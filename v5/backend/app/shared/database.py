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
    """Initialize all database paths from the application base path (v5 root)."""
    global PASTA_BASE, PASTA_TENANTS, PASTA_SHARED, PASTA_CONFIG
    global CATALOGO_PARTILHADO, FICHEIRO_TENANTS

    PASTA_BASE = base_path
    data_path = os.path.join(base_path, 'data')
    PASTA_TENANTS = os.path.join(data_path, 'tenants')  # /app/data/tenants
    PASTA_SHARED = os.path.join(data_path, 'shared')    # /app/data/shared
    PASTA_CONFIG = os.path.join(data_path, 'config')    # /app/data/config
    CATALOGO_PARTILHADO = os.path.join(PASTA_SHARED, 'catalog.db')
    FICHEIRO_TENANTS = os.path.join(PASTA_CONFIG, 'tenants.json')

    # Create directories if they don't exist
    for path in [data_path, PASTA_TENANTS, PASTA_SHARED, PASTA_CONFIG]:
        os.makedirs(path, exist_ok=True)
        logger.info(f"Ensured directory exists: {path}")


# Alias for compatibility
db_init_paths = init_paths


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


def obter_bd_para_tenant(tenant_id: str):
    """
    Get a standalone database connection for a tenant (outside of Flask request context).
    Used by scheduler and background tasks.
    """
    try:
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
    """
    Get list of all tenant IDs from the tenants folder.
    """
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
    campos_existentes = bd.execute('SELECT COUNT(*) FROM schema_fields').fetchone()[0]
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


def inicializar_catalogo():
    """Initialize the shared catalog database schema.

    This function creates the catalog database directly without using Flask's g context,
    so it can be called during application startup.

    RFID v3 Migration: Complete catalog structure with power calculations support.
    """
    # Create connection directly (not using g context as this runs at startup)
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
    # mod1-mod8 flags indicate which modules are compatible with this column
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

    # --- Mod.2: Electrical Panels (Quadros Elétricos) ---
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

    # --- Mod.3: Fuse Boxes (Cofretes Fusível) ---
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

    # --- Mod.6: MUPI (Advertising/Display Panels) ---
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

    # --- Field Catalog (global - shared by all tenants) ---
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

    # --- Safe migration for existing catalog tables ---
    # Add new columns if they don't exist (for upgrades from older versions)
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

    _safe_add_columns_catalog(bd, 'catalog_luminaires', [
        ('power_watts', 'REAL DEFAULT 0'),
        ('voltage', 'TEXT DEFAULT "230V"'),
        ('current_amps', 'REAL'),
        ('active', 'INTEGER DEFAULT 1'),
    ])

    _safe_add_columns_catalog(bd, 'catalog_electrical_panels', [
        ('max_power_total', 'REAL DEFAULT 0'),
        ('max_power_per_phase', 'REAL'),
        ('phases', 'INTEGER DEFAULT 1'),
        ('voltage', 'TEXT DEFAULT "230V"'),
        ('active', 'INTEGER DEFAULT 1'),
    ])

    _safe_add_columns_catalog(bd, 'catalog_fuse_boxes', [
        ('max_power', 'REAL DEFAULT 0'),
        ('voltage', 'TEXT DEFAULT "230V"'),
        ('active', 'INTEGER DEFAULT 1'),
    ])

    _safe_add_columns_catalog(bd, 'catalog_telemetry_panels', [
        ('power_watts', 'REAL DEFAULT 0'),
        ('voltage', 'TEXT DEFAULT "230V"'),
        ('active', 'INTEGER DEFAULT 1'),
    ])

    _safe_add_columns_catalog(bd, 'catalog_module_ev', [
        ('power_watts', 'REAL DEFAULT 0'),
        ('current_amps', 'REAL'),
        ('voltage', 'TEXT DEFAULT "230V"'),
        ('connector_type', 'TEXT'),
        ('active', 'INTEGER DEFAULT 1'),
    ])

    _safe_add_columns_catalog(bd, 'catalog_module_mupi', [
        ('power_watts', 'REAL DEFAULT 0'),
        ('size', 'TEXT'),
        ('active', 'INTEGER DEFAULT 1'),
    ])

    _safe_add_columns_catalog(bd, 'catalog_module_lateral', [
        ('lateral_type', 'TEXT'),
        ('active', 'INTEGER DEFAULT 1'),
    ])

    _safe_add_columns_catalog(bd, 'catalog_module_antenna', [
        ('frequency', 'TEXT'),
        ('power_watts', 'REAL DEFAULT 0'),
        ('active', 'INTEGER DEFAULT 1'),
    ])

    _safe_add_columns_catalog(bd, 'catalog_packs', [
        ('active', 'INTEGER DEFAULT 1'),
    ])

    # --- Field Catalog (global - shared by all tenants) ---
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

    # Insert predefined fields if table is empty
    campos_existentes = bd.execute('SELECT COUNT(*) FROM field_catalog').fetchone()[0]
    if campos_existentes == 0:
        campos_catalogo = [
            # (field_name, field_type, label_pt, label_en, label_fr, label_de, category, options, order, is_system, is_required_default)
            ('rfid_tag', 'text', 'RFID Tag', 'RFID Tag', 'Tag RFID', 'RFID-Tag', 'identification', None, 1, 1, 1),
            ('product_reference', 'text', 'Referência do Produto', 'Product Reference', 'Référence Produit', 'Produktreferenz', 'identification', None, 2, 1, 1),
            ('manufacturer', 'text', 'Fabricante', 'Manufacturer', 'Fabricant', 'Hersteller', 'identification', None, 3, 1, 1),
            ('model', 'text', 'Modelo', 'Model', 'Modèle', 'Modell', 'identification', None, 4, 1, 1),
            ('condition_status', 'select', 'Estado', 'Condition', 'État', 'Zustand', 'maintenance', json.dumps(['Operacional', 'Manutenção Necessária', 'Em Reparação', 'Desativado']), 21, 1, 0),
            ('height_meters', 'number', 'Altura (m)', 'Height (m)', 'Hauteur (m)', 'Höhe (m)', 'specifications', None, 5, 0, 0),
            ('material', 'select', 'Material', 'Material', 'Matériau', 'Material', 'specifications', json.dumps(['Aço Galvanizado', 'Alumínio', 'Aço Inox', 'Compósito']), 6, 0, 0),
            ('power_watts', 'number', 'Potência (W)', 'Power (W)', 'Puissance (W)', 'Leistung (W)', 'specifications', None, 7, 0, 0),
            ('connection_type', 'select', 'Tipologia de Ligação', 'Connection Type', 'Type de Connexion', 'Anschlusstyp', 'specifications', json.dumps(['Monofásica', 'Trifásica']), 8, 0, 0),
            # Electrical balance fields (RFID v3 migration)
            ('electrical_max_power', 'number', 'Potência Máxima (W)', 'Max Power (W)', 'Puissance Max (W)', 'Max. Leistung (W)', 'electrical', None, 30, 0, 0),
            ('total_installed_power', 'number', 'Potência Instalada (W)', 'Installed Power (W)', 'Puissance Installée (W)', 'Installierte Leistung (W)', 'electrical', None, 31, 0, 0),
            ('remaining_power', 'number', 'Potência Restante (W)', 'Remaining Power (W)', 'Puissance Restante (W)', 'Restleistung (W)', 'electrical', None, 32, 0, 0),
            ('electrical_connection_type', 'select', 'Tipo de Ligação Elétrica', 'Electrical Connection', 'Connexion Électrique', 'Elektrischer Anschluss', 'electrical', json.dumps(['Monofásico', 'Trifásico']), 33, 0, 0),
            # Installation fields
            ('installation_date', 'date', 'Data de Instalação', 'Installation Date', "Date d'Installation", 'Installationsdatum', 'installation', None, 9, 0, 0),
            ('installation_location', 'text', 'Localização', 'Location', 'Emplacement', 'Standort', 'installation', None, 10, 0, 0),
            ('gps_coordinates', 'gps', 'Coordenadas GPS', 'GPS Coordinates', 'Coordonnées GPS', 'GPS-Koordinaten', 'installation', None, 11, 0, 0),
            ('gps_latitude', 'number', 'GPS Latitude', 'GPS Latitude', 'GPS Latitude', 'GPS Breitengrad', 'installation', None, 12, 0, 0),
            ('gps_longitude', 'number', 'GPS Longitude', 'GPS Longitude', 'GPS Longitude', 'GPS Längengrad', 'installation', None, 13, 0, 0),
            ('municipality', 'text', 'Município', 'Municipality', 'Commune', 'Gemeinde', 'installation', None, 13, 0, 0),
            ('street_address', 'text', 'Morada', 'Address', 'Adresse', 'Adresse', 'installation', None, 14, 0, 0),
            ('postal_code', 'text', 'Código Postal', 'Postal Code', 'Code Postal', 'Postleitzahl', 'installation', None, 15, 0, 0),
            # Warranty
            ('warranty_end_date', 'date', 'Fim da Garantia', 'Warranty End', 'Fin de Garantie', 'Garantieende', 'warranty', None, 40, 0, 0),
            ('warranty_certificate', 'text', 'Certificado de Garantia', 'Warranty Certificate', 'Certificat de Garantie', 'Garantiezertifikat', 'warranty', None, 41, 0, 0),
            # Maintenance
            ('last_inspection_date', 'date', 'Última Inspeção', 'Last Inspection', 'Dernière Inspection', 'Letzte Inspektion', 'maintenance', None, 50, 0, 0),
            ('next_inspection_date', 'date', 'Próxima Inspeção', 'Next Inspection', 'Prochaine Inspection', 'Nächste Inspektion', 'maintenance', None, 51, 0, 0),
            ('next_maintenance_date', 'date', 'Próxima Manutenção', 'Next Maintenance', 'Prochaine Maintenance', 'Nächste Wartung', 'maintenance', None, 52, 0, 0),
            ('maintenance_notes', 'textarea', 'Notas de Manutenção', 'Maintenance Notes', 'Notes de Maintenance', 'Wartungshinweise', 'maintenance', None, 53, 0, 0),
            # Equipment
            ('attached_equipment', 'textarea', 'Equipamentos Associados', 'Attached Equipment', 'Équipements Associés', 'Angeschlossene Geräte', 'equipment', None, 60, 0, 0),
            ('luminaire_type', 'text', 'Tipo de Luminária', 'Luminaire Type', 'Type de Luminaire', 'Leuchtentyp', 'equipment', None, 61, 0, 0),
            ('column_color', 'color_select', 'Cor da Coluna', 'Column Color', 'Couleur de la Colonne', 'Säulenfarbe', 'specifications', None, 62, 0, 0),
            # Other
            ('notes', 'textarea', 'Observações', 'Notes', 'Observations', 'Bemerkungen', 'other', None, 99, 0, 0),
        ]
        for campo in campos_catalogo:
            bd.execute('''
                INSERT OR IGNORE INTO field_catalog
                (field_name, field_type, field_label_pt, field_label_en, field_label_fr, field_label_de,
                 field_category, field_options, field_order, is_system, is_required_default)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', campo)

    # Insert default packs if none exist
    packs_existentes = bd.execute('SELECT COUNT(*) FROM catalog_packs').fetchone()[0]
    if packs_existentes == 0:
        packs_default = [
            ('Standard', 'Pack padrão para colunas standard'),
            ('Premium', 'Pack premium com módulos avançados'),
            ('Industrial', 'Pack para aplicações industriais'),
            ('Smart City', 'Pack completo para cidades inteligentes'),
        ]
        for pack_name, pack_desc in packs_default:
            bd.execute('''
                INSERT OR IGNORE INTO catalog_packs (pack_name, pack_description)
                VALUES (?, ?)
            ''', (pack_name, pack_desc))

    bd.commit()
    bd.close()  # Close connection since this runs outside request context
    logger.info("Catalog database initialized with RFID v3 schema")


def _safe_add_columns_catalog(bd, table_name, columns):
    """Safely add columns to a catalog table (no-op if they already exist).

    Used for the shared catalog database migrations.
    """
    for col_def in columns:
        # col_def is a tuple like ('column_name', 'COLUMN_TYPE DEFAULT value')
        col_name = col_def[0]
        col_type = col_def[1]
        try:
            bd.execute(f'ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}')
            logger.debug(f"Added column {col_name} to {table_name}")
        except sqlite3.OperationalError:
            pass  # Column already exists


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
