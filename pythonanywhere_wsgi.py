# =============================================================================
# WSGI Configuration for PythonAnywhere
# SmartLamppost v4.0
# =============================================================================
#
# INSTRUCTIONS:
# 1. In PythonAnywhere, go to Web tab
# 2. Click on your WSGI configuration file link
# 3. Replace the entire content with this file
# 4. Change YOUR_USERNAME to your actual PythonAnywhere username
# 5. Save and reload your web app
#
# =============================================================================

import sys
import os

# =============================================================================
# CHANGE THIS TO YOUR PYTHONANYWHERE USERNAME
# =============================================================================
USERNAME = 'YOUR_USERNAME'  # <-- CHANGE THIS!
# =============================================================================

# Add your project directory to the sys.path
project_home = f'/home/{USERNAME}/smartlamppost'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set the working directory
os.chdir(project_home)

# Import your Flask app
from app import app as application

# =============================================================================
# That's it! Save this file and reload your web app.
# =============================================================================
