"""
SmartLamppost v5.0 - Dashboard Module Routes
Statistics and overview data.
"""

import logging
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, g

from ...shared.database import obter_bd, extrair_valor
from ...shared.permissions import requer_autenticacao

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/stats', methods=['GET'])
@requer_autenticacao
def get_stats():
    """Get dashboard statistics."""
    bd = obter_bd()

    # Total assets
    total_assets = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM assets').fetchone(), 0) or 0

    # Assets by status
    status_counts = bd.execute('''
        SELECT
            COALESCE(ad.field_value, 'Sem estado') as status,
            COUNT(*) as count
        FROM assets a
        LEFT JOIN asset_data ad ON a.id = ad.asset_id
            AND (ad.field_name = 'status' OR ad.field_name = 'condition_status')
        GROUP BY ad.field_value
    ''').fetchall()

    # Recent assets (last 30 days)
    thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
    recent_assets = extrair_valor(bd.execute('''
        SELECT COUNT(*) as cnt FROM assets WHERE created_at > ?
    ''', (thirty_days_ago,)).fetchone(), 0) or 0

    # Total users
    total_users = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM users WHERE active = 1').fetchone(), 0) or 0

    # Interventions (if table exists)
    try:
        total_interventions = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM interventions').fetchone(), 0) or 0
        open_interventions = extrair_valor(bd.execute('''
            SELECT COUNT(*) as cnt FROM interventions WHERE status = 'em_curso'
        ''').fetchone(), 0) or 0
    except Exception:
        total_interventions = 0
        open_interventions = 0

    return jsonify({
        'total_assets': total_assets,
        'recent_assets': recent_assets,
        'total_users': total_users,
        'total_interventions': total_interventions,
        'open_interventions': open_interventions,
        'assets_by_status': [dict(s) for s in status_counts]
    }), 200


@dashboard_bp.route('/recent-activity', methods=['GET'])
@requer_autenticacao
def get_recent_activity():
    """Get recent activity log."""
    bd = obter_bd()

    activity = bd.execute('''
        SELECT al.*, u.email, u.first_name, u.last_name
        FROM audit_log al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 20
    ''').fetchall()

    return jsonify([dict(a) for a in activity]), 200


@dashboard_bp.route('/assets-timeline', methods=['GET'])
@requer_autenticacao
def get_assets_timeline():
    """Get assets created over time (last 12 months)."""
    bd = obter_bd()

    # Group by month - use PostgreSQL-compatible syntax
    try:
        # Try PostgreSQL syntax first
        timeline = bd.execute('''
            SELECT
                TO_CHAR(created_at, 'YYYY-MM') as month,
                COUNT(*) as count
            FROM assets
            WHERE created_at > CURRENT_DATE - INTERVAL '12 months'
            GROUP BY TO_CHAR(created_at, 'YYYY-MM')
            ORDER BY month
        ''').fetchall()
    except Exception:
        # Fallback to SQLite syntax
        timeline = bd.execute('''
            SELECT
                strftime('%Y-%m', created_at) as month,
                COUNT(*) as count
            FROM assets
            WHERE created_at > date('now', '-12 months')
            GROUP BY strftime('%Y-%m', created_at)
            ORDER BY month
        ''').fetchall()

    return jsonify([dict(t) for t in timeline]), 200
