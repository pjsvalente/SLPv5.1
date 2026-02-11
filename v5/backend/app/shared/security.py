"""
SmartLamppost v4.0 - Security utilities
Password hashing, token generation, and path validation.
"""

import os
import secrets
import logging

from werkzeug.security import generate_password_hash, check_password_hash

logger = logging.getLogger(__name__)

# Valid actions for permission checks (whitelist to prevent SQL injection)
VALID_PERMISSION_ACTIONS = frozenset({'view', 'create', 'edit', 'delete'})


def hash_password(password):
    """Generate a secure password hash using werkzeug (pbkdf2:sha256 with salt)."""
    return generate_password_hash(password, method='pbkdf2:sha256')


def verify_password(password, password_hash):
    """Verify a password against a hash.

    Supports both new werkzeug hashes and legacy SHA-256 hashes for migration.
    """
    import hashlib

    # Try werkzeug format first
    if password_hash.startswith('pbkdf2:') or password_hash.startswith('scrypt:'):
        return check_password_hash(password_hash, password)

    # Fall back to legacy SHA-256 for existing accounts
    legacy_hash = hashlib.sha256(password.encode()).hexdigest()
    if password_hash == legacy_hash:
        logger.info("Legacy SHA-256 password matched - should be migrated on next change")
        return True

    return False


def generate_token():
    """Generate a cryptographically secure session token."""
    return secrets.token_urlsafe(32)


def validate_safe_path(file_path, allowed_directory):
    """Validate that a file path is within an allowed directory.

    Prevents path traversal attacks by resolving symlinks and relative paths.
    Returns the resolved path if safe, None otherwise.
    """
    resolved_path = os.path.realpath(file_path)
    resolved_dir = os.path.realpath(allowed_directory)

    if resolved_path.startswith(resolved_dir + os.sep) or resolved_path == resolved_dir:
        return resolved_path
    return None


def validate_permission_action(action):
    """Validate that a permission action is in the allowed whitelist.

    Prevents SQL injection through the action parameter.
    Returns the validated action or None.
    """
    if action in VALID_PERMISSION_ACTIONS:
        return action
    logger.warning("Invalid permission action attempted: %s", action)
    return None
