"""Shared utilities for SmartLamppost v5."""

from .database import (
    obter_bd, obter_bd_catalogo, obter_config,
    carregar_tenants, guardar_tenants, obter_tenant,
    tenant_existe, inicializar_bd_tenant, registar_auditoria
)
from .security import (
    hash_password, verify_password, generate_token,
    validate_safe_path, validate_permission_action
)
from .permissions import (
    verificar_permissao, requer_autenticacao,
    requer_admin, requer_superadmin
)
from .modules import ModuleRegistry, get_tenant_modules
from .plans import PlanService

__all__ = [
    'obter_bd', 'obter_bd_catalogo', 'obter_config',
    'carregar_tenants', 'guardar_tenants', 'obter_tenant',
    'tenant_existe', 'inicializar_bd_tenant', 'registar_auditoria',
    'hash_password', 'verify_password', 'generate_token',
    'validate_safe_path', 'validate_permission_action',
    'verificar_permissao', 'requer_autenticacao',
    'requer_admin', 'requer_superadmin',
    'ModuleRegistry', 'get_tenant_modules',
    'PlanService'
]
