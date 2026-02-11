"""SmartLamppost v5.0 - Core modules (always active)."""

from .auth import auth_bp
from .tenants import tenants_bp
from .users import users_bp

__all__ = ['auth_bp', 'tenants_bp', 'users_bp']
