"""
SmartLamppost v5.0 - Pytest Configuration and Fixtures
"""

import os
import sys
import json
import shutil
import tempfile
import pytest

# Add project root to path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)


@pytest.fixture(scope='session')
def app():
    """Create application for testing with proper configuration."""
    # Create temp directory for test data
    test_data_dir = tempfile.mkdtemp(prefix='smartlamppost_test_')

    # Copy modules.json to test config directory (under /data/config/)
    src_config = os.path.join(backend_dir, 'config', 'modules.json')
    test_data_config_dir = os.path.join(test_data_dir, 'data', 'config')
    os.makedirs(test_data_config_dir, exist_ok=True)

    if os.path.exists(src_config):
        shutil.copy(src_config, test_data_config_dir)

    # Also create top-level config for module discovery
    test_config_dir = os.path.join(test_data_dir, 'config')
    os.makedirs(test_config_dir, exist_ok=True)
    if os.path.exists(src_config):
        shutil.copy(src_config, test_config_dir)

    # Create tenants directory structure (under /data/tenants/)
    # Use 'smartlamppost' as it's the MASTER_TENANT_ID required for superadmin operations
    test_tenant_dir = os.path.join(test_data_dir, 'data', 'tenants', 'smartlamppost')
    os.makedirs(test_tenant_dir, exist_ok=True)
    os.makedirs(os.path.join(test_tenant_dir, 'uploads'), exist_ok=True)
    os.makedirs(os.path.join(test_tenant_dir, 'backups'), exist_ok=True)

    # Create shared directory (under /data/shared/)
    os.makedirs(os.path.join(test_data_dir, 'data', 'shared'), exist_ok=True)

    # Create plans.json
    plans_config = {
        "plans": {
            "base": {
                "id": "base",
                "name": "Base",
                "modules": ["dashboard", "assets", "users", "settings"]
            },
            "pro": {
                "id": "pro",
                "name": "Pro",
                "modules": ["dashboard", "assets", "users", "settings", "interventions", "catalog", "technicians", "reports"]
            },
            "premium": {
                "id": "premium",
                "name": "Premium",
                "modules": ["*"]
            }
        }
    }
    with open(os.path.join(test_data_config_dir, 'plans.json'), 'w') as f:
        json.dump(plans_config, f)
    with open(os.path.join(test_config_dir, 'plans.json'), 'w') as f:
        json.dump(plans_config, f)

    # Create test tenant config - use 'smartlamppost' as MASTER_TENANT_ID
    tenants_config = {
        "tenants": [{
            "id": "smartlamppost",
            "name": "SmartLamppost",
            "short_name": "SLP",
            "is_master": True,
            "active": True,
            "plan": "premium",
            "created_at": "2024-01-01T00:00:00"
        }]
    }
    with open(os.path.join(test_data_config_dir, 'tenants.json'), 'w') as f:
        json.dump(tenants_config, f)
    with open(os.path.join(test_config_dir, 'tenants.json'), 'w') as f:
        json.dump(tenants_config, f)

    # Set environment variables
    os.environ['SECRET_KEY'] = 'test-secret-key-for-testing-only'
    os.environ['FLASK_DEBUG'] = '0'

    # Create test config class
    class TestConfig:
        TESTING = True
        DEBUG = True
        BASE_PATH = test_data_dir
        MASTER_TENANT_ID = 'smartlamppost'
        SECRET_KEY = 'test-secret-key-for-testing-only'

    # Initialize database paths
    from app.shared.database import db_init_paths
    db_init_paths(test_data_dir)

    # Create the app
    from app import create_app
    flask_app = create_app(TestConfig)

    # Initialize test tenant database
    with flask_app.app_context():
        from flask import g
        from app.shared.database import inicializar_bd_tenant, obter_bd
        from app.shared.security import hash_password

        # Set tenant_id in g context - use smartlamppost as MASTER_TENANT_ID
        g.tenant_id = 'smartlamppost'

        inicializar_bd_tenant('smartlamppost')

        # Create test users
        bd = obter_bd('smartlamppost')

        # Superadmin user
        bd.execute('''
            INSERT OR REPLACE INTO users
            (email, password_hash, role, first_name, last_name, active, must_change_password)
            VALUES (?, ?, 'superadmin', 'Super', 'Admin', 1, 0)
        ''', ('superadmin@test.com', hash_password('superadmin123')))

        # Admin user
        bd.execute('''
            INSERT OR REPLACE INTO users
            (email, password_hash, role, first_name, last_name, active, must_change_password)
            VALUES (?, ?, 'admin', 'Admin', 'User', 1, 0)
        ''', ('admin@test.com', hash_password('admin123')))

        # Regular user
        bd.execute('''
            INSERT OR REPLACE INTO users
            (email, password_hash, role, first_name, last_name, active, must_change_password)
            VALUES (?, ?, 'user', 'Regular', 'User', 1, 0)
        ''', ('user@test.com', hash_password('user123')))

        bd.commit()

    yield flask_app

    # Cleanup
    shutil.rmtree(test_data_dir, ignore_errors=True)


@pytest.fixture(scope='function')
def client(app):
    """Get a test client."""
    return app.test_client()


@pytest.fixture(scope='function')
def superadmin_headers(client):
    """Get authentication headers for superadmin."""
    response = client.post('/api/auth/login',
        json={'email': 'superadmin@test.com', 'password': 'superadmin123'},
        content_type='application/json')
    data = response.get_json()
    if data and 'token' in data:
        return {'Authorization': f'Bearer {data["token"]}', 'Content-Type': 'application/json'}
    return {'Content-Type': 'application/json'}


@pytest.fixture(scope='function')
def admin_headers(client):
    """Get authentication headers for admin."""
    response = client.post('/api/auth/login',
        json={'email': 'admin@test.com', 'password': 'admin123'},
        content_type='application/json')
    data = response.get_json()
    if data and 'token' in data:
        return {'Authorization': f'Bearer {data["token"]}', 'Content-Type': 'application/json'}
    return {'Content-Type': 'application/json'}


@pytest.fixture(scope='function')
def user_headers(client):
    """Get authentication headers for regular user."""
    response = client.post('/api/auth/login',
        json={'email': 'user@test.com', 'password': 'user123'},
        content_type='application/json')
    data = response.get_json()
    if data and 'token' in data:
        return {'Authorization': f'Bearer {data["token"]}', 'Content-Type': 'application/json'}
    return {'Content-Type': 'application/json'}


@pytest.fixture(scope='function')
def sample_asset_data():
    """Sample asset data for testing."""
    return {
        'rfid_tag': 'TEST-RFID-001',
        'product_reference': 'REF-001',
        'manufacturer': 'Test Manufacturer',
        'model': 'Test Model',
        'condition_status': 'Operacional',
        'installation_location': 'Test Location',
        'gps_latitude': 38.7223,
        'gps_longitude': -9.1393
    }


@pytest.fixture(scope='function')
def sample_intervention_data():
    """Sample intervention data for testing."""
    return {
        'intervention_type': 'Manutenção Preventiva',
        'description': 'Test intervention description',
        'priority': 'média',
        'scheduled_date': '2025-02-15'
    }


@pytest.fixture(scope='function')
def sample_technician_data():
    """Sample technician data for testing."""
    return {
        'name': 'Test Technician',
        'company': 'Test Company',
        'specialty': 'Electricista',
        'phone': '+351912345678',
        'email': 'tech@test.com'
    }
