"""
SmartLamppost v5.0 - Configuration
"""

import os


class Config:
    """Base configuration."""

    # Base paths - backend directory is the app root in production
    BACKEND_PATH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # In Railway/production, use /app as base; locally use parent of backend
    if os.environ.get('RAILWAY_ENVIRONMENT') or os.environ.get('FLASK_ENV') == 'production':
        BASE_PATH = BACKEND_PATH  # In production, backend IS the base
    else:
        BASE_PATH = os.path.dirname(BACKEND_PATH)  # v5 root in development

    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY', os.urandom(32).hex())

    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')

    # Session/Token
    TOKEN_EXPIRATION_HOURS = int(os.environ.get('TOKEN_EXPIRATION_HOURS', '24'))

    # Multi-tenant paths - use relative paths that work in container
    DATA_PATH = os.path.join(BACKEND_PATH, 'data')
    TENANTS_PATH = os.path.join(DATA_PATH, 'tenants')
    SHARED_PATH = os.path.join(DATA_PATH, 'shared')
    CONFIG_PATH = os.path.join(DATA_PATH, 'config')
    UPLOADS_PATH = os.path.join(DATA_PATH, 'uploads')
    BACKUPS_PATH = os.path.join(DATA_PATH, 'backups')

    # Master tenant
    MASTER_TENANT_ID = 'smartlamppost'

    # File upload limits
    MAX_FILE_SIZE = 3 * 1024 * 1024  # 3MB
    ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png'}

    # 2FA settings
    CODE_2FA_EXPIRATION_MINUTES = 10
    CODE_2FA_LENGTH = 6
    MAX_2FA_ATTEMPTS = 3

    # Email settings
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
    SMTP_USER = os.environ.get('SMTP_USER', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    EMAIL_FROM = os.environ.get('EMAIL_FROM', 'noreply@smartlamppost.com')

    # SMS settings
    SMS_API_URL = os.environ.get('SMS_API_URL', '')
    SMS_API_KEY = os.environ.get('SMS_API_KEY', '')

    # Backup settings
    MAX_BACKUPS = 30


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    # SECRET_KEY is already handled in Config class


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DEBUG = True


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
