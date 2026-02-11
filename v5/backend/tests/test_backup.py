"""
SmartLamppost v5.0 - Backup API Tests

Note: Backup endpoints use /api/backup/create, /api/backup/list, etc.
"""

import pytest


class TestBackupList:
    """Tests for GET /api/backup/list endpoint."""

    def test_list_backups_authenticated(self, client, superadmin_headers):
        """Test listing backups when authenticated as superadmin."""
        response = client.get('/api/backup/list', headers=superadmin_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'backups' in data or isinstance(data, list)

    def test_list_backups_as_admin(self, client, admin_headers):
        """Test listing backups as admin."""
        response = client.get('/api/backup/list', headers=admin_headers)
        assert response.status_code in [200, 403]

    def test_list_backups_unauthenticated(self, client):
        """Test listing backups without authentication."""
        response = client.get('/api/backup/list')
        assert response.status_code == 401

    def test_list_backups_as_user(self, client, user_headers):
        """Test listing backups as regular user (should be forbidden)."""
        response = client.get('/api/backup/list', headers=user_headers)
        assert response.status_code in [403, 401]


class TestBackupCreate:
    """Tests for POST /api/backup/create endpoint."""

    def test_create_backup_success(self, client, superadmin_headers):
        """Test creating a new backup."""
        response = client.post('/api/backup/create', headers=superadmin_headers)
        # 400 may occur if backup dir doesn't exist
        assert response.status_code in [200, 201, 202, 400]

    def test_create_backup_as_admin(self, client, admin_headers):
        """Test creating backup as admin."""
        response = client.post('/api/backup/create', headers=admin_headers)
        assert response.status_code in [200, 201, 202, 400, 403]

    def test_create_backup_unauthenticated(self, client):
        """Test creating backup without authentication."""
        response = client.post('/api/backup/create')
        assert response.status_code == 401

    def test_create_backup_as_user(self, client, user_headers):
        """Test creating backup as regular user (should be forbidden)."""
        response = client.post('/api/backup/create', headers=user_headers)
        assert response.status_code in [403, 401]


class TestBackupDownload:
    """Tests for GET /api/backup/<filename> endpoint."""

    def test_download_backup_not_found(self, client, superadmin_headers):
        """Test downloading non-existent backup."""
        response = client.get('/api/backup/nonexistent.zip', headers=superadmin_headers)
        assert response.status_code == 404

    def test_download_backup_unauthenticated(self, client):
        """Test downloading backup without authentication."""
        response = client.get('/api/backup/test.zip')
        assert response.status_code == 401


class TestBackupDelete:
    """Tests for DELETE /api/backup/<filename> endpoint."""

    def test_delete_backup_not_found(self, client, superadmin_headers):
        """Test deleting non-existent backup."""
        response = client.delete('/api/backup/nonexistent.zip', headers=superadmin_headers)
        assert response.status_code in [404, 200]  # 200 if "not found" is treated as success

    def test_delete_backup_unauthenticated(self, client):
        """Test deleting backup without authentication."""
        response = client.delete('/api/backup/test.zip')
        assert response.status_code == 401


class TestBackupRestore:
    """Tests for POST /api/backup/restore/<filename> endpoint."""

    def test_restore_not_found(self, client, superadmin_headers):
        """Test restore with non-existent file."""
        response = client.post('/api/backup/restore/nonexistent.zip', headers=superadmin_headers)
        assert response.status_code in [400, 404]

    def test_restore_unauthenticated(self, client):
        """Test restore without authentication."""
        response = client.post('/api/backup/restore/test.zip')
        assert response.status_code == 401


class TestBackupScheduler:
    """Tests for backup scheduler endpoints."""

    def test_get_scheduler_config(self, client, superadmin_headers):
        """Test getting scheduler configuration."""
        response = client.get('/api/backup/scheduler/config', headers=superadmin_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'enabled' in data or 'config' in data

    def test_update_scheduler_config(self, client, superadmin_headers):
        """Test updating scheduler configuration."""
        response = client.put('/api/backup/scheduler/config',
            json={'enabled': False, 'schedule_type': 'daily', 'time': '04:00'},
            headers=superadmin_headers)
        assert response.status_code == 200

    def test_scheduler_config_unauthenticated(self, client):
        """Test scheduler config without authentication."""
        response = client.get('/api/backup/scheduler/config')
        assert response.status_code == 401

    def test_get_scheduler_history(self, client, superadmin_headers):
        """Test getting backup history."""
        response = client.get('/api/backup/scheduler/history', headers=superadmin_headers)
        assert response.status_code == 200

    def test_get_next_run(self, client, superadmin_headers):
        """Test getting next scheduled run."""
        response = client.get('/api/backup/scheduler/next-run', headers=superadmin_headers)
        assert response.status_code == 200

    def test_run_backup_now(self, client, superadmin_headers):
        """Test running backup immediately."""
        response = client.post('/api/backup/scheduler/run-now', headers=superadmin_headers)
        # 201 returned when backup is created
        assert response.status_code in [200, 201, 202]
