"""
SmartLamppost v5.0 - Permissions System
RBAC (Role-Based Access Control) for multi-tenant authorization.
"""

import json
import logging
from functools import wraps
from datetime import datetime

from flask import request, jsonify, g

from .database import obter_bd, carregar_tenants, MASTER_TENANT_ID
from .plans import TenantPlanService

logger = logging.getLogger(__name__)

# Role hierarchy (higher number = more permissions)
ROLE_HIERARCHY = {
    'guest': 0,
    'user': 1,
    'operator': 2,
    'admin': 3,
    'superadmin': 4
}


def identificar_tenant_por_email(email):
    """Identify tenant by user email - searches all tenant databases."""
    dados = carregar_tenants()
    for tenant in dados.get('tenants', []):
        try:
            bd = obter_bd(tenant['id'])
            user = bd.execute(
                'SELECT id FROM users WHERE email = ? AND active = 1',
                (email,)
            ).fetchone()
            if user:
                return tenant['id']
        except Exception:
            continue
    return None


def requer_autenticacao(f):
    """Decorator requiring valid authentication token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')

        if not token:
            return jsonify({'error': 'Token de autenticação necessário'}), 401

        # Search for valid session in all tenants
        dados = carregar_tenants()
        tenant_encontrado = None
        utilizador = None

        for tenant in dados.get('tenants', []):
            try:
                bd = obter_bd(tenant['id'])
                sessao = bd.execute('''
                    SELECT s.*, u.id as user_id, u.email, u.role, u.first_name,
                           u.last_name, u.two_factor_enabled, u.must_change_password
                    FROM sessions s
                    JOIN users u ON s.user_id = u.id
                    WHERE s.token = ? AND s.expires_at > ? AND u.active = 1
                ''', (token, datetime.now().isoformat())).fetchone()

                if sessao:
                    tenant_encontrado = tenant['id']
                    utilizador = dict(sessao)
                    break
            except Exception as e:
                logger.debug("Error checking tenant %s: %s", tenant['id'], str(e))
                continue

        if not tenant_encontrado or not utilizador:
            return jsonify({'error': 'Sessão inválida ou expirada'}), 401

        # Set global context
        g.tenant_id = tenant_encontrado
        g.utilizador_atual = utilizador
        g.utilizador_atual['tenant_id'] = tenant_encontrado

        return f(*args, **kwargs)

    return decorated


# Alias para compatibilidade
requer_login = requer_autenticacao


def requer_admin(f):
    """Decorator requiring admin or superadmin role."""
    @wraps(f)
    @requer_autenticacao
    def decorated(*args, **kwargs):
        user = g.utilizador_atual
        if user.get('role') not in ['admin', 'superadmin']:
            return jsonify({'error': 'Permissão negada - requer administrador'}), 403
        return f(*args, **kwargs)
    return decorated


# Alias for compatibility
requer_admin_ou_superior = requer_admin


def requer_superadmin(f):
    """Decorator requiring superadmin role."""
    @wraps(f)
    @requer_autenticacao
    def decorated(*args, **kwargs):
        user = g.utilizador_atual
        if user.get('role') != 'superadmin':
            return jsonify({'error': 'Permissão negada - requer superadmin'}), 403
        if g.tenant_id != MASTER_TENANT_ID:
            return jsonify({'error': 'Operação só permitida no tenant master'}), 403
        return f(*args, **kwargs)
    return decorated


def requer_permissao(modulo, acao='view'):
    """Decorator requiring specific module permission.

    Args:
        modulo: Module ID (e.g., 'assets', 'interventions')
        acao: Action type ('view', 'create', 'edit', 'delete')
    """
    def decorator(f):
        @wraps(f)
        @requer_autenticacao
        def decorated(*args, **kwargs):
            user = g.utilizador_atual
            tenant_id = g.tenant_id

            # Superadmin has all permissions
            if user.get('role') == 'superadmin':
                return f(*args, **kwargs)

            # Admin has all permissions within their tenant
            if user.get('role') == 'admin':
                # Check if tenant has access to module
                if not TenantPlanService.tenant_can_access_module(tenant_id, modulo):
                    return jsonify({
                        'error': f'Módulo {modulo} não disponível no seu plano'
                    }), 403
                return f(*args, **kwargs)

            # Check tenant plan access to module
            if not TenantPlanService.tenant_can_access_module(tenant_id, modulo):
                return jsonify({
                    'error': f'Módulo {modulo} não disponível no seu plano'
                }), 403

            # Check user-specific permissions
            if not verificar_permissao(user['user_id'], modulo, acao):
                return jsonify({
                    'error': f'Sem permissão para {acao} em {modulo}'
                }), 403

            return f(*args, **kwargs)
        return decorated
    return decorator


def verificar_permissao(user_id, section, action='view'):
    """Check if a user has permission for an action on a section.

    Args:
        user_id: User ID
        section: Section/module name
        action: Action type ('view', 'create', 'edit', 'delete')

    Returns:
        bool: True if user has permission
    """
    bd = obter_bd()

    # Get user role first
    user = bd.execute(
        'SELECT role FROM users WHERE id = ?',
        (user_id,)
    ).fetchone()

    if not user:
        return False

    # Admin and superadmin have all permissions
    if user['role'] in ['admin', 'superadmin']:
        return True

    # Map action to column name
    action_column_map = {
        'view': 'can_view',
        'create': 'can_create',
        'edit': 'can_edit',
        'delete': 'can_delete'
    }

    column = action_column_map.get(action, 'can_view')

    # Check user permissions table
    perm = bd.execute(f'''
        SELECT {column} FROM user_permissions
        WHERE user_id = ? AND section = ? AND field_name IS NULL
    ''', (user_id, section)).fetchone()

    if perm:
        return bool(perm[0])

    # Default: no permission
    return False


def verificar_permissao_campo(user_id, section, field_name, action='view'):
    """Check if a user has permission for a specific field.

    Args:
        user_id: User ID
        section: Section/module name
        field_name: Field name
        action: 'view' or 'edit'

    Returns:
        bool: True if user has permission
    """
    bd = obter_bd()

    # Get user role
    user = bd.execute(
        'SELECT role FROM users WHERE id = ?',
        (user_id,)
    ).fetchone()

    if not user:
        return False

    # Admin and superadmin have all permissions
    if user['role'] in ['admin', 'superadmin']:
        return True

    column = 'can_view' if action == 'view' else 'can_edit'

    # Check field-specific permission
    perm = bd.execute(f'''
        SELECT {column} FROM user_permissions
        WHERE user_id = ? AND section = ? AND field_name = ?
    ''', (user_id, section, field_name)).fetchone()

    if perm:
        return bool(perm[0])

    # Fallback to section-level permission
    return verificar_permissao(user_id, section, action)


def obter_permissoes_utilizador(user_id):
    """Get all permissions for a user.

    Returns:
        dict: Structured permissions object
    """
    bd = obter_bd()

    permissions = bd.execute('''
        SELECT section, field_name, can_view, can_create, can_edit, can_delete
        FROM user_permissions
        WHERE user_id = ?
    ''', (user_id,)).fetchall()

    result = {}
    for perm in permissions:
        section = perm['section']
        if section not in result:
            result[section] = {
                'access': False,
                'actions': [],
                'fields': {}
            }

        if perm['field_name'] is None:
            # Section-level permission
            result[section]['access'] = bool(perm['can_view'])
            if perm['can_view']:
                result[section]['actions'].append('view')
            if perm['can_create']:
                result[section]['actions'].append('create')
            if perm['can_edit']:
                result[section]['actions'].append('edit')
            if perm['can_delete']:
                result[section]['actions'].append('delete')
        else:
            # Field-level permission
            result[section]['fields'][perm['field_name']] = {
                'view': bool(perm['can_view']),
                'edit': bool(perm['can_edit'])
            }

    return result


def definir_permissoes_utilizador(user_id, permissions_dict):
    """Set permissions for a user.

    Args:
        user_id: User ID
        permissions_dict: Dict with section -> permissions structure
    """
    bd = obter_bd()

    # Clear existing permissions
    bd.execute('DELETE FROM user_permissions WHERE user_id = ?', (user_id,))

    # Insert new permissions
    for section, perms in permissions_dict.items():
        # Section-level permissions
        bd.execute('''
            INSERT INTO user_permissions
            (user_id, section, can_view, can_create, can_edit, can_delete)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            user_id,
            section,
            1 if perms.get('access') or 'view' in perms.get('actions', []) else 0,
            1 if 'create' in perms.get('actions', []) else 0,
            1 if 'edit' in perms.get('actions', []) else 0,
            1 if 'delete' in perms.get('actions', []) else 0
        ))

        # Field-level permissions
        for field_name, field_perms in perms.get('fields', {}).items():
            bd.execute('''
                INSERT INTO user_permissions
                (user_id, section, field_name, can_view, can_edit)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                user_id,
                section,
                field_name,
                1 if field_perms.get('view') else 0,
                1 if field_perms.get('edit') else 0
            ))

    bd.commit()
    logger.info("Permissions updated for user %s", user_id)


def get_role_level(role):
    """Get the hierarchy level for a role."""
    return ROLE_HIERARCHY.get(role, 0)


def has_role_or_higher(user_role, required_role):
    """Check if user role is equal or higher than required."""
    return get_role_level(user_role) >= get_role_level(required_role)
