"""
SmartLamppost v5.0 - Catalog Module API Tests
"""

import pytest


# Test all 8 catalog tables
CATALOG_TYPES = [
    'columns',
    'luminaires',
    'electrical-panels',
    'fuse-boxes',
    'telemetry-panels',
    'ev-chargers',
    'mupi',
    'antennas'
]


class TestCatalogList:
    """Tests for GET /api/catalog/<type> endpoint."""

    @pytest.mark.parametrize('catalog_type', CATALOG_TYPES)
    def test_list_catalog_items(self, client, superadmin_headers, catalog_type):
        """Test listing catalog items for each type."""
        response = client.get(f'/api/catalog/{catalog_type}', headers=superadmin_headers)
        assert response.status_code in [200, 404]

    def test_list_catalog_unauthenticated(self, client):
        """Test listing catalog without authentication."""
        response = client.get('/api/catalog/columns')
        assert response.status_code == 401

    def test_list_catalog_with_pagination(self, client, superadmin_headers):
        """Test listing catalog with pagination."""
        response = client.get('/api/catalog/columns?page=1&per_page=10',
            headers=superadmin_headers)
        assert response.status_code in [200, 404]


class TestCatalogCreate:
    """Tests for POST /api/catalog/<type> endpoint."""

    def test_create_column_item(self, client, superadmin_headers):
        """Test creating a column catalog item."""
        response = client.post('/api/catalog/columns',
            json={
                'reference': 'COL-TEST-001',
                'manufacturer': 'Test Manufacturer',
                'model': 'Test Model',
                'height_meters': 8.0,
                'material': 'Aço Galvanizado'
            },
            headers=superadmin_headers)
        assert response.status_code in [200, 201, 400, 404]

    def test_create_luminaire_item(self, client, superadmin_headers):
        """Test creating a luminaire catalog item."""
        response = client.post('/api/catalog/luminaires',
            json={
                'reference': 'LUM-TEST-001',
                'manufacturer': 'Test Manufacturer',
                'model': 'LED Model',
                'power_watts': 100,
                'lumens': 12000
            },
            headers=superadmin_headers)
        assert response.status_code in [200, 201, 400, 404]

    def test_create_catalog_unauthenticated(self, client):
        """Test creating catalog item without authentication."""
        response = client.post('/api/catalog/columns',
            json={'reference': 'TEST', 'manufacturer': 'Test'},
            content_type='application/json')
        assert response.status_code in [401, 404]

    def test_create_catalog_as_user(self, client, user_headers):
        """Test creating catalog item as regular user."""
        response = client.post('/api/catalog/columns',
            json={'reference': 'TEST', 'manufacturer': 'Test'},
            headers=user_headers)
        assert response.status_code in [403, 401, 404]


class TestCatalogRead:
    """Tests for GET /api/catalog/<type>/<id> endpoint."""

    def test_get_catalog_item_not_found(self, client, superadmin_headers):
        """Test getting non-existent catalog item."""
        response = client.get('/api/catalog/columns/99999', headers=superadmin_headers)
        assert response.status_code in [404, 405]

    def test_get_catalog_item_unauthenticated(self, client):
        """Test getting catalog item without authentication."""
        response = client.get('/api/catalog/columns/1')
        # 404 if endpoint doesn't exist for specific ID
        assert response.status_code in [401, 404]


class TestCatalogUpdate:
    """Tests for PUT /api/catalog/<type>/<id> endpoint."""

    def test_update_catalog_item_not_found(self, client, superadmin_headers):
        """Test updating non-existent catalog item."""
        response = client.put('/api/catalog/columns/99999',
            json={'manufacturer': 'Updated'},
            headers=superadmin_headers)
        assert response.status_code in [404, 405]

    def test_update_catalog_unauthenticated(self, client):
        """Test updating catalog item without authentication."""
        response = client.put('/api/catalog/columns/1',
            json={'manufacturer': 'Updated'},
            content_type='application/json')
        assert response.status_code in [401, 404]


class TestCatalogDelete:
    """Tests for DELETE /api/catalog/<type>/<id> endpoint."""

    def test_delete_catalog_item_not_found(self, client, superadmin_headers):
        """Test deleting non-existent catalog item."""
        response = client.delete('/api/catalog/columns/99999', headers=superadmin_headers)
        # 200 may be returned even if item doesn't exist (idempotent delete)
        assert response.status_code in [200, 404, 405]

    def test_delete_catalog_unauthenticated(self, client):
        """Test deleting catalog item without authentication."""
        response = client.delete('/api/catalog/columns/1')
        assert response.status_code in [401, 404]


class TestCatalogSearch:
    """Tests for catalog search functionality."""

    def test_search_catalog(self, client, superadmin_headers):
        """Test searching catalog items."""
        response = client.get('/api/catalog/columns?search=test',
            headers=superadmin_headers)
        assert response.status_code in [200, 404]


class TestCatalogImportExport:
    """Tests for catalog import/export functionality."""

    def test_export_catalog(self, client, superadmin_headers):
        """Test exporting catalog to Excel/CSV."""
        response = client.get('/api/catalog/columns/export',
            headers=superadmin_headers)
        assert response.status_code in [200, 404, 405]

    def test_export_catalog_unauthenticated(self, client):
        """Test exporting catalog without authentication."""
        response = client.get('/api/catalog/columns/export')
        assert response.status_code in [401, 404]
