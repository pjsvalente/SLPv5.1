"""
SmartLamppost v5.0 - Map Module Routes
GPS visualization and route planning for assets and interventions.
"""

import json
import logging
import math
import requests
from datetime import datetime

from flask import Blueprint, request, jsonify, g

from ...shared.database import obter_bd
from ...shared.permissions import requer_autenticacao, requer_permissao

logger = logging.getLogger(__name__)

# OSRM public API for routing (free, no API key required)
OSRM_API_URL = "https://router.project-osrm.org"

map_bp = Blueprint('map', __name__)


@map_bp.route('/assets', methods=['GET'])
@requer_permissao('assets', 'view')
def get_map_assets():
    """Get all assets with GPS coordinates for map display."""
    bd = obter_bd()

    # Get filter parameters
    status = request.args.get('status', '')
    municipality = request.args.get('municipality', '')

    # Get all assets
    assets = bd.execute('SELECT * FROM assets ORDER BY serial_number').fetchall()

    result = []
    for asset in assets:
        # Get asset fields
        fields_data = bd.execute('''
            SELECT field_name, field_value FROM asset_data WHERE asset_id = ?
        ''', (asset['id'],)).fetchall()

        fields = {f['field_name']: f['field_value'] for f in fields_data}

        # Only include assets with GPS coordinates
        lat = fields.get('gps_latitude')
        lng = fields.get('gps_longitude')

        if lat and lng:
            try:
                lat_float = float(lat)
                lng_float = float(lng)

                # Apply filters
                if status and fields.get('condition_status') != status:
                    continue
                if municipality and fields.get('municipality') != municipality:
                    continue

                result.append({
                    'id': asset['id'],
                    'serial_number': asset['serial_number'],
                    'latitude': lat_float,
                    'longitude': lng_float,
                    'status': fields.get('condition_status', 'Operacional'),
                    'municipality': fields.get('municipality', ''),
                    'street_address': fields.get('street_address', ''),
                    'model': fields.get('model', ''),
                    'manufacturer': fields.get('manufacturer', ''),
                    'created_at': asset['created_at']
                })
            except (ValueError, TypeError):
                # Skip assets with invalid GPS coordinates
                continue

    return jsonify({
        'assets': result,
        'total': len(result)
    }), 200


@map_bp.route('/assets/<serial_number>', methods=['GET'])
@requer_permissao('assets', 'view')
def get_map_asset_detail(serial_number):
    """Get detailed asset information for map popup."""
    bd = obter_bd()

    asset = bd.execute(
        'SELECT * FROM assets WHERE serial_number = ?',
        (serial_number,)
    ).fetchone()

    if not asset:
        return jsonify({'error': 'Ativo nao encontrado'}), 404

    # Get all fields
    fields_data = bd.execute('''
        SELECT field_name, field_value FROM asset_data WHERE asset_id = ?
    ''', (asset['id'],)).fetchall()

    fields = {f['field_name']: f['field_value'] for f in fields_data}

    # Get recent interventions
    interventions = bd.execute('''
        SELECT id, intervention_type, status, created_at
        FROM interventions
        WHERE asset_serial = ?
        ORDER BY created_at DESC
        LIMIT 5
    ''', (serial_number,)).fetchall()

    return jsonify({
        'id': asset['id'],
        'serial_number': asset['serial_number'],
        'fields': fields,
        'created_at': asset['created_at'],
        'recent_interventions': [dict(i) for i in interventions]
    }), 200


@map_bp.route('/interventions', methods=['GET'])
@requer_permissao('interventions', 'view')
def get_map_interventions():
    """Get interventions with asset GPS for route planning."""
    bd = obter_bd()

    status = request.args.get('status', 'em_curso')
    intervention_type = request.args.get('type', '')

    # Build query - join with assets to get serial_number
    query = '''
        SELECT i.*, a.serial_number as asset_serial,
               u.first_name || ' ' || u.last_name as created_by_name
        FROM interventions i
        LEFT JOIN assets a ON i.asset_id = a.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE 1=1
    '''
    params = []

    if status:
        query += ' AND i.status = ?'
        params.append(status)

    if intervention_type:
        query += ' AND i.intervention_type = ?'
        params.append(intervention_type)

    query += ' ORDER BY i.created_at DESC'

    interventions = bd.execute(query, params).fetchall()

    result = []
    for intervention in interventions:
        # Get asset GPS coordinates using asset_id directly
        asset_id = intervention['asset_id']
        if not asset_id:
            continue

        fields_data = bd.execute('''
            SELECT field_name, field_value FROM asset_data
            WHERE asset_id = ? AND field_name IN ('gps_latitude', 'gps_longitude', 'street_address', 'municipality')
        ''', (asset_id,)).fetchall()

        fields = {f['field_name']: f['field_value'] for f in fields_data}

        lat = fields.get('gps_latitude')
        lng = fields.get('gps_longitude')

        if lat and lng:
            try:
                result.append({
                    'id': intervention['id'],
                    'intervention_type': intervention['intervention_type'],
                    'status': intervention['status'],
                    'asset_serial': intervention['asset_serial'] or '',
                    'latitude': float(lat),
                    'longitude': float(lng),
                    'street_address': fields.get('street_address', ''),
                    'municipality': fields.get('municipality', ''),
                    'problem_description': intervention['problem_description'],
                    'created_at': intervention['created_at'],
                    'created_by_name': intervention['created_by_name']
                })
            except (ValueError, TypeError):
                continue

    return jsonify({
        'interventions': result,
        'total': len(result)
    }), 200


@map_bp.route('/route-plan', methods=['POST'])
@requer_permissao('interventions', 'view')
def calculate_route():
    """Calculate optimal route for multiple interventions."""
    dados = request.get_json() or {}
    intervention_ids = dados.get('intervention_ids', [])

    # Support both formats for starting point
    starting_point = dados.get('starting_point', {})
    start_lat = starting_point.get('latitude') or dados.get('start_latitude')
    start_lng = starting_point.get('longitude') or dados.get('start_longitude')

    if not intervention_ids:
        return jsonify({'error': 'Nenhuma intervencao selecionada'}), 400

    bd = obter_bd()

    # Get interventions with GPS
    waypoints = []

    # Add start point if provided
    if start_lat and start_lng:
        waypoints.append({
            'id': 'start',
            'type': 'start',
            'latitude': float(start_lat),
            'longitude': float(start_lng),
            'label': 'Ponto de Partida'
        })

    for int_id in intervention_ids:
        # Get intervention with asset serial number via JOIN
        intervention = bd.execute('''
            SELECT i.*, a.serial_number as asset_serial
            FROM interventions i
            LEFT JOIN assets a ON i.asset_id = a.id
            WHERE i.id = ?
        ''', (int_id,)).fetchone()

        if intervention and intervention['asset_id']:
            fields_data = bd.execute('''
                SELECT field_name, field_value FROM asset_data
                WHERE asset_id = ? AND field_name IN ('gps_latitude', 'gps_longitude')
            ''', (intervention['asset_id'],)).fetchall()

            fields = {f['field_name']: f['field_value'] for f in fields_data}

            lat = fields.get('gps_latitude')
            lng = fields.get('gps_longitude')

            if lat and lng:
                try:
                    waypoints.append({
                        'id': intervention['id'],
                        'type': 'intervention',
                        'intervention_type': intervention['intervention_type'],
                        'latitude': float(lat),
                        'longitude': float(lng),
                        'label': f"{intervention['asset_serial'] or ''} - {intervention['intervention_type']}"
                    })
                except (ValueError, TypeError):
                    continue

    # Simple nearest neighbor route optimization
    if len(waypoints) > 1:
        optimized = optimize_route_nearest_neighbor(waypoints)
    else:
        optimized = waypoints

    # Try to get real road route from OSRM
    route_geometry = None
    total_distance = 0
    total_duration = 0

    if len(optimized) >= 2:
        osrm_result = get_osrm_route(optimized)
        if osrm_result:
            route_geometry = osrm_result.get('geometry')
            total_distance = osrm_result.get('distance', 0) / 1000  # Convert to km
            total_duration = osrm_result.get('duration', 0) / 60  # Convert to minutes
        else:
            # Fallback to straight-line distance
            total_distance = calculate_total_distance(optimized)
            total_duration = total_distance * 2  # Rough estimate: 30 km/h average

    return jsonify({
        'waypoints': optimized,
        'route_geometry': route_geometry,  # GeoJSON LineString for drawing on map
        'total_distance_km': round(total_distance, 2),
        'estimated_time_minutes': round(total_duration, 0)
    }), 200


@map_bp.route('/statistics', methods=['GET'])
@requer_permissao('assets', 'view')
def get_map_statistics():
    """Get statistics for map overview."""
    bd = obter_bd()

    # Get total assets with GPS
    assets = bd.execute('SELECT id FROM assets').fetchall()

    assets_with_gps = 0
    municipalities = {}
    statuses = {}

    for asset in assets:
        fields_data = bd.execute('''
            SELECT field_name, field_value FROM asset_data
            WHERE asset_id = ? AND field_name IN ('gps_latitude', 'gps_longitude', 'municipality', 'condition_status')
        ''', (asset['id'],)).fetchall()

        fields = {f['field_name']: f['field_value'] for f in fields_data}

        if fields.get('gps_latitude') and fields.get('gps_longitude'):
            assets_with_gps += 1

            # Count by municipality
            muni = fields.get('municipality', 'Desconhecido')
            municipalities[muni] = municipalities.get(muni, 0) + 1

            # Count by status
            status = fields.get('condition_status', 'Operacional')
            statuses[status] = statuses.get(status, 0) + 1

    # Get open interventions count
    open_interventions = bd.execute('''
        SELECT COUNT(*) FROM interventions WHERE status = 'em_curso'
    ''').fetchone()[0]

    return jsonify({
        'total_assets': len(assets),
        'assets_with_gps': assets_with_gps,
        'assets_without_gps': len(assets) - assets_with_gps,
        'open_interventions': open_interventions,
        'by_municipality': municipalities,
        'by_status': statuses
    }), 200


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the distance between two GPS points in kilometers."""
    R = 6371  # Earth's radius in kilometers

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def optimize_route_nearest_neighbor(waypoints):
    """Simple nearest neighbor algorithm for route optimization."""
    if len(waypoints) <= 2:
        return waypoints

    # Start from first waypoint (start point or first intervention)
    optimized = [waypoints[0]]
    remaining = waypoints[1:]

    while remaining:
        current = optimized[-1]
        nearest = None
        nearest_dist = float('inf')

        for wp in remaining:
            dist = haversine_distance(
                current['latitude'], current['longitude'],
                wp['latitude'], wp['longitude']
            )
            if dist < nearest_dist:
                nearest_dist = dist
                nearest = wp

        if nearest:
            optimized.append(nearest)
            remaining.remove(nearest)

    # Add sequence numbers
    for i, wp in enumerate(optimized):
        wp['sequence'] = i + 1

    return optimized


def calculate_total_distance(waypoints):
    """Calculate total route distance in kilometers."""
    total = 0
    for i in range(len(waypoints) - 1):
        total += haversine_distance(
            waypoints[i]['latitude'], waypoints[i]['longitude'],
            waypoints[i + 1]['latitude'], waypoints[i + 1]['longitude']
        )
    return total


def get_osrm_route(waypoints):
    """
    Get real road route from OSRM (Open Source Routing Machine).
    Returns route geometry, distance, and duration.
    """
    if len(waypoints) < 2:
        return None

    try:
        # Build coordinates string: lng,lat;lng,lat;...
        coords = ";".join([
            f"{wp['longitude']},{wp['latitude']}"
            for wp in waypoints
        ])

        # Call OSRM API
        url = f"{OSRM_API_URL}/route/v1/driving/{coords}"
        params = {
            'overview': 'full',  # Get full route geometry
            'geometries': 'geojson',  # Return as GeoJSON
            'steps': 'false'
        }

        response = requests.get(url, params=params, timeout=10)

        if response.status_code == 200:
            data = response.json()

            if data.get('code') == 'Ok' and data.get('routes'):
                route = data['routes'][0]
                return {
                    'geometry': route['geometry'],  # GeoJSON LineString
                    'distance': route['distance'],  # in meters
                    'duration': route['duration']   # in seconds
                }

        logger.warning(f"OSRM API returned non-OK response: {response.status_code}")
        return None

    except requests.exceptions.Timeout:
        logger.warning("OSRM API timeout")
        return None
    except requests.exceptions.RequestException as e:
        logger.warning(f"OSRM API error: {e}")
        return None
    except Exception as e:
        logger.error(f"Error getting OSRM route: {e}")
        return None
