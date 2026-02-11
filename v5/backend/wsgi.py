"""
SmartLamppost v5.0 - WSGI Entry Point
For Railway/Heroku/PythonAnywhere deployment.
"""

import os
import sys

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.shared.config import config_by_name

# Get environment
env = os.environ.get('FLASK_ENV', 'production')
config_class = config_by_name.get(env, config_by_name['default'])

# Create application
application = create_app(config_class)
app = application  # Alias for gunicorn/flask run

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
