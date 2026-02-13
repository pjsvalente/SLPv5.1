"""
SmartLamppost v5.0 - Settings Routes
System configuration management.
"""

import os
import json
import logging
import shutil
import zipfile
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file

from flask import g
from ...shared.database import obter_bd, obter_bd_catalogo
from ...shared.permissions import requer_admin, requer_superadmin, requer_autenticacao
from ...shared.config import Config

logger = logging.getLogger(__name__)

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/prefixes', methods=['GET'])
@requer_admin
def get_prefixes():
    """Get all prefix configurations."""
    bd = obter_bd()

    prefixes = {}
    configs = bd.execute('''
        SELECT config_key, config_value FROM system_config
        WHERE config_key LIKE 'prefix_%'
    ''').fetchall()

    for cfg in configs:
        key = cfg['config_key'].replace('prefix_', '')
        prefixes[key] = cfg['config_value']

    return jsonify(prefixes), 200


@settings_bp.route('/prefixes', methods=['PUT'])
@requer_admin
def update_prefixes():
    """Update prefix configurations."""
    dados = request.get_json() or {}
    bd = obter_bd()

    for key, value in dados.items():
        bd.execute('''
            INSERT OR REPLACE INTO system_config (config_key, config_value)
            VALUES (?, ?)
        ''', (f'prefix_{key}', value))

    bd.commit()
    return jsonify({'message': 'Prefixos atualizados'}), 200


@settings_bp.route('/colors', methods=['GET'])
@requer_admin
def get_colors():
    """Get color list."""
    bd = obter_bd()

    result = bd.execute('''
        SELECT config_value FROM system_config WHERE config_key = 'colors_list'
    ''').fetchone()

    colors = []
    if result and result['config_value']:
        try:
            colors = json.loads(result['config_value'])
        except json.JSONDecodeError:
            colors = []

    return jsonify({'colors': colors}), 200


@settings_bp.route('/colors', methods=['PUT'])
@requer_admin
def update_colors():
    """Update color list."""
    dados = request.get_json() or {}
    colors = dados.get('colors', [])

    bd = obter_bd()
    bd.execute('''
        INSERT OR REPLACE INTO system_config (config_key, config_value)
        VALUES ('colors_list', ?)
    ''', (json.dumps(colors),))
    bd.commit()

    return jsonify({'message': 'Cores atualizadas'}), 200


@settings_bp.route('/counters', methods=['GET'])
@requer_admin
def get_counters():
    """Get all sequence counters."""
    bd = obter_bd()

    counters = bd.execute('''
        SELECT counter_type, current_value, updated_at FROM sequence_counters
    ''').fetchall()

    return jsonify({
        'counters': [dict(c) for c in counters]
    }), 200


@settings_bp.route('/counters/<counter_type>', methods=['PUT'])
@requer_admin
def update_counter(counter_type):
    """Update a specific counter value."""
    dados = request.get_json() or {}
    new_value = dados.get('value')

    if new_value is None:
        return jsonify({'error': 'Valor é obrigatório'}), 400

    bd = obter_bd()
    bd.execute('''
        UPDATE sequence_counters SET current_value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE counter_type = ?
    ''', (new_value, counter_type))
    bd.commit()

    return jsonify({'message': 'Contador atualizado'}), 200


@settings_bp.route('/schema', methods=['GET'])
@requer_admin
def get_schema():
    """Get all schema fields."""
    bd = obter_bd()

    fields = bd.execute('''
        SELECT * FROM schema_fields ORDER BY field_order
    ''').fetchall()

    result = []
    for f in fields:
        field = dict(f)
        if field.get('field_options'):
            try:
                field['field_options'] = json.loads(field['field_options'])
            except json.JSONDecodeError:
                field['field_options'] = []
        result.append(field)

    return jsonify({'fields': result}), 200


@settings_bp.route('/schema', methods=['POST'])
@requer_admin
def add_schema_field():
    """Add a new schema field."""
    dados = request.get_json() or {}

    required_fields = ['field_name', 'field_type', 'field_label']
    for field in required_fields:
        if not dados.get(field):
            return jsonify({'error': f'{field} é obrigatório'}), 400

    # Get max order
    bd = obter_bd()
    max_order = bd.execute('SELECT MAX(field_order) as max FROM schema_fields').fetchone()
    next_order = (max_order['max'] or 0) + 1

    options = dados.get('field_options')
    if options and isinstance(options, list):
        options = json.dumps(options)

    bd.execute('''
        INSERT INTO schema_fields (field_name, field_type, field_label, required, field_order, field_category, field_options)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        dados['field_name'],
        dados['field_type'],
        dados['field_label'],
        1 if dados.get('required') else 0,
        dados.get('field_order', next_order),
        dados.get('field_category', 'other'),
        options
    ))
    bd.commit()

    return jsonify({'message': 'Campo adicionado', 'id': bd.execute('SELECT last_insert_rowid()').fetchone()[0]}), 201


@settings_bp.route('/schema/<int:field_id>', methods=['PUT'])
@requer_admin
def update_schema_field(field_id):
    """Update a schema field."""
    dados = request.get_json() or {}
    bd = obter_bd()

    # Check if exists
    existing = bd.execute('SELECT id FROM schema_fields WHERE id = ?', (field_id,)).fetchone()
    if not existing:
        return jsonify({'error': 'Campo não encontrado'}), 404

    options = dados.get('field_options')
    if options and isinstance(options, list):
        options = json.dumps(options)

    bd.execute('''
        UPDATE schema_fields SET
            field_label = COALESCE(?, field_label),
            field_type = COALESCE(?, field_type),
            required = COALESCE(?, required),
            field_order = COALESCE(?, field_order),
            field_category = COALESCE(?, field_category),
            field_options = COALESCE(?, field_options)
        WHERE id = ?
    ''', (
        dados.get('field_label'),
        dados.get('field_type'),
        1 if dados.get('required') else 0 if 'required' in dados else None,
        dados.get('field_order'),
        dados.get('field_category'),
        options,
        field_id
    ))
    bd.commit()

    return jsonify({'message': 'Campo atualizado'}), 200


@settings_bp.route('/schema/<int:field_id>', methods=['DELETE'])
@requer_admin
def delete_schema_field(field_id):
    """Delete a schema field."""
    bd = obter_bd()

    # Check if exists
    existing = bd.execute('SELECT id FROM schema_fields WHERE id = ?', (field_id,)).fetchone()
    if not existing:
        return jsonify({'error': 'Campo não encontrado'}), 404

    bd.execute('DELETE FROM schema_fields WHERE id = ?', (field_id,))
    bd.commit()

    return jsonify({'message': 'Campo eliminado'}), 200


# =========================================================================
# PLANS MANAGEMENT (superadmin only)
# =========================================================================

def _load_plans_file():
    """Load plans from configuration file."""
    # Try multiple possible locations
    possible_paths = [
        os.path.join(Config.CONFIG_PATH, 'plans.json'),  # data/config/plans.json
        os.path.join(Config.DATA_PATH, 'config', 'plans.json'),  # data/config/plans.json
        os.path.join(os.path.dirname(Config.BACKEND_PATH), 'config', 'plans.json'),  # v5/config/plans.json
    ]

    for plans_path in possible_paths:
        if os.path.exists(plans_path):
            logger.info(f"Loading plans from: {plans_path}")
            with open(plans_path, 'r', encoding='utf-8') as f:
                return json.load(f)

    # Return default plans if no file found
    logger.warning("Plans file not found, using default plans")
    return {
        'plans': {
            'base': {
                'id': 'base',
                'name': 'Base',
                'description': 'Plano essencial',
                'modules': ['dashboard', 'assets'],
                'limits': {'max_users': 3, 'max_assets': 100, 'max_storage_mb': 50},
                'features': {'2fa': False, 'api_access': False, 'export_excel': True}
            },
            'pro': {
                'id': 'pro',
                'name': 'Pro',
                'description': 'Plano profissional',
                'modules': ['dashboard', 'assets', 'users', 'interventions', 'technicians', 'catalog'],
                'limits': {'max_users': 10, 'max_assets': 1000, 'max_storage_mb': 500},
                'features': {'2fa': True, 'export_excel': True, 'export_pdf': True}
            },
            'premium': {
                'id': 'premium',
                'name': 'Premium',
                'description': 'Plano completo',
                'modules': ['dashboard', 'assets', 'users', 'interventions', 'technicians', 'catalog', 'reports', 'data'],
                'limits': {'max_users': 50, 'max_assets': 10000, 'max_storage_mb': 5000},
                'features': {'2fa': True, 'export_excel': True, 'export_pdf': True, 'custom_branding': True, 'analytics': True}
            },
            'enterprise': {
                'id': 'enterprise',
                'name': 'Enterprise',
                'description': 'Plano empresarial',
                'modules': ['*'],
                'limits': {'max_users': -1, 'max_assets': -1, 'max_storage_mb': -1},
                'features': {'2fa': True, 'api_access': True, 'export_excel': True, 'export_pdf': True, 'custom_branding': True, 'analytics': True, 'priority_support': True}
            }
        },
        'modules': {
            'dashboard': {'id': 'dashboard', 'name': 'Dashboard', 'description': 'Painel principal', 'icon': 'LayoutDashboard'},
            'assets': {'id': 'assets', 'name': 'Ativos', 'description': 'Gestão de ativos', 'icon': 'Package'},
            'users': {'id': 'users', 'name': 'Utilizadores', 'description': 'Gestão de utilizadores', 'icon': 'Users'},
            'interventions': {'id': 'interventions', 'name': 'Intervenções', 'description': 'Gestão de intervenções', 'icon': 'Wrench'},
            'technicians': {'id': 'technicians', 'name': 'Técnicos', 'description': 'Gestão de técnicos', 'icon': 'HardHat'},
            'catalog': {'id': 'catalog', 'name': 'Catálogo', 'description': 'Catálogo de produtos', 'icon': 'BookOpen'},
            'reports': {'id': 'reports', 'name': 'Relatórios', 'description': 'Relatórios e estatísticas', 'icon': 'FileText'},
            'data': {'id': 'data', 'name': 'Dados', 'description': 'Import/Export', 'icon': 'Database'},
            'map': {'id': 'map', 'name': 'Mapa GPS', 'description': 'Mapa de ativos', 'icon': 'MapPin'},
            'analytics': {'id': 'analytics', 'name': 'Analytics', 'description': 'Análise avançada', 'icon': 'BarChart3'},
            'settings': {'id': 'settings', 'name': 'Definições', 'description': 'Configurações', 'icon': 'Settings'}
        },
        'default_plan': 'base'
    }


def _save_plans_file(data):
    """Save plans to configuration file."""
    plans_path = os.path.join(Config.CONFIG_PATH, 'plans.json')
    # Ensure directory exists
    os.makedirs(os.path.dirname(plans_path), exist_ok=True)
    with open(plans_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@settings_bp.route('/plans', methods=['GET'])
@requer_superadmin
def get_plans():
    """Get all plans and modules configuration."""
    data = _load_plans_file()
    return jsonify({
        'plans': data.get('plans', {}),
        'modules': data.get('modules', {}),
        'default_plan': data.get('default_plan', 'base')
    }), 200


@settings_bp.route('/plans/<plan_id>', methods=['GET'])
@requer_superadmin
def get_plan(plan_id):
    """Get a specific plan."""
    data = _load_plans_file()
    plan = data.get('plans', {}).get(plan_id)
    if not plan:
        return jsonify({'error': 'Plano não encontrado'}), 404
    return jsonify(plan), 200


@settings_bp.route('/plans/<plan_id>', methods=['PUT'])
@requer_superadmin
def update_plan(plan_id):
    """Update a plan's configuration."""
    dados = request.get_json() or {}
    data = _load_plans_file()

    if plan_id not in data.get('plans', {}):
        return jsonify({'error': 'Plano não encontrado'}), 404

    plan = data['plans'][plan_id]

    # Update allowed fields
    if 'name' in dados:
        plan['name'] = dados['name']
    if 'description' in dados:
        plan['description'] = dados['description']
    if 'modules' in dados:
        plan['modules'] = dados['modules']
    if 'limits' in dados:
        plan['limits'] = dados['limits']
    if 'features' in dados:
        plan['features'] = dados['features']

    _save_plans_file(data)
    logger.info("Plan %s updated", plan_id)

    return jsonify({'message': 'Plano atualizado', 'plan': plan}), 200


@settings_bp.route('/plans/<plan_id>/modules', methods=['PUT'])
@requer_superadmin
def update_plan_modules(plan_id):
    """Update modules for a specific plan."""
    dados = request.get_json() or {}
    modules = dados.get('modules', [])

    data = _load_plans_file()

    if plan_id not in data.get('plans', {}):
        return jsonify({'error': 'Plano não encontrado'}), 404

    data['plans'][plan_id]['modules'] = modules
    _save_plans_file(data)

    logger.info("Plan %s modules updated: %s", plan_id, modules)
    return jsonify({'message': 'Módulos atualizados'}), 200


@settings_bp.route('/modules', methods=['GET'])
@requer_superadmin
def get_modules():
    """Get all available modules."""
    data = _load_plans_file()
    return jsonify({'modules': data.get('modules', {})}), 200


@settings_bp.route('/modules/<module_id>', methods=['PUT'])
@requer_superadmin
def update_module(module_id):
    """Update a module's configuration."""
    dados = request.get_json() or {}
    data = _load_plans_file()

    if 'modules' not in data:
        data['modules'] = {}

    if module_id not in data['modules']:
        # Create new module
        data['modules'][module_id] = {'id': module_id}

    module = data['modules'][module_id]

    if 'name' in dados:
        module['name'] = dados['name']
    if 'description' in dados:
        module['description'] = dados['description']
    if 'icon' in dados:
        module['icon'] = dados['icon']

    _save_plans_file(data)
    return jsonify({'message': 'Módulo atualizado'}), 200


# =========================================================================
# FIELD CATALOG MANAGEMENT (superadmin only)
# =========================================================================

@settings_bp.route('/field-catalog', methods=['GET'])
@requer_superadmin
def get_field_catalog():
    """Get all fields from global catalog."""
    bd = obter_bd_catalogo()
    fields = bd.execute('''
        SELECT * FROM field_catalog ORDER BY field_category, field_order
    ''').fetchall()

    result = []
    for f in fields:
        field = dict(f)
        if field.get('field_options'):
            try:
                field['field_options'] = json.loads(field['field_options'])
            except json.JSONDecodeError:
                field['field_options'] = []
        result.append(field)

    return jsonify({'fields': result}), 200


@settings_bp.route('/field-catalog', methods=['POST'])
@requer_superadmin
def add_field_to_catalog():
    """Add a new field to the global catalog."""
    dados = request.get_json() or {}

    required = ['field_name', 'field_type', 'field_label_pt']
    for field in required:
        if not dados.get(field):
            return jsonify({'error': f'{field} é obrigatório'}), 400

    bd = obter_bd_catalogo()

    # Check if exists
    existing = bd.execute('SELECT id FROM field_catalog WHERE field_name = ?',
                         (dados['field_name'],)).fetchone()
    if existing:
        return jsonify({'error': 'Campo já existe no catálogo'}), 400

    # Get max order
    max_order = bd.execute('SELECT MAX(field_order) as max FROM field_catalog').fetchone()
    next_order = (max_order['max'] or 0) + 1

    options = dados.get('field_options')
    if options and isinstance(options, list):
        options = json.dumps(options)

    bd.execute('''
        INSERT INTO field_catalog
        (field_name, field_type, field_label_pt, field_label_en, field_label_fr, field_label_de,
         field_category, field_options, field_order, is_system, is_required_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    ''', (
        dados['field_name'],
        dados['field_type'],
        dados['field_label_pt'],
        dados.get('field_label_en', dados['field_label_pt']),
        dados.get('field_label_fr', dados['field_label_pt']),
        dados.get('field_label_de', dados['field_label_pt']),
        dados.get('field_category', 'other'),
        options,
        dados.get('field_order', next_order),
        1 if dados.get('is_required_default') else 0
    ))
    bd.commit()

    return jsonify({'message': 'Campo adicionado ao catálogo'}), 201


@settings_bp.route('/field-catalog/<field_name>', methods=['PUT'])
@requer_superadmin
def update_catalog_field(field_name):
    """Update a field in the global catalog."""
    dados = request.get_json() or {}
    bd = obter_bd_catalogo()

    existing = bd.execute('SELECT * FROM field_catalog WHERE field_name = ?',
                         (field_name,)).fetchone()
    if not existing:
        return jsonify({'error': 'Campo não encontrado'}), 404

    options = dados.get('field_options')
    if options and isinstance(options, list):
        options = json.dumps(options)

    bd.execute('''
        UPDATE field_catalog SET
            field_label_pt = COALESCE(?, field_label_pt),
            field_label_en = COALESCE(?, field_label_en),
            field_label_fr = COALESCE(?, field_label_fr),
            field_label_de = COALESCE(?, field_label_de),
            field_type = COALESCE(?, field_type),
            field_category = COALESCE(?, field_category),
            field_options = COALESCE(?, field_options),
            field_order = COALESCE(?, field_order),
            is_required_default = COALESCE(?, is_required_default)
        WHERE field_name = ?
    ''', (
        dados.get('field_label_pt'),
        dados.get('field_label_en'),
        dados.get('field_label_fr'),
        dados.get('field_label_de'),
        dados.get('field_type'),
        dados.get('field_category'),
        options,
        dados.get('field_order'),
        1 if dados.get('is_required_default') else 0 if 'is_required_default' in dados else None,
        field_name
    ))
    bd.commit()

    return jsonify({'message': 'Campo atualizado'}), 200


@settings_bp.route('/field-catalog/<field_name>', methods=['DELETE'])
@requer_superadmin
def delete_catalog_field(field_name):
    """Delete a field from the global catalog (only custom fields)."""
    bd = obter_bd_catalogo()

    existing = bd.execute('SELECT is_system FROM field_catalog WHERE field_name = ?',
                         (field_name,)).fetchone()
    if not existing:
        return jsonify({'error': 'Campo não encontrado'}), 404

    if existing['is_system']:
        return jsonify({'error': 'Campos de sistema não podem ser eliminados'}), 400

    bd.execute('DELETE FROM field_catalog WHERE field_name = ?', (field_name,))
    bd.commit()

    return jsonify({'message': 'Campo eliminado do catálogo'}), 200


# =========================================================================
# TENANT FIELD CONFIGURATION (admin only)
# =========================================================================

@settings_bp.route('/fields', methods=['GET'])
@requer_admin
def get_tenant_fields():
    """Get fields available for the tenant with activation status."""
    bd_catalog = obter_bd_catalogo()
    bd_tenant = obter_bd()
    lang = request.args.get('lang', 'pt')

    # Get all fields from global catalog
    catalog_fields = bd_catalog.execute('''
        SELECT * FROM field_catalog ORDER BY field_category, field_order
    ''').fetchall()

    # Get tenant configurations
    tenant_configs = {}
    try:
        configs = bd_tenant.execute('SELECT * FROM tenant_field_config').fetchall()
        for cfg in configs:
            tenant_configs[cfg['field_name']] = dict(cfg)
    except Exception:
        # Table might not exist yet
        pass

    result = []
    for f in catalog_fields:
        field = dict(f)

        # Get label for current language
        label_key = f'field_label_{lang}'
        field['field_label'] = field.get(label_key) or field.get('field_label_pt')

        # Parse options
        if field.get('field_options'):
            try:
                field['field_options'] = json.loads(field['field_options'])
            except json.JSONDecodeError:
                field['field_options'] = []

        # Add tenant-specific config
        tenant_cfg = tenant_configs.get(field['field_name'], {})
        field['is_active'] = tenant_cfg.get('is_active', 1)  # Default active
        field['is_required'] = tenant_cfg.get('is_required', field.get('is_required_default', 0))
        field['custom_label'] = tenant_cfg.get('custom_label')
        field['custom_order'] = tenant_cfg.get('custom_order')

        # System fields are always active
        if field['is_system']:
            field['is_active'] = 1

        result.append(field)

    return jsonify({'fields': result}), 200


@settings_bp.route('/fields/<field_name>', methods=['PUT'])
@requer_admin
def update_tenant_field(field_name):
    """Update tenant configuration for a specific field."""
    dados = request.get_json() or {}
    bd_catalog = obter_bd_catalogo()
    bd_tenant = obter_bd()
    user_id = g.utilizador_atual.get('user_id')

    # Check if field exists in catalog
    catalog_field = bd_catalog.execute(
        'SELECT is_system FROM field_catalog WHERE field_name = ?',
        (field_name,)
    ).fetchone()

    if not catalog_field:
        return jsonify({'error': 'Campo não existe no catálogo'}), 404

    # Cannot deactivate system fields
    if catalog_field['is_system'] and dados.get('is_active') == 0:
        return jsonify({'error': 'Campos de sistema não podem ser desativados'}), 400

    # Upsert tenant config
    bd_tenant.execute('''
        INSERT INTO tenant_field_config (field_name, is_active, is_required, custom_label, custom_order, updated_at, updated_by)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
        ON CONFLICT(field_name) DO UPDATE SET
            is_active = COALESCE(?, is_active),
            is_required = COALESCE(?, is_required),
            custom_label = COALESCE(?, custom_label),
            custom_order = COALESCE(?, custom_order),
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
    ''', (
        field_name,
        dados.get('is_active', 1),
        dados.get('is_required', 0),
        dados.get('custom_label'),
        dados.get('custom_order'),
        user_id,
        dados.get('is_active'),
        dados.get('is_required'),
        dados.get('custom_label'),
        dados.get('custom_order'),
        user_id
    ))
    bd_tenant.commit()

    return jsonify({'message': 'Configuração do campo atualizada'}), 200


@settings_bp.route('/fields/bulk', methods=['PUT'])
@requer_admin
def update_tenant_fields_bulk():
    """Update multiple field configurations at once."""
    dados = request.get_json() or {}
    fields = dados.get('fields', [])

    if not fields:
        return jsonify({'error': 'Nenhum campo fornecido'}), 400

    bd_catalog = obter_bd_catalogo()
    bd_tenant = obter_bd()
    user_id = g.utilizador_atual.get('user_id')

    for field_data in fields:
        field_name = field_data.get('field_name')
        if not field_name:
            continue

        # Check if field exists and is not system
        catalog_field = bd_catalog.execute(
            'SELECT is_system FROM field_catalog WHERE field_name = ?',
            (field_name,)
        ).fetchone()

        if not catalog_field:
            continue

        # Skip deactivation of system fields
        if catalog_field['is_system'] and field_data.get('is_active') == 0:
            continue

        bd_tenant.execute('''
            INSERT INTO tenant_field_config (field_name, is_active, is_required, custom_label, custom_order, updated_at, updated_by)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
            ON CONFLICT(field_name) DO UPDATE SET
                is_active = ?,
                is_required = ?,
                custom_label = ?,
                custom_order = ?,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = ?
        ''', (
            field_name,
            field_data.get('is_active', 1),
            field_data.get('is_required', 0),
            field_data.get('custom_label'),
            field_data.get('custom_order'),
            user_id,
            field_data.get('is_active', 1),
            field_data.get('is_required', 0),
            field_data.get('custom_label'),
            field_data.get('custom_order'),
            user_id
        ))

    bd_tenant.commit()
    return jsonify({'message': 'Configurações atualizadas'}), 200


@settings_bp.route('/fields/active', methods=['GET'])
@requer_autenticacao
def get_active_fields():
    """Get only active fields for the current tenant (used by AssetForm)."""
    bd_catalog = obter_bd_catalogo()
    bd_tenant = obter_bd()
    lang = request.args.get('lang', 'pt')

    # Get all catalog fields
    catalog_fields = bd_catalog.execute('''
        SELECT * FROM field_catalog ORDER BY field_category, field_order
    ''').fetchall()

    # Get tenant deactivations
    deactivated = set()
    required_override = {}
    try:
        configs = bd_tenant.execute(
            'SELECT field_name, is_active, is_required FROM tenant_field_config'
        ).fetchall()
        for cfg in configs:
            if cfg['is_active'] == 0:
                deactivated.add(cfg['field_name'])
            if cfg['is_required'] is not None:
                required_override[cfg['field_name']] = cfg['is_required']
    except Exception:
        # Table might not exist yet
        pass

    result = []
    for f in catalog_fields:
        # Skip if deactivated (system fields cannot be deactivated)
        if f['field_name'] in deactivated and not f['is_system']:
            continue

        field = dict(f)

        # Get label for current language
        label_key = f'field_label_{lang}'
        field['field_label'] = field.get(label_key) or field.get('field_label_pt')

        # Parse options
        if field.get('field_options'):
            try:
                field['field_options'] = json.loads(field['field_options'])
            except json.JSONDecodeError:
                field['field_options'] = []

        # Apply required override
        if field['field_name'] in required_override:
            field['required'] = required_override[field['field_name']]
        else:
            field['required'] = field.get('is_required_default', 0)

        result.append(field)

    return jsonify({'fields': result}), 200


# =========================================================================
# BACKUP/RESTORE MANAGEMENT (admin only)
# =========================================================================

def _get_tenant_backup_path(tenant_id: str) -> str:
    """Get the backup directory for a tenant."""
    backup_dir = os.path.join(Config.BACKUPS_PATH, tenant_id)
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir


def _get_tenant_data_path(tenant_id: str) -> str:
    """Get the data directory for a tenant."""
    return os.path.join(Config.TENANTS_PATH, tenant_id)


def _get_tenant_uploads_path(tenant_id: str) -> str:
    """Get the uploads directory for a tenant."""
    return os.path.join(Config.UPLOADS_PATH, tenant_id)


def _create_backup(tenant_id: str, user_email: str) -> dict:
    """Create a backup ZIP for a tenant."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_name = f'backup_{tenant_id}_{timestamp}.zip'
    backup_dir = _get_tenant_backup_path(tenant_id)
    backup_path = os.path.join(backup_dir, backup_name)

    tenant_data_path = _get_tenant_data_path(tenant_id)
    tenant_uploads_path = _get_tenant_uploads_path(tenant_id)

    # Create ZIP file
    with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Add database file
        db_path = os.path.join(tenant_data_path, 'database.db')
        if os.path.exists(db_path):
            zipf.write(db_path, 'database.db')

        # Add uploads folder if exists
        if os.path.exists(tenant_uploads_path):
            for root, dirs, files in os.walk(tenant_uploads_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.join('uploads', os.path.relpath(file_path, tenant_uploads_path))
                    zipf.write(file_path, arcname)

        # Add metadata
        metadata = {
            'tenant_id': tenant_id,
            'created_at': datetime.now().isoformat(),
            'created_by': user_email,
            'version': '5.0'
        }
        zipf.writestr('backup_metadata.json', json.dumps(metadata, indent=2))

    # Get file size
    file_size = os.path.getsize(backup_path)

    # Cleanup old backups (keep only MAX_BACKUPS)
    _cleanup_old_backups(tenant_id)

    return {
        'filename': backup_name,
        'size': file_size,
        'created_at': datetime.now().isoformat(),
        'created_by': user_email
    }


def _cleanup_old_backups(tenant_id: str):
    """Remove old backups exceeding MAX_BACKUPS limit."""
    backup_dir = _get_tenant_backup_path(tenant_id)
    backups = []

    for filename in os.listdir(backup_dir):
        if filename.endswith('.zip'):
            filepath = os.path.join(backup_dir, filename)
            backups.append({
                'filename': filename,
                'path': filepath,
                'created': os.path.getctime(filepath)
            })

    # Sort by creation time (newest first)
    backups.sort(key=lambda x: x['created'], reverse=True)

    # Remove backups exceeding limit
    for backup in backups[Config.MAX_BACKUPS:]:
        try:
            os.remove(backup['path'])
            logger.info("Removed old backup: %s", backup['filename'])
        except Exception as e:
            logger.error("Failed to remove old backup %s: %s", backup['filename'], e)


def _restore_backup(tenant_id: str, backup_filename: str) -> bool:
    """Restore a tenant from a backup ZIP."""
    backup_dir = _get_tenant_backup_path(tenant_id)
    backup_path = os.path.join(backup_dir, backup_filename)

    if not os.path.exists(backup_path):
        raise FileNotFoundError("Backup file not found")

    tenant_data_path = _get_tenant_data_path(tenant_id)
    tenant_uploads_path = _get_tenant_uploads_path(tenant_id)

    # Create temp directory for extraction
    temp_dir = os.path.join(backup_dir, 'temp_restore')
    os.makedirs(temp_dir, exist_ok=True)

    try:
        # Extract ZIP
        with zipfile.ZipFile(backup_path, 'r') as zipf:
            zipf.extractall(temp_dir)

        # Verify metadata
        metadata_path = os.path.join(temp_dir, 'backup_metadata.json')
        if os.path.exists(metadata_path):
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                if metadata.get('tenant_id') != tenant_id:
                    raise ValueError("Backup is from a different tenant")

        # Restore database
        extracted_db = os.path.join(temp_dir, 'database.db')
        if os.path.exists(extracted_db):
            target_db = os.path.join(tenant_data_path, 'database.db')
            # Create backup of current database before overwriting
            if os.path.exists(target_db):
                shutil.copy2(target_db, target_db + '.pre_restore')
            shutil.copy2(extracted_db, target_db)

        # Restore uploads
        extracted_uploads = os.path.join(temp_dir, 'uploads')
        if os.path.exists(extracted_uploads):
            # Clear existing uploads
            if os.path.exists(tenant_uploads_path):
                shutil.rmtree(tenant_uploads_path)
            shutil.copytree(extracted_uploads, tenant_uploads_path)

        return True

    finally:
        # Cleanup temp directory
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


@settings_bp.route('/backups', methods=['GET'])
@requer_admin
def list_backups():
    """List all backups for the current tenant."""
    tenant_id = g.utilizador_atual.get('tenant_id')
    backup_dir = _get_tenant_backup_path(tenant_id)

    backups = []
    if os.path.exists(backup_dir):
        for filename in os.listdir(backup_dir):
            if filename.endswith('.zip'):
                filepath = os.path.join(backup_dir, filename)
                stat = os.stat(filepath)

                # Try to read metadata from ZIP
                metadata = {}
                try:
                    with zipfile.ZipFile(filepath, 'r') as zipf:
                        if 'backup_metadata.json' in zipf.namelist():
                            metadata = json.loads(zipf.read('backup_metadata.json'))
                except Exception:
                    pass

                backups.append({
                    'filename': filename,
                    'size': stat.st_size,
                    'created_at': metadata.get('created_at') or datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    'created_by': metadata.get('created_by', 'Unknown'),
                    'version': metadata.get('version', 'Unknown')
                })

    # Sort by creation time (newest first)
    backups.sort(key=lambda x: x['created_at'], reverse=True)

    return jsonify({'backups': backups, 'max_backups': Config.MAX_BACKUPS}), 200


@settings_bp.route('/backups', methods=['POST'])
@requer_admin
def create_backup():
    """Create a new backup for the current tenant."""
    tenant_id = g.utilizador_atual.get('tenant_id')
    user_email = g.utilizador_atual.get('email', 'Unknown')

    try:
        backup_info = _create_backup(tenant_id, user_email)
        logger.info("Backup created for tenant %s by %s: %s", tenant_id, user_email, backup_info['filename'])
        return jsonify({
            'message': 'Backup criado com sucesso',
            'backup': backup_info
        }), 201
    except Exception as e:
        logger.error("Failed to create backup for tenant %s: %s", tenant_id, e)
        return jsonify({'error': f'Erro ao criar backup: {str(e)}'}), 500


@settings_bp.route('/backups/<filename>', methods=['GET'])
@requer_admin
def download_backup(filename):
    """Download a specific backup file."""
    tenant_id = g.utilizador_atual.get('tenant_id')
    backup_dir = _get_tenant_backup_path(tenant_id)
    backup_path = os.path.join(backup_dir, filename)

    # Security: ensure filename doesn't contain path traversal
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Nome de ficheiro inválido'}), 400

    if not os.path.exists(backup_path):
        return jsonify({'error': 'Backup não encontrado'}), 404

    return send_file(
        backup_path,
        mimetype='application/zip',
        as_attachment=True,
        download_name=filename
    )


@settings_bp.route('/backups/<filename>/restore', methods=['POST'])
@requer_admin
def restore_backup(filename):
    """Restore from a specific backup file."""
    tenant_id = g.utilizador_atual.get('tenant_id')
    user_email = g.utilizador_atual.get('email', 'Unknown')

    # Security: ensure filename doesn't contain path traversal
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Nome de ficheiro inválido'}), 400

    try:
        _restore_backup(tenant_id, filename)
        logger.info("Backup restored for tenant %s by %s: %s", tenant_id, user_email, filename)
        return jsonify({'message': 'Backup restaurado com sucesso'}), 200
    except FileNotFoundError:
        return jsonify({'error': 'Backup não encontrado'}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error("Failed to restore backup for tenant %s: %s", tenant_id, e)
        return jsonify({'error': f'Erro ao restaurar backup: {str(e)}'}), 500


@settings_bp.route('/backups/<filename>', methods=['DELETE'])
@requer_admin
def delete_backup(filename):
    """Delete a specific backup file."""
    tenant_id = g.utilizador_atual.get('tenant_id')
    backup_dir = _get_tenant_backup_path(tenant_id)
    backup_path = os.path.join(backup_dir, filename)

    # Security: ensure filename doesn't contain path traversal
    if '..' in filename or '/' in filename or '\\' in filename:
        return jsonify({'error': 'Nome de ficheiro inválido'}), 400

    if not os.path.exists(backup_path):
        return jsonify({'error': 'Backup não encontrado'}), 404

    try:
        os.remove(backup_path)
        logger.info("Backup deleted for tenant %s: %s", tenant_id, filename)
        return jsonify({'message': 'Backup eliminado com sucesso'}), 200
    except Exception as e:
        logger.error("Failed to delete backup for tenant %s: %s", tenant_id, e)
        return jsonify({'error': f'Erro ao eliminar backup: {str(e)}'}), 500


# =========================================================================
# AUDIT LOG MANAGEMENT (admin only)
# =========================================================================

@settings_bp.route('/audit-log', methods=['GET'])
@requer_admin
def get_audit_log():
    """Get audit log entries with filtering and pagination."""
    bd = obter_bd()

    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    per_page = min(per_page, 100)  # Max 100 per page
    offset = (page - 1) * per_page

    # Filters
    user_id = request.args.get('user_id', type=int)
    action = request.args.get('action')
    table_name = request.args.get('table_name')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    search = request.args.get('search')

    # Build query
    where_clauses = []
    params = []

    if user_id:
        where_clauses.append('a.user_id = ?')
        params.append(user_id)

    if action:
        where_clauses.append('a.action = ?')
        params.append(action)

    if table_name:
        where_clauses.append('a.table_name = ?')
        params.append(table_name)

    if date_from:
        where_clauses.append('a.created_at >= ?')
        params.append(date_from)

    if date_to:
        where_clauses.append('a.created_at <= ?')
        params.append(date_to + ' 23:59:59')

    if search:
        where_clauses.append("(a.old_values LIKE ? OR a.new_values LIKE ? OR (u.first_name || ' ' || u.last_name) LIKE ?)")
        search_param = f'%{search}%'
        params.extend([search_param, search_param, search_param])

    where_sql = ' AND '.join(where_clauses) if where_clauses else '1=1'

    # Get total count
    count_query = f'''
        SELECT COUNT(*) as total
        FROM audit_log a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE {where_sql}
    '''
    total = bd.execute(count_query, params).fetchone()['total']

    # Get paginated entries
    query = f'''
        SELECT
            a.id,
            a.user_id,
            a.action,
            a.table_name,
            a.record_id,
            a.old_values,
            a.new_values,
            a.created_at,
            (u.first_name || ' ' || u.last_name) as user_name,
            u.email as user_email
        FROM audit_log a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE {where_sql}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
    '''
    params.extend([per_page, offset])

    entries = bd.execute(query, params).fetchall()

    result = []
    for entry in entries:
        entry_dict = dict(entry)
        # Parse JSON fields
        if entry_dict.get('old_values'):
            try:
                entry_dict['old_values'] = json.loads(entry_dict['old_values'])
            except (json.JSONDecodeError, TypeError):
                pass
        if entry_dict.get('new_values'):
            try:
                entry_dict['new_values'] = json.loads(entry_dict['new_values'])
            except (json.JSONDecodeError, TypeError):
                pass
        result.append(entry_dict)

    return jsonify({
        'entries': result,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    }), 200


@settings_bp.route('/audit-log/actions', methods=['GET'])
@requer_admin
def get_audit_actions():
    """Get distinct actions and tables for filtering."""
    bd = obter_bd()

    actions = bd.execute('SELECT DISTINCT action FROM audit_log ORDER BY action').fetchall()
    tables = bd.execute('SELECT DISTINCT table_name FROM audit_log ORDER BY table_name').fetchall()

    return jsonify({
        'actions': [a['action'] for a in actions],
        'tables': [t['table_name'] for t in tables]
    }), 200


@settings_bp.route('/audit-log/users', methods=['GET'])
@requer_admin
def get_audit_users():
    """Get users who have audit log entries."""
    bd = obter_bd()

    users = bd.execute('''
        SELECT DISTINCT u.id, (u.first_name || ' ' || u.last_name) as nome, u.email
        FROM audit_log a
        JOIN users u ON a.user_id = u.id
        ORDER BY u.first_name
    ''').fetchall()

    return jsonify({
        'users': [dict(u) for u in users]
    }), 200


@settings_bp.route('/audit-log/export', methods=['GET'])
@requer_admin
def export_audit_log():
    """Export audit log to JSON."""
    bd = obter_bd()

    # Filters (same as list)
    user_id = request.args.get('user_id', type=int)
    action = request.args.get('action')
    table_name = request.args.get('table_name')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    where_clauses = []
    params = []

    if user_id:
        where_clauses.append('a.user_id = ?')
        params.append(user_id)

    if action:
        where_clauses.append('a.action = ?')
        params.append(action)

    if table_name:
        where_clauses.append('a.table_name = ?')
        params.append(table_name)

    if date_from:
        where_clauses.append('a.created_at >= ?')
        params.append(date_from)

    if date_to:
        where_clauses.append('a.created_at <= ?')
        params.append(date_to + ' 23:59:59')

    where_sql = ' AND '.join(where_clauses) if where_clauses else '1=1'

    query = f'''
        SELECT
            a.id,
            a.user_id,
            a.action,
            a.table_name,
            a.record_id,
            a.old_values,
            a.new_values,
            a.created_at,
            (u.first_name || ' ' || u.last_name) as user_name,
            u.email as user_email
        FROM audit_log a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE {where_sql}
        ORDER BY a.created_at DESC
    '''

    entries = bd.execute(query, params).fetchall()

    result = []
    for entry in entries:
        entry_dict = dict(entry)
        if entry_dict.get('old_values'):
            try:
                entry_dict['old_values'] = json.loads(entry_dict['old_values'])
            except (json.JSONDecodeError, TypeError):
                pass
        if entry_dict.get('new_values'):
            try:
                entry_dict['new_values'] = json.loads(entry_dict['new_values'])
            except (json.JSONDecodeError, TypeError):
                pass
        result.append(entry_dict)

    export_data = {
        'exported_at': datetime.now().isoformat(),
        'tenant_id': g.utilizador_atual.get('tenant_id'),
        'total_entries': len(result),
        'filters': {
            'user_id': user_id,
            'action': action,
            'table_name': table_name,
            'date_from': date_from,
            'date_to': date_to
        },
        'entries': result
    }

    import io
    buffer = io.BytesIO()
    buffer.write(json.dumps(export_data, indent=2, default=str).encode('utf-8'))
    buffer.seek(0)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'audit_log_export_{timestamp}.json'

    return send_file(
        buffer,
        as_attachment=True,
        download_name=filename,
        mimetype='application/json'
    )


@settings_bp.route('/audit-log/<int:entry_id>', methods=['GET'])
@requer_admin
def get_audit_entry(entry_id):
    """Get a specific audit log entry with full details."""
    bd = obter_bd()

    entry = bd.execute('''
        SELECT
            a.id,
            a.user_id,
            a.action,
            a.table_name,
            a.record_id,
            a.old_values,
            a.new_values,
            a.created_at,
            (u.first_name || ' ' || u.last_name) as user_name,
            u.email as user_email
        FROM audit_log a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.id = ?
    ''', (entry_id,)).fetchone()

    if not entry:
        return jsonify({'error': 'Entrada não encontrada'}), 404

    entry_dict = dict(entry)
    if entry_dict.get('old_values'):
        try:
            entry_dict['old_values'] = json.loads(entry_dict['old_values'])
        except (json.JSONDecodeError, TypeError):
            pass
    if entry_dict.get('new_values'):
        try:
            entry_dict['new_values'] = json.loads(entry_dict['new_values'])
        except (json.JSONDecodeError, TypeError):
            pass

    return jsonify({'entry': entry_dict}), 200


@settings_bp.route('/audit-log/stats', methods=['GET'])
@requer_admin
def get_audit_stats():
    """Get audit log statistics."""
    bd = obter_bd()

    # Total entries
    total = bd.execute('SELECT COUNT(*) as count FROM audit_log').fetchone()['count']

    # Entries by action
    by_action = bd.execute('''
        SELECT action, COUNT(*) as count
        FROM audit_log
        GROUP BY action
        ORDER BY count DESC
    ''').fetchall()

    # Entries by table
    by_table = bd.execute('''
        SELECT table_name, COUNT(*) as count
        FROM audit_log
        GROUP BY table_name
        ORDER BY count DESC
    ''').fetchall()

    # Entries today
    today = bd.execute('''
        SELECT COUNT(*) as count
        FROM audit_log
        WHERE DATE(created_at) = DATE('now')
    ''').fetchone()['count']

    # Entries this week
    this_week = bd.execute('''
        SELECT COUNT(*) as count
        FROM audit_log
        WHERE created_at >= DATE('now', '-7 days')
    ''').fetchone()['count']

    # Top users
    top_users = bd.execute('''
        SELECT u.id, (u.first_name || ' ' || u.last_name) as nome, u.email, COUNT(*) as count
        FROM audit_log a
        JOIN users u ON a.user_id = u.id
        GROUP BY a.user_id
        ORDER BY count DESC
        LIMIT 10
    ''').fetchall()

    return jsonify({
        'total': total,
        'today': today,
        'this_week': this_week,
        'by_action': [dict(a) for a in by_action],
        'by_table': [dict(t) for t in by_table],
        'top_users': [dict(u) for u in top_users]
    }), 200


# =========================================================================
# SCHEDULER MANAGEMENT (superadmin only)
# =========================================================================

@settings_bp.route('/scheduler/status', methods=['GET'])
@requer_superadmin
def get_scheduler_status():
    """Get current scheduler status."""
    from ...shared.scheduler import obter_status_scheduler
    return jsonify(obter_status_scheduler()), 200


@settings_bp.route('/scheduler/start', methods=['POST'])
@requer_superadmin
def start_scheduler():
    """Start the background scheduler."""
    from ...shared.scheduler import iniciar_scheduler

    dados = request.get_json() or {}
    hora_diaria = dados.get('hora_diaria', '06:00')
    dia_semanal = dados.get('dia_semanal', 'sunday')
    hora_semanal = dados.get('hora_semanal', '02:00')

    iniciar_scheduler(hora_diaria, dia_semanal, hora_semanal)

    return jsonify({'message': 'Scheduler iniciado'}), 200


@settings_bp.route('/scheduler/stop', methods=['POST'])
@requer_superadmin
def stop_scheduler():
    """Stop the background scheduler."""
    from ...shared.scheduler import parar_scheduler
    parar_scheduler()
    return jsonify({'message': 'Scheduler parado'}), 200


@settings_bp.route('/scheduler/run-now', methods=['POST'])
@requer_superadmin
def run_scheduler_now():
    """Run scheduled tasks immediately (for testing)."""
    from ...shared.scheduler import executar_tarefas_diarias

    # Run in a separate thread to not block the request
    import threading
    thread = threading.Thread(target=executar_tarefas_diarias, daemon=True)
    thread.start()

    return jsonify({'message': 'Tarefas iniciadas em background'}), 200


# =========================================================================
# NOTIFICATION SETTINGS (admin)
# =========================================================================

@settings_bp.route('/notifications', methods=['GET'])
@requer_admin
def get_notification_settings():
    """Get notification settings for current tenant."""
    bd = obter_bd()

    # Check if notification_settings table exists
    table_exists = bd.execute('''
        SELECT name FROM sqlite_master WHERE type='table' AND name='notification_settings'
    ''').fetchone()

    if not table_exists:
        # Create table if not exists
        bd.execute('''
            CREATE TABLE IF NOT EXISTS notification_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by INTEGER
            )
        ''')
        bd.commit()

    settings = bd.execute('SELECT setting_key, setting_value FROM notification_settings').fetchall()
    result = {s['setting_key']: s['setting_value'] for s in settings}

    # Default values
    defaults = {
        'email_maintenance_alerts': 'true',
        'email_daily_report': 'false',
        'email_intervention_updates': 'true',
        'alert_days_before': '7',
        'warranty_alert_days': '30'
    }

    for key, default in defaults.items():
        if key not in result:
            result[key] = default

    return jsonify(result), 200


@settings_bp.route('/notifications', methods=['PUT'])
@requer_admin
def update_notification_settings():
    """Update notification settings for current tenant."""
    bd = obter_bd()
    dados = request.get_json() or {}

    # Ensure table exists
    bd.execute('''
        CREATE TABLE IF NOT EXISTS notification_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )
    ''')

    for key, value in dados.items():
        bd.execute('''
            INSERT INTO notification_settings (setting_key, setting_value, updated_at, updated_by)
            VALUES (?, ?, CURRENT_TIMESTAMP, ?)
            ON CONFLICT(setting_key) DO UPDATE SET
                setting_value = ?,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = ?
        ''', (key, str(value), g.user_id, str(value), g.user_id))

    bd.commit()

    return jsonify({'message': 'Definições atualizadas'}), 200


@settings_bp.route('/notifications/test', methods=['POST'])
@requer_admin
def test_notification():
    """Send a test notification email."""
    from ...shared.email_service import enviar_email_generico

    dados = request.get_json() or {}
    email = dados.get('email')

    if not email:
        return jsonify({'error': 'Email é obrigatório'}), 400

    sucesso = enviar_email_generico(
        destinatarios=[email],
        assunto='[SmartLamppost] Email de Teste',
        corpo_html='''
        <h2>Teste de Notificação</h2>
        <p>Este é um email de teste do sistema SmartLamppost.</p>
        <p>Se recebeu este email, as notificações estão configuradas corretamente.</p>
        '''
    )

    if sucesso:
        return jsonify({'message': 'Email de teste enviado'}), 200
    else:
        return jsonify({'error': 'Erro ao enviar email. Verifique as configurações SMTP.'}), 500


# =========================================================================
# CATALOG IMPORT/EXPORT (superadmin only)
# =========================================================================

@settings_bp.route('/catalog/columns', methods=['GET'])
@requer_superadmin
def get_catalog_columns():
    """Get all columns from the catalog."""
    bd = obter_bd_catalogo()

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    search = request.args.get('search', '')
    pack = request.args.get('pack', '')

    query = 'SELECT * FROM catalog_columns WHERE 1=1'
    params = []

    if search:
        query += ' AND (reference LIKE ? OR description LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])

    if pack:
        query += ' AND pack = ?'
        params.append(pack)

    # Get total count
    count_query = query.replace('SELECT *', 'SELECT COUNT(*)')
    total = bd.execute(count_query, params).fetchone()[0]

    # Add pagination
    query += ' ORDER BY reference LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])

    columns = bd.execute(query, params).fetchall()

    return jsonify({
        'columns': [dict(c) for c in columns],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    }), 200


@settings_bp.route('/catalog/columns/packs', methods=['GET'])
@requer_superadmin
def get_catalog_packs():
    """Get distinct pack types from catalog."""
    bd = obter_bd_catalogo()

    packs = bd.execute('''
        SELECT pack, COUNT(*) as count
        FROM catalog_columns
        GROUP BY pack
        ORDER BY pack
    ''').fetchall()

    return jsonify({
        'packs': [{'name': p['pack'], 'count': p['count']} for p in packs]
    }), 200


@settings_bp.route('/catalog/columns/stats', methods=['GET'])
@requer_superadmin
def get_catalog_stats():
    """Get catalog statistics."""
    bd = obter_bd_catalogo()

    stats = {}

    # Total columns
    stats['total'] = bd.execute('SELECT COUNT(*) FROM catalog_columns').fetchone()[0]

    # By pack
    packs = bd.execute('''
        SELECT pack, COUNT(*) as count
        FROM catalog_columns
        GROUP BY pack
        ORDER BY count DESC
    ''').fetchall()
    stats['by_pack'] = [{'pack': p['pack'], 'count': p['count']} for p in packs]

    # By height
    heights = bd.execute('''
        SELECT height_m, COUNT(*) as count
        FROM catalog_columns
        GROUP BY height_m
        ORDER BY height_m
    ''').fetchall()
    stats['by_height'] = [{'height': h['height_m'], 'count': h['count']} for h in heights]

    # By arm count
    arms = bd.execute('''
        SELECT arm_count, COUNT(*) as count
        FROM catalog_columns
        GROUP BY arm_count
        ORDER BY arm_count
    ''').fetchall()
    stats['by_arm_count'] = [{'arms': a['arm_count'], 'count': a['count']} for a in arms]

    return jsonify(stats), 200


@settings_bp.route('/catalog/import', methods=['POST'])
@requer_superadmin
def import_catalog():
    """Import catalog from Excel file."""
    import pandas as pd
    from werkzeug.utils import secure_filename

    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum ficheiro enviado'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'Nenhum ficheiro selecionado'}), 400

    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({'error': 'Formato de ficheiro inválido. Use .xlsx ou .xls'}), 400

    clear_existing = request.form.get('clear', 'false').lower() == 'true'

    try:
        # Read Excel file
        df = pd.read_excel(file)

        # Skip header row if it's a duplicate
        if len(df) > 0 and df.iloc[0]['Referência Coluna'] == 'Referência Coluna':
            df = df.iloc[1:]

        # Rename columns
        column_mapping = {
            'Descrição': 'description',
            'Referência Coluna': 'reference',
            'Leitura da referência da coluna Smartlamppost': 'pack',
            'Unnamed: 3': 'column_type',
            'Unnamed: 4': 'fixing',
            'Unnamed: 5': 'height_m',
            'Unnamed: 6': 'arm_count',
            'Unnamed: 7': 'arm_street',
            'Unnamed: 8': 'arm_sidewalk',
            'Unnamed: 9': 'luminaire_included',
            'Módulo da coluna Smartlamppost': 'mod1_luminaire',
            'Unnamed: 11': 'mod2_electrical',
            'Unnamed: 12': 'mod3_fuse_box',
            'Unnamed: 13': 'mod4_telemetry',
            'Unnamed: 14': 'mod5_ev',
            'Unnamed: 15': 'mod6_mupi',
            'Unnamed: 16': 'mod7_lateral',
            'Unnamed: 17': 'mod8_antenna'
        }

        df = df.rename(columns=column_mapping)

        # Clean data
        df['height_m'] = pd.to_numeric(df.get('height_m', 0), errors='coerce').fillna(0).astype(int)
        df['arm_count'] = pd.to_numeric(df.get('arm_count', 0), errors='coerce').fillna(0).astype(int)
        df['arm_street'] = pd.to_numeric(df.get('arm_street', 0), errors='coerce').fillna(0).astype(int)
        df['arm_sidewalk'] = pd.to_numeric(df.get('arm_sidewalk', 0), errors='coerce').fillna(0).astype(int)

        # Filter valid rows
        df = df[df['reference'].notna() & (df['reference'] != '')]

        bd = obter_bd_catalogo()

        if clear_existing:
            bd.execute('DELETE FROM catalog_columns')

        imported = 0
        updated = 0
        errors = 0

        for idx, row in df.iterrows():
            try:
                existing = bd.execute(
                    'SELECT id FROM catalog_columns WHERE reference = ?',
                    (row['reference'],)
                ).fetchone()

                if existing:
                    bd.execute('''
                        UPDATE catalog_columns SET
                            description = ?, pack = ?, column_type = ?, fixing = ?,
                            height_m = ?, arm_count = ?, arm_street = ?, arm_sidewalk = ?,
                            luminaire_included = ?, mod1_luminaire = ?, mod2_electrical = ?,
                            mod3_fuse_box = ?, mod4_telemetry = ?, mod5_ev = ?,
                            mod6_mupi = ?, mod7_lateral = ?, mod8_antenna = ?
                        WHERE reference = ?
                    ''', (
                        row.get('description', ''),
                        row.get('pack', 'BAREBONE'),
                        row.get('column_type', 'Standard'),
                        row.get('fixing', 'Flange'),
                        row.get('height_m', 0),
                        row.get('arm_count', 0),
                        row.get('arm_street', 0),
                        row.get('arm_sidewalk', 0),
                        row.get('luminaire_included', 'Não'),
                        row.get('mod1_luminaire', 'Não'),
                        row.get('mod2_electrical', 'Não'),
                        row.get('mod3_fuse_box', 'Não'),
                        row.get('mod4_telemetry', 'Não'),
                        row.get('mod5_ev', 'Não'),
                        row.get('mod6_mupi', 'Não'),
                        row.get('mod7_lateral', 'Sim'),
                        row.get('mod8_antenna', 'Sim'),
                        row['reference']
                    ))
                    updated += 1
                else:
                    bd.execute('''
                        INSERT INTO catalog_columns (
                            description, reference, pack, column_type, fixing, height_m,
                            arm_count, arm_street, arm_sidewalk, luminaire_included,
                            mod1_luminaire, mod2_electrical, mod3_fuse_box, mod4_telemetry,
                            mod5_ev, mod6_mupi, mod7_lateral, mod8_antenna
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        row.get('description', ''),
                        row['reference'],
                        row.get('pack', 'BAREBONE'),
                        row.get('column_type', 'Standard'),
                        row.get('fixing', 'Flange'),
                        row.get('height_m', 0),
                        row.get('arm_count', 0),
                        row.get('arm_street', 0),
                        row.get('arm_sidewalk', 0),
                        row.get('luminaire_included', 'Não'),
                        row.get('mod1_luminaire', 'Não'),
                        row.get('mod2_electrical', 'Não'),
                        row.get('mod3_fuse_box', 'Não'),
                        row.get('mod4_telemetry', 'Não'),
                        row.get('mod5_ev', 'Não'),
                        row.get('mod6_mupi', 'Não'),
                        row.get('mod7_lateral', 'Sim'),
                        row.get('mod8_antenna', 'Sim')
                    ))
                    imported += 1

            except Exception as e:
                logger.error(f"Error importing row: {e}")
                errors += 1

        bd.commit()

        return jsonify({
            'message': 'Importação concluída',
            'imported': imported,
            'updated': updated,
            'errors': errors,
            'total': imported + updated
        }), 200

    except Exception as e:
        logger.error(f"Error importing catalog: {e}")
        return jsonify({'error': f'Erro ao importar: {str(e)}'}), 500


@settings_bp.route('/catalog/export', methods=['GET'])
@requer_superadmin
def export_catalog():
    """Export catalog to Excel file."""
    import pandas as pd
    from io import BytesIO

    bd = obter_bd_catalogo()

    columns = bd.execute('SELECT * FROM catalog_columns ORDER BY reference').fetchall()

    # Convert to DataFrame
    data = [dict(c) for c in columns]
    df = pd.DataFrame(data)

    # Rename columns to Portuguese
    column_mapping = {
        'id': 'ID',
        'description': 'Descrição',
        'reference': 'Referência',
        'pack': 'Pack',
        'column_type': 'Tipo',
        'fixing': 'Fixação',
        'height_m': 'Altura (m)',
        'arm_count': 'Nº Braços',
        'arm_street': 'Braço Rua',
        'arm_sidewalk': 'Braço Passeio',
        'luminaire_included': 'Luminária Incluída',
        'mod1_luminaire': 'Mod. Luminária',
        'mod2_electrical': 'Mod. Quadro Elétrico',
        'mod3_fuse_box': 'Mod. Cofrete',
        'mod4_telemetry': 'Mod. Telemetria',
        'mod5_ev': 'Mod. CVE',
        'mod6_mupi': 'Mod. MUPI',
        'mod7_lateral': 'Mod. Lateral',
        'mod8_antenna': 'Mod. Antena'
    }

    df = df.rename(columns=column_mapping)

    # Create Excel file
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Catálogo Colunas', index=False)

    output.seek(0)

    filename = f'catalogo_colunas_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'

    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )


# =========================================================================
# FAVORITES/DEFAULTS MANAGEMENT (admin)
# =========================================================================

@settings_bp.route('/favorites', methods=['GET'])
@requer_admin
def get_favorites():
    """Get favorite values for defaults when creating assets."""
    bd = obter_bd()

    # Get all favorite configs
    configs = bd.execute('''
        SELECT config_key, config_value FROM system_config
        WHERE config_key LIKE 'favorite_%'
    ''').fetchall()

    result = {}
    for cfg in configs:
        key = cfg['config_key'].replace('favorite_', '')
        result[key] = cfg['config_value']

    return jsonify(result), 200


@settings_bp.route('/favorites', methods=['PUT'])
@requer_admin
def update_favorites():
    """Update favorite values for defaults."""
    dados = request.get_json() or {}
    bd = obter_bd()
    user_id = g.utilizador_atual.get('user_id')

    for campo, valor in dados.items():
        config_key = f'favorite_{campo}'
        bd.execute('''
            INSERT INTO system_config (config_key, config_value, description, updated_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(config_key) DO UPDATE SET
                config_value = ?,
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP
        ''', (config_key, valor, f'Valor favorito para {campo}', user_id, valor, user_id))

    bd.commit()
    return jsonify({'message': 'Favoritos atualizados'}), 200


@settings_bp.route('/defaults', methods=['GET'])
@requer_admin
def get_defaults():
    """Get default values for date calculations (warranty, inspection, maintenance)."""
    bd = obter_bd()

    configs = bd.execute('''
        SELECT config_key, config_value FROM system_config
        WHERE config_key LIKE 'default_%'
    ''').fetchall()

    result = {
        'warranty_years': '5',
        'inspection_months': '12',
        'maintenance_months': '6'
    }

    for cfg in configs:
        key = cfg['config_key'].replace('default_', '')
        result[key] = cfg['config_value']

    return jsonify(result), 200


@settings_bp.route('/defaults', methods=['PUT'])
@requer_admin
def update_defaults():
    """Update default values for date calculations."""
    dados = request.get_json() or {}
    bd = obter_bd()
    user_id = g.utilizador_atual.get('user_id')

    for campo, valor in dados.items():
        config_key = f'default_{campo}'
        bd.execute('''
            INSERT INTO system_config (config_key, config_value, description, updated_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(config_key) DO UPDATE SET
                config_value = ?,
                updated_by = ?,
                updated_at = CURRENT_TIMESTAMP
        ''', (config_key, str(valor), f'Valor default para {campo}', user_id, str(valor), user_id))

    bd.commit()
    return jsonify({'message': 'Defaults atualizados'}), 200


# =========================================================================
# CONFIGURABLE LISTS (dropdowns) MANAGEMENT (admin)
# =========================================================================

@settings_bp.route('/lists', methods=['GET'])
@requer_admin
def get_configurable_lists():
    """Get all configurable lists (dropdowns)."""
    bd = obter_bd()

    # Ensure table exists
    bd.execute('''
        CREATE TABLE IF NOT EXISTS configurable_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_name TEXT UNIQUE NOT NULL,
            list_values TEXT NOT NULL DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )
    ''')
    bd.commit()

    lists = bd.execute('SELECT * FROM configurable_lists ORDER BY list_name').fetchall()

    result = {}
    for lst in lists:
        try:
            result[lst['list_name']] = json.loads(lst['list_values'])
        except json.JSONDecodeError:
            result[lst['list_name']] = []

    return jsonify(result), 200


@settings_bp.route('/lists/<list_name>', methods=['GET'])
@requer_autenticacao
def get_configurable_list(list_name):
    """Get a specific configurable list."""
    bd = obter_bd()

    lst = bd.execute(
        'SELECT list_values FROM configurable_lists WHERE list_name = ?',
        (list_name,)
    ).fetchone()

    if not lst:
        return jsonify({'values': []}), 200

    try:
        values = json.loads(lst['list_values'])
    except json.JSONDecodeError:
        values = []

    return jsonify({'values': values}), 200


@settings_bp.route('/lists/<list_name>', methods=['PUT'])
@requer_admin
def update_configurable_list(list_name):
    """Update a configurable list."""
    dados = request.get_json() or {}
    values = dados.get('values', [])
    bd = obter_bd()
    user_id = g.utilizador_atual.get('user_id')

    # Ensure table exists
    bd.execute('''
        CREATE TABLE IF NOT EXISTS configurable_lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            list_name TEXT UNIQUE NOT NULL,
            list_values TEXT NOT NULL DEFAULT '[]',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER
        )
    ''')

    bd.execute('''
        INSERT INTO configurable_lists (list_name, list_values, updated_by)
        VALUES (?, ?, ?)
        ON CONFLICT(list_name) DO UPDATE SET
            list_values = ?,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
    ''', (list_name, json.dumps(values), user_id, json.dumps(values), user_id))

    bd.commit()
    return jsonify({'message': 'Lista atualizada'}), 200


@settings_bp.route('/lists/<list_name>/add', methods=['POST'])
@requer_autenticacao
def add_to_configurable_list(list_name):
    """Add a new value to a configurable list."""
    dados = request.get_json() or {}
    new_value = dados.get('value', '').strip()
    bd = obter_bd()
    user_id = g.utilizador_atual.get('user_id')

    if not new_value:
        return jsonify({'error': 'Valor não pode estar vazio'}), 400

    # Get current values
    lst = bd.execute(
        'SELECT list_values FROM configurable_lists WHERE list_name = ?',
        (list_name,)
    ).fetchone()

    if lst:
        try:
            values = json.loads(lst['list_values'])
        except json.JSONDecodeError:
            values = []
    else:
        values = []

    # Add new value if not exists
    if new_value not in values:
        values.append(new_value)

        # Ensure table exists
        bd.execute('''
            CREATE TABLE IF NOT EXISTS configurable_lists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                list_name TEXT UNIQUE NOT NULL,
                list_values TEXT NOT NULL DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by INTEGER
            )
        ''')

        bd.execute('''
            INSERT INTO configurable_lists (list_name, list_values, updated_by)
            VALUES (?, ?, ?)
            ON CONFLICT(list_name) DO UPDATE SET
                list_values = ?,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = ?
        ''', (list_name, json.dumps(values), user_id, json.dumps(values), user_id))

        bd.commit()

    return jsonify({'message': 'Valor adicionado', 'values': values}), 200


# =========================================================================
# MENU ORDER MANAGEMENT (per tenant)
# =========================================================================

@settings_bp.route('/menu-order', methods=['GET'])
@requer_admin
def get_menu_order():
    """Get the custom menu order for the current tenant."""
    bd = obter_bd()

    # Get menu order from system_config
    result = bd.execute('''
        SELECT config_value FROM system_config WHERE config_key = 'menu_order'
    ''').fetchone()

    if result and result['config_value']:
        try:
            menu_order = json.loads(result['config_value'])
            return jsonify({'menu_order': menu_order}), 200
        except json.JSONDecodeError:
            pass

    # Return default order if not set
    return jsonify({'menu_order': []}), 200


@settings_bp.route('/menu-order', methods=['PUT'])
@requer_admin
def update_menu_order():
    """Update the custom menu order for the current tenant."""
    dados = request.get_json() or {}
    menu_order = dados.get('menu_order', [])
    bd = obter_bd()
    user_id = g.utilizador_atual.get('user_id')

    # Validate that menu_order is a list of strings (menu IDs)
    if not isinstance(menu_order, list):
        return jsonify({'error': 'menu_order deve ser uma lista'}), 400

    bd.execute('''
        INSERT INTO system_config (config_key, config_value, description, updated_by)
        VALUES ('menu_order', ?, 'Ordem personalizada dos menus', ?)
        ON CONFLICT(config_key) DO UPDATE SET
            config_value = ?,
            updated_by = ?,
            updated_at = CURRENT_TIMESTAMP
    ''', (json.dumps(menu_order), user_id, json.dumps(menu_order), user_id))

    bd.commit()

    return jsonify({'message': 'Ordem dos menus atualizada'}), 200


@settings_bp.route('/menu-items', methods=['GET'])
@requer_autenticacao
def get_available_menu_items():
    """Get all available menu items with their current order."""
    bd = obter_bd()
    user_role = g.utilizador_atual.get('role', 'user')

    # Default menu items with their order
    default_items = [
        {'id': 'dashboard', 'icon': 'LayoutDashboard', 'default_order': 1},
        {'id': 'assets', 'icon': 'Package', 'default_order': 2},
        {'id': 'scan', 'icon': 'ScanLine', 'default_order': 3},
        {'id': 'map', 'icon': 'MapPin', 'default_order': 4},
        {'id': 'interventions', 'icon': 'Wrench', 'default_order': 5},
        {'id': 'catalog', 'icon': 'BookOpen', 'default_order': 6},
        {'id': 'technicians', 'icon': 'HardHat', 'default_order': 7},
        {'id': 'reports', 'icon': 'FileText', 'default_order': 8},
        {'id': 'customReports', 'icon': 'FileSpreadsheet', 'default_order': 9},
        {'id': 'analytics', 'icon': 'BarChart3', 'default_order': 10},
    ]

    # Add admin-only items
    if user_role in ['admin', 'superadmin']:
        default_items.extend([
            {'id': 'users', 'icon': 'Users', 'default_order': 11},
            {'id': 'data', 'icon': 'Database', 'default_order': 12},
            {'id': 'settings', 'icon': 'Settings', 'default_order': 99, 'fixed_position': 'end'},
        ])

    # Add superadmin-only items
    if user_role == 'superadmin':
        default_items.append({'id': 'tenants', 'icon': 'Building2', 'default_order': 97})

    # Get custom menu order
    result = bd.execute('''
        SELECT config_value FROM system_config WHERE config_key = 'menu_order'
    ''').fetchone()

    custom_order = []
    if result and result['config_value']:
        try:
            custom_order = json.loads(result['config_value'])
        except json.JSONDecodeError:
            pass

    # Apply custom order to items
    if custom_order:
        order_map = {menu_id: idx for idx, menu_id in enumerate(custom_order)}
        for item in default_items:
            if item['id'] in order_map:
                item['order'] = order_map[item['id']]
            else:
                # Items not in custom order go at the end
                item['order'] = 1000 + item['default_order']
    else:
        for item in default_items:
            item['order'] = item['default_order']

    # Sort by order
    default_items.sort(key=lambda x: x['order'])

    return jsonify({'items': default_items}), 200
