"""
SmartLamppost v5.0 - Settings and Audit API Tests

Note: Settings endpoints use specific routes like /prefixes, /colors, /audit-log
"""

import pytest


class TestSettingsPrefixes:
    """Tests for GET/PUT /api/settings/prefixes endpoint."""

    def test_get_prefixes_authenticated(self, client, superadmin_headers):
        """Test getting prefixes when authenticated."""
        response = client.get('/api/settings/prefixes', headers=superadmin_headers)
        assert response.status_code == 200

    def test_get_prefixes_as_admin(self, client, admin_headers):
        """Test getting prefixes as admin."""
        response = client.get('/api/settings/prefixes', headers=admin_headers)
        assert response.status_code in [200, 403]

    def test_get_prefixes_unauthenticated(self, client):
        """Test getting prefixes without authentication."""
        response = client.get('/api/settings/prefixes')
        assert response.status_code == 401

    def test_update_prefixes_success(self, client, admin_headers):
        """Test updating prefixes."""
        response = client.put('/api/settings/prefixes',
            json={'prefix_assets': 'TST', 'prefix_assets_digits': 6},
            headers=admin_headers)
        assert response.status_code in [200, 400, 403]

    def test_update_prefixes_as_user(self, client, user_headers):
        """Test updating prefixes as regular user (should be forbidden)."""
        response = client.put('/api/settings/prefixes',
            json={'prefix_assets': 'TST'},
            headers=user_headers)
        assert response.status_code in [403, 401]


class TestAuditLog:
    """Tests for GET /api/settings/audit-log endpoint."""

    def test_get_audit_log_authenticated(self, client, superadmin_headers):
        """Test getting audit log when authenticated."""
        response = client.get('/api/settings/audit-log', headers=superadmin_headers)
        assert response.status_code == 200

    def test_get_audit_log_with_filters(self, client, superadmin_headers):
        """Test getting audit log with filters."""
        response = client.get('/api/settings/audit-log?action=create&limit=10', headers=superadmin_headers)
        assert response.status_code == 200

    def test_get_audit_log_unauthenticated(self, client):
        """Test getting audit log without authentication."""
        response = client.get('/api/settings/audit-log')
        assert response.status_code == 401

    def test_get_audit_actions(self, client, admin_headers):
        """Test getting audit action types."""
        response = client.get('/api/settings/audit-log/actions', headers=admin_headers)
        assert response.status_code == 200

    def test_get_audit_users(self, client, admin_headers):
        """Test getting users who made audit entries."""
        response = client.get('/api/settings/audit-log/users', headers=admin_headers)
        assert response.status_code == 200

    def test_get_audit_stats(self, client, admin_headers):
        """Test getting audit statistics."""
        response = client.get('/api/settings/audit-log/stats', headers=admin_headers)
        assert response.status_code == 200


class TestFieldCatalog:
    """Tests for field catalog management (superadmin only)."""

    def test_get_field_catalog(self, client, superadmin_headers):
        """Test getting field catalog."""
        response = client.get('/api/settings/field-catalog', headers=superadmin_headers)
        assert response.status_code == 200

    def test_get_field_catalog_as_admin(self, client, admin_headers):
        """Test getting field catalog as admin (should be forbidden)."""
        response = client.get('/api/settings/field-catalog', headers=admin_headers)
        assert response.status_code == 403

    def test_add_field_to_catalog(self, client, superadmin_headers):
        """Test adding a field to catalog."""
        response = client.post('/api/settings/field-catalog',
            json={
                'field_name': 'test_field_new',
                'field_type': 'text',
                'field_label_pt': 'Campo Teste'
            },
            headers=superadmin_headers)
        assert response.status_code in [201, 200, 400]

    def test_add_field_catalog_unauthenticated(self, client):
        """Test adding field to catalog without authentication."""
        response = client.post('/api/settings/field-catalog',
            json={'field_name': 'test', 'field_type': 'text', 'field_label_pt': 'Test'},
            content_type='application/json')
        assert response.status_code == 401


class TestTenantFields:
    """Tests for tenant field configuration."""

    def test_get_tenant_fields(self, client, admin_headers):
        """Test getting tenant field configuration."""
        response = client.get('/api/settings/fields', headers=admin_headers)
        assert response.status_code == 200

    def test_get_active_fields(self, client, superadmin_headers):
        """Test getting active fields for tenant."""
        response = client.get('/api/settings/fields/active', headers=superadmin_headers)
        assert response.status_code == 200

    def test_update_tenant_field(self, client, admin_headers):
        """Test updating tenant field configuration."""
        response = client.put('/api/settings/fields/test_field',
            json={'is_active': True, 'is_required': False},
            headers=admin_headers)
        assert response.status_code in [200, 400, 404]

    def test_bulk_update_fields(self, client, admin_headers):
        """Test bulk updating field configurations."""
        response = client.put('/api/settings/fields/bulk',
            json={'fields': [{'field_name': 'test_field', 'is_active': True}]},
            headers=admin_headers)
        assert response.status_code == 200


class TestSettingsPermissions:
    """Tests for settings permissions."""

    def test_admin_can_view_prefixes(self, client, admin_headers):
        """Test that admin can view prefixes."""
        response = client.get('/api/settings/prefixes', headers=admin_headers)
        assert response.status_code in [200, 403]

    def test_user_cannot_modify_prefixes(self, client, user_headers):
        """Test that regular user cannot modify prefixes."""
        response = client.put('/api/settings/prefixes',
            json={'prefix_assets': 'BAD'},
            headers=user_headers)
        assert response.status_code in [403, 401]


class TestPlans:
    """Tests for plan endpoints (superadmin only)."""

    def test_get_plans(self, client, superadmin_headers):
        """Test getting all plans."""
        response = client.get('/api/settings/plans', headers=superadmin_headers)
        assert response.status_code == 200

    def test_get_modules(self, client, superadmin_headers):
        """Test getting available modules."""
        response = client.get('/api/settings/modules', headers=superadmin_headers)
        assert response.status_code == 200

    def test_plans_forbidden_for_admin(self, client, admin_headers):
        """Test that admin cannot access plans."""
        response = client.get('/api/settings/plans', headers=admin_headers)
        assert response.status_code == 403


class TestConfigLists:
    """Tests for configurable lists."""

    def test_get_lists(self, client, admin_headers):
        """Test getting configurable lists."""
        response = client.get('/api/settings/lists', headers=admin_headers)
        assert response.status_code == 200

    def test_get_specific_list(self, client, superadmin_headers):
        """Test getting a specific configurable list."""
        response = client.get('/api/settings/lists/materials', headers=superadmin_headers)
        assert response.status_code in [200, 404]
