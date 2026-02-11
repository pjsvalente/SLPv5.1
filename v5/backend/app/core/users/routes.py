"""
SmartLamppost v5.0 - User Management Routes
CRUD operations for users within a tenant.
"""

import logging
from datetime import datetime

from flask import Blueprint, request, jsonify, g

from ...shared.database import obter_bd, registar_auditoria
from ...shared.security import hash_password
from ...shared.permissions import (
    requer_autenticacao, requer_admin,
    obter_permissoes_utilizador, definir_permissoes_utilizador
)
from ...shared.plans import TenantPlanService

logger = logging.getLogger(__name__)

users_bp = Blueprint('users', __name__)


@users_bp.route('', methods=['GET'])
@requer_admin
def list_users():
    """List all users in current tenant."""
    bd = obter_bd()
    users = bd.execute('''
        SELECT id, email, role, first_name, last_name, phone, active,
               two_factor_enabled, two_factor_method, must_change_password,
               created_at, last_login
        FROM users ORDER BY created_at DESC
    ''').fetchall()

    return jsonify([dict(u) for u in users]), 200


@users_bp.route('', methods=['POST'])
@requer_admin
def create_user():
    """Create a new user in current tenant."""
    dados = request.get_json() or {}

    email = dados.get('email', '').strip().lower()
    password = dados.get('password', 'temp123')
    role = dados.get('role', 'user')
    first_name = dados.get('first_name', '')
    last_name = dados.get('last_name', '')

    if not email:
        return jsonify({'error': 'Email é obrigatório'}), 400

    # Validate role
    if role not in ['user', 'operator', 'admin']:
        return jsonify({'error': 'Role inválido'}), 400

    # Only superadmin can create superadmins
    if role == 'superadmin' and g.utilizador_atual['role'] != 'superadmin':
        return jsonify({'error': 'Não pode criar superadmins'}), 403

    # Check user limit
    bd = obter_bd()
    current_count = bd.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    within_limit, limit, remaining = TenantPlanService.check_tenant_limit(
        g.tenant_id, 'max_users', current_count
    )

    if not within_limit:
        return jsonify({
            'error': f'Limite de utilizadores atingido ({limit}). Atualize o seu plano.'
        }), 403

    # Check if email exists
    existing = bd.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        return jsonify({'error': 'Email já existe'}), 400

    # Create user
    cursor = bd.execute('''
        INSERT INTO users (email, password_hash, role, first_name, last_name,
                          must_change_password, created_by)
        VALUES (?, ?, ?, ?, ?, 1, ?)
    ''', (
        email, hash_password(password), role, first_name, last_name,
        g.utilizador_atual['user_id']
    ))
    bd.commit()

    user_id = cursor.lastrowid

    # Log audit
    registar_auditoria(bd, g.utilizador_atual['user_id'], 'CREATE', 'users', user_id, None, {
        'email': email, 'role': role
    })
    bd.commit()

    logger.info("User created: %s in tenant %s", email, g.tenant_id)

    return jsonify({
        'id': user_id,
        'email': email,
        'role': role,
        'message': 'Utilizador criado com sucesso'
    }), 201


@users_bp.route('/<int:user_id>', methods=['GET'])
@requer_admin
def get_user(user_id):
    """Get user details."""
    bd = obter_bd()
    user = bd.execute('''
        SELECT id, email, role, first_name, last_name, phone, active,
               two_factor_enabled, two_factor_method, must_change_password,
               created_at, last_login
        FROM users WHERE id = ?
    ''', (user_id,)).fetchone()

    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404

    user_dict = dict(user)
    user_dict['permissions'] = obter_permissoes_utilizador(user_id)

    return jsonify(user_dict), 200


@users_bp.route('/<int:user_id>', methods=['PUT'])
@requer_admin
def update_user(user_id):
    """Update user details."""
    bd = obter_bd()
    user = bd.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()

    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404

    dados = request.get_json() or {}
    old_values = dict(user)

    # Fields that can be updated
    updates = []
    params = []

    if 'first_name' in dados:
        updates.append('first_name = ?')
        params.append(dados['first_name'])

    if 'last_name' in dados:
        updates.append('last_name = ?')
        params.append(dados['last_name'])

    if 'phone' in dados:
        updates.append('phone = ?')
        params.append(dados['phone'])

    if 'role' in dados:
        new_role = dados['role']
        if new_role not in ['user', 'operator', 'admin']:
            return jsonify({'error': 'Role inválido'}), 400
        if new_role == 'superadmin' and g.utilizador_atual['role'] != 'superadmin':
            return jsonify({'error': 'Não pode definir role superadmin'}), 403
        updates.append('role = ?')
        params.append(new_role)

    if 'active' in dados:
        updates.append('active = ?')
        params.append(1 if dados['active'] else 0)

    if 'two_factor_enabled' in dados:
        updates.append('two_factor_enabled = ?')
        params.append(1 if dados['two_factor_enabled'] else 0)

    if 'two_factor_method' in dados:
        if dados['two_factor_method'] not in ['email', 'sms']:
            return jsonify({'error': 'Método 2FA inválido'}), 400
        updates.append('two_factor_method = ?')
        params.append(dados['two_factor_method'])

    if not updates:
        return jsonify({'error': 'Nenhum campo para atualizar'}), 400

    params.append(user_id)
    bd.execute(f'UPDATE users SET {", ".join(updates)} WHERE id = ?', params)

    # Log audit
    registar_auditoria(bd, g.utilizador_atual['user_id'], 'UPDATE', 'users', user_id,
                       old_values, dados)
    bd.commit()

    logger.info("User updated: %s", user_id)
    return jsonify({'message': 'Utilizador atualizado'}), 200


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@requer_admin
def delete_user(user_id):
    """Deactivate a user."""
    bd = obter_bd()
    user = bd.execute('SELECT id, email FROM users WHERE id = ?', (user_id,)).fetchone()

    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404

    # Can't delete yourself
    if user_id == g.utilizador_atual['user_id']:
        return jsonify({'error': 'Não pode eliminar a sua própria conta'}), 400

    # Soft delete
    bd.execute('UPDATE users SET active = 0 WHERE id = ?', (user_id,))

    # Invalidate sessions
    bd.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))

    registar_auditoria(bd, g.utilizador_atual['user_id'], 'DELETE', 'users', user_id,
                       {'email': user['email']}, None)
    bd.commit()

    logger.info("User deactivated: %s", user_id)
    return jsonify({'message': 'Utilizador desativado'}), 200


@users_bp.route('/<int:user_id>/permissions', methods=['GET'])
@requer_admin
def get_user_permissions(user_id):
    """Get user permissions."""
    bd = obter_bd()
    user = bd.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone()

    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404

    permissions = obter_permissoes_utilizador(user_id)
    return jsonify(permissions), 200


@users_bp.route('/<int:user_id>/permissions', methods=['PUT'])
@requer_admin
def update_user_permissions(user_id):
    """Update user permissions."""
    bd = obter_bd()
    user = bd.execute('SELECT id, role FROM users WHERE id = ?', (user_id,)).fetchone()

    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404

    # Admin and superadmin have all permissions - no need to set
    if user['role'] in ['admin', 'superadmin']:
        return jsonify({'message': 'Administradores têm todas as permissões'}), 200

    dados = request.get_json() or {}
    definir_permissoes_utilizador(user_id, dados)

    logger.info("Permissions updated for user: %s", user_id)
    return jsonify({'message': 'Permissões atualizadas'}), 200


@users_bp.route('/<int:user_id>/reset-password', methods=['POST'])
@requer_admin
def force_password_reset(user_id):
    """Force user to reset password on next login."""
    bd = obter_bd()
    user = bd.execute('SELECT id FROM users WHERE id = ?', (user_id,)).fetchone()

    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404

    dados = request.get_json() or {}
    new_password = dados.get('password', 'temp123')

    bd.execute('''
        UPDATE users SET password_hash = ?, must_change_password = 1
        WHERE id = ?
    ''', (hash_password(new_password), user_id))

    # Invalidate sessions
    bd.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))
    bd.commit()

    logger.info("Password reset forced for user: %s", user_id)
    return jsonify({'message': 'Password redefinida. O utilizador terá de alterar no próximo login.'}), 200


@users_bp.route('/<int:user_id>/toggle-2fa', methods=['POST'])
@requer_admin
def toggle_2fa(user_id):
    """Toggle 2FA for a user."""
    # Check if tenant has 2FA feature
    if not TenantPlanService.tenant_has_feature(g.tenant_id, '2fa'):
        return jsonify({'error': '2FA não disponível no seu plano'}), 403

    bd = obter_bd()
    user = bd.execute(
        'SELECT id, two_factor_enabled FROM users WHERE id = ?',
        (user_id,)
    ).fetchone()

    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404

    new_status = 0 if user['two_factor_enabled'] else 1
    bd.execute('UPDATE users SET two_factor_enabled = ? WHERE id = ?', (new_status, user_id))
    bd.commit()

    status_text = 'ativado' if new_status else 'desativado'
    logger.info("2FA %s for user: %s", status_text, user_id)
    return jsonify({'message': f'2FA {status_text}', 'enabled': bool(new_status)}), 200


@users_bp.route('/permission-sections', methods=['GET'])
@requer_admin
def list_permission_sections():
    """List available permission sections (modules)."""
    from ...shared.modules import get_tenant_modules, ModuleRegistry

    modules = get_tenant_modules(g.tenant_id)
    sections = []

    for module_id in modules:
        module = ModuleRegistry.get_module(module_id)
        if module:
            config = module['config']
            sections.append({
                'id': module_id,
                'name': config.get('name', module_id),
                'permissions': config.get('permissions', [])
            })

    return jsonify(sections), 200


# =========================================================================
# RGPD / GDPR COMPLIANCE ENDPOINTS
# =========================================================================

@users_bp.route('/me/data-export', methods=['GET'])
@requer_autenticacao
def export_my_data():
    """
    RGPD Art. 20 - Right to data portability.
    Export all personal data for the authenticated user.
    Returns a JSON file with all user data.
    """
    import json
    from flask import Response

    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    # Get user profile data
    user = bd.execute('''
        SELECT id, email, first_name, last_name, phone, role,
               two_factor_enabled, two_factor_method, created_at, last_login
        FROM users WHERE id = ?
    ''', (user_id,)).fetchone()

    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404

    export_data = {
        'export_date': datetime.now().isoformat(),
        'export_type': 'RGPD_DATA_PORTABILITY',
        'user_profile': {
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'phone': user['phone'],
            'role': user['role'],
            'two_factor_enabled': bool(user['two_factor_enabled']),
            'two_factor_method': user['two_factor_method'],
            'created_at': user['created_at'],
            'last_login': user['last_login']
        },
        'activity_log': [],
        'sessions': [],
        'assets_created': [],
        'interventions_created': []
    }

    # Get audit log entries for this user
    audit_logs = bd.execute('''
        SELECT action, table_name, record_id, old_values, new_values, created_at
        FROM audit_log WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 1000
    ''', (user_id,)).fetchall()

    for log in audit_logs:
        export_data['activity_log'].append({
            'action': log['action'],
            'table': log['table_name'],
            'record_id': log['record_id'],
            'timestamp': log['created_at']
        })

    # Get session history
    sessions = bd.execute('''
        SELECT token, ip_address, user_agent, created_at, expires_at
        FROM sessions WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 100
    ''', (user_id,)).fetchall()

    for session in sessions:
        export_data['sessions'].append({
            'ip_address': session['ip_address'],
            'user_agent': session['user_agent'],
            'created_at': session['created_at'],
            'expires_at': session['expires_at']
        })

    # Get assets created by this user
    assets = bd.execute('''
        SELECT serial_number, created_at
        FROM assets WHERE created_by = ?
        ORDER BY created_at DESC
    ''', (user_id,)).fetchall()

    for asset in assets:
        export_data['assets_created'].append({
            'serial_number': asset['serial_number'],
            'created_at': asset['created_at']
        })

    # Get interventions created by this user
    interventions = bd.execute('''
        SELECT id, intervention_type, status, created_at
        FROM interventions WHERE created_by = ?
        ORDER BY created_at DESC
    ''', (user_id,)).fetchall()

    for intervention in interventions:
        export_data['interventions_created'].append({
            'id': intervention['id'],
            'type': intervention['intervention_type'],
            'status': intervention['status'],
            'created_at': intervention['created_at']
        })

    # Log the export request
    registar_auditoria(bd, user_id, 'RGPD_EXPORT', 'users', user_id, None, {
        'export_type': 'data_portability'
    })
    bd.commit()

    logger.info("RGPD data export for user: %s", user_id)

    # Return as downloadable JSON file
    response = Response(
        json.dumps(export_data, indent=2, ensure_ascii=False),
        mimetype='application/json',
        headers={
            'Content-Disposition': f'attachment; filename=my_data_export_{datetime.now().strftime("%Y%m%d")}.json'
        }
    )
    return response


@users_bp.route('/me/delete-request', methods=['POST'])
@requer_autenticacao
def request_account_deletion():
    """
    RGPD Art. 17 - Right to erasure (right to be forgotten).
    Request account deletion. Creates a pending deletion request.
    """
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    dados = request.get_json() or {}
    reason = dados.get('reason', '')
    password = dados.get('password', '')

    # Verify password
    from ...shared.security import verify_password
    user = bd.execute('SELECT password_hash FROM users WHERE id = ?', (user_id,)).fetchone()

    if not user or not verify_password(password, user['password_hash']):
        return jsonify({'error': 'Password incorreta'}), 401

    # Check if there's already a pending request
    existing = bd.execute('''
        SELECT id FROM deletion_requests WHERE user_id = ? AND status = 'pending'
    ''', (user_id,)).fetchone()

    if existing:
        return jsonify({'error': 'Já existe um pedido de eliminação pendente'}), 400

    # Create deletion request (30 day waiting period per RGPD)
    from datetime import timedelta
    scheduled_date = datetime.now() + timedelta(days=30)

    bd.execute('''
        INSERT INTO deletion_requests (user_id, reason, scheduled_deletion_date, status)
        VALUES (?, ?, ?, 'pending')
    ''', (user_id, reason, scheduled_date.isoformat()))

    # Log the request
    registar_auditoria(bd, user_id, 'RGPD_DELETE_REQUEST', 'users', user_id, None, {
        'reason': reason,
        'scheduled_date': scheduled_date.isoformat()
    })
    bd.commit()

    logger.info("RGPD deletion request for user: %s, scheduled: %s", user_id, scheduled_date)

    return jsonify({
        'message': 'Pedido de eliminação registado',
        'scheduled_deletion_date': scheduled_date.isoformat(),
        'notice': 'A sua conta será eliminada em 30 dias. Pode cancelar este pedido a qualquer momento.'
    }), 200


@users_bp.route('/me/cancel-deletion', methods=['POST'])
@requer_autenticacao
def cancel_deletion_request():
    """Cancel a pending account deletion request."""
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    result = bd.execute('''
        UPDATE deletion_requests SET status = 'cancelled', cancelled_at = ?
        WHERE user_id = ? AND status = 'pending'
    ''', (datetime.now().isoformat(), user_id))

    if result.rowcount == 0:
        return jsonify({'error': 'Não existe pedido de eliminação pendente'}), 404

    registar_auditoria(bd, user_id, 'RGPD_DELETE_CANCEL', 'users', user_id, None, None)
    bd.commit()

    logger.info("RGPD deletion cancelled for user: %s", user_id)
    return jsonify({'message': 'Pedido de eliminação cancelado'}), 200


@users_bp.route('/me/deletion-status', methods=['GET'])
@requer_autenticacao
def get_deletion_status():
    """Get current deletion request status."""
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    request_info = bd.execute('''
        SELECT id, reason, scheduled_deletion_date, status, created_at
        FROM deletion_requests WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 1
    ''', (user_id,)).fetchone()

    if not request_info:
        return jsonify({'has_pending_request': False}), 200

    return jsonify({
        'has_pending_request': request_info['status'] == 'pending',
        'status': request_info['status'],
        'scheduled_deletion_date': request_info['scheduled_deletion_date'],
        'created_at': request_info['created_at']
    }), 200


@users_bp.route('/<int:user_id>/anonymize', methods=['POST'])
@requer_admin
def anonymize_user(user_id):
    """
    RGPD Art. 17 - Admin endpoint to anonymize a user's personal data.
    Replaces personal data with anonymized values while preserving audit trail.
    """
    bd = obter_bd()
    user = bd.execute('SELECT id, email FROM users WHERE id = ?', (user_id,)).fetchone()

    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404

    # Can't anonymize yourself
    if user_id == g.utilizador_atual['user_id']:
        return jsonify({'error': 'Não pode anonimizar a sua própria conta'}), 400

    # Generate anonymized values
    anon_id = f"ANON_{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Anonymize user data
    bd.execute('''
        UPDATE users SET
            email = ?,
            first_name = 'Utilizador',
            last_name = 'Anonimizado',
            phone = NULL,
            password_hash = 'ANONYMIZED',
            active = 0,
            two_factor_enabled = 0
        WHERE id = ?
    ''', (f"{anon_id}@anonymized.local", user_id))

    # Delete sessions
    bd.execute('DELETE FROM sessions WHERE user_id = ?', (user_id,))

    # Delete 2FA codes
    bd.execute('DELETE FROM two_factor_codes WHERE user_id = ?', (user_id,))

    # Update deletion request if exists
    bd.execute('''
        UPDATE deletion_requests SET status = 'completed', completed_at = ?
        WHERE user_id = ? AND status = 'pending'
    ''', (datetime.now().isoformat(), user_id))

    # Log the anonymization
    registar_auditoria(bd, g.utilizador_atual['user_id'], 'RGPD_ANONYMIZE', 'users', user_id,
                       {'original_email': user['email']}, {'anonymized_id': anon_id})
    bd.commit()

    logger.info("User anonymized: %s -> %s", user['email'], anon_id)
    return jsonify({
        'message': 'Utilizador anonimizado com sucesso',
        'anonymized_id': anon_id
    }), 200


@users_bp.route('/deletion-requests', methods=['GET'])
@requer_admin
def list_deletion_requests():
    """List all pending deletion requests (admin view)."""
    bd = obter_bd()

    requests = bd.execute('''
        SELECT dr.*, u.email, u.first_name, u.last_name
        FROM deletion_requests dr
        JOIN users u ON dr.user_id = u.id
        WHERE dr.status = 'pending'
        ORDER BY dr.scheduled_deletion_date ASC
    ''').fetchall()

    return jsonify([dict(r) for r in requests]), 200


@users_bp.route('/consent-log', methods=['POST'])
@requer_autenticacao
def log_consent():
    """
    RGPD Art. 7 - Log user consent for specific purposes.
    Records consent with timestamp for compliance.
    """
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']
    dados = request.get_json() or {}

    consent_type = dados.get('consent_type', '')  # e.g., 'marketing', 'analytics', 'cookies'
    granted = dados.get('granted', False)

    if not consent_type:
        return jsonify({'error': 'Tipo de consentimento é obrigatório'}), 400

    # Upsert consent record
    bd.execute('''
        INSERT INTO user_consents (user_id, consent_type, granted, ip_address, user_agent, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, consent_type) DO UPDATE SET
            granted = ?, ip_address = ?, user_agent = ?, updated_at = ?
    ''', (
        user_id, consent_type, 1 if granted else 0,
        request.remote_addr, request.headers.get('User-Agent', ''),
        datetime.now().isoformat(),
        1 if granted else 0, request.remote_addr,
        request.headers.get('User-Agent', ''), datetime.now().isoformat()
    ))

    registar_auditoria(bd, user_id, 'CONSENT_UPDATE', 'user_consents', user_id, None, {
        'consent_type': consent_type,
        'granted': granted
    })
    bd.commit()

    logger.info("Consent %s for user %s: %s", 'granted' if granted else 'revoked', user_id, consent_type)
    return jsonify({'message': 'Consentimento registado'}), 200


@users_bp.route('/me/consents', methods=['GET'])
@requer_autenticacao
def get_my_consents():
    """Get all consent records for the authenticated user."""
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    consents = bd.execute('''
        SELECT consent_type, granted, updated_at
        FROM user_consents WHERE user_id = ?
    ''', (user_id,)).fetchall()

    return jsonify([dict(c) for c in consents]), 200
