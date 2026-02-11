"""
Integration tests for the Flask API endpoints.
Tests authentication, authorization, asset management, and key security features.
"""

import os
import sys
import json
import tempfile
import shutil
import pytest

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope='module')
def test_app():
    """Create a test application with temporary databases."""
    # Create temp directory for test databases
    tmpdir = tempfile.mkdtemp()

    # Set environment before importing app
    os.environ['SECRET_KEY'] = 'test-secret-key-for-testing'
    os.environ['FLASK_DEBUG'] = '0'

    # Patch paths before import
    from utils.database import init_paths
    init_paths(tmpdir)

    # Create directory structure
    os.makedirs(os.path.join(tmpdir, 'tenants', 'smartlamppost'), exist_ok=True)
    os.makedirs(os.path.join(tmpdir, 'shared'), exist_ok=True)
    os.makedirs(os.path.join(tmpdir, 'config'), exist_ok=True)
    os.makedirs(os.path.join(tmpdir, 'backups'), exist_ok=True)
    os.makedirs(os.path.join(tmpdir, 'uploads', 'interventions'), exist_ok=True)

    # Write tenant config
    config = {
        'tenants': [{
            'id': 'smartlamppost',
            'name': 'SmartLamppost',
            'short_name': 'SLP',
            'is_master': True,
            'active': True,
            'created_at': '2024-01-01T00:00:00'
        }]
    }
    with open(os.path.join(tmpdir, 'config', 'tenants.json'), 'w') as f:
        json.dump(config, f)

    from app import app
    app.config['TESTING'] = True

    # Initialize database
    with app.app_context():
        from utils.database import inicializar_bd_tenant, inicializar_catalogo, obter_bd
        from utils.security import hash_password

        inicializar_bd_tenant('smartlamppost')
        inicializar_catalogo()

        # Create test admin user with werkzeug hash
        bd = obter_bd('smartlamppost')
        existing = bd.execute('SELECT id FROM users WHERE email = ?', ('admin@test.com',)).fetchone()
        if not existing:
            bd.execute('''
                INSERT INTO users
                (email, password_hash, role, first_name, active, must_change_password)
                VALUES (?, ?, 'superadmin', 'Test Admin', 1, 0)
            ''', ('admin@test.com', hash_password('testpass123')))
        else:
            bd.execute('UPDATE users SET password_hash = ? WHERE email = ?',
                       (hash_password('testpass123'), 'admin@test.com'))
        bd.commit()

    yield app

    # Cleanup
    shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.fixture
def client(test_app):
    """Get a test client."""
    return test_app.test_client()


@pytest.fixture
def auth_headers(client):
    """Login and return authorization headers."""
    response = client.post('/api/auth/login', json={
        'email': 'admin@test.com',
        'password': 'testpass123'
    })
    data = response.get_json()
    assert 'token' in data, f"Login failed: {data}"
    return {'Authorization': f'Bearer {data["token"]}'}


class TestHealthCheck:
    def test_health_endpoint(self, client):
        response = client.get('/api/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['version'] == '4.0.0'


class TestAuthentication:
    def test_login_success(self, client):
        response = client.post('/api/auth/login', json={
            'email': 'admin@test.com',
            'password': 'testpass123'
        })
        assert response.status_code == 200
        data = response.get_json()
        assert 'token' in data
        assert data['user']['email'] == 'admin@test.com'
        assert data['user']['role'] == 'superadmin'

    def test_login_wrong_password(self, client):
        response = client.post('/api/auth/login', json={
            'email': 'admin@test.com',
            'password': 'wrongpassword'
        })
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post('/api/auth/login', json={
            'email': 'nobody@test.com',
            'password': 'whatever'
        })
        assert response.status_code == 401

    def test_login_empty_credentials(self, client):
        response = client.post('/api/auth/login', json={
            'email': '',
            'password': ''
        })
        assert response.status_code == 400

    def test_protected_endpoint_without_token(self, client):
        response = client.get('/api/users')
        assert response.status_code == 401

    def test_protected_endpoint_with_invalid_token(self, client):
        response = client.get('/api/users', headers={
            'Authorization': 'Bearer invalid-token-12345'
        })
        assert response.status_code == 401

    def test_auth_me_endpoint(self, client, auth_headers):
        response = client.get('/api/auth/me', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['email'] == 'admin@test.com'
        assert data['role'] == 'superadmin'

    def test_logout(self, client, auth_headers):
        response = client.post('/api/auth/logout', headers=auth_headers)
        assert response.status_code == 200

    def test_change_password(self, client):
        # Login first
        login_resp = client.post('/api/auth/login', json={
            'email': 'admin@test.com',
            'password': 'testpass123'
        })
        token = login_resp.get_json()['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Change password
        response = client.post('/api/auth/change-password', headers=headers, json={
            'current_password': 'testpass123',
            'new_password': 'newpassword123'
        })
        assert response.status_code == 200

        # Login with new password
        login_resp2 = client.post('/api/auth/login', json={
            'email': 'admin@test.com',
            'password': 'newpassword123'
        })
        assert login_resp2.status_code == 200

        # Change back for other tests
        token2 = login_resp2.get_json()['token']
        client.post('/api/auth/change-password',
                     headers={'Authorization': f'Bearer {token2}'},
                     json={'current_password': 'newpassword123', 'new_password': 'testpass123'})

    def test_change_password_wrong_current(self, client, auth_headers):
        response = client.post('/api/auth/change-password', headers=auth_headers, json={
            'current_password': 'wrong',
            'new_password': 'newpass123'
        })
        assert response.status_code == 401

    def test_change_password_too_short(self, client, auth_headers):
        response = client.post('/api/auth/change-password', headers=auth_headers, json={
            'current_password': 'testpass123',
            'new_password': 'short'
        })
        assert response.status_code == 400


class TestSchemaEndpoints:
    def test_get_schema(self, client, auth_headers):
        response = client.get('/api/schema', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_add_schema_field(self, client, auth_headers):
        import uuid
        field_name = f'test_field_{uuid.uuid4().hex[:8]}'
        response = client.post('/api/schema', headers=auth_headers, json={
            'field_name': field_name,
            'field_type': 'text',
            'field_label': 'Test Field',
            'required': 0,
            'field_category': 'custom'
        })
        assert response.status_code == 201


class TestAssetEndpoints:
    def test_list_assets_empty(self, client, auth_headers):
        response = client.get('/api/assets', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'assets' in data
        assert 'total' in data

    def test_create_asset(self, client, auth_headers):
        import uuid
        sn = f'TEST-SN-{uuid.uuid4().hex[:6]}'
        response = client.post('/api/assets', headers=auth_headers, json={
            'serial_number': sn,
            'data': {
                'rfid_tag': 'RFID001',
                'product_reference': 'REF001',
                'manufacturer': 'TestMfg',
                'model': 'Model1',
                'condition_status': 'Operacional'
            }
        })
        assert response.status_code == 201

    def test_get_asset(self, client, auth_headers):
        # Create first
        client.post('/api/assets', headers=auth_headers, json={
            'serial_number': 'TEST-SN-002',
            'data': {
                'rfid_tag': 'RFID002',
                'product_reference': 'REF002',
                'manufacturer': 'TestMfg',
                'model': 'Model2'
            }
        })

        response = client.get('/api/assets/TEST-SN-002', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert data['serial_number'] == 'TEST-SN-002'

    def test_update_asset(self, client, auth_headers):
        response = client.put('/api/assets/TEST-SN-002', headers=auth_headers, json={
            'data': {'notes': 'Updated via test'}
        })
        assert response.status_code == 200

    def test_get_nonexistent_asset(self, client, auth_headers):
        response = client.get('/api/assets/NONEXISTENT', headers=auth_headers)
        assert response.status_code == 404

    def test_create_duplicate_asset(self, client, auth_headers):
        client.post('/api/assets', headers=auth_headers, json={
            'serial_number': 'TEST-SN-DUP',
            'data': {'rfid_tag': 'X', 'product_reference': 'Y', 'manufacturer': 'Z', 'model': 'W'}
        })
        response = client.post('/api/assets', headers=auth_headers, json={
            'serial_number': 'TEST-SN-DUP',
            'data': {'rfid_tag': 'X', 'product_reference': 'Y', 'manufacturer': 'Z', 'model': 'W'}
        })
        assert response.status_code == 400


class TestUserManagement:
    def test_list_users(self, client, auth_headers):
        response = client.get('/api/users', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_create_user(self, client, auth_headers):
        import uuid
        response = client.post('/api/users', headers=auth_headers, json={
            'email': f'newuser-{uuid.uuid4().hex[:6]}@test.com',
            'password': 'password123',
            'first_name': 'New',
            'last_name': 'User',
            'role': 'user'
        })
        assert response.status_code == 201

    def test_create_user_duplicate_email(self, client, auth_headers):
        client.post('/api/users', headers=auth_headers, json={
            'email': 'dupuser@test.com',
            'password': 'password123',
            'first_name': 'Dup',
            'last_name': 'User',
            'role': 'user'
        })
        response = client.post('/api/users', headers=auth_headers, json={
            'email': 'dupuser@test.com',
            'password': 'password123',
            'first_name': 'Dup2',
            'last_name': 'User2',
            'role': 'user'
        })
        assert response.status_code == 400


class TestBackupSecurity:
    """Tests for path traversal prevention in backup endpoints."""

    def test_backup_download_invalid_prefix(self, client, auth_headers):
        response = client.get('/api/backup/download/evil_file.zip', headers=auth_headers)
        assert response.status_code == 400

    def test_backup_download_invalid_suffix(self, client, auth_headers):
        response = client.get('/api/backup/download/backup_test.txt', headers=auth_headers)
        assert response.status_code == 400

    def test_backup_download_path_traversal(self, client, auth_headers):
        response = client.get(
            '/api/backup/download/backup_..%2F..%2Fetc%2Fpasswd.zip',
            headers=auth_headers
        )
        # Should be either 400 or 404, not 200
        assert response.status_code in [400, 404]

    def test_backup_delete_invalid_name(self, client, auth_headers):
        response = client.delete('/api/backup/delete/evil.txt', headers=auth_headers)
        assert response.status_code == 400


class TestExternalTechnicians:
    def test_list_technicians(self, client, auth_headers):
        response = client.get('/api/external-technicians', headers=auth_headers)
        assert response.status_code == 200

    def test_create_technician(self, client, auth_headers):
        response = client.post('/api/external-technicians', headers=auth_headers, json={
            'name': 'Test Technician',
            'company': 'Test Company',
            'phone': '912345678',
            'email': 'tech@test.com'
        })
        assert response.status_code == 201

    def test_create_technician_missing_fields(self, client, auth_headers):
        response = client.post('/api/external-technicians', headers=auth_headers, json={
            'name': 'Only Name'
        })
        assert response.status_code == 400


class TestPermissionSections:
    def test_list_permission_sections(self, client, auth_headers):
        response = client.get('/api/permission-sections', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        section_ids = [s['id'] for s in data]
        assert 'dashboard' in section_ids
        assert 'assets' in section_ids
