"""
SmartLamppost v5.0 - Authentication Routes
Login, logout, 2FA, password management.
"""

import random
import string
import logging
from datetime import datetime, timedelta

from flask import Blueprint, request, jsonify, g

from ...shared.database import obter_bd, carregar_tenants, MASTER_TENANT_ID
from ...shared.security import hash_password, verify_password, generate_token
from ...shared.permissions import requer_autenticacao, identificar_tenant_por_email
from ...shared.email_service import enviar_email_2fa, enviar_sms_2fa, enviar_email_reset_password
from ...shared.config import Config
from ...shared.error_codes import ErrorCode, error_response

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """User login endpoint."""
    dados = request.get_json() or {}
    email = dados.get('email', '').strip().lower()
    password = dados.get('password', '')

    if not email or not password:
        return jsonify({'error_code': ErrorCode.FIELDS_REQUIRED}), 400

    # Identify tenant by email
    tenant_id = identificar_tenant_por_email(email)
    if not tenant_id:
        return jsonify({'error_code': ErrorCode.INVALID_CREDENTIALS}), 401

    g.tenant_id = tenant_id
    bd = obter_bd(tenant_id)

    # Find user
    user = bd.execute('''
        SELECT id, email, password_hash, role, first_name, last_name,
               two_factor_enabled, two_factor_method, must_change_password,
               failed_login_attempts, locked_until, active
        FROM users WHERE email = ?
    ''', (email,)).fetchone()

    if not user:
        return jsonify({'error_code': ErrorCode.INVALID_CREDENTIALS}), 401

    if not user['active']:
        return jsonify({'error_code': ErrorCode.ACCOUNT_INACTIVE}), 401

    # Check if account is locked
    if user['locked_until']:
        locked_until = datetime.fromisoformat(user['locked_until'])
        if datetime.now() < locked_until:
            return jsonify({'error_code': ErrorCode.ACCOUNT_LOCKED}), 401
        # Reset lock
        bd.execute('UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = ?',
                   (user['id'],))
        bd.commit()

    # Verify password
    if not verify_password(password, user['password_hash']):
        # Increment failed attempts
        attempts = user['failed_login_attempts'] + 1
        if attempts >= 5:
            lock_until = datetime.now() + timedelta(minutes=15)
            bd.execute('''
                UPDATE users SET failed_login_attempts = ?, locked_until = ?
                WHERE id = ?
            ''', (attempts, lock_until.isoformat(), user['id']))
        else:
            bd.execute('UPDATE users SET failed_login_attempts = ? WHERE id = ?',
                       (attempts, user['id']))
        bd.commit()
        return jsonify({'error_code': ErrorCode.INVALID_CREDENTIALS}), 401

    # Reset failed attempts
    bd.execute('UPDATE users SET failed_login_attempts = 0 WHERE id = ?', (user['id'],))

    # Check if 2FA is enabled
    if user['two_factor_enabled']:
        # Generate 2FA code
        code = ''.join(random.choices(string.digits, k=Config.CODE_2FA_LENGTH))
        expires = datetime.now() + timedelta(minutes=Config.CODE_2FA_EXPIRATION_MINUTES)

        bd.execute('''
            INSERT INTO two_factor_codes (user_id, code, method, expires_at)
            VALUES (?, ?, ?, ?)
        ''', (user['id'], code, user['two_factor_method'], expires.isoformat()))
        bd.commit()

        # Send code
        method = user['two_factor_method']
        if method == 'sms':
            phone = bd.execute('SELECT phone FROM users WHERE id = ?', (user['id'],)).fetchone()
            if phone and phone['phone']:
                enviar_sms_2fa(phone['phone'], code)
        else:
            enviar_email_2fa(email, code)

        return jsonify({
            'requires_2fa': True,
            'method': method,
            'user_id': user['id'],
            'tenant_id': tenant_id
        }), 200

    # Create session
    token = generate_token()
    expires = datetime.now() + timedelta(hours=Config.TOKEN_EXPIRATION_HOURS)

    bd.execute('''
        INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        user['id'], token, expires.isoformat(),
        request.remote_addr, request.headers.get('User-Agent', '')[:255]
    ))

    # Update last login
    bd.execute('UPDATE users SET last_login = ? WHERE id = ?',
               (datetime.now().isoformat(), user['id']))
    bd.commit()

    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'tenant_id': tenant_id,
            'must_change_password': bool(user['must_change_password'])
        }
    }), 200


@auth_bp.route('/verify-2fa', methods=['POST'])
def verify_2fa():
    """Verify 2FA code and complete login."""
    dados = request.get_json() or {}
    user_id = dados.get('user_id')
    tenant_id = dados.get('tenant_id')
    code = dados.get('code', '').strip()

    if not all([user_id, tenant_id, code]):
        return jsonify({'error_code': ErrorCode.FIELDS_REQUIRED}), 400

    g.tenant_id = tenant_id
    bd = obter_bd(tenant_id)

    # Find valid code
    code_record = bd.execute('''
        SELECT id, attempts FROM two_factor_codes
        WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > ?
    ''', (user_id, code, datetime.now().isoformat())).fetchone()

    if not code_record:
        # Check attempts
        pending = bd.execute('''
            SELECT id, attempts FROM two_factor_codes
            WHERE user_id = ? AND used = 0 AND expires_at > ?
            ORDER BY created_at DESC LIMIT 1
        ''', (user_id, datetime.now().isoformat())).fetchone()

        if pending:
            attempts = pending['attempts'] + 1
            if attempts >= Config.MAX_2FA_ATTEMPTS:
                bd.execute('UPDATE two_factor_codes SET used = 1 WHERE id = ?', (pending['id'],))
                bd.commit()
                return jsonify({'error_code': ErrorCode.SESSION_EXPIRED}), 401

            bd.execute('UPDATE two_factor_codes SET attempts = ? WHERE id = ?',
                       (attempts, pending['id']))
            bd.commit()

        return jsonify({'error_code': ErrorCode.INVALID_2FA_CODE}), 401

    # Mark code as used
    bd.execute('UPDATE two_factor_codes SET used = 1 WHERE id = ?', (code_record['id'],))

    # Get user
    user = bd.execute('''
        SELECT id, email, role, first_name, last_name, must_change_password
        FROM users WHERE id = ?
    ''', (user_id,)).fetchone()

    # Create session
    token = generate_token()
    expires = datetime.now() + timedelta(hours=Config.TOKEN_EXPIRATION_HOURS)

    bd.execute('''
        INSERT INTO sessions (user_id, token, expires_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        user_id, token, expires.isoformat(),
        request.remote_addr, request.headers.get('User-Agent', '')[:255]
    ))

    bd.execute('UPDATE users SET last_login = ? WHERE id = ?',
               (datetime.now().isoformat(), user_id))
    bd.commit()

    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'role': user['role'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'tenant_id': tenant_id,
            'must_change_password': bool(user['must_change_password'])
        }
    }), 200


@auth_bp.route('/resend-2fa', methods=['POST'])
def resend_2fa():
    """Resend 2FA code."""
    dados = request.get_json() or {}
    user_id = dados.get('user_id')
    tenant_id = dados.get('tenant_id')

    if not all([user_id, tenant_id]):
        return jsonify({'error_code': ErrorCode.FIELDS_REQUIRED}), 400

    g.tenant_id = tenant_id
    bd = obter_bd(tenant_id)

    user = bd.execute('''
        SELECT email, phone, two_factor_method FROM users WHERE id = ?
    ''', (user_id,)).fetchone()

    if not user:
        return jsonify({'error_code': ErrorCode.USER_NOT_FOUND}), 404

    # Invalidate old codes
    bd.execute('UPDATE two_factor_codes SET used = 1 WHERE user_id = ? AND used = 0', (user_id,))

    # Generate new code
    code = ''.join(random.choices(string.digits, k=Config.CODE_2FA_LENGTH))
    expires = datetime.now() + timedelta(minutes=Config.CODE_2FA_EXPIRATION_MINUTES)

    bd.execute('''
        INSERT INTO two_factor_codes (user_id, code, method, expires_at)
        VALUES (?, ?, ?, ?)
    ''', (user_id, code, user['two_factor_method'], expires.isoformat()))
    bd.commit()

    # Send code
    if user['two_factor_method'] == 'sms' and user['phone']:
        enviar_sms_2fa(user['phone'], code)
    else:
        enviar_email_2fa(user['email'], code)

    return jsonify({'message': 'code_resent'}), 200


@auth_bp.route('/logout', methods=['POST'])
@requer_autenticacao
def logout():
    """User logout - invalidate session."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    bd = obter_bd()
    bd.execute('DELETE FROM sessions WHERE token = ?', (token,))
    bd.commit()
    return jsonify({'message': 'logout_success'}), 200


@auth_bp.route('/me', methods=['GET'])
@requer_autenticacao
def me():
    """Get current user info."""
    user = g.utilizador_atual
    tenant_id = g.tenant_id

    # Get tenant info
    from ...shared.database import obter_tenant
    from ...shared.modules import get_tenant_menu_items

    tenant = obter_tenant(tenant_id)
    menu_items = get_tenant_menu_items(tenant_id, user.get('role', 'user'))

    # Get user language preference (handle missing column gracefully)
    bd = obter_bd(tenant_id)
    user_language = 'pt'
    try:
        user_data = bd.execute(
            'SELECT language FROM users WHERE id = ?',
            (user['user_id'],)
        ).fetchone()
        if user_data and user_data['language']:
            user_language = user_data['language']
    except Exception:
        pass  # Column doesn't exist yet, use default

    return jsonify({
        'id': user['user_id'],
        'email': user['email'],
        'role': user['role'],
        'first_name': user.get('first_name'),
        'last_name': user.get('last_name'),
        'tenant_id': tenant_id,
        'tenant_name': tenant.get('name', tenant_id) if tenant else tenant_id,
        'must_change_password': bool(user.get('must_change_password')),
        'two_factor_enabled': bool(user.get('two_factor_enabled')),
        'menu_items': menu_items,
        'language': user_language
    }), 200


@auth_bp.route('/preferences', methods=['PUT'])
@requer_autenticacao
def update_preferences():
    """Update user preferences like language."""
    dados = request.get_json() or {}
    language = dados.get('language')

    if language and language not in ['pt', 'en', 'fr', 'de']:
        return jsonify({'error_code': ErrorCode.VALIDATION_ERROR}), 400

    bd = obter_bd()
    if language:
        try:
            bd.execute(
                'UPDATE users SET language = ? WHERE id = ?',
                (language, g.utilizador_atual['user_id'])
            )
            bd.commit()
        except Exception:
            # Column doesn't exist, try to add it
            try:
                bd.execute('ALTER TABLE users ADD COLUMN language TEXT DEFAULT "pt"')
                bd.execute(
                    'UPDATE users SET language = ? WHERE id = ?',
                    (language, g.utilizador_atual['user_id'])
                )
                bd.commit()
            except Exception:
                pass  # Already exists or other error

    return jsonify({'message': 'preferences_updated'}), 200


@auth_bp.route('/change-password', methods=['POST'])
@requer_autenticacao
def change_password():
    """Change user password."""
    dados = request.get_json() or {}
    current = dados.get('current_password', '')
    new = dados.get('new_password', '')
    confirm = dados.get('confirm_password', '')

    if not all([current, new, confirm]):
        return jsonify({'error_code': ErrorCode.FIELDS_REQUIRED}), 400

    if new != confirm:
        return jsonify({'error_code': ErrorCode.PASSWORDS_DONT_MATCH}), 400

    if len(new) < 8:
        return jsonify({'error_code': ErrorCode.PASSWORD_TOO_SHORT}), 400

    bd = obter_bd()
    user = bd.execute(
        'SELECT password_hash FROM users WHERE id = ?',
        (g.utilizador_atual['user_id'],)
    ).fetchone()

    if not verify_password(current, user['password_hash']):
        return jsonify({'error_code': ErrorCode.INVALID_CREDENTIALS}), 401

    new_hash = hash_password(new)
    bd.execute('''
        UPDATE users SET password_hash = ?, must_change_password = 0
        WHERE id = ?
    ''', (new_hash, g.utilizador_atual['user_id']))
    bd.commit()

    return jsonify({'message': 'password_changed'}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset."""
    dados = request.get_json() or {}
    email = dados.get('email', '').strip().lower()

    if not email:
        return jsonify({'error_code': ErrorCode.EMAIL_REQUIRED}), 400

    tenant_id = identificar_tenant_por_email(email)
    if not tenant_id:
        # Don't reveal if email exists
        return jsonify({'message': 'reset_email_sent'}), 200

    g.tenant_id = tenant_id
    bd = obter_bd(tenant_id)

    user = bd.execute('SELECT id FROM users WHERE email = ? AND active = 1', (email,)).fetchone()
    if not user:
        return jsonify({'message': 'reset_email_sent'}), 200

    # Generate reset token
    token = generate_token()
    expires = datetime.now() + timedelta(hours=1)

    bd.execute('''
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    ''', (user['id'], token, expires.isoformat()))
    bd.commit()

    # Send email
    enviar_email_reset_password(email, token, tenant_id)

    return jsonify({'message': 'reset_email_sent'}), 200


@auth_bp.route('/bootstrap', methods=['POST'])
def bootstrap():
    """Bootstrap/reset admin user for emergency access."""
    # This creates/resets the admin user for the master tenant
    from ...shared.database import inicializar_bd_tenant, carregar_tenants, guardar_tenants

    try:
        # Ensure master tenant is registered in tenants.json
        dados = carregar_tenants()
        tenant_ids = [t['id'] for t in dados.get('tenants', [])]

        if MASTER_TENANT_ID not in tenant_ids:
            dados['tenants'].append({
                'id': MASTER_TENANT_ID,
                'name': 'SmartLamppost',
                'plan': 'enterprise',
                'active': True,
                'created_at': datetime.now().isoformat()
            })
            guardar_tenants(dados)
            logger.info(f"Registered master tenant: {MASTER_TENANT_ID}")

        # Initialize master tenant database if needed
        inicializar_bd_tenant(MASTER_TENANT_ID)

        bd = obter_bd(MASTER_TENANT_ID)

        # Check if admin exists
        admin = bd.execute("SELECT id FROM users WHERE email = 'admin@smartlamppost.com'").fetchone()

        new_hash = hash_password('Admin123!')

        if admin:
            # Reset admin password
            bd.execute('''
                UPDATE users SET
                    password_hash = ?,
                    active = 1,
                    failed_login_attempts = 0,
                    locked_until = NULL,
                    must_change_password = 0
                WHERE email = 'admin@smartlamppost.com'
            ''', (new_hash,))
        else:
            # Create admin user
            bd.execute('''
                INSERT INTO users (email, password_hash, role, first_name, last_name, active)
                VALUES ('admin@smartlamppost.com', ?, 'superadmin', 'Admin', 'Sistema', 1)
            ''', (new_hash,))

        bd.commit()

        return jsonify({
            'message': 'Admin user ready',
            'email': 'admin@smartlamppost.com',
            'password': 'Admin123!',
            'tenant': MASTER_TENANT_ID
        }), 200

    except Exception as e:
        logger.error(f"Bootstrap error: {e}")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token."""
    dados = request.get_json() or {}
    token = dados.get('token', '')
    new_password = dados.get('new_password', '')

    if not all([token, new_password]):
        return jsonify({'error_code': ErrorCode.FIELDS_REQUIRED}), 400

    if len(new_password) < 8:
        return jsonify({'error_code': ErrorCode.PASSWORD_TOO_SHORT}), 400

    # Search for token in all tenants
    dados_tenants = carregar_tenants()
    for tenant in dados_tenants.get('tenants', []):
        try:
            bd = obter_bd(tenant['id'])
            reset = bd.execute('''
                SELECT user_id FROM password_reset_tokens
                WHERE token = ? AND used = 0 AND expires_at > ?
            ''', (token, datetime.now().isoformat())).fetchone()

            if reset:
                new_hash = hash_password(new_password)
                bd.execute('''
                    UPDATE users SET password_hash = ?, must_change_password = 0
                    WHERE id = ?
                ''', (new_hash, reset['user_id']))
                bd.execute('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', (token,))
                bd.commit()
                return jsonify({'message': 'password_changed'}), 200
        except Exception:
            continue

    return jsonify({'error_code': ErrorCode.SESSION_EXPIRED}), 400
