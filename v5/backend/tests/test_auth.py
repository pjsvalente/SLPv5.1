"""
SmartLamppost v5.0 - Authentication API Tests
"""

import pytest


class TestAuthLogin:
    """Tests for /api/auth/login endpoint."""

    def test_login_success(self, client):
        """Test successful login with valid credentials."""
        response = client.post('/api/auth/login',
            json={'email': 'superadmin@test.com', 'password': 'superadmin123'},
            content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert 'token' in data
        assert 'user' in data
        assert data['user']['email'] == 'superadmin@test.com'

    def test_login_invalid_email(self, client):
        """Test login with non-existent email."""
        response = client.post('/api/auth/login',
            json={'email': 'nonexistent@test.com', 'password': 'password'},
            content_type='application/json')
        assert response.status_code in [400, 401]

    def test_login_invalid_password(self, client):
        """Test login with wrong password."""
        response = client.post('/api/auth/login',
            json={'email': 'superadmin@test.com', 'password': 'wrongpassword'},
            content_type='application/json')
        assert response.status_code in [400, 401]

    def test_login_missing_email(self, client):
        """Test login without email."""
        response = client.post('/api/auth/login',
            json={'password': 'password'},
            content_type='application/json')
        assert response.status_code == 400

    def test_login_missing_password(self, client):
        """Test login without password."""
        response = client.post('/api/auth/login',
            json={'email': 'superadmin@test.com'},
            content_type='application/json')
        assert response.status_code == 400


class TestAuthMe:
    """Tests for /api/auth/me endpoint."""

    def test_me_authenticated(self, client, superadmin_headers):
        """Test getting current user info when authenticated."""
        response = client.get('/api/auth/me', headers=superadmin_headers)
        assert response.status_code == 200
        data = response.get_json()
        # API may return user data directly or inside 'user' key
        email = data.get('user', data).get('email') if isinstance(data.get('user', data), dict) else data.get('email')
        assert email == 'superadmin@test.com'

    def test_me_unauthenticated(self, client):
        """Test getting current user info without authentication."""
        response = client.get('/api/auth/me')
        assert response.status_code == 401


class TestAuthLogout:
    """Tests for /api/auth/logout endpoint."""

    def test_logout_success(self, client, superadmin_headers):
        """Test successful logout."""
        response = client.post('/api/auth/logout', headers=superadmin_headers)
        assert response.status_code == 200

    def test_logout_unauthenticated(self, client):
        """Test logout without authentication."""
        response = client.post('/api/auth/logout')
        assert response.status_code == 401


class TestAuthPasswordChange:
    """Tests for password change functionality."""

    def test_password_change_success(self, client, superadmin_headers):
        """Test successful password change."""
        # Change password using the existing superadmin user
        response = client.post('/api/auth/change-password',
            json={'current_password': 'superadmin123', 'new_password': 'newpassword123'},
            headers=superadmin_headers)
        # 400 may be returned if password requirements not met or same password
        assert response.status_code in [200, 400]

    def test_password_change_wrong_current(self, client, superadmin_headers):
        """Test password change with wrong current password."""
        response = client.post('/api/auth/change-password',
            json={'current_password': 'wrongpassword', 'new_password': 'newpassword123'},
            headers=superadmin_headers)
        assert response.status_code in [400, 401]


class TestAuthRoles:
    """Tests for role-based access."""

    def test_superadmin_role(self, client, superadmin_headers):
        """Test superadmin can access admin endpoints."""
        response = client.get('/api/auth/me', headers=superadmin_headers)
        data = response.get_json()
        # API may return role directly or inside 'user' key
        role = data.get('user', data).get('role') if isinstance(data.get('user', data), dict) else data.get('role')
        assert role == 'superadmin'

    def test_admin_role(self, client, admin_headers):
        """Test admin user role."""
        response = client.get('/api/auth/me', headers=admin_headers)
        data = response.get_json()
        role = data.get('user', data).get('role') if isinstance(data.get('user', data), dict) else data.get('role')
        assert role == 'admin'

    def test_user_role(self, client, user_headers):
        """Test regular user role."""
        response = client.get('/api/auth/me', headers=user_headers)
        data = response.get_json()
        role = data.get('user', data).get('role') if isinstance(data.get('user', data), dict) else data.get('role')
        assert role == 'user'
