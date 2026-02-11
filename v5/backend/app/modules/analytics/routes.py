"""
SmartLamppost v5.0 - Analytics & KPIs Module
Advanced analytics: MTBF, costs, efficiency, and predictive maintenance.
"""

import logging
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g

from ...shared.database import obter_bd
from ...shared.permissions import requer_autenticacao, requer_permissao

logger = logging.getLogger(__name__)

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/kpis', methods=['GET'])
@requer_permissao('analytics', 'view')
def get_kpis():
    """Get all KPI metrics for the dashboard."""
    bd = obter_bd()

    # Date range filter
    start_date = request.args.get('start_date', (datetime.now() - timedelta(days=365)).isoformat())
    end_date = request.args.get('end_date', datetime.now().isoformat())

    kpis = {
        'mtbf': calculate_mtbf(bd, start_date, end_date),
        'mttr': calculate_mttr(bd, start_date, end_date),
        'availability': calculate_availability(bd, start_date, end_date),
        'costs': calculate_costs(bd, start_date, end_date),
        'efficiency': calculate_efficiency(bd, start_date, end_date),
        'interventions_summary': get_interventions_summary(bd, start_date, end_date),
        'asset_health': get_asset_health(bd),
        'trends': get_trends(bd, start_date, end_date)
    }

    return jsonify(kpis), 200


def calculate_mtbf(bd, start_date, end_date):
    """
    Calculate Mean Time Between Failures.
    MTBF = Total Operating Time / Number of Failures
    """
    # Get corrective interventions (failures)
    failures = bd.execute('''
        SELECT COUNT(*) as count
        FROM interventions
        WHERE intervention_type = 'corretiva'
          AND created_at BETWEEN ? AND ?
    ''', (start_date, end_date)).fetchone()

    failure_count = failures['count'] if failures else 0

    # Get total assets and operating time
    total_assets = bd.execute('SELECT COUNT(*) FROM assets').fetchone()[0]

    # Calculate days in period
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        days_in_period = (end - start).days
    except:
        days_in_period = 365

    total_operating_hours = total_assets * days_in_period * 24

    if failure_count > 0:
        mtbf_hours = total_operating_hours / failure_count
        mtbf_days = mtbf_hours / 24
    else:
        mtbf_hours = total_operating_hours
        mtbf_days = days_in_period

    return {
        'value': round(mtbf_hours, 1),
        'unit': 'hours',
        'days': round(mtbf_days, 1),
        'failures': failure_count,
        'total_assets': total_assets
    }


def calculate_mttr(bd, start_date, end_date):
    """
    Calculate Mean Time To Repair.
    MTTR = Total Repair Time / Number of Repairs
    """
    repairs = bd.execute('''
        SELECT duration_hours
        FROM interventions
        WHERE intervention_type IN ('corretiva', 'substituicao')
          AND status = 'concluida'
          AND duration_hours IS NOT NULL
          AND created_at BETWEEN ? AND ?
    ''', (start_date, end_date)).fetchall()

    if repairs:
        total_hours = sum(r['duration_hours'] for r in repairs)
        mttr = total_hours / len(repairs)
    else:
        mttr = 0

    return {
        'value': round(mttr, 2),
        'unit': 'hours',
        'repairs_count': len(repairs),
        'total_hours': round(total_hours if repairs else 0, 1)
    }


def calculate_availability(bd, start_date, end_date):
    """
    Calculate system availability.
    Availability = (MTBF / (MTBF + MTTR)) * 100
    """
    mtbf = calculate_mtbf(bd, start_date, end_date)
    mttr = calculate_mttr(bd, start_date, end_date)

    mtbf_val = mtbf['value']
    mttr_val = mttr['value']

    if mtbf_val + mttr_val > 0:
        availability = (mtbf_val / (mtbf_val + mttr_val)) * 100
    else:
        availability = 100

    # Count assets by status
    operational = bd.execute('''
        SELECT COUNT(DISTINCT a.id)
        FROM assets a
        LEFT JOIN asset_data ad ON a.id = ad.asset_id AND ad.field_name = 'condition_status'
        WHERE ad.field_value = 'Operacional' OR ad.field_value IS NULL
    ''').fetchone()[0]

    total = bd.execute('SELECT COUNT(*) FROM assets').fetchone()[0]

    current_availability = (operational / total * 100) if total > 0 else 100

    return {
        'calculated': round(availability, 2),
        'current': round(current_availability, 2),
        'operational_assets': operational,
        'total_assets': total,
        'unit': '%'
    }


def calculate_costs(bd, start_date, end_date):
    """Calculate intervention costs breakdown."""
    # Total costs by type
    costs_by_type = bd.execute('''
        SELECT intervention_type,
               SUM(total_cost) as total,
               COUNT(*) as count,
               AVG(total_cost) as average
        FROM interventions
        WHERE created_at BETWEEN ? AND ?
          AND total_cost IS NOT NULL
        GROUP BY intervention_type
    ''', (start_date, end_date)).fetchall()

    # Monthly costs trend
    monthly_costs = bd.execute('''
        SELECT strftime('%Y-%m', created_at) as month,
               SUM(total_cost) as total
        FROM interventions
        WHERE created_at BETWEEN ? AND ?
          AND total_cost IS NOT NULL
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month
    ''', (start_date, end_date)).fetchall()

    # Cost per asset
    total_costs = bd.execute('''
        SELECT SUM(total_cost) as total
        FROM interventions
        WHERE created_at BETWEEN ? AND ?
          AND total_cost IS NOT NULL
    ''', (start_date, end_date)).fetchone()

    total_assets = bd.execute('SELECT COUNT(*) FROM assets').fetchone()[0]

    total = total_costs['total'] or 0
    cost_per_asset = total / total_assets if total_assets > 0 else 0

    return {
        'total': round(total, 2),
        'cost_per_asset': round(cost_per_asset, 2),
        'by_type': [dict(c) for c in costs_by_type],
        'monthly': [dict(m) for m in monthly_costs],
        'currency': 'EUR'
    }


def calculate_efficiency(bd, start_date, end_date):
    """Calculate operational efficiency metrics."""
    # Interventions completed vs total
    interventions = bd.execute('''
        SELECT status, COUNT(*) as count
        FROM interventions
        WHERE created_at BETWEEN ? AND ?
        GROUP BY status
    ''', (start_date, end_date)).fetchall()

    status_counts = {i['status']: i['count'] for i in interventions}
    total = sum(status_counts.values())
    completed = status_counts.get('concluida', 0)

    completion_rate = (completed / total * 100) if total > 0 else 0

    # Average time to complete
    avg_time = bd.execute('''
        SELECT AVG(
            CAST((julianday(completed_at) - julianday(created_at)) * 24 AS REAL)
        ) as avg_hours
        FROM interventions
        WHERE status = 'concluida'
          AND completed_at IS NOT NULL
          AND created_at BETWEEN ? AND ?
    ''', (start_date, end_date)).fetchone()

    avg_completion_hours = avg_time['avg_hours'] or 0

    # First-time fix rate (interventions without follow-up)
    # Simplified: count assets with only one corrective intervention

    return {
        'completion_rate': round(completion_rate, 1),
        'avg_completion_hours': round(avg_completion_hours, 1),
        'total_interventions': total,
        'completed': completed,
        'pending': status_counts.get('pendente', 0),
        'in_progress': status_counts.get('em_curso', 0),
        'cancelled': status_counts.get('cancelada', 0)
    }


def get_interventions_summary(bd, start_date, end_date):
    """Get interventions summary by type and status."""
    by_type = bd.execute('''
        SELECT intervention_type, COUNT(*) as count
        FROM interventions
        WHERE created_at BETWEEN ? AND ?
        GROUP BY intervention_type
        ORDER BY count DESC
    ''', (start_date, end_date)).fetchall()

    by_month = bd.execute('''
        SELECT strftime('%Y-%m', created_at) as month,
               intervention_type,
               COUNT(*) as count
        FROM interventions
        WHERE created_at BETWEEN ? AND ?
        GROUP BY strftime('%Y-%m', created_at), intervention_type
        ORDER BY month
    ''', (start_date, end_date)).fetchall()

    # Top assets with most interventions
    top_assets = bd.execute('''
        SELECT a.serial_number, COUNT(i.id) as intervention_count
        FROM assets a
        JOIN interventions i ON a.id = i.asset_id
        WHERE i.created_at BETWEEN ? AND ?
        GROUP BY a.id
        ORDER BY intervention_count DESC
        LIMIT 10
    ''', (start_date, end_date)).fetchall()

    return {
        'by_type': [dict(t) for t in by_type],
        'by_month': [dict(m) for m in by_month],
        'top_assets': [dict(a) for a in top_assets]
    }


def get_asset_health(bd):
    """Get current asset health distribution."""
    health = bd.execute('''
        SELECT ad.field_value as status, COUNT(*) as count
        FROM assets a
        LEFT JOIN asset_data ad ON a.id = ad.asset_id AND ad.field_name = 'condition_status'
        GROUP BY ad.field_value
    ''').fetchall()

    # Warranty status
    today = datetime.now().date().isoformat()
    warranty_expiring = bd.execute('''
        SELECT COUNT(*)
        FROM asset_data
        WHERE field_name = 'warranty_end_date'
          AND DATE(field_value) BETWEEN DATE('now') AND DATE('now', '+30 days')
    ''').fetchone()[0]

    warranty_expired = bd.execute('''
        SELECT COUNT(*)
        FROM asset_data
        WHERE field_name = 'warranty_end_date'
          AND DATE(field_value) < DATE('now')
    ''').fetchone()[0]

    # Maintenance due
    maintenance_due = bd.execute('''
        SELECT COUNT(*)
        FROM asset_data
        WHERE field_name IN ('next_maintenance_date', 'next_inspection_date')
          AND DATE(field_value) <= DATE('now', '+7 days')
    ''').fetchone()[0]

    return {
        'by_status': [dict(h) for h in health],
        'warranty_expiring_30d': warranty_expiring,
        'warranty_expired': warranty_expired,
        'maintenance_due_7d': maintenance_due
    }


def get_trends(bd, start_date, end_date):
    """Get trend data for charts."""
    # Interventions per month
    interventions_trend = bd.execute('''
        SELECT strftime('%Y-%m', created_at) as month,
               COUNT(*) as total,
               SUM(CASE WHEN intervention_type = 'corretiva' THEN 1 ELSE 0 END) as corrective,
               SUM(CASE WHEN intervention_type = 'preventiva' THEN 1 ELSE 0 END) as preventive
        FROM interventions
        WHERE created_at BETWEEN ? AND ?
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month
    ''', (start_date, end_date)).fetchall()

    # Costs per month
    costs_trend = bd.execute('''
        SELECT strftime('%Y-%m', created_at) as month,
               SUM(total_cost) as total_cost
        FROM interventions
        WHERE created_at BETWEEN ? AND ?
          AND total_cost IS NOT NULL
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month
    ''', (start_date, end_date)).fetchall()

    # Assets added per month
    assets_trend = bd.execute('''
        SELECT strftime('%Y-%m', created_at) as month,
               COUNT(*) as added
        FROM assets
        WHERE created_at BETWEEN ? AND ?
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month
    ''', (start_date, end_date)).fetchall()

    return {
        'interventions': [dict(i) for i in interventions_trend],
        'costs': [dict(c) for c in costs_trend],
        'assets': [dict(a) for a in assets_trend]
    }


@analytics_bp.route('/predictive', methods=['GET'])
@requer_permissao('analytics', 'view')
def get_predictive_maintenance():
    """Get predictive maintenance suggestions based on historical data."""
    bd = obter_bd()

    # Assets with high intervention frequency
    high_risk = bd.execute('''
        SELECT a.id, a.serial_number,
               COUNT(i.id) as intervention_count,
               MAX(i.created_at) as last_intervention,
               ad_loc.field_value as location
        FROM assets a
        JOIN interventions i ON a.id = i.asset_id
        LEFT JOIN asset_data ad_loc ON a.id = ad_loc.asset_id AND ad_loc.field_name = 'installation_location'
        WHERE i.created_at >= DATE('now', '-365 days')
        GROUP BY a.id
        HAVING intervention_count >= 3
        ORDER BY intervention_count DESC
        LIMIT 20
    ''').fetchall()

    # Assets approaching maintenance/inspection dates
    upcoming_maintenance = bd.execute('''
        SELECT a.id, a.serial_number,
               ad_maint.field_value as next_maintenance,
               ad_insp.field_value as next_inspection,
               ad_loc.field_value as location
        FROM assets a
        LEFT JOIN asset_data ad_maint ON a.id = ad_maint.asset_id AND ad_maint.field_name = 'next_maintenance_date'
        LEFT JOIN asset_data ad_insp ON a.id = ad_insp.asset_id AND ad_insp.field_name = 'next_inspection_date'
        LEFT JOIN asset_data ad_loc ON a.id = ad_loc.asset_id AND ad_loc.field_name = 'installation_location'
        WHERE DATE(ad_maint.field_value) <= DATE('now', '+14 days')
           OR DATE(ad_insp.field_value) <= DATE('now', '+14 days')
        ORDER BY COALESCE(ad_maint.field_value, ad_insp.field_value)
        LIMIT 20
    ''').fetchall()

    # Assets without recent maintenance (overdue)
    overdue = bd.execute('''
        SELECT a.id, a.serial_number,
               ad_last.field_value as last_inspection,
               ad_loc.field_value as location,
               julianday('now') - julianday(ad_last.field_value) as days_since
        FROM assets a
        LEFT JOIN asset_data ad_last ON a.id = ad_last.asset_id AND ad_last.field_name = 'last_inspection_date'
        LEFT JOIN asset_data ad_loc ON a.id = ad_loc.asset_id AND ad_loc.field_name = 'installation_location'
        WHERE ad_last.field_value IS NOT NULL
          AND julianday('now') - julianday(ad_last.field_value) > 365
        ORDER BY days_since DESC
        LIMIT 20
    ''').fetchall()

    return jsonify({
        'high_risk_assets': [dict(a) for a in high_risk],
        'upcoming_maintenance': [dict(a) for a in upcoming_maintenance],
        'overdue_inspection': [dict(a) for a in overdue]
    }), 200


@analytics_bp.route('/export', methods=['GET'])
@requer_permissao('analytics', 'view')
def export_analytics():
    """Export analytics data as CSV or Excel."""
    import csv
    import io
    from flask import Response

    bd = obter_bd()
    format_type = request.args.get('format', 'csv')
    report_type = request.args.get('type', 'interventions')
    start_date = request.args.get('start_date', (datetime.now() - timedelta(days=365)).isoformat())
    end_date = request.args.get('end_date', datetime.now().isoformat())

    if report_type == 'interventions':
        data = bd.execute('''
            SELECT i.id, a.serial_number as asset, i.intervention_type, i.status,
                   i.problem_description, i.solution_description, i.total_cost,
                   i.duration_hours, i.created_at, i.completed_at
            FROM interventions i
            JOIN assets a ON i.asset_id = a.id
            WHERE i.created_at BETWEEN ? AND ?
            ORDER BY i.created_at DESC
        ''', (start_date, end_date)).fetchall()

        headers = ['ID', 'Asset', 'Type', 'Status', 'Problem', 'Solution', 'Cost', 'Hours', 'Created', 'Completed']

    elif report_type == 'costs':
        data = bd.execute('''
            SELECT strftime('%Y-%m', i.created_at) as month,
                   i.intervention_type,
                   COUNT(*) as count,
                   SUM(i.total_cost) as total_cost,
                   AVG(i.total_cost) as avg_cost
            FROM interventions i
            WHERE i.created_at BETWEEN ? AND ?
              AND i.total_cost IS NOT NULL
            GROUP BY strftime('%Y-%m', i.created_at), i.intervention_type
            ORDER BY month
        ''', (start_date, end_date)).fetchall()

        headers = ['Month', 'Type', 'Count', 'Total Cost', 'Avg Cost']

    else:
        return jsonify({'error': 'Invalid report type'}), 400

    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)

    for row in data:
        writer.writerow(list(dict(row).values()))

    output.seek(0)

    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename=analytics_{report_type}_{datetime.now().strftime("%Y%m%d")}.csv'
        }
    )


# =========================================================================
# ML PREDICTION MODULE
# =========================================================================

@analytics_bp.route('/ml/predict-maintenance', methods=['GET'])
@requer_permissao('analytics', 'view')
def predict_maintenance():
    """
    Predict maintenance needs using ML-inspired heuristics.
    Uses historical data patterns to estimate failure probability.
    """
    bd = obter_bd()

    predictions = []

    # Get all active assets with their intervention history (v5 schema)
    assets = bd.execute('''
        SELECT
            a.id,
            a.serial_number,
            ad_ref.field_value as product_reference,
            ad_status.field_value as status,
            a.created_at as asset_created,
            COUNT(i.id) as total_interventions,
            SUM(CASE WHEN i.intervention_type = 'corretiva' THEN 1 ELSE 0 END) as corrective_count,
            SUM(CASE WHEN i.intervention_type = 'preventiva' THEN 1 ELSE 0 END) as preventive_count,
            MAX(i.created_at) as last_intervention,
            AVG(CASE WHEN i.status = 'concluida' AND i.completed_at IS NOT NULL
                THEN julianday(i.completed_at) - julianday(i.created_at)
                ELSE NULL END) as avg_repair_days
        FROM assets a
        LEFT JOIN asset_data ad_ref ON a.id = ad_ref.asset_id AND ad_ref.field_name = 'product_reference'
        LEFT JOIN asset_data ad_status ON a.id = ad_status.asset_id AND ad_status.field_name = 'condition_status'
        LEFT JOIN interventions i ON a.id = i.asset_id
        WHERE ad_status.field_value IS NULL OR ad_status.field_value != 'Desativado'
        GROUP BY a.id
    ''').fetchall()

    for asset in assets:
        asset_dict = dict(asset)

        # Calculate risk score (0-100)
        risk_score = calculate_risk_score(asset_dict, bd)

        # Calculate days until predicted maintenance
        days_until = predict_days_until_maintenance(asset_dict, bd)

        # Get failure probability
        failure_prob = calculate_failure_probability(asset_dict)

        # Determine priority level
        priority = 'low'
        if risk_score >= 70:
            priority = 'critical'
        elif risk_score >= 50:
            priority = 'high'
        elif risk_score >= 30:
            priority = 'medium'

        predictions.append({
            'asset_id': asset_dict['id'],
            'serial_number': asset_dict['serial_number'],
            'product_reference': asset_dict['product_reference'],
            'status': asset_dict['status'],
            'risk_score': risk_score,
            'failure_probability': failure_prob,
            'days_until_maintenance': days_until,
            'priority': priority,
            'total_interventions': asset_dict['total_interventions'] or 0,
            'corrective_count': asset_dict['corrective_count'] or 0,
            'last_intervention': asset_dict['last_intervention'],
            'recommendation': get_maintenance_recommendation(risk_score, asset_dict)
        })

    # Sort by risk score descending
    predictions.sort(key=lambda x: x['risk_score'], reverse=True)

    # Summary statistics
    summary = {
        'total_assets': len(predictions),
        'critical_count': sum(1 for p in predictions if p['priority'] == 'critical'),
        'high_count': sum(1 for p in predictions if p['priority'] == 'high'),
        'medium_count': sum(1 for p in predictions if p['priority'] == 'medium'),
        'low_count': sum(1 for p in predictions if p['priority'] == 'low'),
        'avg_risk_score': round(sum(p['risk_score'] for p in predictions) / len(predictions), 1) if predictions else 0
    }

    return jsonify({
        'predictions': predictions[:50],  # Top 50
        'summary': summary,
        'generated_at': datetime.now().isoformat()
    }), 200


def calculate_risk_score(asset, bd):
    """
    Calculate risk score based on multiple factors.
    Score ranges from 0 (low risk) to 100 (high risk).
    """
    score = 0

    # Factor 1: Intervention frequency (0-30 points)
    total_interventions = asset.get('total_interventions') or 0
    corrective_count = asset.get('corrective_count') or 0

    if total_interventions > 0:
        # More corrective than preventive = higher risk
        corrective_ratio = corrective_count / total_interventions
        score += min(corrective_ratio * 30, 30)

    # Factor 2: Time since last intervention (0-25 points)
    last_intervention = asset.get('last_intervention')
    if last_intervention:
        try:
            last_date = datetime.fromisoformat(last_intervention.replace('Z', '+00:00').replace(' ', 'T'))
            days_since = (datetime.now() - last_date.replace(tzinfo=None)).days
            if days_since > 365:
                score += 25
            elif days_since > 180:
                score += 15
            elif days_since > 90:
                score += 10
        except:
            pass
    else:
        # No interventions might mean new or neglected
        asset_created = asset.get('asset_created')
        if asset_created:
            try:
                created_date = datetime.fromisoformat(asset_created.replace('Z', '+00:00').replace(' ', 'T'))
                age_days = (datetime.now() - created_date.replace(tzinfo=None)).days
                if age_days > 365:
                    score += 20  # Old asset with no maintenance
            except:
                pass

    # Factor 3: Asset age (0-20 points)
    asset_created = asset.get('asset_created')
    if asset_created:
        try:
            created_date = datetime.fromisoformat(asset_created.replace('Z', '+00:00').replace(' ', 'T'))
            age_years = (datetime.now() - created_date.replace(tzinfo=None)).days / 365
            if age_years > 10:
                score += 20
            elif age_years > 5:
                score += 12
            elif age_years > 2:
                score += 5
        except:
            pass

    # Factor 4: Average repair time (0-15 points)
    avg_repair = asset.get('avg_repair_days')
    if avg_repair and avg_repair > 0:
        if avg_repair > 7:
            score += 15
        elif avg_repair > 3:
            score += 10
        elif avg_repair > 1:
            score += 5

    # Factor 5: Current status (0-10 points)
    status = asset.get('status', '')
    if status == 'manutencao':
        score += 10
    elif status == 'suspenso':
        score += 5

    return min(int(score), 100)


def calculate_failure_probability(asset):
    """Calculate estimated failure probability in next 30 days."""
    total = asset.get('total_interventions') or 0
    corrective = asset.get('corrective_count') or 0

    if total == 0:
        return 5  # Base probability for new assets

    # Base probability on historical corrective rate
    base_prob = (corrective / total) * 50

    # Adjust for time since last intervention
    last_intervention = asset.get('last_intervention')
    if last_intervention:
        try:
            last_date = datetime.fromisoformat(last_intervention.replace('Z', '+00:00').replace(' ', 'T'))
            days_since = (datetime.now() - last_date.replace(tzinfo=None)).days
            # Probability increases with time
            time_factor = min(days_since / 365, 1) * 30
            base_prob += time_factor
        except:
            pass

    return min(round(base_prob, 1), 95)


def predict_days_until_maintenance(asset, bd):
    """Predict days until next maintenance is needed."""
    # Get average interval between interventions for this asset
    asset_id = asset.get('id')

    intervals = bd.execute('''
        SELECT
            julianday(i2.created_at) - julianday(i1.created_at) as interval_days
        FROM interventions i1
        JOIN interventions i2 ON i1.asset_id = i2.asset_id
            AND i2.created_at > i1.created_at
        WHERE i1.asset_id = ?
        ORDER BY i1.created_at
    ''', (asset_id,)).fetchall()

    if not intervals:
        return 180  # Default: 6 months

    avg_interval = sum(i['interval_days'] for i in intervals) / len(intervals)

    # Calculate days since last intervention
    last_intervention = asset.get('last_intervention')
    if last_intervention:
        try:
            last_date = datetime.fromisoformat(last_intervention.replace('Z', '+00:00').replace(' ', 'T'))
            days_since = (datetime.now() - last_date.replace(tzinfo=None)).days
            remaining = max(int(avg_interval - days_since), 0)
            return remaining
        except:
            pass

    return int(avg_interval)


def get_maintenance_recommendation(risk_score, asset):
    """Generate maintenance recommendation based on risk score."""
    if risk_score >= 70:
        return "Agendar manutenção preventiva imediatamente"
    elif risk_score >= 50:
        return "Agendar inspeção nas próximas 2 semanas"
    elif risk_score >= 30:
        return "Incluir na próxima ronda de manutenção"
    else:
        return "Manter monitorização regular"


@analytics_bp.route('/ml/failure-patterns', methods=['GET'])
@requer_permissao('analytics', 'view')
def get_failure_patterns():
    """Analyze failure patterns to identify common issues."""
    bd = obter_bd()

    # Failures by month/season (v5 uses intervention_type)
    monthly_failures = bd.execute('''
        SELECT
            strftime('%m', created_at) as month,
            COUNT(*) as count
        FROM interventions
        WHERE intervention_type = 'corretiva'
          AND created_at >= DATE('now', '-2 years')
        GROUP BY strftime('%m', created_at)
        ORDER BY month
    ''').fetchall()

    # Failures by day of week
    daily_failures = bd.execute('''
        SELECT
            strftime('%w', created_at) as weekday,
            COUNT(*) as count
        FROM interventions
        WHERE intervention_type = 'corretiva'
          AND created_at >= DATE('now', '-1 year')
        GROUP BY strftime('%w', created_at)
        ORDER BY weekday
    ''').fetchall()

    # Common failure descriptions (keywords) - v5 uses problem_description
    descriptions = bd.execute('''
        SELECT problem_description as descricao FROM interventions
        WHERE intervention_type = 'corretiva'
          AND problem_description IS NOT NULL
          AND problem_description != ''
        ORDER BY created_at DESC
        LIMIT 500
    ''').fetchall()

    # Simple keyword extraction
    keywords = {}
    common_words = ['de', 'da', 'do', 'a', 'o', 'e', 'em', 'para', 'com', 'sem', 'por', 'que', 'na', 'no']
    for row in descriptions:
        if row['descricao']:
            words = row['descricao'].lower().split()
            for word in words:
                word = word.strip('.,;:!?()[]')
                if len(word) > 3 and word not in common_words:
                    keywords[word] = keywords.get(word, 0) + 1

    # Top keywords
    top_keywords = sorted(keywords.items(), key=lambda x: x[1], reverse=True)[:20]

    # Asset types with most failures (v5 uses asset_data for product_reference)
    product_failures = bd.execute('''
        SELECT
            ad.field_value as product_reference,
            COUNT(i.id) as failure_count,
            COUNT(DISTINCT a.id) as asset_count
        FROM assets a
        LEFT JOIN asset_data ad ON a.id = ad.asset_id AND ad.field_name = 'product_reference'
        JOIN interventions i ON a.id = i.asset_id
        WHERE i.intervention_type = 'corretiva'
        GROUP BY ad.field_value
        HAVING failure_count > 2
        ORDER BY failure_count DESC
        LIMIT 10
    ''').fetchall()

    return jsonify({
        'monthly_pattern': [{'month': r['month'], 'count': r['count']} for r in monthly_failures],
        'daily_pattern': [{'weekday': r['weekday'], 'count': r['count']} for r in daily_failures],
        'top_keywords': [{'word': k, 'count': v} for k, v in top_keywords],
        'product_failures': [dict(r) for r in product_failures],
        'insights': generate_pattern_insights(monthly_failures, daily_failures, top_keywords)
    }), 200


def generate_pattern_insights(monthly, daily, keywords):
    """Generate structured insights from patterns for frontend translation."""
    insights = []

    # Monthly insight - return structured data for frontend to translate
    if monthly:
        month_data = {r['month']: r['count'] for r in monthly}
        peak_month = max(month_data.items(), key=lambda x: x[1], default=('00', 0))
        if peak_month[0] != '00':
            insights.append({
                'type': 'peak_month',
                'month': peak_month[0],
                'count': peak_month[1]
            })

    # Daily insight - return structured data for frontend to translate
    if daily:
        day_data = {r['weekday']: r['count'] for r in daily}
        peak_day = max(day_data.items(), key=lambda x: x[1], default=('0', 0))
        insights.append({
            'type': 'peak_day',
            'weekday': peak_day[0],
            'count': peak_day[1]
        })

    # Keyword insight
    if keywords and len(keywords) > 0:
        top_issue = keywords[0][0]
        insights.append({
            'type': 'top_keyword',
            'keyword': top_issue,
            'count': keywords[0][1]
        })

    return insights


@analytics_bp.route('/ml/asset-lifetime', methods=['GET'])
@requer_permissao('analytics', 'view')
def get_asset_lifetime_analysis():
    """Analyze asset lifetime and replacement recommendations."""
    bd = obter_bd()

    # Get assets with age and intervention data (v5 schema)
    assets = bd.execute('''
        SELECT
            a.id,
            a.serial_number,
            ad_ref.field_value as product_reference,
            a.created_at,
            julianday('now') - julianday(a.created_at) as age_days,
            COUNT(i.id) as total_interventions,
            SUM(CASE WHEN i.intervention_type = 'corretiva' THEN 1 ELSE 0 END) as failures,
            SUM(COALESCE(i.total_cost, 0)) as total_cost
        FROM assets a
        LEFT JOIN asset_data ad_ref ON a.id = ad_ref.asset_id AND ad_ref.field_name = 'product_reference'
        LEFT JOIN asset_data ad_status ON a.id = ad_status.asset_id AND ad_status.field_name = 'condition_status'
        LEFT JOIN interventions i ON a.id = i.asset_id
        WHERE ad_status.field_value IS NULL OR ad_status.field_value != 'Desativado'
        GROUP BY a.id
        HAVING age_days > 365
    ''').fetchall()

    analysis = []
    for asset in assets:
        asset_dict = dict(asset)
        age_years = round(asset_dict['age_days'] / 365, 1)
        total_cost = asset_dict['total_cost'] or 0
        annual_cost = total_cost / age_years if age_years > 0 else 0

        # Recommendation based on age and failure rate
        failures = asset_dict['failures'] or 0
        failure_rate = failures / age_years if age_years > 0 else 0

        recommendation = 'manter'
        if age_years > 15 or failure_rate > 3:
            recommendation = 'substituir'
        elif age_years > 10 or failure_rate > 2:
            recommendation = 'avaliar'
        elif failure_rate > 1:
            recommendation = 'monitorizar'

        analysis.append({
            'asset_id': asset_dict['id'],
            'serial_number': asset_dict['serial_number'],
            'product_reference': asset_dict['product_reference'],
            'age_years': age_years,
            'total_interventions': asset_dict['total_interventions'] or 0,
            'failures': failures,
            'failure_rate_annual': round(failure_rate, 2),
            'total_cost': round(total_cost, 2),
            'annual_cost': round(annual_cost, 2),
            'recommendation': recommendation
        })

    # Sort by recommendation priority
    priority_order = {'substituir': 0, 'avaliar': 1, 'monitorizar': 2, 'manter': 3}
    analysis.sort(key=lambda x: (priority_order.get(x['recommendation'], 4), -x['failure_rate_annual']))

    # Summary
    summary = {
        'total_analyzed': len(analysis),
        'replace_recommended': sum(1 for a in analysis if a['recommendation'] == 'substituir'),
        'evaluate_recommended': sum(1 for a in analysis if a['recommendation'] == 'avaliar'),
        'monitor_recommended': sum(1 for a in analysis if a['recommendation'] == 'monitorizar'),
        'avg_age_years': round(sum(a['age_years'] for a in analysis) / len(analysis), 1) if analysis else 0,
        'total_maintenance_cost': round(sum(a['total_cost'] for a in analysis), 2)
    }

    return jsonify({
        'analysis': analysis[:30],
        'summary': summary
    }), 200


# =========================================================================
# WEATHER INTEGRATION
# =========================================================================

@analytics_bp.route('/weather', methods=['GET'])
@requer_autenticacao
def get_weather_data():
    """Get weather data for asset locations."""
    import requests

    bd = obter_bd()

    # Get weather API configuration
    api_key = bd.execute('''
        SELECT config_value FROM system_config WHERE config_key = 'weather_api_key'
    ''').fetchone()

    if not api_key or not api_key['config_value']:
        return jsonify({
            'error': 'API de meteorologia não configurada',
            'configured': False
        }), 200

    # Get unique locations from assets
    locations = bd.execute('''
        SELECT DISTINCT
            ad_lat.field_value as latitude,
            ad_lon.field_value as longitude,
            ad_loc.field_value as location_name
        FROM assets a
        JOIN asset_data ad_lat ON a.id = ad_lat.asset_id AND ad_lat.field_name = 'gps_latitude'
        JOIN asset_data ad_lon ON a.id = ad_lon.asset_id AND ad_lon.field_name = 'gps_longitude'
        LEFT JOIN asset_data ad_loc ON a.id = ad_loc.asset_id AND ad_loc.field_name = 'installation_location'
        WHERE ad_lat.field_value IS NOT NULL AND ad_lon.field_value IS NOT NULL
        LIMIT 10
    ''').fetchall()

    weather_data = []
    for loc in locations:
        try:
            lat = float(loc['latitude'])
            lon = float(loc['longitude'])

            # OpenWeatherMap API
            response = requests.get(
                f"https://api.openweathermap.org/data/2.5/weather",
                params={
                    'lat': lat,
                    'lon': lon,
                    'appid': api_key['config_value'],
                    'units': 'metric',
                    'lang': 'pt'
                },
                timeout=5
            )

            if response.status_code == 200:
                data = response.json()
                weather_data.append({
                    'location': loc['location_name'] or f"{lat}, {lon}",
                    'latitude': lat,
                    'longitude': lon,
                    'temperature': data['main']['temp'],
                    'feels_like': data['main']['feels_like'],
                    'humidity': data['main']['humidity'],
                    'pressure': data['main']['pressure'],
                    'description': data['weather'][0]['description'] if data['weather'] else '',
                    'icon': data['weather'][0]['icon'] if data['weather'] else '',
                    'wind_speed': data['wind']['speed'],
                    'wind_direction': data['wind'].get('deg', 0),
                    'clouds': data['clouds']['all'],
                    'visibility': data.get('visibility', 0),
                    'rain': data.get('rain', {}).get('1h', 0),
                    'snow': data.get('snow', {}).get('1h', 0)
                })
        except Exception as e:
            logger.error(f"Error fetching weather for {loc}: {e}")
            continue

    return jsonify({
        'configured': True,
        'locations': weather_data,
        'fetched_at': datetime.now().isoformat()
    }), 200


@analytics_bp.route('/weather/forecast', methods=['GET'])
@requer_autenticacao
def get_weather_forecast():
    """Get weather forecast for planning maintenance."""
    import requests

    bd = obter_bd()

    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)

    if not lat or not lon:
        # Use default location (Lisbon)
        lat = 38.7223
        lon = -9.1393

    api_key = bd.execute('''
        SELECT config_value FROM system_config WHERE config_key = 'weather_api_key'
    ''').fetchone()

    if not api_key or not api_key['config_value']:
        return jsonify({
            'error': 'API de meteorologia não configurada',
            'configured': False
        }), 200

    try:
        # Get 5-day forecast
        response = requests.get(
            f"https://api.openweathermap.org/data/2.5/forecast",
            params={
                'lat': lat,
                'lon': lon,
                'appid': api_key['config_value'],
                'units': 'metric',
                'lang': 'pt'
            },
            timeout=10
        )

        if response.status_code != 200:
            return jsonify({'error': 'Erro ao obter previsão', 'configured': True}), 200

        data = response.json()

        # Process forecast
        forecast = []
        for item in data.get('list', []):
            forecast.append({
                'datetime': item['dt_txt'],
                'temperature': item['main']['temp'],
                'feels_like': item['main']['feels_like'],
                'humidity': item['main']['humidity'],
                'description': item['weather'][0]['description'] if item['weather'] else '',
                'icon': item['weather'][0]['icon'] if item['weather'] else '',
                'wind_speed': item['wind']['speed'],
                'rain_probability': item.get('pop', 0) * 100,
                'rain_mm': item.get('rain', {}).get('3h', 0)
            })

        # Identify good maintenance windows (low rain, moderate temp, low wind)
        good_windows = []
        for item in forecast:
            if (item['rain_probability'] < 30 and
                item['wind_speed'] < 10 and
                5 < item['temperature'] < 30):
                good_windows.append({
                    'datetime': item['datetime'],
                    'conditions': item['description'],
                    'temperature': item['temperature']
                })

        return jsonify({
            'configured': True,
            'location': {'lat': lat, 'lon': lon},
            'forecast': forecast,
            'maintenance_windows': good_windows[:10],
            'city': data.get('city', {}).get('name', 'Unknown')
        }), 200

    except Exception as e:
        logger.error(f"Error fetching forecast: {e}")
        return jsonify({'error': str(e), 'configured': True}), 500


@analytics_bp.route('/weather/config', methods=['POST'])
@requer_autenticacao
def configure_weather_api():
    """Configure weather API key."""
    bd = obter_bd()
    dados = request.get_json() or {}

    api_key = dados.get('api_key', '').strip()

    if not api_key:
        return jsonify({'error': 'API key é obrigatória'}), 400

    # Validate API key with OpenWeatherMap
    import requests as http_requests
    try:
        logger.info(f"Validating OpenWeatherMap API key...")
        response = http_requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={'lat': 38.7223, 'lon': -9.1393, 'appid': api_key},
            timeout=10
        )
        logger.info(f"OpenWeatherMap response status: {response.status_code}")

        if response.status_code == 401:
            return jsonify({'error': 'API key inválida ou não ativada. Novas chaves podem demorar até 2 horas a ativar.'}), 400
        elif response.status_code != 200:
            error_data = response.json() if response.text else {}
            error_msg = error_data.get('message', f'Erro {response.status_code}')
            return jsonify({'error': f'Erro da API: {error_msg}'}), 400

    except http_requests.exceptions.Timeout:
        return jsonify({'error': 'Timeout ao validar API key. Tente novamente.'}), 400
    except http_requests.exceptions.ConnectionError:
        return jsonify({'error': 'Erro de conexão. Verifique a ligação à internet.'}), 400
    except Exception as e:
        logger.error(f"Error validating weather API key: {e}")
        return jsonify({'error': f'Erro ao validar API key: {str(e)}'}), 400

    # Save API key
    try:
        bd.execute('''
            INSERT INTO system_config (config_key, config_value, updated_at)
            VALUES ('weather_api_key', ?, CURRENT_TIMESTAMP)
            ON CONFLICT(config_key) DO UPDATE SET
                config_value = excluded.config_value,
                updated_at = CURRENT_TIMESTAMP
        ''', (api_key,))
        bd.commit()
        logger.info("Weather API key saved successfully")
    except Exception as e:
        logger.error(f"Error saving weather API key: {e}")
        return jsonify({'error': 'Erro ao guardar configuração'}), 500

    return jsonify({'message': 'API key configurada com sucesso', 'success': True}), 200


@analytics_bp.route('/weather/alerts', methods=['GET'])
@requer_autenticacao
def get_weather_alerts():
    """Get weather alerts that may affect maintenance."""
    import requests

    bd = obter_bd()

    api_key = bd.execute('''
        SELECT config_value FROM system_config WHERE config_key = 'weather_api_key'
    ''').fetchone()

    if not api_key or not api_key['config_value']:
        return jsonify({'configured': False, 'alerts': []}), 200

    # Get unique locations
    locations = bd.execute('''
        SELECT DISTINCT
            ad_lat.field_value as latitude,
            ad_lon.field_value as longitude,
            ad_loc.field_value as location_name,
            COUNT(DISTINCT a.id) as asset_count
        FROM assets a
        JOIN asset_data ad_lat ON a.id = ad_lat.asset_id AND ad_lat.field_name = 'gps_latitude'
        JOIN asset_data ad_lon ON a.id = ad_lon.asset_id AND ad_lon.field_name = 'gps_longitude'
        LEFT JOIN asset_data ad_loc ON a.id = ad_loc.asset_id AND ad_loc.field_name = 'installation_location'
        WHERE ad_lat.field_value IS NOT NULL AND ad_lon.field_value IS NOT NULL
        GROUP BY ad_lat.field_value, ad_lon.field_value
        LIMIT 5
    ''').fetchall()

    alerts = []
    for loc in locations:
        try:
            lat = float(loc['latitude'])
            lon = float(loc['longitude'])

            response = requests.get(
                f"https://api.openweathermap.org/data/2.5/weather",
                params={
                    'lat': lat,
                    'lon': lon,
                    'appid': api_key['config_value'],
                    'units': 'metric'
                },
                timeout=5
            )

            if response.status_code == 200:
                data = response.json()

                # Check for adverse conditions
                wind_speed = data['wind']['speed']
                rain = data.get('rain', {}).get('1h', 0)
                temp = data['main']['temp']

                if wind_speed > 15:
                    alerts.append({
                        'type': 'wind',
                        'severity': 'high' if wind_speed > 25 else 'medium',
                        'location': loc['location_name'] or f"{lat}, {lon}",
                        'message': f"Vento forte: {wind_speed} m/s",
                        'asset_count': loc['asset_count'],
                        'recommendation': 'Evitar trabalhos em altura'
                    })

                if rain > 5:
                    alerts.append({
                        'type': 'rain',
                        'severity': 'high' if rain > 10 else 'medium',
                        'location': loc['location_name'] or f"{lat}, {lon}",
                        'message': f"Chuva: {rain} mm/h",
                        'asset_count': loc['asset_count'],
                        'recommendation': 'Adiar trabalhos exteriores'
                    })

                if temp < 0 or temp > 35:
                    alerts.append({
                        'type': 'temperature',
                        'severity': 'medium',
                        'location': loc['location_name'] or f"{lat}, {lon}",
                        'message': f"Temperatura extrema: {temp}°C",
                        'asset_count': loc['asset_count'],
                        'recommendation': 'Tomar precauções' if temp > 35 else 'Atenção a gelo'
                    })

        except Exception as e:
            logger.error(f"Error checking weather alerts for {loc}: {e}")

    return jsonify({
        'configured': True,
        'alerts': alerts,
        'checked_at': datetime.now().isoformat()
    }), 200
