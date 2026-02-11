#!/usr/bin/env python3
"""
SmartLamppost v5 - Entry Point
"""
import os
import sys

# Adicionar path do projeto
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV', 'development') == 'development'

    print(f"""
    ╔═══════════════════════════════════════════╗
    ║     SmartLamppost v5 Backend Server       ║
    ╠═══════════════════════════════════════════╣
    ║  URL: http://localhost:{port}               ║
    ║  Mode: {'Development' if debug else 'Production'}                    ║
    ╚═══════════════════════════════════════════╝
    """)

    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
