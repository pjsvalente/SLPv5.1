"""
SmartLamppost v5.0 - Database management utilities
Handles multi-tenant database connections, initialization, and migrations.
Supports both SQLite (local development) and PostgreSQL (Railway production).
"""

import os
import json
import sqlite3
import logging
from urllib.parse import urlparse

from flask import g

logger = logging.getLogger(__name__)

# Database mode detection
DATABASE_URL = os.environ.get('DATABASE_URL')
USE_POSTGRES = DATABASE_URL is not None and DATABASE_URL.startswith('postgres')

# PostgreSQL connection pool (only if using Postgres)
_pg_pool = None

RealDictCursor = None

if USE_POSTGRES:
    try:
        import psycopg2
        from psycopg2 import pool
        from psycopg2.extras import RealDictCursor as _RealDictCursor
        RealDictCursor = _RealDictCursor
        logger.info("PostgreSQL mode enabled")
    except ImportError:
        logger.warning("psycopg2 not installed, falling back to SQLite")
        USE_POSTGRES = False

# These will be set by the app during initialization
PASTA_BASE = None
PASTA_TENANTS = None
PASTA_SHARED = None
PASTA_CONFIG = None
CATALOGO_PARTILHADO = None
FICHEIRO_TENANTS = None
MASTER_TENANT_ID = 'smartlamppost'

# Current schema version for migration tracking
SCHEMA_VERSION = 5


# =========================================================================
# DATABASE ADAPTER - Unified interface for SQLite/PostgreSQL
# =========================================================================

class DatabaseAdapter:
    """Adapter to provide consistent interface for SQLite and PostgreSQL."""

    def __init__(self, connection, is_postgres=False):
        self.conn = connection
        self.is_postgres = is_postgres
        self._cursor = None

    def execute(self, query, params=None):
        """Execute query with automatic parameter placeholder conversion."""
        if self.is_postgres:
            # Convert ? to %s for PostgreSQL
            query = query.replace('?', '%s')
            # Handle AUTOINCREMENT -> SERIAL
            query = query.replace('AUTOINCREMENT', '')
            query = query.replace('INTEGER PRIMARY KEY', 'SERIAL PRIMARY KEY')
            # Handle INSERT OR REPLACE -> INSERT ON CONFLICT DO UPDATE
            if 'INSERT OR REPLACE' in query:
                # Special handling for known tables
                if 'asset_data' in query:
                    query = query.replace('INSERT OR REPLACE', 'INSERT')
                    query = query.rstrip().rstrip(';')
                    query += ' ON CONFLICT (asset_id, field_name) DO UPDATE SET field_value = EXCLUDED.field_value'
                elif 'notification_settings' in query:
                    query = query.replace('INSERT OR REPLACE', 'INSERT')
                    query = query.rstrip().rstrip(';')
                    query += ' ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = EXCLUDED.updated_at'
                elif 'system_config' in query:
                    query = query.replace('INSERT OR REPLACE', 'INSERT')
                    query = query.rstrip().rstrip(';')
                    query += ' ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value'
                else:
                    # Generic fallback - just replace without ON CONFLICT
                    query = query.replace('INSERT OR REPLACE', 'INSERT')
            # Handle INSERT OR IGNORE -> INSERT ON CONFLICT DO NOTHING
            if 'INSERT OR IGNORE' in query:
                query = query.replace('INSERT OR IGNORE', 'INSERT')
                if 'ON CONFLICT' not in query:
                    query = query.rstrip().rstrip(';') + ' ON CONFLICT DO NOTHING'

            # Handle SQLite strftime -> PostgreSQL TO_CHAR
            import re
            # strftime('%Y-%m', col) -> TO_CHAR(col, 'YYYY-MM')
            query = re.sub(r"strftime\s*\(\s*'%Y-%m'\s*,\s*(\w+)\s*\)", r"TO_CHAR(\1::timestamp, 'YYYY-MM')", query)
            # strftime('%Y-%m', col) for expressions like i.created_at
            query = re.sub(r"strftime\s*\(\s*'%Y-%m'\s*,\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\)", r"TO_CHAR(\1::timestamp, 'YYYY-MM')", query)
            # strftime('%m', col) -> TO_CHAR(col, 'MM')
            query = re.sub(r"strftime\s*\(\s*'%m'\s*,\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\)", r"TO_CHAR(\1::timestamp, 'MM')", query)
            # strftime('%w', col) -> EXTRACT(DOW FROM col)
            query = re.sub(r"strftime\s*\(\s*'%w'\s*,\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\)", r"EXTRACT(DOW FROM \1::timestamp)::text", query)

            # Handle SQLite date functions -> PostgreSQL
            # DATE('now') -> CURRENT_DATE
            query = query.replace("DATE('now')", "CURRENT_DATE")
            # DATE('now', '-X days') -> CURRENT_DATE - INTERVAL 'X days'
            query = re.sub(r"DATE\s*\(\s*'now'\s*,\s*'(-?\d+)\s+days?'\s*\)", r"CURRENT_DATE + INTERVAL '\1 days'", query)
            query = re.sub(r"DATE\s*\(\s*'now'\s*,\s*'\+(\d+)\s+days?'\s*\)", r"CURRENT_DATE + INTERVAL '\1 days'", query)
            # date('now', '-X months')
            query = re.sub(r"date\s*\(\s*'now'\s*,\s*'(-?\d+)\s+months?'\s*\)", r"CURRENT_DATE + INTERVAL '\1 months'", query, flags=re.IGNORECASE)
            query = re.sub(r"DATE\s*\(\s*'now'\s*,\s*'(-?\d+)\s+years?'\s*\)", r"CURRENT_DATE + INTERVAL '\1 years'", query)

            # julianday('now') - julianday(col) -> EXTRACT(EPOCH FROM NOW() - col) / 86400
            query = re.sub(r"julianday\s*\(\s*'now'\s*\)\s*-\s*julianday\s*\(\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\)",
                          r"EXTRACT(EPOCH FROM NOW() - \1::timestamp) / 86400", query)
            # julianday(col2) - julianday(col1)
            query = re.sub(r"julianday\s*\(\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\)\s*-\s*julianday\s*\(\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\)",
                          r"EXTRACT(EPOCH FROM \1::timestamp - \2::timestamp) / 86400", query)

        if self.is_postgres and RealDictCursor:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        else:
            cursor = self.conn.cursor()

        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        return cursor

    def executemany(self, query, params_list):
        """Execute many with automatic conversion."""
        if self.is_postgres:
            query = query.replace('?', '%s')
        cursor = self.conn.cursor()
        cursor.executemany(query, params_list)
        return cursor

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.conn.close()

    @property
    def lastrowid(self):
        """Get last inserted row ID (PostgreSQL compatibility)."""
        if self.is_postgres:
            # For PostgreSQL, we need to use RETURNING in the INSERT statement
            # or call currval on the sequence
            return None  # Caller should use RETURNING instead
        return None


def get_count(bd, query, params=None):
    """
    Execute a COUNT query and return the integer result.
    Works with both SQLite and PostgreSQL.
    """
    result = bd.execute(query, params).fetchone() if params else bd.execute(query).fetchone()
    return extrair_valor(result, 0) or 0


def table_exists(bd, table_name):
    """
    Check if a table exists in the database.
    Works with both SQLite and PostgreSQL.
    """
    if USE_POSTGRES:
        result = bd.execute(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = ?)",
            (table_name,)
        ).fetchone()
        return extrair_valor(result, 0) or False
    else:
        result = bd.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,)
        ).fetchone()
        return result is not None


def _get_pg_connection(schema_name='public'):
    """Get a PostgreSQL connection for a specific schema (tenant)."""
    global _pg_pool

    if _pg_pool is None:
        # Parse DATABASE_URL
        result = urlparse(DATABASE_URL)
        _pg_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            host=result.hostname,
            port=result.port or 5432,
            database=result.path[1:],  # Remove leading /
            user=result.username,
            password=result.password
        )

    conn = _pg_pool.getconn()
    cursor = conn.cursor()

    # Ensure the schema exists before setting search_path
    if schema_name != 'public':
        try:
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
            conn.commit()
        except Exception as e:
            logger.warning(f"Could not create schema {schema_name}: {e}")
            conn.rollback()

    # Set search_path persistently for this connection
    try:
        cursor.execute(f"SET search_path TO {schema_name}, public")
        conn.commit()
    except Exception as e:
        logger.error(f"Error setting search_path to {schema_name}: {e}")
        conn.rollback()

    cursor.close()
    return conn


def _return_pg_connection(conn):
    """Return connection to pool."""
    if _pg_pool:
        _pg_pool.putconn(conn)


# =========================================================================
# PATH INITIALIZATION
# =========================================================================

def init_paths(base_path):
    """Initialize all database paths from the application base path (v5 root)."""
    global PASTA_BASE, PASTA_TENANTS, PASTA_SHARED, PASTA_CONFIG
    global CATALOGO_PARTILHADO, FICHEIRO_TENANTS

    PASTA_BASE = base_path
    data_path = os.path.join(base_path, 'data')
    PASTA_TENANTS = os.path.join(data_path, 'tenants')
    PASTA_SHARED = os.path.join(data_path, 'shared')
    PASTA_CONFIG = os.path.join(data_path, 'config')
    CATALOGO_PARTILHADO = os.path.join(PASTA_SHARED, 'catalog.db')
    FICHEIRO_TENANTS = os.path.join(PASTA_CONFIG, 'tenants.json')

    # Create directories if they don't exist (SQLite mode)
    if not USE_POSTGRES:
        for path in [data_path, PASTA_TENANTS, PASTA_SHARED, PASTA_CONFIG]:
            os.makedirs(path, exist_ok=True)
            logger.info(f"Ensured directory exists: {path}")

    logger.info(f"Database mode: {'PostgreSQL' if USE_POSTGRES else 'SQLite'}")


# Alias for compatibility
db_init_paths = init_paths


# =========================================================================
# CONNECTION MANAGEMENT
# =========================================================================

def obter_caminho_bd_tenant(tenant_id):
    """Get the database file path for a specific tenant (SQLite only)."""
    return os.path.join(PASTA_TENANTS, tenant_id, 'database.db')


def obter_bd(tenant_id=None):
    """Get a database connection for the current or specified tenant.

    Connections are cached per-request in Flask's g object.
    """
    if tenant_id is None:
        tenant_id = getattr(g, 'tenant_id', MASTER_TENANT_ID)

    cache_key = f'_database_{tenant_id}'
    bd = getattr(g, cache_key, None)

    if bd is None:
        if USE_POSTGRES:
            # PostgreSQL: use schema per tenant
            schema_name = f"tenant_{tenant_id.replace('-', '_')}"
            conn = _get_pg_connection(schema_name)
            if RealDictCursor:
                conn.cursor_factory = RealDictCursor
            bd = DatabaseAdapter(conn, is_postgres=True)
        else:
            # SQLite: file per tenant
            caminho_bd = obter_caminho_bd_tenant(tenant_id)
            os.makedirs(os.path.dirname(caminho_bd), exist_ok=True)
            conn = sqlite3.connect(caminho_bd)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA foreign_keys = ON")
            bd = conn  # Return raw connection for SQLite (backward compatible)

        setattr(g, cache_key, bd)

    return bd


def obter_bd_catalogo():
    """Get a connection to the shared catalog database."""
    bd = getattr(g, '_database_catalog', None)
    if bd is None:
        if USE_POSTGRES:
            conn = _get_pg_connection('catalog')
            bd = DatabaseAdapter(conn, is_postgres=True)
        else:
            bd = sqlite3.connect(CATALOGO_PARTILHADO)
            bd.row_factory = sqlite3.Row
        g._database_catalog = bd
    return bd


def obter_bd_para_tenant(tenant_id: str):
    """
    Get a standalone database connection for a tenant (outside of Flask request context).
    Used by scheduler and background tasks.
    """
    try:
        if USE_POSTGRES:
            schema_name = f"tenant_{tenant_id.replace('-', '_')}"
            conn = _get_pg_connection(schema_name)
            return DatabaseAdapter(conn, is_postgres=True)
        else:
            caminho_bd = obter_caminho_bd_tenant(tenant_id)
            if not os.path.exists(caminho_bd):
                return None
            bd = sqlite3.connect(caminho_bd)
            bd.row_factory = sqlite3.Row
            bd.execute("PRAGMA foreign_keys = ON")
            return bd
    except Exception as e:
        logger.error("Error connecting to tenant %s database: %s", tenant_id, e)
        return None


def obter_lista_tenants():
    """Get list of all tenant IDs."""
    if USE_POSTGRES:
        # Get from tenants.json or query pg_catalog
        dados = carregar_tenants()
        return [t['id'] for t in dados.get('tenants', [])]
    else:
        if not PASTA_TENANTS or not os.path.exists(PASTA_TENANTS):
            return []
        tenants = []
        for item in os.listdir(PASTA_TENANTS):
            tenant_path = os.path.join(PASTA_TENANTS, item)
            if os.path.isdir(tenant_path) and os.path.exists(os.path.join(tenant_path, 'database.db')):
                tenants.append(item)
        return tenants


def fechar_ligacoes(excecao):
    """Close all database connections at end of request."""
    bd_catalog = getattr(g, '_database_catalog', None)
    if bd_catalog is not None:
        if USE_POSTGRES and hasattr(bd_catalog, 'conn'):
            _return_pg_connection(bd_catalog.conn)
        elif hasattr(bd_catalog, 'close'):
            bd_catalog.close()

    for attr in list(vars(g).keys()):
        if attr.startswith('_database_'):
            bd = getattr(g, attr, None)
            if bd is not None:
                try:
                    if USE_POSTGRES and hasattr(bd, 'conn'):
                        _return_pg_connection(bd.conn)
                    elif hasattr(bd, 'close'):
                        bd.close()
                except Exception:
                    logger.debug("Error closing database connection for %s", attr)


def obter_config(chave, valor_padrao=None, tenant_id=None):
    """Get a system configuration value from the database."""
    bd = obter_bd(tenant_id)
    try:
        resultado = bd.execute(
            'SELECT config_value FROM system_config WHERE config_key = ?',
            (chave,)
        ).fetchone()
        if resultado:
            return resultado['config_value'] if isinstance(resultado, dict) else resultado[0]
        return valor_padrao
    except Exception:
        return valor_padrao


def extrair_valor(row, key_or_index=0):
    """
    Extract a value from a database row, compatible with both SQLite Row and PostgreSQL RealDictRow.

    Args:
        row: The database row (can be dict, tuple, or sqlite3.Row)
        key_or_index: Column name (str) or index (int)

    Returns:
        The extracted value, or None if row is None
    """
    if row is None:
        return None

    if isinstance(row, dict):
        # PostgreSQL RealDictRow or dict
        if isinstance(key_or_index, int):
            # Get value by index - convert to list of values
            values = list(row.values())
            return values[key_or_index] if key_or_index < len(values) else None
        return row.get(key_or_index)

    # SQLite Row or tuple
    if isinstance(key_or_index, str):
        # Try to access by name (sqlite3.Row supports this)
        try:
            return row[key_or_index]
        except (KeyError, TypeError):
            return None

    # Access by index
    try:
        return row[key_or_index]
    except (IndexError, TypeError):
        return None


# =========================================================================
# TENANT MANAGEMENT
# =========================================================================

def carregar_tenants():
    """Load the tenant list from the configuration file or database."""
    if USE_POSTGRES:
        # For PostgreSQL, we still use JSON file for tenant registry
        # This allows tenant list to persist without needing a special table
        pass

    if FICHEIRO_TENANTS and os.path.exists(FICHEIRO_TENANTS):
        with open(FICHEIRO_TENANTS, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'tenants': [], 'version': '1.0.0'}


def guardar_tenants(dados):
    """Save the tenant list to the configuration file."""
    # Ensure config directory exists
    if PASTA_CONFIG:
        os.makedirs(PASTA_CONFIG, exist_ok=True)

    with open(FICHEIRO_TENANTS, 'w', encoding='utf-8') as f:
        json.dump(dados, f, indent=2, ensure_ascii=False)


def obter_tenant(tenant_id):
    """Get information about a specific tenant."""
    dados = carregar_tenants()
    for tenant in dados.get('tenants', []):
        if tenant['id'] == tenant_id:
            return tenant
    return None


def tenant_existe(tenant_id):
    """Check if a tenant exists."""
    return obter_tenant(tenant_id) is not None


# =========================================================================
# SCHEMA INITIALIZATION - PostgreSQL
# =========================================================================

def _criar_schema_postgres(tenant_id):
    """Create PostgreSQL schema for a tenant."""
    schema_name = f"tenant_{tenant_id.replace('-', '_')}"

    conn = _get_pg_connection('public')
    cursor = conn.cursor()

    # Create schema if not exists
    cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {schema_name}")
    conn.commit()

    # Set search path to new schema
    cursor.execute(f"SET search_path TO {schema_name}")

    return conn, schema_name


def _criar_tabelas_postgres(conn, schema_name):
    """Create all tables in PostgreSQL schema."""
    cursor = conn.cursor()

    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            first_name TEXT,
            last_name TEXT,
            phone TEXT,
            two_factor_enabled INTEGER DEFAULT 0,
            two_factor_method TEXT DEFAULT 'email',
            must_change_password INTEGER DEFAULT 1,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TIMESTAMP,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            created_by INTEGER,
            language TEXT DEFAULT 'pt'
        )
    ''')

    # Sessions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT
        )
    ''')

    # Two Factor Codes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS two_factor_codes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            method TEXT DEFAULT 'email',
            expires_at TIMESTAMP NOT NULL,
            attempts INTEGER DEFAULT 0,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Password Reset Tokens
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # User Permissions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_permissions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            section TEXT NOT NULL,
            field_name TEXT,
            can_view INTEGER DEFAULT 1,
            can_create INTEGER DEFAULT 0,
            can_edit INTEGER DEFAULT 0,
            can_delete INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, section, field_name)
        )
    ''')

    # Permission Templates
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS permission_templates (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            permissions_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Schema Fields
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS schema_fields (
            id SERIAL PRIMARY KEY,
            field_name TEXT UNIQUE NOT NULL,
            field_type TEXT NOT NULL,
            field_label TEXT NOT NULL,
            required INTEGER DEFAULT 0,
            field_order INTEGER DEFAULT 0,
            field_category TEXT DEFAULT 'general',
            field_options TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Assets
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id SERIAL PRIMARY KEY,
            serial_number TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER
        )
    ''')

    # Asset Data (key-value)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS asset_data (
            id SERIAL PRIMARY KEY,
            asset_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            field_value TEXT,
            UNIQUE(asset_id, field_name)
        )
    ''')

    # Maintenance Log
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS maintenance_log (
            id SERIAL PRIMARY KEY,
            asset_id INTEGER NOT NULL,
            action_type TEXT NOT NULL,
            description TEXT,
            performed_by INTEGER,
            performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Audit Log
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            action TEXT NOT NULL,
            table_name TEXT,
            record_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # System Config
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_config (
            config_key TEXT PRIMARY KEY,
            config_value TEXT,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Sequence Counters
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sequence_counters (
            id SERIAL PRIMARY KEY,
            counter_type TEXT UNIQUE NOT NULL,
            current_value INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Status Change Log
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS status_change_log (
            id SERIAL PRIMARY KEY,
            asset_id INTEGER NOT NULL,
            previous_status TEXT,
            new_status TEXT NOT NULL,
            description TEXT NOT NULL,
            changed_by INTEGER NOT NULL,
            intervention_id INTEGER,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # External Technicians
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS external_technicians (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            company TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            notes TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER
        )
    ''')

    # Technicians
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS technicians (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL,
            tipo TEXT NOT NULL,
            empresa TEXT,
            telefone TEXT,
            email TEXT,
            especialidade TEXT,
            notas TEXT,
            ativo INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Backup History
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS backup_history (
            id SERIAL PRIMARY KEY,
            filename TEXT NOT NULL,
            description TEXT,
            file_size INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Interventions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS interventions (
            id SERIAL PRIMARY KEY,
            asset_id INTEGER NOT NULL,
            intervention_type TEXT NOT NULL,
            problem_description TEXT,
            solution_description TEXT,
            parts_used TEXT,
            total_cost REAL DEFAULT 0,
            duration_hours REAL,
            status TEXT DEFAULT 'em_curso',
            previous_asset_status TEXT,
            final_asset_status TEXT,
            notes TEXT,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )
    ''')

    # Intervention Technicians
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS intervention_technicians (
            id SERIAL PRIMARY KEY,
            intervention_id INTEGER NOT NULL,
            user_id INTEGER,
            external_technician_id INTEGER,
            technician_id INTEGER,
            role TEXT DEFAULT 'participante'
        )
    ''')

    # Intervention Files
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS intervention_files (
            id SERIAL PRIMARY KEY,
            intervention_id INTEGER NOT NULL,
            file_category TEXT NOT NULL,
            file_name TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER,
            description TEXT,
            cost_value REAL,
            uploaded_by INTEGER NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Intervention Edit Log
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS intervention_edit_log (
            id SERIAL PRIMARY KEY,
            intervention_id INTEGER NOT NULL,
            edited_by INTEGER NOT NULL,
            edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            field_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT
        )
    ''')

    # Intervention Time Logs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS intervention_time_logs (
            id SERIAL PRIMARY KEY,
            intervention_id INTEGER NOT NULL,
            logged_by INTEGER NOT NULL,
            time_spent REAL NOT NULL,
            work_date DATE DEFAULT CURRENT_DATE,
            description TEXT,
            logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Tenant Field Config
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tenant_field_config (
            id SERIAL PRIMARY KEY,
            field_name TEXT UNIQUE NOT NULL,
            is_active INTEGER DEFAULT 1,
            is_required INTEGER DEFAULT 0,
            custom_label TEXT,
            custom_order INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )
    ''')

    # Intervention Updates
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS intervention_updates (
            id SERIAL PRIMARY KEY,
            intervention_id INTEGER NOT NULL,
            update_code TEXT UNIQUE NOT NULL,
            update_number INTEGER NOT NULL,
            description TEXT,
            notes TEXT,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # GDPR Tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS deletion_requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            reason TEXT,
            scheduled_deletion_date TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            cancelled_at TIMESTAMP,
            completed_at TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_consents (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            consent_type TEXT NOT NULL,
            granted INTEGER DEFAULT 0,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, consent_type)
        )
    ''')

    conn.commit()


# =========================================================================
# SCHEMA INITIALIZATION - SQLite (Original)
# =========================================================================

def inicializar_bd_tenant(tenant_id):
    """Initialize the database schema for a specific tenant.

    This is the single source of truth for the tenant database schema.
    Uses CREATE TABLE IF NOT EXISTS and ALTER TABLE for safe migration.
    """
    if USE_POSTGRES:
        conn, schema_name = _criar_schema_postgres(tenant_id)
        _criar_tabelas_postgres(conn, schema_name)
        _inserir_dados_iniciais_postgres(conn)
        _return_pg_connection(conn)
        logger.info("PostgreSQL tenant schema initialized: %s", tenant_id)
        return None

    # SQLite mode
    bd = obter_bd(tenant_id)

    # --- Users ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            first_name TEXT,
            last_name TEXT,
            phone TEXT,
            two_factor_enabled INTEGER DEFAULT 0,
            two_factor_method TEXT DEFAULT 'email',
            must_change_password INTEGER DEFAULT 1,
            failed_login_attempts INTEGER DEFAULT 0,
            locked_until TIMESTAMP,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')

    # Safe column additions for migration from older schemas
    _safe_add_columns(bd, 'users', [
        ('email', 'TEXT'),
        ('phone', 'TEXT'),
        ('two_factor_enabled', 'INTEGER DEFAULT 0'),
        ('two_factor_method', 'TEXT DEFAULT "email"'),
        ('must_change_password', 'INTEGER DEFAULT 0'),
        ('failed_login_attempts', 'INTEGER DEFAULT 0'),
        ('locked_until', 'TIMESTAMP'),
        ('active', 'INTEGER DEFAULT 1'),
        ('created_by', 'INTEGER'),
        ('first_name', 'TEXT'),
        ('last_name', 'TEXT'),
        ('language', 'TEXT DEFAULT "pt"'),
    ])

    # --- Sessions ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # --- 2FA Codes ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS two_factor_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            method TEXT DEFAULT 'email',
            expires_at TIMESTAMP NOT NULL,
            attempts INTEGER DEFAULT 0,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # --- Password Reset Tokens ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')

    # --- User Permissions ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS user_permissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            section TEXT NOT NULL,
            field_name TEXT,
            can_view INTEGER DEFAULT 1,
            can_create INTEGER DEFAULT 0,
            can_edit INTEGER DEFAULT 0,
            can_delete INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, section, field_name)
        )
    ''')

    # --- Permission Templates ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS permission_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            permissions_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Schema Fields (dynamic fields) ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS schema_fields (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            field_name TEXT UNIQUE NOT NULL,
            field_type TEXT NOT NULL,
            field_label TEXT NOT NULL,
            required INTEGER DEFAULT 0,
            field_order INTEGER DEFAULT 0,
            field_category TEXT DEFAULT 'general',
            field_options TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Assets ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            serial_number TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            updated_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id)
        )
    ''')

    # --- Asset Data (key-value store for dynamic fields) ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS asset_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER NOT NULL,
            field_name TEXT NOT NULL,
            field_value TEXT,
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
            UNIQUE(asset_id, field_name)
        )
    ''')

    # --- Maintenance Log ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS maintenance_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER NOT NULL,
            action_type TEXT NOT NULL,
            description TEXT,
            performed_by INTEGER,
            performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
            FOREIGN KEY (performed_by) REFERENCES users(id)
        )
    ''')

    # --- Audit Log ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            table_name TEXT,
            record_id INTEGER,
            old_values TEXT,
            new_values TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    # --- System Config ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS system_config (
            config_key TEXT PRIMARY KEY,
            config_value TEXT,
            description TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Sequence Counters ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS sequence_counters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            counter_type TEXT UNIQUE NOT NULL,
            current_value INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Status Change Log ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS status_change_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER NOT NULL,
            previous_status TEXT,
            new_status TEXT NOT NULL,
            description TEXT NOT NULL,
            changed_by INTEGER NOT NULL,
            intervention_id INTEGER,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
            FOREIGN KEY (changed_by) REFERENCES users(id),
            FOREIGN KEY (intervention_id) REFERENCES interventions(id)
        )
    ''')

    # --- External Technicians (legacy) ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS external_technicians (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            company TEXT NOT NULL,
            phone TEXT,
            email TEXT,
            notes TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')

    # --- Technicians (unified table for internal + external) ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS technicians (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK(tipo IN ('interno', 'externo')),
            empresa TEXT,
            telefone TEXT,
            email TEXT,
            especialidade TEXT,
            notas TEXT,
            ativo INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Backup History ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS backup_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            description TEXT,
            file_size INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Interventions ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS interventions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER NOT NULL,
            intervention_type TEXT NOT NULL,
            problem_description TEXT,
            solution_description TEXT,
            parts_used TEXT,
            total_cost REAL DEFAULT 0,
            duration_hours REAL,
            status TEXT DEFAULT 'em_curso',
            previous_asset_status TEXT,
            final_asset_status TEXT,
            notes TEXT,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id),
            FOREIGN KEY (updated_by) REFERENCES users(id)
        )
    ''')

    # --- Intervention Technicians ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS intervention_technicians (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intervention_id INTEGER NOT NULL,
            user_id INTEGER,
            external_technician_id INTEGER,
            technician_id INTEGER,
            role TEXT DEFAULT 'participante',
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (external_technician_id) REFERENCES external_technicians(id),
            FOREIGN KEY (technician_id) REFERENCES technicians(id)
        )
    ''')

    # --- Intervention Files ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS intervention_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intervention_id INTEGER NOT NULL,
            file_category TEXT NOT NULL,
            file_name TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER,
            description TEXT,
            cost_value REAL,
            uploaded_by INTEGER NOT NULL,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
            FOREIGN KEY (uploaded_by) REFERENCES users(id)
        )
    ''')

    # --- Intervention Edit Log ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS intervention_edit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intervention_id INTEGER NOT NULL,
            edited_by INTEGER NOT NULL,
            edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            field_name TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
            FOREIGN KEY (edited_by) REFERENCES users(id)
        )
    ''')

    # --- Intervention Time Logs ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS intervention_time_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intervention_id INTEGER NOT NULL,
            logged_by INTEGER NOT NULL,
            time_spent REAL NOT NULL,
            work_date DATE DEFAULT CURRENT_DATE,
            description TEXT,
            logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
            FOREIGN KEY (logged_by) REFERENCES users(id)
        )
    ''')

    # --- Tenant Field Configuration ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS tenant_field_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            field_name TEXT UNIQUE NOT NULL,
            is_active INTEGER DEFAULT 1,
            is_required INTEGER DEFAULT 0,
            custom_label TEXT,
            custom_order INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            FOREIGN KEY (updated_by) REFERENCES users(id)
        )
    ''')

    # --- Intervention Updates ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS intervention_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            intervention_id INTEGER NOT NULL,
            update_code TEXT UNIQUE NOT NULL,
            update_number INTEGER NOT NULL,
            description TEXT,
            notes TEXT,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ''')

    # --- Default schema fields (RFID v3 migration - complete set) ---
    campos_existentes = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM schema_fields').fetchone(), 0) or 0
    if campos_existentes == 0:
        campos_predefinidos = [
            # Identification
            ('rfid_tag', 'text', 'RFID Tag', 1, 1, 'identification', None),
            ('product_reference', 'text', 'Referência do Produto', 1, 2, 'identification', None),
            ('manufacturer', 'text', 'Fabricante', 1, 3, 'identification', None),
            ('model', 'text', 'Modelo', 1, 4, 'identification', None),
            # Specifications
            ('height_meters', 'number', 'Altura (m)', 0, 5, 'specifications', None),
            ('material', 'select', 'Material', 0, 6, 'specifications',
             json.dumps(['Aço Galvanizado', 'Alumínio', 'Aço Inox', 'Compósito'])),
            ('column_color', 'color_select', 'Cor', 0, 7, 'specifications', None),
            ('power_watts', 'number', 'Potência (W)', 0, 8, 'specifications', None),
            ('connection_type', 'select', 'Tipologia de Ligação', 0, 9, 'specifications',
             json.dumps(['Monofásica', 'Trifásica'])),
            # Electrical Balance (RFID v3)
            ('electrical_max_power', 'number', 'Potência Máxima (W)', 0, 30, 'electrical', None),
            ('total_installed_power', 'number', 'Potência Instalada (W)', 0, 31, 'electrical', None),
            ('remaining_power', 'number', 'Potência Restante (W)', 0, 32, 'electrical', None),
            ('electrical_connection_type', 'select', 'Tipo Ligação Elétrica', 0, 33, 'electrical',
             json.dumps(['Monofásico', 'Trifásico'])),
            # Installation
            ('installation_date', 'date', 'Data de Instalação', 0, 40, 'installation', None),
            ('installation_location', 'text', 'Localização', 0, 41, 'installation', None),
            ('gps_coordinates', 'gps', 'Coordenadas GPS', 0, 42, 'installation', None),
            ('gps_latitude', 'number', 'GPS Latitude', 0, 43, 'installation', None),
            ('gps_longitude', 'number', 'GPS Longitude', 0, 44, 'installation', None),
            ('municipality', 'text', 'Município', 0, 45, 'installation', None),
            ('street_address', 'text', 'Morada', 0, 46, 'installation', None),
            ('postal_code', 'text', 'Código Postal', 0, 47, 'installation', None),
            # Warranty
            ('warranty_end_date', 'date', 'Fim da Garantia', 0, 50, 'warranty', None),
            ('warranty_certificate', 'text', 'Certificado de Garantia', 0, 51, 'warranty', None),
            # Maintenance
            ('condition_status', 'select', 'Estado', 0, 60, 'maintenance',
             json.dumps(['Operacional', 'Manutenção Necessária', 'Em Reparação', 'Desativado', 'Suspenso'])),
            ('last_inspection_date', 'date', 'Última Inspeção', 0, 61, 'maintenance', None),
            ('next_inspection_date', 'date', 'Próxima Inspeção', 0, 62, 'maintenance', None),
            ('next_maintenance_date', 'date', 'Próxima Manutenção', 0, 63, 'maintenance', None),
            ('maintenance_notes', 'textarea', 'Notas de Manutenção', 0, 64, 'maintenance', None),
            # Equipment
            ('attached_equipment', 'textarea', 'Equipamentos Associados', 0, 70, 'equipment', None),
            ('luminaire_type', 'text', 'Tipo de Luminária', 0, 71, 'equipment', None),
            # Other
            ('notes', 'textarea', 'Observações', 0, 99, 'other', None),
        ]
        for campo in campos_predefinidos:
            bd.execute('''
                INSERT OR IGNORE INTO schema_fields
                (field_name, field_type, field_label, required, field_order, field_category, field_options)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', campo)

    # Add new schema fields if they don't exist (for migration from older schemas)
    campos_novos = [
        ('electrical_max_power', 'number', 'Potência Máxima (W)', 0, 30, 'electrical', None),
        ('total_installed_power', 'number', 'Potência Instalada (W)', 0, 31, 'electrical', None),
        ('remaining_power', 'number', 'Potência Restante (W)', 0, 32, 'electrical', None),
        ('electrical_connection_type', 'select', 'Tipo Ligação Elétrica', 0, 33, 'electrical',
         json.dumps(['Monofásico', 'Trifásico'])),
        ('column_color', 'color_select', 'Cor', 0, 7, 'specifications', None),
        ('postal_code', 'text', 'Código Postal', 0, 47, 'installation', None),
    ]
    for campo in campos_novos:
        existente = bd.execute(
            'SELECT id FROM schema_fields WHERE field_name = ?', (campo[0],)
        ).fetchone()
        if not existente:
            bd.execute('''
                INSERT INTO schema_fields
                (field_name, field_type, field_label, required, field_order, field_category, field_options)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', campo)

    # --- Default configuration ---
    config_padroes = [
        ('prefix_assets', 'SLP', 'Prefixo para números de série de ativos'),
        ('prefix_assets_digits', '9', 'Número de dígitos para numeração de ativos'),
        ('prefix_int_preventiva', 'INTP', 'Prefixo para intervenções preventivas'),
        ('prefix_int_corretiva', 'INTC', 'Prefixo para intervenções corretivas'),
        ('prefix_int_substituicao', 'INTS', 'Prefixo para intervenções de substituição'),
        ('prefix_int_inspecao', 'INSP', 'Prefixo para inspeções'),
        ('prefix_int_digits', '9', 'Número de dígitos para numeração de intervenções'),
        ('colors_list', json.dumps(['RAL 7016', 'RAL 9006', 'RAL 9010', 'Branco', 'Preto', 'Cinzento']),
         'Lista de cores disponíveis para ativos'),
    ]
    for chave, valor, descricao in config_padroes:
        bd.execute('''
            INSERT OR IGNORE INTO system_config (config_key, config_value, description)
            VALUES (?, ?, ?)
        ''', (chave, valor, descricao))

    # --- Default counters ---
    contadores = ['assets', 'int_preventiva', 'int_corretiva', 'int_substituicao', 'int_inspecao']
    for contador in contadores:
        bd.execute('''
            INSERT OR IGNORE INTO sequence_counters (counter_type, current_value)
            VALUES (?, 0)
        ''', (contador,))

    # --- RGPD/GDPR Compliance Tables ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS deletion_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reason TEXT,
            scheduled_deletion_date TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            cancelled_at TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    bd.execute('''
        CREATE TABLE IF NOT EXISTS user_consents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            consent_type TEXT NOT NULL,
            granted INTEGER DEFAULT 0,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, consent_type)
        )
    ''')

    bd.commit()
    logger.info("Tenant database initialized: %s", tenant_id)
    return bd


def _inserir_dados_iniciais_postgres(conn):
    """Insert initial data for PostgreSQL tenant."""
    cursor = conn.cursor()

    # Check if schema_fields has data
    cursor.execute('SELECT COUNT(*) as cnt FROM schema_fields')
    count = extrair_valor(cursor.fetchone(), 0) or 0

    if count == 0:
        campos = [
            ('rfid_tag', 'text', 'RFID Tag', 1, 1, 'identification', None),
            ('product_reference', 'text', 'Referência do Produto', 1, 2, 'identification', None),
            ('manufacturer', 'text', 'Fabricante', 1, 3, 'identification', None),
            ('model', 'text', 'Modelo', 1, 4, 'identification', None),
            ('height_meters', 'number', 'Altura (m)', 0, 5, 'specifications', None),
            ('condition_status', 'select', 'Estado', 0, 60, 'maintenance',
             json.dumps(['Operacional', 'Manutenção Necessária', 'Em Reparação', 'Desativado', 'Suspenso'])),
            ('notes', 'textarea', 'Observações', 0, 99, 'other', None),
        ]
        for campo in campos:
            cursor.execute('''
                INSERT INTO schema_fields
                (field_name, field_type, field_label, required, field_order, field_category, field_options)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (field_name) DO NOTHING
            ''', campo)

    # Default config
    configs = [
        ('prefix_assets', 'SLP', 'Prefixo para ativos'),
        ('prefix_assets_digits', '9', 'Dígitos para numeração'),
    ]
    for chave, valor, desc in configs:
        cursor.execute('''
            INSERT INTO system_config (config_key, config_value, description)
            VALUES (%s, %s, %s)
            ON CONFLICT (config_key) DO NOTHING
        ''', (chave, valor, desc))

    # Default counters
    for contador in ['assets', 'int_preventiva', 'int_corretiva', 'int_substituicao', 'int_inspecao']:
        cursor.execute('''
            INSERT INTO sequence_counters (counter_type, current_value)
            VALUES (%s, 0)
            ON CONFLICT (counter_type) DO NOTHING
        ''', (contador,))

    conn.commit()


def inicializar_catalogo():
    """Initialize the shared catalog database schema."""
    if USE_POSTGRES:
        _inicializar_catalogo_postgres()
        return

    # SQLite mode
    bd = sqlite3.connect(CATALOGO_PARTILHADO)
    bd.row_factory = sqlite3.Row

    # --- Catalog Packs (grouping of columns) ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_packs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pack_name TEXT UNIQUE NOT NULL,
            pack_description TEXT,
            pack_data TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Generic Values (for dropdowns) ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_values (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            column_name TEXT NOT NULL,
            value TEXT NOT NULL,
            value_label TEXT,
            value_order INTEGER DEFAULT 0
        )
    ''')

    # --- Catalog Columns (base posts/columns) ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            pack TEXT NOT NULL,
            column_type TEXT DEFAULT 'Standard',
            fixing TEXT DEFAULT 'Flange',
            height_m REAL,
            arm_count INTEGER DEFAULT 1,
            arm_street INTEGER DEFAULT 0,
            arm_sidewalk INTEGER DEFAULT 0,
            mod1 INTEGER DEFAULT 0,
            mod2 INTEGER DEFAULT 0,
            mod3 INTEGER DEFAULT 0,
            mod4 INTEGER DEFAULT 0,
            mod5 INTEGER DEFAULT 0,
            mod6 INTEGER DEFAULT 0,
            mod7 INTEGER DEFAULT 0,
            mod8 INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Mod.1: Luminaires ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_luminaires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT NOT NULL,
            description TEXT,
            luminaire_type TEXT,
            manufacturer_ref TEXT,
            power_watts REAL DEFAULT 0,
            voltage TEXT DEFAULT '230V',
            current_amps REAL,
            type_1 INTEGER DEFAULT 1,
            type_2 INTEGER DEFAULT 0,
            column_height_m REAL,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Mod.2: Electrical Panels ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_electrical_panels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            panel_type TEXT,
            short_reference TEXT,
            max_power_total REAL DEFAULT 0,
            max_power_per_phase REAL,
            phases INTEGER DEFAULT 1,
            voltage TEXT DEFAULT '230V',
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Mod.3: Fuse Boxes ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_fuse_boxes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            fuse_type TEXT,
            short_reference TEXT,
            max_power REAL DEFAULT 0,
            voltage TEXT DEFAULT '230V',
            type_s INTEGER DEFAULT 0,
            type_d INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Mod.4: Telemetry Panels ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_telemetry_panels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            panel_type TEXT,
            short_reference TEXT,
            power_watts REAL DEFAULT 0,
            voltage TEXT DEFAULT '230V',
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Mod.5: EV Chargers ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_ev (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            module_type TEXT,
            short_reference TEXT,
            power_watts REAL DEFAULT 0,
            current_amps REAL,
            voltage TEXT DEFAULT '230V',
            connector_type TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Mod.6: MUPI ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_mupi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            module_type TEXT,
            short_reference TEXT,
            power_watts REAL DEFAULT 0,
            size TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Mod.7: Lateral Modules ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_lateral (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            module_type TEXT,
            short_reference TEXT,
            lateral_type TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Mod.8: Antennas ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_antenna (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            module_type TEXT,
            short_reference TEXT,
            column_height_m REAL,
            frequency TEXT,
            power_watts REAL DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # --- Field Catalog (global) ---
    bd.execute('''
        CREATE TABLE IF NOT EXISTS field_catalog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            field_name TEXT UNIQUE NOT NULL,
            field_type TEXT NOT NULL,
            field_label_pt TEXT NOT NULL,
            field_label_en TEXT,
            field_label_fr TEXT,
            field_label_de TEXT,
            field_category TEXT DEFAULT 'other',
            field_options TEXT,
            field_order INTEGER DEFAULT 50,
            is_system INTEGER DEFAULT 0,
            is_required_default INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT
        )
    ''')

    # Safe migrations
    _safe_add_columns_catalog(bd, 'catalog_columns', [
        ('mod1', 'INTEGER DEFAULT 0'),
        ('mod2', 'INTEGER DEFAULT 0'),
        ('mod3', 'INTEGER DEFAULT 0'),
        ('mod4', 'INTEGER DEFAULT 0'),
        ('mod5', 'INTEGER DEFAULT 0'),
        ('mod6', 'INTEGER DEFAULT 0'),
        ('mod7', 'INTEGER DEFAULT 0'),
        ('mod8', 'INTEGER DEFAULT 0'),
        ('active', 'INTEGER DEFAULT 1'),
    ])

    # Insert default field catalog
    campos_existentes = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM field_catalog').fetchone(), 0) or 0
    if campos_existentes == 0:
        campos_catalogo = [
            ('rfid_tag', 'text', 'RFID Tag', 'RFID Tag', 'Tag RFID', 'RFID-Tag', 'identification', None, 1, 1, 1),
            ('product_reference', 'text', 'Referência do Produto', 'Product Reference', 'Référence Produit', 'Produktreferenz', 'identification', None, 2, 1, 1),
            ('manufacturer', 'text', 'Fabricante', 'Manufacturer', 'Fabricant', 'Hersteller', 'identification', None, 3, 1, 1),
            ('model', 'text', 'Modelo', 'Model', 'Modèle', 'Modell', 'identification', None, 4, 1, 1),
            ('condition_status', 'select', 'Estado', 'Condition', 'État', 'Zustand', 'maintenance', json.dumps(['Operacional', 'Manutenção Necessária', 'Em Reparação', 'Desativado']), 21, 1, 0),
            ('height_meters', 'number', 'Altura (m)', 'Height (m)', 'Hauteur (m)', 'Höhe (m)', 'specifications', None, 5, 0, 0),
            ('notes', 'textarea', 'Observações', 'Notes', 'Observations', 'Bemerkungen', 'other', None, 99, 0, 0),
        ]
        for campo in campos_catalogo:
            bd.execute('''
                INSERT OR IGNORE INTO field_catalog
                (field_name, field_type, field_label_pt, field_label_en, field_label_fr, field_label_de,
                 field_category, field_options, field_order, is_system, is_required_default)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', campo)

    # Default packs
    packs_existentes = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_packs').fetchone(), 0) or 0
    if packs_existentes == 0:
        packs = [('Standard', 'Pack padrão'), ('Premium', 'Pack premium'), ('Industrial', 'Pack industrial')]
        for p in packs:
            bd.execute('INSERT OR IGNORE INTO catalog_packs (pack_name, pack_description) VALUES (?, ?)', p)

    bd.commit()
    bd.close()
    logger.info("Catalog database initialized")


def _inicializar_catalogo_postgres():
    """Initialize catalog schema in PostgreSQL."""
    conn = _get_pg_connection('public')
    cursor = conn.cursor()

    # Create catalog schema
    cursor.execute("CREATE SCHEMA IF NOT EXISTS catalog")
    cursor.execute("SET search_path TO catalog")

    # Catalog Packs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_packs (
            id SERIAL PRIMARY KEY,
            pack_name TEXT UNIQUE NOT NULL,
            pack_description TEXT,
            pack_data TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Catalog Values (for dropdowns)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_values (
            id SERIAL PRIMARY KEY,
            column_name TEXT NOT NULL,
            value TEXT NOT NULL,
            value_label TEXT,
            value_order INTEGER DEFAULT 0
        )
    ''')

    # Catalog Columns (base posts/columns)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_columns (
            id SERIAL PRIMARY KEY,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            pack TEXT NOT NULL,
            column_type TEXT DEFAULT 'Standard',
            fixing TEXT DEFAULT 'Flange',
            height_m REAL,
            arm_count INTEGER DEFAULT 1,
            arm_street INTEGER DEFAULT 0,
            arm_sidewalk INTEGER DEFAULT 0,
            mod1 INTEGER DEFAULT 0,
            mod2 INTEGER DEFAULT 0,
            mod3 INTEGER DEFAULT 0,
            mod4 INTEGER DEFAULT 0,
            mod5 INTEGER DEFAULT 0,
            mod6 INTEGER DEFAULT 0,
            mod7 INTEGER DEFAULT 0,
            mod8 INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Mod.1: Luminaires
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_luminaires (
            id SERIAL PRIMARY KEY,
            reference TEXT NOT NULL,
            description TEXT,
            luminaire_type TEXT,
            manufacturer_ref TEXT,
            power_watts REAL DEFAULT 0,
            voltage TEXT DEFAULT '230V',
            current_amps REAL,
            type_1 INTEGER DEFAULT 1,
            type_2 INTEGER DEFAULT 0,
            column_height_m REAL,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Mod.2: Electrical Panels
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_electrical_panels (
            id SERIAL PRIMARY KEY,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            panel_type TEXT,
            short_reference TEXT,
            max_power_total REAL DEFAULT 0,
            max_power_per_phase REAL,
            phases INTEGER DEFAULT 1,
            voltage TEXT DEFAULT '230V',
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Mod.3: Fuse Boxes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_fuse_boxes (
            id SERIAL PRIMARY KEY,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            fuse_type TEXT,
            short_reference TEXT,
            max_power REAL DEFAULT 0,
            voltage TEXT DEFAULT '230V',
            type_s INTEGER DEFAULT 0,
            type_d INTEGER DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Mod.4: Telemetry Panels
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_telemetry_panels (
            id SERIAL PRIMARY KEY,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            panel_type TEXT,
            short_reference TEXT,
            power_watts REAL DEFAULT 0,
            voltage TEXT DEFAULT '230V',
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Mod.5: EV Chargers
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_ev (
            id SERIAL PRIMARY KEY,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            module_type TEXT,
            short_reference TEXT,
            power_watts REAL DEFAULT 0,
            current_amps REAL,
            voltage TEXT DEFAULT '230V',
            connector_type TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Mod.6: MUPI
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_mupi (
            id SERIAL PRIMARY KEY,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            module_type TEXT,
            short_reference TEXT,
            power_watts REAL DEFAULT 0,
            size TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Mod.7: Lateral Modules
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_lateral (
            id SERIAL PRIMARY KEY,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            module_type TEXT,
            short_reference TEXT,
            lateral_type TEXT,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Mod.8: Antennas
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_antenna (
            id SERIAL PRIMARY KEY,
            reference TEXT UNIQUE NOT NULL,
            description TEXT,
            module_type TEXT,
            short_reference TEXT,
            column_height_m REAL,
            frequency TEXT,
            power_watts REAL DEFAULT 0,
            active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Field Catalog
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS field_catalog (
            id SERIAL PRIMARY KEY,
            field_name TEXT UNIQUE NOT NULL,
            field_type TEXT NOT NULL,
            field_label_pt TEXT NOT NULL,
            field_label_en TEXT,
            field_label_fr TEXT,
            field_label_de TEXT,
            field_category TEXT DEFAULT 'other',
            field_options TEXT,
            field_order INTEGER DEFAULT 50,
            is_system INTEGER DEFAULT 0,
            is_required_default INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT
        )
    ''')

    # Insert default packs
    default_packs = [
        ('Pack Standard', 'Colunas standard'),
        ('Pack Premium', 'Colunas premium com mais funcionalidades'),
        ('Pack Urban', 'Colunas para ambiente urbano')
    ]
    for pack_name, pack_desc in default_packs:
        cursor.execute('''
            INSERT INTO catalog_packs (pack_name, pack_description)
            VALUES (%s, %s)
            ON CONFLICT (pack_name) DO NOTHING
        ''', (pack_name, pack_desc))

    conn.commit()
    _return_pg_connection(conn)
    logger.info("PostgreSQL catalog schema initialized")


def _safe_add_columns_catalog(bd, table_name, columns):
    """Safely add columns to a catalog table."""
    for col_def in columns:
        col_name = col_def[0]
        col_type = col_def[1]
        try:
            bd.execute(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}')
            logger.debug(f"Added column {col_name} to {table_name}")
        except sqlite3.OperationalError:
            pass


def _safe_add_columns(bd, table_name, columns):
    """Safely add columns to an existing table."""
    for col_name, col_type in columns:
        try:
            bd.execute(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}')
        except sqlite3.OperationalError:
            pass


def registar_auditoria(bd, user_id, acao, tabela, record_id, valores_antigos, valores_novos):
    """Record an action in the audit log."""
    bd.execute('''
        INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        user_id, acao, tabela, record_id,
        json.dumps(valores_antigos, default=str) if valores_antigos else None,
        json.dumps(valores_novos, default=str) if valores_novos else None
    ))
