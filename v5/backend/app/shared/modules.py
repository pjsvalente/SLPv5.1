"""
SmartLamppost v5.0 - Module Registry
Dynamic module loading and management based on tenant plans.
"""

import os
import json
import logging
import importlib
from pathlib import Path

logger = logging.getLogger(__name__)

# Module registry singleton
_modules = {}
_modules_path = None


def _load_modules_config(base_path):
    """Load modules configuration from JSON file."""
    config_path = os.path.join(base_path, 'config', 'modules.json')
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f).get('modules', {})
    return {}


class ModuleRegistry:
    """Registry for all available modules in the system."""

    @classmethod
    def discover_modules(cls, base_path):
        """Discover all available modules from config and code."""
        global _modules, _modules_path
        _modules_path = base_path

        # Load module definitions from config
        modules_config = _load_modules_config(base_path)

        for module_id, config in modules_config.items():
            _modules[module_id] = {
                'id': module_id,
                'config': config,
                'loaded': False,
                'blueprint': None
            }
            logger.debug("Discovered module: %s", module_id)

        logger.info("Discovered %d modules", len(_modules))
        return _modules

    @classmethod
    def get_all_modules(cls):
        """Get all discovered modules."""
        return _modules

    @classmethod
    def get_module(cls, module_id):
        """Get a specific module by ID."""
        return _modules.get(module_id)

    @classmethod
    def register_all_blueprints(cls, app):
        """Register all module blueprints with the Flask app."""
        modules_base = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            'modules'
        )

        for module_id, module_info in _modules.items():
            try:
                # Check if module has routes file
                module_path = os.path.join(modules_base, module_id)
                routes_file = os.path.join(module_path, 'routes.py')

                if os.path.exists(routes_file):
                    # Import the module's routes
                    module_name = f'app.modules.{module_id}.routes'
                    routes_module = importlib.import_module(module_name)

                    # Get the blueprint (convention: {module_id}_bp)
                    bp_name = f'{module_id}_bp'
                    if hasattr(routes_module, bp_name):
                        bp = getattr(routes_module, bp_name)
                        prefix = module_info['config'].get('routes_prefix', f'/api/{module_id}')
                        app.register_blueprint(bp, url_prefix=prefix)
                        module_info['loaded'] = True
                        module_info['blueprint'] = bp
                        logger.info("Registered module blueprint: %s at %s", module_id, prefix)
                    else:
                        logger.warning("Module %s has no blueprint named %s", module_id, bp_name)
                else:
                    logger.debug("Module %s has no routes.py", module_id)

            except Exception as e:
                logger.error("Failed to register module %s: %s", module_id, str(e))

    @classmethod
    def is_module_active_for_tenant(cls, module_id, tenant_plan):
        """Check if a module is active for a tenant based on their plan."""
        from .plans import PlanService

        module = cls.get_module(module_id)
        if not module:
            return False

        plan = PlanService.get_plan(tenant_plan)
        if not plan:
            return False

        # Premium plan has access to all modules
        if '*' in plan.get('modules', []):
            return True

        return module_id in plan.get('modules', [])

    @classmethod
    def get_modules_for_plan(cls, plan_id):
        """Get all modules available for a specific plan."""
        from .plans import PlanService

        plan = PlanService.get_plan(plan_id)
        if not plan:
            return []

        # Premium gets all
        if '*' in plan.get('modules', []):
            return list(_modules.keys())

        return [m for m in plan.get('modules', []) if m in _modules]


def get_tenant_modules(tenant_id):
    """Get active modules for a specific tenant."""
    from .database import obter_tenant
    from .plans import PlanService

    tenant = obter_tenant(tenant_id)
    if not tenant:
        return []

    plan_id = tenant.get('plan', 'base')
    return ModuleRegistry.get_modules_for_plan(plan_id)


def get_tenant_menu_items(tenant_id, user_role='user'):
    """Get menu items for a tenant based on their plan and user role."""
    modules = get_tenant_modules(tenant_id)
    menu_items = []

    for module_id in modules:
        module = ModuleRegistry.get_module(module_id)
        if not module:
            continue

        config = module['config']

        # Check if admin only
        if config.get('admin_only') and user_role not in ['admin', 'superadmin']:
            continue

        menu = config.get('menu', {})
        if menu:
            menu_items.append({
                'id': module_id,
                'label': menu.get('label', config.get('name', module_id)),
                'path': menu.get('path', f'/{module_id}'),
                'icon': config.get('icon', 'Circle'),
                'order': config.get('order', 99)
            })

    # Add superadmin-only items
    if user_role == 'superadmin':
        menu_items.append({
            'id': 'tenants',
            'label': 'Tenants',
            'path': '/tenants',
            'icon': 'Building2',
            'order': 97
        })

    # Sort by order
    menu_items.sort(key=lambda x: x['order'])
    return menu_items
