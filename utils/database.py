"""
SmartLamppost v4.0 - Database management utilities
Handles multi-tenant database connections, initialization, and migrations.
"""

import os
import json
import sqlite3
import logging

from flask import g

logger = logging.getLogger(__name__)

# These will be set by the app during initialization
PASTA_BASE = None
PASTA_TENANTS = None
PASTA_SHARED = None
PASTA_CONFIG = None
CATALOGO_PARTILHADO = None
FICHEIRO_TENANTS = None
MASTER_TENANT_ID = 'smartlamppost'

# Current schema version for migration tracking
SCHEMA_VERSION = 4


def init_paths(base_path):
    """Initialize all database paths from the application base path."""
    global PASTA_BASE, PASTA_TENANTS, PASTA_SHARED, PASTA_CONFIG
    global CATALOGO_PARTILHADO, FICHEIRO_TENANTS

    PASTA_BASE = base_path
    PASTA_TENANTS = os.path.join(base_path, 'tenants')
    PASTA_SHARED = os.path.join(base_path, 'shared')
    PASTA_CONFIG = os.path.join(base_path, 'config')
    CATALOGO_PARTILHADO = os.path.join(PASTA_SHARED, 'catalog.db')
    FICHEIRO_TENANTS = os.path.join(PASTA_CONFIG, 'tenants.json')


def obter_caminho_bd_tenant(tenant_id):
    """Get the database file path for a specific tenant."""
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
        caminho_bd = obter_caminho_bd_tenant(tenant_id)
        os.makedirs(os.path.dirname(caminho_bd), exist_ok=True)
        bd = sqlite3.connect(caminho_bd)
        bd.row_factory = sqlite3.Row
        bd.execute("PRAGMA foreign_keys = ON")
        setattr(g, cache_key, bd)

    return bd


def obter_bd_catalogo():
    """Get a connection to the shared catalog database."""
    bd = getattr(g, '_database_catalog', None)
    if bd is None:
        bd = sqlite3.connect(CATALOGO_PARTILHADO)
        bd.row_factory = sqlite3.Row
        g._database_catalog = bd
    return bd


def fechar_ligacoes(excecao):
    """Close all database connections at end of request."""
    bd_catalog = getattr(g, '_database_catalog', None)
    if bd_catalog is not None:
        bd_catalog.close()

    for attr in list(vars(g).keys()):
        if attr.startswith('_database_'):
            bd = getattr(g, attr, None)
            if bd is not None:
                try:
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
        return resultado['config_value'] if resultado else valor_padrao
    except Exception:
        return valor_padrao


# =========================================================================
# TENANT MANAGEMENT
# =========================================================================

def carregar_tenants():
    """Load the tenant list from the configuration file."""
    if os.path.exists(FICHEIRO_TENANTS):
        with open(FICHEIRO_TENANTS, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'tenants': [], 'version': '1.0.0'}


def guardar_tenants(dados):
    """Save the tenant list to the configuration file."""
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
# SCHEMA INITIALIZATION
# =========================================================================

def inicializar_bd_tenant(tenant_id):
    """Initialize the database schema for a specific tenant.

    This is the single source of truth for the tenant database schema.
    Uses CREATE TABLE IF NOT EXISTS and ALTER TABLE for safe migration.
    """
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

    # --- External Technicians ---
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
            role TEXT DEFAULT 'participante',
            FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (external_technician_id) REFERENCES external_technicians(id)
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

    # --- Default schema fields ---
    campos_existentes = bd.execute('SELECT COUNT(*) FROM schema_fields').fetchone()[0]
    if campos_existentes == 0:
        campos_predefinidos = [
            ('rfid_tag', 'text', 'RFID Tag', 1, 1, 'identification', None),
            ('product_reference', 'text', 'Referência do Produto', 1, 2, 'identification', None),
            ('manufacturer', 'text', 'Fabricante', 1, 3, 'identification', None),
            ('model', 'text', 'Modelo', 1, 4, 'identification', None),
            ('height_meters', 'number', 'Altura (m)', 0, 5, 'specifications', None),
            ('material', 'select', 'Material', 0, 6, 'specifications',
             json.dumps(['Aço Galvanizado', 'Alumínio', 'Aço Inox', 'Compósito'])),
            ('power_watts', 'number', 'Potência (W)', 0, 7, 'specifications', None),
            ('connection_type', 'select', 'Tipologia de Ligação', 0, 8, 'specifications',
             json.dumps(['Monofásica', 'Trifásica'])),
            ('installation_date', 'date', 'Data de Instalação', 0, 9, 'installation', None),
            ('installation_location', 'text', 'Localização', 0, 10, 'installation', None),
            ('gps_latitude', 'number', 'GPS Latitude', 0, 11, 'installation', None),
            ('gps_longitude', 'number', 'GPS Longitude', 0, 12, 'installation', None),
            ('municipality', 'text', 'Município', 0, 13, 'installation', None),
            ('street_address', 'text', 'Morada', 0, 14, 'installation', None),
            ('warranty_end_date', 'date', 'Fim da Garantia', 0, 15, 'warranty', None),
            ('warranty_certificate', 'text', 'Certificado de Garantia', 0, 16, 'warranty', None),
            ('last_inspection_date', 'date', 'Última Inspeção', 0, 17, 'maintenance', None),
            ('next_inspection_date', 'date', 'Próxima Inspeção', 0, 18, 'maintenance', None),
            ('next_maintenance_date', 'date', 'Próxima Manutenção', 0, 19, 'maintenance', None),
            ('maintenance_notes', 'textarea', 'Notas de Manutenção', 0, 20, 'maintenance', None),
            ('condition_status', 'select', 'Estado', 0, 21, 'maintenance',
             json.dumps(['Operacional', 'Manutenção Necessária', 'Em Reparação', 'Desativado'])),
            ('attached_equipment', 'textarea', 'Equipamentos Associados', 0, 22, 'equipment', None),
            ('luminaire_type', 'text', 'Tipo de Luminária', 0, 23, 'equipment', None),
            ('notes', 'textarea', 'Observações', 0, 99, 'other', None),
        ]
        for campo in campos_predefinidos:
            bd.execute('''
                INSERT OR IGNORE INTO schema_fields
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

    bd.commit()
    logger.info("Tenant database initialized: %s", tenant_id)
    return bd


def inicializar_catalogo():
    """Initialize the shared catalog database schema."""
    bd = obter_bd_catalogo()

    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT,
            reference TEXT UNIQUE NOT NULL,
            pack TEXT NOT NULL,
            column_type TEXT DEFAULT 'Standard',
            fixing TEXT DEFAULT 'Flange',
            height_m INTEGER,
            arm_count INTEGER DEFAULT 0,
            arm_street INTEGER DEFAULT 0,
            arm_sidewalk INTEGER DEFAULT 0,
            luminaire_included TEXT DEFAULT 'Não',
            mod1_luminaire TEXT DEFAULT 'Não',
            mod2_electrical TEXT DEFAULT 'Não',
            mod3_fuse_box TEXT DEFAULT 'Não',
            mod4_telemetry TEXT DEFAULT 'Não',
            mod5_ev TEXT DEFAULT 'Não',
            mod6_mupi TEXT DEFAULT 'Não',
            mod7_lateral TEXT DEFAULT 'Sim',
            mod8_antenna TEXT DEFAULT 'Sim'
        )
    ''')

    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_luminaires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            luminaire_type TEXT NOT NULL,
            description TEXT,
            reference TEXT NOT NULL,
            manufacturer_ref TEXT,
            column_height_m INTEGER,
            type_1 INTEGER DEFAULT 0,
            type_2 INTEGER DEFAULT 0,
            UNIQUE(reference, column_height_m)
        )
    ''')

    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_electrical_panels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            panel_type TEXT NOT NULL,
            description TEXT,
            reference TEXT UNIQUE NOT NULL,
            short_reference TEXT NOT NULL
        )
    ''')

    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_fuse_boxes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fuse_type TEXT NOT NULL,
            description TEXT,
            reference TEXT UNIQUE NOT NULL,
            short_reference TEXT NOT NULL,
            type_s INTEGER DEFAULT 0,
            type_d INTEGER DEFAULT 0
        )
    ''')

    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_telemetry_panels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            panel_type TEXT NOT NULL,
            description TEXT,
            reference TEXT UNIQUE NOT NULL,
            short_reference TEXT NOT NULL
        )
    ''')

    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_ev (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_type TEXT NOT NULL,
            description TEXT,
            reference TEXT UNIQUE NOT NULL,
            short_reference TEXT NOT NULL
        )
    ''')

    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_mupi (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_type TEXT NOT NULL,
            description TEXT,
            reference TEXT UNIQUE NOT NULL,
            short_reference TEXT NOT NULL
        )
    ''')

    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_lateral (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_type TEXT NOT NULL,
            description TEXT,
            reference TEXT UNIQUE NOT NULL,
            short_reference TEXT NOT NULL
        )
    ''')

    bd.execute('''
        CREATE TABLE IF NOT EXISTS catalog_module_antenna (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            module_type TEXT NOT NULL,
            description TEXT,
            reference TEXT UNIQUE NOT NULL,
            short_reference TEXT NOT NULL,
            column_height_m INTEGER
        )
    ''')

    bd.commit()
    logger.info("Catalog database initialized")
    return bd


def _safe_add_columns(bd, table_name, columns):
    """Safely add columns to an existing table (no-op if they already exist)."""
    for col_name, col_type in columns:
        try:
            bd.execute(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}')
        except sqlite3.OperationalError:
            pass  # Column already exists


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
