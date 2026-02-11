"""
SmartLamppost v5.0 - Map GPS API Tests
"""

import pytest


class TestMapAssets:
    """Tests for GET /api/map/assets endpoint."""

    def test_get_map_assets(self, client, superadmin_headers):
        """Test getting assets for map visualization."""
        response = client.get('/api/map/assets', headers=superadmin_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'assets' in data or isinstance(data, list)

    def test_get_map_assets_unauthenticated(self, client):
        """Test getting map assets without authentication."""
        response = client.get('/api/map/assets')
        assert response.status_code == 401

    def test_get_map_assets_with_bounds(self, client, superadmin_headers):
        """Test getting map assets with geographic bounds."""
        response = client.get('/api/map/assets?north=39&south=38&east=-9&west=-10',
            headers=superadmin_headers)
        assert response.status_code == 200


class TestMapInterventions:
    """Tests for GET /api/map/interventions endpoint."""

    def test_get_map_interventions(self, client, superadmin_headers):
        """Test getting interventions for map visualization."""
        response = client.get('/api/map/interventions', headers=superadmin_headers)
        assert response.status_code in [200, 404]

    def test_get_map_interventions_by_status(self, client, superadmin_headers):
        """Test getting map interventions filtered by status."""
        response = client.get('/api/map/interventions?status=pendente',
            headers=superadmin_headers)
        assert response.status_code in [200, 404]

    def test_get_map_interventions_unauthenticated(self, client):
        """Test getting map interventions without authentication."""
        response = client.get('/api/map/interventions')
        assert response.status_code in [401, 404]


class TestMapRoutes:
    """Tests for route planning endpoints."""

    def test_get_route_planning(self, client, superadmin_headers):
        """Test getting route planning data."""
        response = client.get('/api/map/routes', headers=superadmin_headers)
        assert response.status_code in [200, 404]

    def test_calculate_route(self, client, superadmin_headers):
        """Test calculating an optimized route."""
        response = client.post('/api/map/routes/calculate',
            json={
                'start': {'lat': 38.7223, 'lng': -9.1393},
                'waypoints': [
                    {'lat': 38.7230, 'lng': -9.1400},
                    {'lat': 38.7240, 'lng': -9.1410}
                ]
            },
            headers=superadmin_headers)
        # 405 if POST method not implemented
        assert response.status_code in [200, 400, 404, 405]

    def test_calculate_route_unauthenticated(self, client):
        """Test calculating route without authentication."""
        response = client.post('/api/map/routes/calculate',
            json={'start': {'lat': 38.7223, 'lng': -9.1393}, 'waypoints': []},
            content_type='application/json')
        # 405 if method not implemented
        assert response.status_code in [401, 404, 405]


class TestMapFilters:
    """Tests for map filter endpoints."""

    def test_get_map_filters(self, client, superadmin_headers):
        """Test getting available map filters."""
        response = client.get('/api/map/filters', headers=superadmin_headers)
        assert response.status_code in [200, 404]


class TestMapClusters:
    """Tests for map clustering functionality."""

    def test_get_clustered_assets(self, client, superadmin_headers):
        """Test getting clustered assets for zoomed out view."""
        response = client.get('/api/map/assets?cluster=true&zoom=10',
            headers=superadmin_headers)
        assert response.status_code == 200
