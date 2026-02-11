"""
SmartLamppost v5.0 - Plan Service
Manage subscription plans and their features.
"""

import os
import json
import logging

logger = logging.getLogger(__name__)

# Plans cache
_plans = None
_plans_path = None


def _load_plans(base_path=None):
    """Load plans from configuration file."""
    global _plans, _plans_path

    if base_path:
        _plans_path = base_path

    if _plans_path is None:
        return {}

    # Try multiple possible locations
    possible_paths = [
        os.path.join(_plans_path, 'data', 'config', 'plans.json'),  # Production: /app/data/config/
        os.path.join(_plans_path, 'config', 'plans.json'),          # Development: v5/config/
        os.path.join(os.path.dirname(_plans_path), 'config', 'plans.json'),  # Fallback: parent/config/
    ]

    for config_path in possible_paths:
        if os.path.exists(config_path):
            logger.info(f"Loading plans from: {config_path}")
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                _plans = data.get('plans', {})
                return _plans

    # If no file found, create default plans
    logger.warning("Plans file not found, using default plans")
    _plans = _get_default_plans()
    return _plans


def _get_default_plans():
    """Return default plans if config file not found."""
    return {
        "base": {
            "id": "base",
            "name": "Base",
            "description": "Plano essencial para gestao de ativos",
            "modules": ["dashboard", "assets"],
            "limits": {"max_users": 3, "max_assets": 100, "max_storage_mb": 50},
            "features": {"2fa": False, "api_access": False, "export_excel": True}
        },
        "pro": {
            "id": "pro",
            "name": "Pro",
            "description": "Plano profissional com funcionalidades avancadas",
            "modules": ["dashboard", "assets", "users", "interventions", "technicians", "catalog"],
            "limits": {"max_users": 10, "max_assets": 1000, "max_storage_mb": 500},
            "features": {"2fa": True, "api_access": False, "export_excel": True, "export_pdf": True}
        },
        "premium": {
            "id": "premium",
            "name": "Premium",
            "description": "Plano completo com todas as funcionalidades",
            "modules": ["dashboard", "assets", "users", "interventions", "technicians", "catalog", "reports", "data"],
            "limits": {"max_users": 50, "max_assets": 10000, "max_storage_mb": 5000},
            "features": {"2fa": True, "api_access": True, "export_excel": True, "export_pdf": True, "custom_branding": True, "analytics": True}
        },
        "enterprise": {
            "id": "enterprise",
            "name": "Enterprise",
            "description": "Plano empresarial com personalizacao total",
            "modules": ["*"],
            "limits": {"max_users": -1, "max_assets": -1, "max_storage_mb": -1},
            "features": {"2fa": True, "api_access": True, "export_excel": True, "export_pdf": True, "custom_branding": True, "analytics": True, "priority_support": True}
        }
    }


class PlanService:
    """Service for managing subscription plans."""

    @classmethod
    def init(cls, base_path):
        """Initialize the plan service with the base path."""
        global _plans_path
        _plans_path = base_path
        _load_plans(base_path)
        logger.info("PlanService initialized with %d plans", len(_plans or {}))

    @classmethod
    def get_all_plans(cls):
        """Get all available plans."""
        if _plans is None:
            _load_plans()
        return _plans or {}

    @classmethod
    def get_plan(cls, plan_id):
        """Get a specific plan by ID."""
        plans = cls.get_all_plans()
        return plans.get(plan_id)

    @classmethod
    def get_plan_modules(cls, plan_id):
        """Get modules available for a plan."""
        plan = cls.get_plan(plan_id)
        if not plan:
            return []
        return plan.get('modules', [])

    @classmethod
    def get_plan_limits(cls, plan_id):
        """Get limits for a plan."""
        plan = cls.get_plan(plan_id)
        if not plan:
            return {}
        return plan.get('limits', {})

    @classmethod
    def get_plan_features(cls, plan_id):
        """Get features for a plan."""
        plan = cls.get_plan(plan_id)
        if not plan:
            return {}
        return plan.get('features', {})

    @classmethod
    def has_feature(cls, plan_id, feature_name):
        """Check if a plan has a specific feature."""
        features = cls.get_plan_features(plan_id)
        return features.get(feature_name, False)

    @classmethod
    def check_limit(cls, plan_id, limit_name, current_value):
        """Check if a plan limit has been reached.

        Returns:
            tuple: (is_within_limit, limit_value, remaining)
        """
        limits = cls.get_plan_limits(plan_id)
        limit_value = limits.get(limit_name, -1)

        # -1 means unlimited
        if limit_value == -1:
            return True, -1, -1

        remaining = limit_value - current_value
        is_within = current_value < limit_value

        return is_within, limit_value, remaining

    @classmethod
    def can_access_module(cls, plan_id, module_id):
        """Check if a plan has access to a specific module."""
        modules = cls.get_plan_modules(plan_id)

        # Premium has all modules
        if '*' in modules:
            return True

        return module_id in modules

    @classmethod
    def compare_plans(cls):
        """Get a comparison of all plans for display."""
        plans = cls.get_all_plans()
        comparison = []

        for plan_id, plan in plans.items():
            comparison.append({
                'id': plan_id,
                'name': plan.get('name', plan_id),
                'description': plan.get('description', ''),
                'modules_count': len(plan.get('modules', [])),
                'limits': plan.get('limits', {}),
                'features': plan.get('features', {})
            })

        return comparison


class TenantPlanService:
    """Service for managing tenant plan assignments."""

    @classmethod
    def get_tenant_plan(cls, tenant_id):
        """Get the plan assigned to a tenant."""
        from .database import obter_tenant

        tenant = obter_tenant(tenant_id)
        if not tenant:
            return 'base'

        return tenant.get('plan', 'base')

    @classmethod
    def set_tenant_plan(cls, tenant_id, plan_id):
        """Assign a plan to a tenant."""
        from .database import carregar_tenants, guardar_tenants

        if not PlanService.get_plan(plan_id):
            raise ValueError(f"Plan {plan_id} does not exist")

        data = carregar_tenants()
        for tenant in data.get('tenants', []):
            if tenant['id'] == tenant_id:
                tenant['plan'] = plan_id
                guardar_tenants(data)
                logger.info("Tenant %s plan updated to %s", tenant_id, plan_id)
                return True

        return False

    @classmethod
    def check_tenant_limit(cls, tenant_id, limit_name, current_value):
        """Check if a tenant has reached a plan limit."""
        plan_id = cls.get_tenant_plan(tenant_id)
        return PlanService.check_limit(plan_id, limit_name, current_value)

    @classmethod
    def tenant_has_feature(cls, tenant_id, feature_name):
        """Check if a tenant has access to a feature."""
        plan_id = cls.get_tenant_plan(tenant_id)
        return PlanService.has_feature(plan_id, feature_name)

    @classmethod
    def tenant_can_access_module(cls, tenant_id, module_id):
        """Check if a tenant can access a module."""
        plan_id = cls.get_tenant_plan(tenant_id)
        return PlanService.can_access_module(plan_id, module_id)
