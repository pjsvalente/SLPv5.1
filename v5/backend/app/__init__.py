"""
SmartLamppost v5.0 - Application Factory
Multi-tenant RFID Infrastructure Management System
"""

import os
import logging
from flask import Flask
from flask_cors import CORS

from .shared.database import db_init_paths, fechar_ligacoes, inicializar_catalogo
from .shared.config import Config
from .shared.modules import ModuleRegistry
from .shared.plans import PlanService

logger = logging.getLogger(__name__)


def create_app(config_class=Config):
    """Application factory pattern."""
    # Get the backend directory (where app package is)
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    static_folder = os.path.join(backend_dir, 'static')

    app = Flask(__name__, static_folder=static_folder, static_url_path='')
    app.config.from_object(config_class)

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )

    # Initialize paths
    db_init_paths(app.config['BASE_PATH'])

    # Initialize catalog database (shared across all tenants)
    inicializar_catalogo()

    # Initialize plan service
    PlanService.init(app.config['BASE_PATH'])

    # Configure CORS
    cors_origins = app.config.get('CORS_ORIGINS', '*').split(',')
    CORS(app, resources={
        r"/api/*": {
            "origins": cors_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Register teardown
    app.teardown_appcontext(fechar_ligacoes)

    # Register core blueprints (always active)
    from .core.auth.routes import auth_bp
    from .core.tenants.routes import tenants_bp
    from .core.users.routes import users_bp
    from .core.settings.routes import settings_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(tenants_bp, url_prefix='/api/tenants')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')

    # Register utility module blueprints (not tied to plans)
    from .modules.data.routes import data_bp
    from .modules.backup.routes import backup_bp
    from .modules.map.routes import map_bp

    app.register_blueprint(data_bp, url_prefix='/api/data')
    app.register_blueprint(backup_bp, url_prefix='/api/backup')
    app.register_blueprint(map_bp, url_prefix='/api/map')

    # Discover and register plan-based modules from modules.json
    ModuleRegistry.discover_modules(app.config['BASE_PATH'])
    ModuleRegistry.register_all_blueprints(app)

    # Health check route
    @app.route('/api/health', methods=['GET'])
    def health():
        return {'status': 'ok', 'version': '5.0.0'}

    # Serve frontend (SPA)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        # Log static folder for debugging
        index_path = os.path.join(app.static_folder, 'index.html')
        logger.info(f"Static folder: {app.static_folder}")
        logger.info(f"Index exists: {os.path.exists(index_path)}")
        if os.path.exists(index_path):
            logger.info(f"Index size: {os.path.getsize(index_path)} bytes")
        # Serve static files if they exist
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return app.send_static_file(path)
        # Otherwise serve index.html for SPA routing
        return app.send_static_file('index.html')

    logger.info("SmartLamppost v5.0 initialized successfully")
    return app
