"""
SmartLamppost v5.0 - Reports Routes
Statistics and report generation.
"""

import json
import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify

from ...shared.database import obter_bd, extrair_valor
from ...shared.permissions import requer_autenticacao

logger = logging.getLogger(__name__)

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/stats', methods=['GET'])
@requer_autenticacao
def get_general_stats():
    """Get general system statistics."""
    bd = obter_bd()

    stats = {}

    # Total assets
    stats['total_assets'] = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM assets').fetchone(), 0) or 0

    # Asset counts by condition_status (from asset_data)
    asset_status = bd.execute('''
        SELECT ad.field_value as status, COUNT(*) as count
        FROM assets a
        LEFT JOIN asset_data ad ON a.id = ad.asset_id AND ad.field_name = 'condition_status'
        GROUP BY ad.field_value
    ''').fetchall()
    stats['assets_by_status'] = {(row['status'] or 'Sem Estado'): row['count'] for row in asset_status}

    # Intervention counts by status
    int_status = bd.execute('''
        SELECT status, COUNT(*) as count FROM interventions GROUP BY status
    ''').fetchall()
    stats['interventions_by_status'] = {row['status']: row['count'] for row in int_status}
    stats['total_interventions'] = sum(stats['interventions_by_status'].values()) if int_status else 0

    # Intervention counts by intervention_type
    int_type = bd.execute('''
        SELECT intervention_type, COUNT(*) as count FROM interventions GROUP BY intervention_type
    ''').fetchall()
    stats['interventions_by_type'] = {row['intervention_type']: row['count'] for row in int_type}

    # Technician counts - check if table exists
    try:
        stats['total_technicians'] = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM external_technicians').fetchone(), 0) or 0
        stats['active_technicians'] = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM external_technicians WHERE active = 1').fetchone(), 0) or 0
    except:
        stats['total_technicians'] = 0
        stats['active_technicians'] = 0

    # User counts
    stats['total_users'] = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM users').fetchone(), 0) or 0
    stats['active_users'] = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM users WHERE active = 1').fetchone(), 0) or 0

    # Recent activity
    stats['recent_interventions'] = extrair_valor(bd.execute('''
        SELECT COUNT(*) as cnt FROM interventions WHERE created_at >= date('now', '-30 days')
    ''').fetchone(), 0) or 0

    stats['recent_assets'] = extrair_valor(bd.execute('''
        SELECT COUNT(*) as cnt FROM assets WHERE created_at >= date('now', '-30 days')
    ''').fetchone(), 0) or 0

    return jsonify(stats), 200


@reports_bp.route('/interventions', methods=['GET'])
@requer_autenticacao
def get_interventions_report():
    """Get interventions report with filters."""
    bd = obter_bd()

    # Get date range
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    int_type = request.args.get('type') or request.args.get('tipo')
    status = request.args.get('status') or request.args.get('estado')

    # Default to last 30 days
    if not start_date:
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')

    # Build query
    query = '''
        SELECT i.*, a.serial_number as asset_serial
        FROM interventions i
        LEFT JOIN assets a ON i.asset_id = a.id
        WHERE DATE(i.created_at) >= ? AND DATE(i.created_at) <= ?
    '''
    params = [start_date, end_date]

    if int_type:
        query += ' AND i.intervention_type = ?'
        params.append(int_type)

    if status:
        query += ' AND i.status = ?'
        params.append(status)

    query += ' ORDER BY i.created_at DESC'

    interventions = bd.execute(query, params).fetchall()

    # Calculate statistics
    stats = {
        'total': len(interventions),
        'by_type': {},
        'by_status': {},
        'avg_duration': 0
    }

    total_duration = 0
    completed_count = 0

    for i in interventions:
        int_dict = dict(i)

        # Count by intervention_type
        type_val = int_dict.get('intervention_type', 'outro')
        stats['by_type'][type_val] = stats['by_type'].get(type_val, 0) + 1

        # Count by status
        status_val = int_dict.get('status', 'em_curso')
        stats['by_status'][status_val] = stats['by_status'].get(status_val, 0) + 1

        # Calculate duration for completed
        if int_dict.get('status') == 'concluida' and int_dict.get('completed_at'):
            try:
                start = datetime.fromisoformat(int_dict['created_at'].replace('Z', '+00:00'))
                end = datetime.fromisoformat(int_dict['completed_at'].replace('Z', '+00:00'))
                duration = (end - start).total_seconds() / 3600  # hours
                total_duration += duration
                completed_count += 1
            except:
                pass

    if completed_count > 0:
        stats['avg_duration'] = round(total_duration / completed_count, 1)

    return jsonify({
        'interventions': [dict(i) for i in interventions],
        'stats': stats,
        'period': {'start': start_date, 'end': end_date}
    }), 200


@reports_bp.route('/assets', methods=['GET'])
@requer_autenticacao
def get_assets_report():
    """Get assets report with filters."""
    bd = obter_bd()

    status = request.args.get('status')

    # Build query
    query = 'SELECT * FROM assets WHERE 1=1'
    params = []

    if status:
        query += ' AND status = ?'
        params.append(status)

    query += ' ORDER BY created_at DESC'

    assets = bd.execute(query, params).fetchall()

    # Calculate statistics
    stats = {
        'total': len(assets),
        'by_status': {},
        'with_interventions': 0
    }

    asset_ids = [a['id'] for a in assets]

    if asset_ids:
        placeholders = ','.join(['?'] * len(asset_ids))
        intervention_counts = bd.execute(f'''
            SELECT asset_id, COUNT(*) as count FROM interventions
            WHERE asset_id IN ({placeholders})
            GROUP BY asset_id
        ''', asset_ids).fetchall()

        stats['with_interventions'] = len(intervention_counts)

    for a in assets:
        asset_dict = dict(a)
        status_val = asset_dict.get('status', 'ativo')
        stats['by_status'][status_val] = stats['by_status'].get(status_val, 0) + 1

    return jsonify({
        'assets': [dict(a) for a in assets],
        'stats': stats
    }), 200


@reports_bp.route('/timeline', methods=['GET'])
@requer_autenticacao
def get_timeline():
    """Get activity timeline."""
    bd = obter_bd()

    days = int(request.args.get('days', 30))

    # Get daily counts
    interventions_timeline = bd.execute('''
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM interventions
        WHERE created_at >= date('now', ?)
        GROUP BY DATE(created_at)
        ORDER BY date
    ''', (f'-{days} days',)).fetchall()

    assets_timeline = bd.execute('''
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM assets
        WHERE created_at >= date('now', ?)
        GROUP BY DATE(created_at)
        ORDER BY date
    ''', (f'-{days} days',)).fetchall()

    return jsonify({
        'interventions': [{'date': row['date'], 'count': row['count']} for row in interventions_timeline],
        'assets': [{'date': row['date'], 'count': row['count']} for row in assets_timeline],
        'period': {'days': days}
    }), 200


@reports_bp.route('/technicians', methods=['GET'])
@requer_autenticacao
def get_technicians_report():
    """Get technicians performance report."""
    bd = obter_bd()

    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date:
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not end_date:
        end_date = datetime.now().strftime('%Y-%m-%d')

    # Get technician stats - using external_technicians table (v5 schema)
    try:
        technicians = bd.execute('''
            SELECT t.id, t.name as nome, t.company as empresa,
                COUNT(DISTINCT it.intervention_id) as total_interventions,
                SUM(CASE WHEN i.status = 'concluida' THEN 1 ELSE 0 END) as completed
            FROM external_technicians t
            LEFT JOIN intervention_technicians it ON t.external_technician_id = t.id
            LEFT JOIN interventions i ON it.intervention_id = i.id
                AND DATE(i.created_at) >= ? AND DATE(i.created_at) <= ?
            WHERE t.active = 1
            GROUP BY t.id
            ORDER BY total_interventions DESC
        ''', (start_date, end_date)).fetchall()
    except:
        technicians = []

    return jsonify({
        'technicians': [dict(t) for t in technicians],
        'period': {'start': start_date, 'end': end_date}
    }), 200


# =========================================================================
# CUSTOM REPORT BUILDER
# =========================================================================

@reports_bp.route('/templates', methods=['GET'])
@requer_autenticacao
def get_report_templates():
    """Get saved report templates."""
    from flask import g
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    # Ensure table exists
    bd.execute('''
        CREATE TABLE IF NOT EXISTS report_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            type TEXT DEFAULT 'assets',
            config TEXT NOT NULL,
            is_public INTEGER DEFAULT 0,
            is_default INTEGER DEFAULT 0,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')
    # Add type column if missing (migration)
    try:
        bd.execute('ALTER TABLE report_templates ADD COLUMN type TEXT DEFAULT "assets"')
        bd.commit()
    except:
        pass
    try:
        bd.execute('ALTER TABLE report_templates ADD COLUMN is_default INTEGER DEFAULT 0')
        bd.commit()
    except:
        pass
    bd.commit()

    # Get user's templates and public templates
    templates = bd.execute('''
        SELECT t.*, u.first_name as creator_name
        FROM report_templates t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.created_by = ? OR t.is_public = 1
        ORDER BY t.updated_at DESC
    ''', (user_id,)).fetchall()

    result = []
    for t in templates:
        template = dict(t)
        try:
            template['config'] = json.loads(template['config'])
        except:
            template['config'] = {}
        result.append(template)

    return jsonify({'templates': result}), 200


@reports_bp.route('/templates', methods=['POST'])
@requer_autenticacao
def create_report_template():
    """Create a new report template."""
    from flask import g
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    dados = request.get_json() or {}

    if not dados.get('name'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    if not dados.get('config'):
        return jsonify({'error': 'Configuração é obrigatória'}), 400

    bd.execute('''
        INSERT INTO report_templates (name, description, type, config, is_public, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        dados['name'],
        dados.get('description', ''),
        dados.get('type', 'assets'),
        json.dumps(dados['config']),
        1 if dados.get('is_public') else 0,
        user_id
    ))
    bd.commit()

    return jsonify({'message': 'Template criado com sucesso'}), 201


@reports_bp.route('/templates/<int:template_id>', methods=['PUT'])
@requer_autenticacao
def update_report_template(template_id):
    """Update a report template."""
    from flask import g
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    dados = request.get_json() or {}

    # Check ownership
    template = bd.execute(
        'SELECT created_by FROM report_templates WHERE id = ?',
        (template_id,)
    ).fetchone()

    if not template:
        return jsonify({'error': 'Template não encontrado'}), 404

    if template['created_by'] != user_id:
        return jsonify({'error': 'Sem permissão para editar este template'}), 403

    config = dados.get('config')
    if config:
        config = json.dumps(config)

    bd.execute('''
        UPDATE report_templates SET
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            type = COALESCE(?, type),
            config = COALESCE(?, config),
            is_public = COALESCE(?, is_public),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (
        dados.get('name'),
        dados.get('description'),
        dados.get('type'),
        config,
        1 if dados.get('is_public') else 0 if 'is_public' in dados else None,
        template_id
    ))
    bd.commit()

    return jsonify({'message': 'Template atualizado'}), 200


@reports_bp.route('/templates/<int:template_id>', methods=['DELETE'])
@requer_autenticacao
def delete_report_template(template_id):
    """Delete a report template."""
    from flask import g
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    template = bd.execute(
        'SELECT created_by FROM report_templates WHERE id = ?',
        (template_id,)
    ).fetchone()

    if not template:
        return jsonify({'error': 'Template não encontrado'}), 404

    if template['created_by'] != user_id:
        return jsonify({'error': 'Sem permissão para eliminar este template'}), 403

    bd.execute('DELETE FROM report_templates WHERE id = ?', (template_id,))
    bd.commit()

    return jsonify({'message': 'Template eliminado'}), 200


@reports_bp.route('/custom', methods=['POST'])
@requer_autenticacao
def generate_custom_report():
    """Generate a custom report based on configuration."""
    bd = obter_bd()
    dados = request.get_json() or {}

    config = dados.get('config', {})

    # Report configuration - support both formats
    # Format 1: type in body (from frontend)
    # Format 2: type in config (legacy)
    report_type = dados.get('type') or config.get('type', 'assets')
    columns = config.get('columns', [])  # List of columns to include
    filters = config.get('filters', [])  # List of filter objects
    group_by = config.get('groupBy') or config.get('group_by')
    sort_by = config.get('sortBy') or config.get('order_by', 'created_at')
    sort_order = config.get('sortOrder', 'asc').upper() if config.get('sortOrder') else config.get('order_dir', 'DESC')
    date_range = config.get('dateRange') or config.get('date_range', {})
    include_stats = config.get('includeStats', True) if 'includeStats' in config else config.get('include_stats', True)

    result = {
        'data': [],
        'stats': {},
        'config': config,
        'generated_at': datetime.now().isoformat()
    }

    # Convert filter array to dict for compatibility
    filter_dict = {}
    if isinstance(filters, list):
        for f in filters:
            if f.get('field') and f.get('value'):
                filter_dict[f['field']] = {
                    'operator': f.get('operator', 'eq'),
                    'value': f['value']
                }
    else:
        filter_dict = filters

    # Build query based on type
    if report_type == 'assets':
        result = _build_assets_report(bd, columns, filter_dict, group_by, sort_by, sort_order, include_stats, date_range)
    elif report_type == 'interventions':
        result = _build_interventions_report(bd, columns, filter_dict, group_by, sort_by, sort_order, date_range, include_stats)
    elif report_type == 'technicians':
        result = _build_technicians_report(bd, columns, filter_dict, date_range, include_stats)
    elif report_type == 'combined' or report_type == 'mixed':
        result = _build_combined_report(bd, config)

    result['generated_at'] = datetime.now().isoformat()
    result['config'] = config
    return jsonify(result), 200


def _build_assets_report(bd, columns, filters, group_by, order_by, order_dir, include_stats, date_range=None):
    """Build assets report."""
    # Default columns if none specified
    if not columns:
        columns = ['id', 'serial_number', 'product_reference', 'condition_status', 'created_at']

    # Column mapping (frontend to database) - v5 uses asset_data for dynamic fields
    base_cols = ['id', 'serial_number', 'created_at', 'updated_at']

    # Get all assets with basic info
    query = 'SELECT id, serial_number, created_at, updated_at FROM assets WHERE 1=1'
    params = []

    # Date range on created_at
    if date_range and date_range.get('start'):
        query += ' AND DATE(created_at) >= ?'
        params.append(date_range['start'])
    if date_range and date_range.get('end'):
        query += ' AND DATE(created_at) <= ?'
        params.append(date_range['end'])

    # Order by
    if order_by in base_cols:
        query += f' ORDER BY {order_by} {order_dir}'
    else:
        query += ' ORDER BY created_at DESC'

    query += ' LIMIT 1000'

    assets = bd.execute(query, params).fetchall()

    # Enrich with asset_data fields
    result_data = []
    for asset in assets:
        asset_dict = dict(asset)

        # Get dynamic fields
        fields = bd.execute('''
            SELECT field_name, field_value FROM asset_data WHERE asset_id = ?
        ''', (asset['id'],)).fetchall()

        for f in fields:
            asset_dict[f['field_name']] = f['field_value']

        result_data.append(asset_dict)

    # Apply filters on enriched data
    if filters:
        filtered = []
        for row in result_data:
            match = True
            for field, filter_info in filters.items():
                if isinstance(filter_info, dict):
                    op = filter_info.get('operator', 'eq')
                    val = filter_info.get('value')
                else:
                    op = 'eq'
                    val = filter_info

                if val:
                    row_val = row.get(field, '')
                    if op == 'eq' and str(row_val) != str(val):
                        match = False
                    elif op == 'contains' and str(val).lower() not in str(row_val).lower():
                        match = False
            if match:
                filtered.append(row)
        result_data = filtered

    result = {
        'data': result_data,
        'columns': columns,
        'total': len(result_data)
    }

    # Calculate stats
    if include_stats and not group_by:
        result['stats'] = {
            'total': len(result_data),
            'by_status': {}
        }
        for row in result_data:
            status = row.get('condition_status', 'Sem Estado')
            result['stats']['by_status'][status] = result['stats']['by_status'].get(status, 0) + 1

    return result


def _build_interventions_report(bd, columns, filters, group_by, order_by, order_dir, date_range, include_stats):
    """Build interventions report."""
    if not columns:
        columns = ['id', 'intervention_type', 'status', 'created_at']

    # Column mapping - v5 schema
    col_map = {
        'id': 'i.id',
        'intervention_type': 'i.intervention_type',
        'status': 'i.status',
        'asset_serial': 'a.serial_number',
        'problem_description': 'i.problem_description',
        'solution_description': 'i.solution_description',
        'total_cost': 'i.total_cost',
        'duration_hours': 'i.duration_hours',
        'created_at': 'i.created_at',
        'completed_at': 'i.completed_at',
        'created_by': 'i.created_by'
    }

    valid_columns = list(col_map.keys())
    select_cols = [c for c in columns if c in valid_columns]
    if not select_cols:
        select_cols = ['id', 'status']

    db_cols = [f"{col_map.get(c, c)} as {c}" for c in select_cols]
    query = f"SELECT {', '.join(db_cols)} FROM interventions i LEFT JOIN assets a ON i.asset_id = a.id WHERE 1=1"
    params = []

    # Date range
    if date_range:
        if date_range.get('start'):
            query += ' AND DATE(i.created_at) >= ?'
            params.append(date_range['start'])
        if date_range.get('end'):
            query += ' AND DATE(i.created_at) <= ?'
            params.append(date_range['end'])

    # Filters
    for field, filter_info in filters.items():
        if field in col_map:
            db_field = col_map[field]
            if isinstance(filter_info, dict):
                op = filter_info.get('operator', 'eq')
                val = filter_info.get('value')
            else:
                op = 'eq'
                val = filter_info

            if val:
                if op == 'eq':
                    query += f' AND {db_field} = ?'
                    params.append(val)
                elif op == 'contains':
                    query += f' AND {db_field} LIKE ?'
                    params.append(f'%{val}%')

    # Group by
    if group_by and group_by in valid_columns:
        db_group = col_map.get(group_by, group_by)
        query = f"SELECT {db_group} as {group_by}, COUNT(*) as count FROM interventions i LEFT JOIN assets a ON i.asset_id = a.id WHERE 1=1"
        query += f' GROUP BY {db_group}'
    else:
        if order_by and order_by in valid_columns:
            db_order = col_map.get(order_by, order_by)
            query += f' ORDER BY {db_order} {order_dir}'
        else:
            query += ' ORDER BY i.created_at DESC'

    query += ' LIMIT 1000'

    data = bd.execute(query, params).fetchall()

    result = {
        'data': [dict(row) for row in data],
        'columns': select_cols,
        'total': len(data)
    }

    if include_stats and not group_by:
        result['stats'] = {
            'total': len(data),
            'by_type': {},
            'by_status': {}
        }
        for row in data:
            d = dict(row)
            if 'intervention_type' in d:
                result['stats']['by_type'][d['intervention_type']] = result['stats']['by_type'].get(d['intervention_type'], 0) + 1
            if 'status' in d:
                result['stats']['by_status'][d['status']] = result['stats']['by_status'].get(d['status'], 0) + 1

    return result


def _build_technicians_report(bd, columns, filters, date_range, include_stats):
    """Build technicians performance report."""
    start = date_range.get('start', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
    end = date_range.get('end', datetime.now().strftime('%Y-%m-%d'))

    try:
        data = bd.execute('''
            SELECT
                t.id,
                t.name as nome,
                t.company as empresa,
                t.specialization as especialidade,
                COUNT(DISTINCT it.intervention_id) as total_interventions,
                SUM(CASE WHEN i.status = 'concluida' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN i.status = 'em_curso' THEN 1 ELSE 0 END) as in_progress
            FROM external_technicians t
            LEFT JOIN intervention_technicians it ON t.id = it.external_technician_id
            LEFT JOIN interventions i ON it.intervention_id = i.id
                AND DATE(i.created_at) >= ? AND DATE(i.created_at) <= ?
            WHERE t.active = 1
            GROUP BY t.id
            ORDER BY total_interventions DESC
        ''', (start, end)).fetchall()
    except:
        data = []

    result = {
        'data': [dict(row) for row in data],
        'columns': ['nome', 'empresa', 'total_interventions', 'completed', 'in_progress'],
        'total': len(data),
        'period': {'start': start, 'end': end}
    }

    if include_stats:
        total_interventions = sum(row['total_interventions'] or 0 for row in data)
        total_completed = sum(row['completed'] or 0 for row in data)
        result['stats'] = {
            'total_technicians': len(data),
            'total_interventions': total_interventions,
            'total_completed': total_completed,
            'completion_rate': round((total_completed / total_interventions * 100) if total_interventions > 0 else 0, 1)
        }

    return result


def _build_combined_report(bd, config):
    """Build combined multi-entity report."""
    result = {
        'assets': {},
        'interventions': {},
        'technicians': {},
        'summary': {}
    }

    date_range = config.get('date_range', {})
    start = date_range.get('start', (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
    end = date_range.get('end', datetime.now().strftime('%Y-%m-%d'))

    # Assets summary (v5 uses asset_data for condition_status)
    assets = bd.execute('''
        SELECT ad.field_value as status, COUNT(*) as count
        FROM assets a
        LEFT JOIN asset_data ad ON a.id = ad.asset_id AND ad.field_name = 'condition_status'
        GROUP BY ad.field_value
    ''').fetchall()
    result['assets'] = {
        'by_status': {(row['status'] or 'Sem Estado'): row['count'] for row in assets},
        'total': sum(row['count'] for row in assets)
    }

    # Interventions summary (v5 uses intervention_type and status)
    interventions = bd.execute('''
        SELECT intervention_type, status, COUNT(*) as count
        FROM interventions
        WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
        GROUP BY intervention_type, status
    ''', (start, end)).fetchall()

    by_type = {}
    by_status = {}
    for row in interventions:
        by_type[row['intervention_type']] = by_type.get(row['intervention_type'], 0) + row['count']
        by_status[row['status']] = by_status.get(row['status'], 0) + row['count']

    result['interventions'] = {
        'by_type': by_type,
        'by_status': by_status,
        'total': sum(row['count'] for row in interventions)
    }

    # Technicians summary (v5 uses external_technicians)
    try:
        technicians = bd.execute('''
            SELECT COUNT(*) as total
            FROM external_technicians WHERE active = 1
        ''').fetchone()
        result['technicians'] = {'total': technicians['total'] if technicians else 0}
    except:
        result['technicians'] = {'total': 0}

    # Summary
    result['summary'] = {
        'period': {'start': start, 'end': end},
        'total_assets': result['assets']['total'],
        'total_interventions': result['interventions']['total'],
        'total_technicians': result['technicians']['total']
    }

    return result


@reports_bp.route('/export', methods=['POST'])
@requer_autenticacao
def export_report():
    """Export report to CSV or Excel."""
    import io
    import csv
    from flask import send_file

    dados = request.get_json() or {}
    format_type = dados.get('format', 'csv')  # csv or xlsx
    report_data = dados.get('data', [])
    columns = dados.get('columns', [])

    if not report_data:
        return jsonify({'error': 'Sem dados para exportar'}), 400

    if format_type == 'csv':
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=columns if columns else report_data[0].keys())
        writer.writeheader()
        writer.writerows(report_data)

        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )

    elif format_type == 'xlsx':
        import pandas as pd

        df = pd.DataFrame(report_data)
        if columns:
            df = df[columns]

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Report', index=False)

        output.seek(0)
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        )

    return jsonify({'error': 'Formato não suportado'}), 400
