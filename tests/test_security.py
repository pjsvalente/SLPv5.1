"""
Tests for security utilities - password hashing, path validation, permission checks.
"""

import os
import tempfile
import pytest

from utils.security import (
    hash_password, verify_password, generate_token,
    validate_safe_path, validate_permission_action,
    VALID_PERMISSION_ACTIONS
)


class TestPasswordHashing:
    """Tests for password hashing and verification."""

    def test_hash_password_returns_werkzeug_format(self):
        hashed = hash_password('test123')
        assert hashed.startswith('pbkdf2:sha256')

    def test_hash_password_different_for_same_input(self):
        """Salted hashes should differ even for same password."""
        h1 = hash_password('test123')
        h2 = hash_password('test123')
        assert h1 != h2

    def test_verify_password_correct(self):
        hashed = hash_password('mypassword')
        assert verify_password('mypassword', hashed) is True

    def test_verify_password_incorrect(self):
        hashed = hash_password('mypassword')
        assert verify_password('wrongpassword', hashed) is False

    def test_verify_legacy_sha256_password(self):
        """Legacy SHA-256 hashes should still be verifiable for migration."""
        import hashlib
        legacy_hash = hashlib.sha256('admin123'.encode()).hexdigest()
        assert verify_password('admin123', legacy_hash) is True

    def test_verify_legacy_sha256_wrong_password(self):
        import hashlib
        legacy_hash = hashlib.sha256('admin123'.encode()).hexdigest()
        assert verify_password('wrongpwd', legacy_hash) is False

    def test_empty_password(self):
        hashed = hash_password('')
        assert verify_password('', hashed) is True
        assert verify_password('notempty', hashed) is False


class TestTokenGeneration:
    """Tests for session token generation."""

    def test_generate_token_returns_string(self):
        token = generate_token()
        assert isinstance(token, str)

    def test_generate_token_sufficient_length(self):
        token = generate_token()
        assert len(token) >= 32

    def test_generate_token_unique(self):
        tokens = {generate_token() for _ in range(100)}
        assert len(tokens) == 100


class TestPathValidation:
    """Tests for path traversal prevention."""

    def test_valid_path_within_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            safe = os.path.join(tmpdir, 'file.txt')
            result = validate_safe_path(safe, tmpdir)
            assert result is not None
            assert result.startswith(os.path.realpath(tmpdir))

    def test_path_traversal_rejected(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            malicious = os.path.join(tmpdir, '..', '..', 'etc', 'passwd')
            result = validate_safe_path(malicious, tmpdir)
            assert result is None

    def test_path_traversal_with_dotdot(self):
        """Test ../../ style path traversal escaping the allowed directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            subdir = os.path.join(tmpdir, 'backups')
            os.makedirs(subdir)
            # Create a file outside subdir
            outside_file = os.path.join(tmpdir, 'secret.txt')
            with open(outside_file, 'w') as f:
                f.write('secret')
            malicious = os.path.join(subdir, '..', 'secret.txt')
            result = validate_safe_path(malicious, subdir)
            assert result is None, "Path traversal with .. should be rejected"

    def test_symlink_traversal_rejected(self):
        """Symlinks pointing outside the directory should be rejected."""
        with tempfile.TemporaryDirectory() as tmpdir:
            target = '/tmp'
            link = os.path.join(tmpdir, 'evil_link')
            try:
                os.symlink(target, link)
                result = validate_safe_path(os.path.join(link, 'something'), tmpdir)
                assert result is None
            finally:
                if os.path.islink(link):
                    os.unlink(link)

    def test_directory_itself_is_valid(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = validate_safe_path(tmpdir, tmpdir)
            assert result is not None


class TestPermissionActionValidation:
    """Tests for SQL injection prevention in permission checks."""

    def test_valid_actions(self):
        for action in ['view', 'create', 'edit', 'delete']:
            assert validate_permission_action(action) == action

    def test_invalid_action_rejected(self):
        assert validate_permission_action('drop') is None

    def test_sql_injection_rejected(self):
        assert validate_permission_action("view; DROP TABLE users--") is None

    def test_empty_action_rejected(self):
        assert validate_permission_action('') is None

    def test_none_action_rejected(self):
        assert validate_permission_action(None) is None

    def test_valid_actions_constant(self):
        assert VALID_PERMISSION_ACTIONS == frozenset({'view', 'create', 'edit', 'delete'})
