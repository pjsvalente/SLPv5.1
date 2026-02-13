"""
SmartLamppost v5.0 - Tenant Management Routes
CRUD operations for tenants (superadmin only).
"""

import os
import logging
from datetime import datetime

from flask import Blueprint, request, jsonify, g, send_file, make_response

from ...shared.database import (
    obter_bd, carregar_tenants, guardar_tenants, obter_tenant,
    tenant_existe, inicializar_bd_tenant, MASTER_TENANT_ID, extrair_valor
)
from ...shared.security import hash_password
from ...shared.permissions import requer_superadmin, requer_autenticacao
from ...shared.plans import PlanService, TenantPlanService
from ...shared.config import Config

logger = logging.getLogger(__name__)

tenants_bp = Blueprint('tenants', __name__)


@tenants_bp.route('/bootstrap', methods=['POST'])
def bootstrap():
    """Initialize or repair the master tenant and admin user."""
    try:
        dados_tenants = carregar_tenants()
        dados = request.get_json() or {}
        admin_email = dados.get('email', 'admin@smartlamppost.com')
        admin_password = dados.get('password', 'admin123')
        tenant_name = dados.get('name', 'SmartLamppost')

        logger.info(f"Bootstrap starting: email={admin_email}, name={tenant_name}")

        # Check if master tenant exists in JSON (may have been lost after redeploy)
        tenant_exists_in_json = any(t['id'] == MASTER_TENANT_ID for t in dados_tenants.get('tenants', []))

        if not tenant_exists_in_json:
            # Create/restore master tenant entry
            master_tenant = {
                'id': MASTER_TENANT_ID,
                'name': tenant_name,
                'short_name': 'SLP',
                'active': True,
                'plan': 'enterprise',
                'created_at': datetime.now().isoformat(),
                'settings': {'language': 'pt'},
                'branding': {}
            }
            dados_tenants['tenants'] = [master_tenant]
            guardar_tenants(dados_tenants)
            logger.info("Tenants JSON saved/restored")

        # Initialize database (creates tables if not exist)
        inicializar_bd_tenant(MASTER_TENANT_ID)
        logger.info("Tenant database initialized")

        # Check if admin user exists
        bd = obter_bd(MASTER_TENANT_ID)
        existing_user = bd.execute('SELECT id FROM users WHERE email = ?', (admin_email,)).fetchone()

        if existing_user:
            # Update existing user password and ensure active
            bd.execute('''
                UPDATE users SET password_hash = ?, active = 1, role = 'superadmin'
                WHERE email = ?
            ''', (hash_password(admin_password), admin_email))
            bd.commit()
            logger.info("Existing admin user updated")
            message = 'Utilizador admin atualizado'
        else:
            # Create admin user
            bd.execute('''
                INSERT INTO users (email, password_hash, role, first_name, last_name, must_change_password, active)
                VALUES (?, ?, 'superadmin', 'Super', 'Admin', 0, 1)
            ''', (admin_email, hash_password(admin_password)))
            bd.commit()
            logger.info("Admin user created")
            message = 'Sistema inicializado com sucesso'

        logger.info("Bootstrap completed: tenant=%s, admin=%s", MASTER_TENANT_ID, admin_email)
        return jsonify({
            'message': message,
            'tenant_id': MASTER_TENANT_ID,
            'admin_email': admin_email
        }), 201
    except Exception as e:
        logger.exception(f"Bootstrap error: {e}")
        return jsonify({'error': str(e)}), 500


@tenants_bp.route('/debug', methods=['GET'])
def debug_paths():
    """Debug endpoint to check paths (remove in production)."""
    from ...shared.database import PASTA_BASE, PASTA_TENANTS, PASTA_SHARED, PASTA_CONFIG, FICHEIRO_TENANTS
    from ...shared.permissions import identificar_tenant_por_email

    # Test tenant identification
    test_email = 'admin@smartlamppost.com'
    found_tenant = identificar_tenant_por_email(test_email)

    # Load tenants
    dados_tenants = carregar_tenants()

    return jsonify({
        'PASTA_BASE': PASTA_BASE,
        'PASTA_TENANTS': PASTA_TENANTS,
        'PASTA_SHARED': PASTA_SHARED,
        'PASTA_CONFIG': PASTA_CONFIG,
        'FICHEIRO_TENANTS': FICHEIRO_TENANTS,
        'BASE_PATH': Config.BASE_PATH,
        'DATA_PATH': Config.DATA_PATH,
        'config_exists': os.path.exists(PASTA_CONFIG) if PASTA_CONFIG else False,
        'tenants_exists': os.path.exists(PASTA_TENANTS) if PASTA_TENANTS else False,
        'tenants_data': dados_tenants,
        'test_email': test_email,
        'found_tenant': found_tenant
    })


@tenants_bp.route('/reset-admin', methods=['POST'])
def reset_admin():
    """Reset admin password and ensure user is active (temporary for setup)."""
    dados = request.get_json() or {}
    new_password = dados.get('password', 'admin123')

    try:
        bd = obter_bd(MASTER_TENANT_ID)
        new_hash = hash_password(new_password)

        # Update password AND ensure user is active
        bd.execute('''
            UPDATE users SET password_hash = ?, active = 1 WHERE email = ?
        ''', (new_hash, 'admin@smartlamppost.com'))
        bd.commit()

        # Verify the user state
        user = bd.execute('SELECT id, email, role, active FROM users WHERE email = ?',
                          ('admin@smartlamppost.com',)).fetchone()

        return jsonify({
            'message': 'Password atualizada',
            'user': dict(user) if user else None
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tenants_bp.route('', methods=['GET'])
@requer_superadmin
def list_tenants():
    """List all tenants (superadmin only)."""
    dados = carregar_tenants()
    tenants = []

    for tenant in dados.get('tenants', []):
        tenant_info = dict(tenant)

        # Get user and asset counts
        try:
            bd = obter_bd(tenant['id'])
            user_count = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM users').fetchone(), 0) or 0
            asset_count = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM assets').fetchone(), 0) or 0
            tenant_info['user_count'] = user_count
            tenant_info['asset_count'] = asset_count
        except Exception:
            tenant_info['user_count'] = 0
            tenant_info['asset_count'] = 0

        # Get plan info
        plan_id = tenant.get('plan', 'base')
        plan = PlanService.get_plan(plan_id)
        tenant_info['plan'] = plan_id
        tenant_info['plan_name'] = plan.get('name', plan_id) if plan else plan_id

        tenants.append(tenant_info)

    return jsonify(tenants), 200


@tenants_bp.route('/<string:tenant_id>', methods=['GET'])
@requer_autenticacao
def get_tenant(tenant_id):
    """Get tenant details."""
    user = g.utilizador_atual

    # Non-superadmin can only view their own tenant
    if user['role'] != 'superadmin' and g.tenant_id != tenant_id:
        return jsonify({'error': 'Sem permissão para ver este tenant'}), 403

    tenant = obter_tenant(tenant_id)
    if not tenant:
        return jsonify({'error': 'Tenant não encontrado'}), 404

    tenant_info = dict(tenant)

    # Add plan info
    plan_id = tenant.get('plan', 'base')
    plan = PlanService.get_plan(plan_id)
    tenant_info['plan'] = plan_id
    tenant_info['plan_details'] = plan

    # Add usage stats
    try:
        bd = obter_bd(tenant_id)
        tenant_info['user_count'] = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM users').fetchone(), 0) or 0
        tenant_info['asset_count'] = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM assets').fetchone(), 0) or 0
    except Exception:
        tenant_info['user_count'] = 0
        tenant_info['asset_count'] = 0

    return jsonify(tenant_info), 200


@tenants_bp.route('', methods=['POST'])
@requer_superadmin
def create_tenant():
    """Create a new tenant (superadmin only)."""
    dados = request.get_json() or {}

    tenant_id = dados.get('id', '').strip().lower()
    name = dados.get('name', '').strip()
    plan = dados.get('plan', 'base')

    if not tenant_id or not name:
        return jsonify({'error': 'ID e nome são obrigatórios'}), 400

    # Validate ID format (alphanumeric + underscore)
    if not tenant_id.replace('_', '').isalnum():
        return jsonify({'error': 'ID deve conter apenas letras, números e underscores'}), 400

    if tenant_existe(tenant_id):
        return jsonify({'error': 'Já existe um tenant com este ID'}), 400

    # Validate plan
    if not PlanService.get_plan(plan):
        return jsonify({'error': f'Plano {plan} não existe'}), 400

    # Create tenant
    dados_tenants = carregar_tenants()
    novo_tenant = {
        'id': tenant_id,
        'name': name,
        'short_name': dados.get('short_name', tenant_id[:3].upper()),
        'plan': plan,
        'is_master': False,
        'active': True,
        'created_at': datetime.now().isoformat(),
        'settings': dados.get('settings', {}),
        'branding': dados.get('branding', {})
    }

    dados_tenants['tenants'].append(novo_tenant)
    guardar_tenants(dados_tenants)

    # Create tenant directory
    tenant_path = os.path.join(Config.TENANTS_PATH, tenant_id)
    os.makedirs(tenant_path, exist_ok=True)

    # Initialize database
    inicializar_bd_tenant(tenant_id)

    # Create default admin user if provided
    admin_email = dados.get('admin_email')
    admin_password = dados.get('admin_password', 'admin123')

    if admin_email:
        bd = obter_bd(tenant_id)
        bd.execute('''
            INSERT INTO users (email, password_hash, role, first_name, must_change_password)
            VALUES (?, ?, 'admin', 'Administrador', 1)
        ''', (admin_email, hash_password(admin_password)))
        bd.commit()

    logger.info("Tenant created: %s", tenant_id)
    return jsonify(novo_tenant), 201


@tenants_bp.route('/<string:tenant_id>', methods=['PUT'])
@requer_superadmin
def update_tenant(tenant_id):
    """Update tenant details (superadmin only)."""
    if not tenant_existe(tenant_id):
        return jsonify({'error': 'Tenant não encontrado'}), 404

    dados = request.get_json() or {}
    dados_tenants = carregar_tenants()

    for tenant in dados_tenants['tenants']:
        if tenant['id'] == tenant_id:
            # Update allowed fields
            if 'name' in dados:
                tenant['name'] = dados['name']
            if 'short_name' in dados:
                tenant['short_name'] = dados['short_name']
            if 'active' in dados:
                tenant['active'] = dados['active']
            if 'settings' in dados:
                tenant['settings'] = dados['settings']
            if 'branding' in dados:
                tenant['branding'] = dados['branding']
            if 'plan' in dados:
                if PlanService.get_plan(dados['plan']):
                    tenant['plan'] = dados['plan']

            guardar_tenants(dados_tenants)
            logger.info("Tenant updated: %s", tenant_id)
            return jsonify(tenant), 200

    return jsonify({'error': 'Tenant não encontrado'}), 404


@tenants_bp.route('/<string:tenant_id>/logo', methods=['POST'])
@requer_autenticacao
def upload_logo(tenant_id):
    """Upload tenant logo."""
    user = g.utilizador_atual

    # Check permissions
    if user['role'] != 'superadmin' and g.tenant_id != tenant_id:
        return jsonify({'error': 'Sem permissão'}), 403

    if user['role'] not in ['admin', 'superadmin']:
        return jsonify({'error': 'Apenas administradores podem alterar o logo'}), 403

    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum ficheiro enviado'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'Ficheiro sem nome'}), 400

    # Validate extension
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in ['png', 'jpg', 'jpeg']:
        return jsonify({'error': 'Formato inválido. Use PNG ou JPG'}), 400

    # Save file
    tenant_path = os.path.join(Config.TENANTS_PATH, tenant_id)
    os.makedirs(tenant_path, exist_ok=True)

    # Remove old logos
    for old_ext in ['png', 'jpg', 'jpeg']:
        old_path = os.path.join(tenant_path, f'logo.{old_ext}')
        if os.path.exists(old_path):
            os.remove(old_path)

    # Save new logo
    logo_path = os.path.join(tenant_path, f'logo.{ext}')
    file.save(logo_path)

    logger.info("Logo uploaded for tenant: %s", tenant_id)
    return jsonify({'message': 'Logo atualizado'}), 200


@tenants_bp.route('/<string:tenant_id>/logo', methods=['GET'])
def get_logo(tenant_id):
    """Get tenant logo."""
    tenant_path = os.path.join(Config.TENANTS_PATH, tenant_id)

    # Try different extensions
    for ext in ['png', 'jpg', 'jpeg', 'svg']:
        logo_path = os.path.join(tenant_path, f'logo.{ext}')
        if os.path.exists(logo_path):
            resp = make_response(send_file(logo_path))
            resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return resp

    # Fallback to master tenant logo
    for ext in ['png', 'jpg', 'jpeg', 'svg']:
        master_logo = os.path.join(Config.TENANTS_PATH, MASTER_TENANT_ID, f'logo.{ext}')
        if os.path.exists(master_logo):
            resp = make_response(send_file(master_logo))
            resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return resp

    # Return default SVG logo
    default_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="12" fill="#1e40af"/>
        <text x="50" y="60" text-anchor="middle" fill="white" font-size="40" font-family="Arial, sans-serif" font-weight="bold">SL</text>
    </svg>'''
    resp = make_response(default_svg)
    resp.headers['Content-Type'] = 'image/svg+xml'
    resp.headers['Cache-Control'] = 'public, max-age=86400'
    return resp


@tenants_bp.route('/<string:tenant_id>/users', methods=['GET'])
@requer_autenticacao
def list_tenant_users(tenant_id):
    """List users in a tenant."""
    user = g.utilizador_atual

    # Check permissions
    if user['role'] != 'superadmin' and g.tenant_id != tenant_id:
        return jsonify({'error': 'Sem permissão'}), 403

    if user['role'] not in ['admin', 'superadmin']:
        return jsonify({'error': 'Apenas administradores podem ver utilizadores'}), 403

    bd = obter_bd(tenant_id)
    users = bd.execute('''
        SELECT id, email, role, first_name, last_name, active,
               two_factor_enabled, created_at, last_login
        FROM users ORDER BY created_at DESC
    ''').fetchall()

    return jsonify([dict(u) for u in users]), 200


@tenants_bp.route('/<string:tenant_id>/plan', methods=['PUT'])
@requer_superadmin
def update_tenant_plan(tenant_id):
    """Update tenant plan (superadmin only)."""
    if not tenant_existe(tenant_id):
        return jsonify({'error': 'Tenant não encontrado'}), 404

    dados = request.get_json() or {}
    new_plan = dados.get('plan')

    if not new_plan:
        return jsonify({'error': 'Plano é obrigatório'}), 400

    if not PlanService.get_plan(new_plan):
        return jsonify({'error': f'Plano {new_plan} não existe'}), 400

    TenantPlanService.set_tenant_plan(tenant_id, new_plan)
    logger.info("Tenant %s plan changed to %s", tenant_id, new_plan)

    return jsonify({'message': f'Plano alterado para {new_plan}'}), 200


@tenants_bp.route('/<string:tenant_id>/branding', methods=['PUT'])
@requer_autenticacao
def update_tenant_branding(tenant_id):
    """Update tenant branding (colors, etc)."""
    user = g.utilizador_atual

    # Check permissions
    if user['role'] != 'superadmin' and g.tenant_id != tenant_id:
        return jsonify({'error': 'Sem permissão'}), 403

    if user['role'] not in ['admin', 'superadmin']:
        return jsonify({'error': 'Apenas administradores podem alterar branding'}), 403

    # Check if tenant has custom branding feature
    if not TenantPlanService.tenant_has_feature(tenant_id, 'custom_branding'):
        return jsonify({'error': 'Funcionalidade não disponível no seu plano'}), 403

    dados = request.get_json() or {}
    dados_tenants = carregar_tenants()

    for tenant in dados_tenants['tenants']:
        if tenant['id'] == tenant_id:
            tenant['branding'] = dados
            guardar_tenants(dados_tenants)
            return jsonify({'message': 'Branding atualizado'}), 200

    return jsonify({'error': 'Tenant não encontrado'}), 404
