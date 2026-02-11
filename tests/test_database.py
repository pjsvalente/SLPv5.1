"""
Tests for database utilities - schema initialization, tenant management, config.
"""

import os
import json
import tempfile
import sqlite3
import pytest

from utils.database import (
    init_paths, inicializar_bd_tenant, inicializar_catalogo,
    carregar_tenants, guardar_tenants, obter_tenant, tenant_existe,
    registar_auditoria, _safe_add_columns
)


@pytest.fixture
def temp_project_dir():
    """Create a temporary project directory structure."""
    with tempfile.TemporaryDirectory() as tmpdir:
        init_paths(tmpdir)
        # Create required subdirectories
        os.makedirs(os.path.join(tmpdir, 'tenants', 'test_tenant'), exist_ok=True)
        os.makedirs(os.path.join(tmpdir, 'shared'), exist_ok=True)
        os.makedirs(os.path.join(tmpdir, 'config'), exist_ok=True)
        yield tmpdir


@pytest.fixture
def tenant_config(temp_project_dir):
    """Create a tenant configuration file."""
    config = {
        'tenants': [
            {
                'id': 'test_tenant',
                'name': 'Test Tenant',
                'short_name': 'TST',
                'is_master': True,
                'active': True,
                'created_at': '2024-01-01T00:00:00'
            }
        ]
    }
    config_path = os.path.join(temp_project_dir, 'config', 'tenants.json')
    with open(config_path, 'w') as f:
        json.dump(config, f)
    return config


class TestTenantManagement:
    """Tests for tenant configuration CRUD."""

    def test_carregar_tenants_empty(self, temp_project_dir):
        data = carregar_tenants()
        # No file exists yet
        assert 'tenants' in data

    def test_guardar_and_carregar_tenants(self, temp_project_dir):
        config = {
            'tenants': [{'id': 'abc', 'name': 'ABC Corp', 'active': True}]
        }
        guardar_tenants(config)
        loaded = carregar_tenants()
        assert loaded['tenants'][0]['id'] == 'abc'

    def test_obter_tenant_found(self, temp_project_dir, tenant_config):
        tenant = obter_tenant('test_tenant')
        assert tenant is not None
        assert tenant['name'] == 'Test Tenant'

    def test_obter_tenant_not_found(self, temp_project_dir, tenant_config):
        tenant = obter_tenant('nonexistent')
        assert tenant is None

    def test_tenant_existe(self, temp_project_dir, tenant_config):
        assert tenant_existe('test_tenant') is True
        assert tenant_existe('nonexistent') is False


class TestSchemaInitialization:
    """Tests for database schema creation."""

    def test_tenant_db_creates_all_tables(self, temp_project_dir):
        """Verify all required tables are created."""
        db_path = os.path.join(temp_project_dir, 'tenants', 'test_tenant', 'database.db')
        bd = sqlite3.connect(db_path)
        bd.row_factory = sqlite3.Row

        # Simulate Flask g object
        import flask
        app = flask.Flask(__name__)
        with app.app_context():
            from flask import g
            g.tenant_id = 'test_tenant'
            setattr(g, '_database_test_tenant', bd)
            inicializar_bd_tenant('test_tenant')

        # Check tables
        cursor = bd.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = {row[0] for row in cursor.fetchall()}

        required_tables = {
            'users', 'sessions', 'two_factor_codes', 'password_reset_tokens',
            'user_permissions', 'schema_fields', 'assets', 'asset_data',
            'maintenance_log', 'audit_log', 'system_config', 'sequence_counters',
            'external_technicians', 'interventions', 'intervention_technicians',
            'intervention_files', 'intervention_edit_log', 'intervention_time_logs',
            'status_change_log', 'intervention_updates'
        }

        missing = required_tables - tables
        assert not missing, f"Missing tables: {missing}"
        bd.close()

    def test_default_schema_fields_created(self, temp_project_dir):
        db_path = os.path.join(temp_project_dir, 'tenants', 'test_tenant', 'database.db')
        bd = sqlite3.connect(db_path)
        bd.row_factory = sqlite3.Row

        import flask
        app = flask.Flask(__name__)
        with app.app_context():
            from flask import g
            g.tenant_id = 'test_tenant'
            setattr(g, '_database_test_tenant', bd)
            inicializar_bd_tenant('test_tenant')

        count = bd.execute('SELECT COUNT(*) FROM schema_fields').fetchone()[0]
        assert count > 0, "Default schema fields should be created"
        bd.close()

    def test_default_counters_created(self, temp_project_dir):
        db_path = os.path.join(temp_project_dir, 'tenants', 'test_tenant', 'database.db')
        bd = sqlite3.connect(db_path)
        bd.row_factory = sqlite3.Row

        import flask
        app = flask.Flask(__name__)
        with app.app_context():
            from flask import g
            g.tenant_id = 'test_tenant'
            setattr(g, '_database_test_tenant', bd)
            inicializar_bd_tenant('test_tenant')

        counters = bd.execute('SELECT counter_type FROM sequence_counters').fetchall()
        counter_types = {c[0] for c in counters}
        assert 'assets' in counter_types
        assert 'int_preventiva' in counter_types
        bd.close()

    def test_catalog_creates_all_tables(self, temp_project_dir):
        catalog_path = os.path.join(temp_project_dir, 'shared', 'catalog.db')
        bd = sqlite3.connect(catalog_path)
        bd.row_factory = sqlite3.Row

        import flask
        app = flask.Flask(__name__)
        with app.app_context():
            from flask import g
            g._database_catalog = bd
            inicializar_catalogo()

        cursor = bd.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = {row[0] for row in cursor.fetchall()}

        required = {
            'catalog_columns', 'catalog_luminaires', 'catalog_electrical_panels',
            'catalog_fuse_boxes', 'catalog_telemetry_panels', 'catalog_module_ev',
            'catalog_module_mupi', 'catalog_module_lateral', 'catalog_module_antenna'
        }

        missing = required - tables
        assert not missing, f"Missing catalog tables: {missing}"
        bd.close()


class TestSafeAddColumns:
    """Tests for safe column migration."""

    def test_add_new_column(self):
        bd = sqlite3.connect(':memory:')
        bd.execute('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)')
        _safe_add_columns(bd, 'test', [('email', 'TEXT')])
        bd.execute("INSERT INTO test (id, name, email) VALUES (1, 'a', 'b')")
        row = bd.execute('SELECT email FROM test WHERE id=1').fetchone()
        assert row[0] == 'b'
        bd.close()

    def test_add_existing_column_no_error(self):
        bd = sqlite3.connect(':memory:')
        bd.execute('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)')
        # Should not raise
        _safe_add_columns(bd, 'test', [('name', 'TEXT')])
        bd.close()


class TestAuditLog:
    """Tests for audit logging."""

    def test_registar_auditoria(self):
        bd = sqlite3.connect(':memory:')
        bd.execute('''CREATE TABLE audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER, action TEXT, table_name TEXT,
            record_id INTEGER, old_values TEXT, new_values TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')

        registar_auditoria(bd, 1, 'CREATE', 'assets', 42,
                           None, {'serial_number': 'SN001'})
        bd.commit()

        row = bd.execute('SELECT * FROM audit_log WHERE id=1').fetchone()
        assert row is not None
        assert row[2] == 'CREATE'
        assert row[3] == 'assets'
        assert row[4] == 42
        bd.close()
