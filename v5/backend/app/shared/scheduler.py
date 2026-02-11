"""
SmartLamppost v5.0 - Scheduled Tasks Service
Handles automatic backups, maintenance alerts, and daily reports.
"""

import os
import logging
import threading
import schedule
import time
from datetime import datetime, timedelta
from typing import Optional

from .config import Config
from .database import obter_bd_para_tenant, obter_lista_tenants

logger = logging.getLogger(__name__)

# Scheduler state
_scheduler_thread: Optional[threading.Thread] = None
_scheduler_running = False


def verificar_alertas_manutencao(tenant_id: str):
    """
    Check for upcoming maintenance and inspection dates.
    Sends email alerts for items due within the next 7 days.
    """
    from .email_service import enviar_alerta_manutencao

    try:
        bd = obter_bd_para_tenant(tenant_id)
        if not bd:
            return

        hoje = datetime.now().date()
        limite = hoje + timedelta(days=7)

        # Get tenant name
        tenant_info = bd.execute('SELECT name FROM tenant_info LIMIT 1').fetchone()
        tenant_name = tenant_info['name'] if tenant_info else 'SmartLamppost'

        # Get admin emails for notifications
        admins = bd.execute('''
            SELECT email FROM users
            WHERE role IN ('admin', 'superadmin') AND is_active = 1
        ''').fetchall()

        if not admins:
            return

        admin_emails = [a['email'] for a in admins]

        # Check next_inspection_date
        ativos_inspecao = bd.execute('''
            SELECT a.serial_number, ad_loc.field_value as localizacao, ad_insp.field_value as data_inspecao
            FROM assets a
            LEFT JOIN asset_data ad_loc ON a.id = ad_loc.asset_id AND ad_loc.field_name = 'installation_location'
            LEFT JOIN asset_data ad_insp ON a.id = ad_insp.asset_id AND ad_insp.field_name = 'next_inspection_date'
            WHERE ad_insp.field_value IS NOT NULL
              AND DATE(ad_insp.field_value) BETWEEN ? AND ?
        ''', (hoje.isoformat(), limite.isoformat())).fetchall()

        for ativo in ativos_inspecao:
            enviar_alerta_manutencao(
                destinatarios=admin_emails,
                ativo_ref=ativo['serial_number'],
                ativo_localizacao=ativo['localizacao'] or '',
                tipo_alerta='inspecao_proxima',
                data_proxima=ativo['data_inspecao'],
                tenant_name=tenant_name
            )

        # Check next_maintenance_date
        ativos_manutencao = bd.execute('''
            SELECT a.serial_number, ad_loc.field_value as localizacao, ad_maint.field_value as data_manutencao
            FROM assets a
            LEFT JOIN asset_data ad_loc ON a.id = ad_loc.asset_id AND ad_loc.field_name = 'installation_location'
            LEFT JOIN asset_data ad_maint ON a.id = ad_maint.asset_id AND ad_maint.field_name = 'next_maintenance_date'
            WHERE ad_maint.field_value IS NOT NULL
              AND DATE(ad_maint.field_value) BETWEEN ? AND ?
        ''', (hoje.isoformat(), limite.isoformat())).fetchall()

        for ativo in ativos_manutencao:
            enviar_alerta_manutencao(
                destinatarios=admin_emails,
                ativo_ref=ativo['serial_number'],
                ativo_localizacao=ativo['localizacao'] or '',
                tipo_alerta='manutencao_proxima',
                data_proxima=ativo['data_manutencao'],
                tenant_name=tenant_name
            )

        # Check warranty_end_date (30 days warning)
        limite_garantia = hoje + timedelta(days=30)
        ativos_garantia = bd.execute('''
            SELECT a.serial_number, ad_loc.field_value as localizacao, ad_war.field_value as data_garantia
            FROM assets a
            LEFT JOIN asset_data ad_loc ON a.id = ad_loc.asset_id AND ad_loc.field_name = 'installation_location'
            LEFT JOIN asset_data ad_war ON a.id = ad_war.asset_id AND ad_war.field_name = 'warranty_end_date'
            WHERE ad_war.field_value IS NOT NULL
              AND DATE(ad_war.field_value) BETWEEN ? AND ?
        ''', (hoje.isoformat(), limite_garantia.isoformat())).fetchall()

        for ativo in ativos_garantia:
            enviar_alerta_manutencao(
                destinatarios=admin_emails,
                ativo_ref=ativo['serial_number'],
                ativo_localizacao=ativo['localizacao'] or '',
                tipo_alerta='garantia_expirar',
                data_proxima=ativo['data_garantia'],
                tenant_name=tenant_name
            )

        logger.info("[SCHEDULER] Checked maintenance alerts for tenant %s", tenant_id)

    except Exception as e:
        logger.error("[SCHEDULER] Error checking alerts for tenant %s: %s", tenant_id, e)


def executar_backup_automatico(tenant_id: str):
    """
    Execute automatic backup for a tenant.
    """
    import zipfile
    import shutil

    try:
        tenant_path = os.path.join(Config.TENANTS_PATH, tenant_id)
        if not os.path.exists(tenant_path):
            return

        backup_dir = os.path.join(Config.BACKUPS_PATH, tenant_id)
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"backup_auto_{timestamp}.zip"
        backup_path = os.path.join(backup_dir, backup_filename)

        db_path = os.path.join(tenant_path, 'database.db')
        uploads_path = os.path.join(tenant_path, 'uploads')

        if not os.path.exists(db_path):
            logger.warning("[BACKUP] No database found for tenant %s", tenant_id)
            return

        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add database
            zipf.write(db_path, 'database.db')

            # Add uploads folder if exists
            if os.path.exists(uploads_path):
                for root, dirs, files in os.walk(uploads_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.join('uploads', os.path.relpath(file_path, uploads_path))
                        zipf.write(file_path, arcname)

        # Clean old backups (keep only MAX_BACKUPS)
        backups = sorted([
            f for f in os.listdir(backup_dir)
            if f.startswith('backup_auto_') and f.endswith('.zip')
        ], reverse=True)

        for old_backup in backups[Config.MAX_BACKUPS:]:
            old_path = os.path.join(backup_dir, old_backup)
            os.remove(old_path)
            logger.info("[BACKUP] Removed old backup: %s", old_backup)

        logger.info("[BACKUP] Automatic backup created for tenant %s: %s", tenant_id, backup_filename)

    except Exception as e:
        logger.error("[BACKUP] Error creating backup for tenant %s: %s", tenant_id, e)


def enviar_relatorio_diario_tenant(tenant_id: str):
    """
    Generate and send daily report for a tenant.
    """
    from .email_service import enviar_relatorio_diario

    try:
        bd = obter_bd_para_tenant(tenant_id)
        if not bd:
            return

        # Get tenant name
        tenant_info = bd.execute('SELECT name FROM tenant_info LIMIT 1').fetchone()
        tenant_name = tenant_info['name'] if tenant_info else 'SmartLamppost'

        # Get admin emails
        admins = bd.execute('''
            SELECT email FROM users
            WHERE role IN ('admin', 'superadmin') AND is_active = 1
        ''').fetchall()

        if not admins:
            return

        admin_emails = [a['email'] for a in admins]
        hoje = datetime.now().date().isoformat()

        # Gather statistics
        stats = {
            'total_assets': bd.execute('SELECT COUNT(*) FROM assets').fetchone()[0],
            'interventions_today': bd.execute('''
                SELECT COUNT(*) FROM interventions WHERE DATE(created_at) = DATE('now')
            ''').fetchone()[0],
            'open_interventions': bd.execute('''
                SELECT COUNT(*) FROM interventions WHERE status IN ('pendente', 'em_curso')
            ''').fetchone()[0],
            'maintenance_due': 0  # Calculated below
        }

        # Count maintenance due in next 7 days
        limite = (datetime.now() + timedelta(days=7)).date().isoformat()
        manut_proxima = bd.execute('''
            SELECT COUNT(*) FROM asset_data
            WHERE field_name IN ('next_maintenance_date', 'next_inspection_date')
              AND DATE(field_value) BETWEEN DATE('now') AND ?
        ''', (limite,)).fetchone()[0]
        stats['maintenance_due'] = manut_proxima

        # Get pending alerts
        alertas = []
        ativos_alertas = bd.execute('''
            SELECT a.serial_number, ad.field_name, ad.field_value
            FROM assets a
            JOIN asset_data ad ON a.id = ad.asset_id
            WHERE ad.field_name IN ('next_maintenance_date', 'next_inspection_date')
              AND DATE(ad.field_value) <= ?
        ''', (limite,)).fetchall()

        for al in ativos_alertas[:10]:
            tipo = 'Inspeção' if al['field_name'] == 'next_inspection_date' else 'Manutenção'
            alertas.append({
                'tipo': tipo,
                'descricao': f"Prevista para {al['field_value']}",
                'ativo_ref': al['serial_number']
            })

        enviar_relatorio_diario(
            destinatarios=admin_emails,
            data=hoje,
            stats=stats,
            alertas=alertas,
            tenant_name=tenant_name
        )

        logger.info("[SCHEDULER] Daily report sent for tenant %s", tenant_id)

    except Exception as e:
        logger.error("[SCHEDULER] Error sending daily report for tenant %s: %s", tenant_id, e)


def executar_tarefas_diarias():
    """Run all daily scheduled tasks for all tenants."""
    logger.info("[SCHEDULER] Starting daily tasks...")

    try:
        tenants = obter_lista_tenants()

        for tenant_id in tenants:
            try:
                # Check maintenance alerts
                verificar_alertas_manutencao(tenant_id)

                # Execute automatic backup
                executar_backup_automatico(tenant_id)

                # Send daily report
                enviar_relatorio_diario_tenant(tenant_id)

            except Exception as e:
                logger.error("[SCHEDULER] Error processing tenant %s: %s", tenant_id, e)

        logger.info("[SCHEDULER] Daily tasks completed for %d tenants", len(tenants))

    except Exception as e:
        logger.error("[SCHEDULER] Error in daily tasks: %s", e)


def executar_backup_semanal():
    """Run weekly backup tasks (more comprehensive)."""
    logger.info("[SCHEDULER] Starting weekly backup...")
    # Weekly backup is same as daily but could include additional cleanup
    executar_tarefas_diarias()


def _run_scheduler():
    """Background thread that runs the scheduler."""
    global _scheduler_running

    while _scheduler_running:
        schedule.run_pending()
        time.sleep(60)  # Check every minute


def iniciar_scheduler(
    hora_diaria: str = "06:00",
    dia_semanal: str = "sunday",
    hora_semanal: str = "02:00"
):
    """
    Start the background scheduler.

    Args:
        hora_diaria: Time for daily tasks (HH:MM)
        dia_semanal: Day for weekly backup (monday, tuesday, etc.)
        hora_semanal: Time for weekly backup (HH:MM)
    """
    global _scheduler_thread, _scheduler_running

    if _scheduler_running:
        logger.warning("[SCHEDULER] Scheduler already running")
        return

    # Schedule daily tasks
    schedule.every().day.at(hora_diaria).do(executar_tarefas_diarias)

    # Schedule weekly backup
    getattr(schedule.every(), dia_semanal).at(hora_semanal).do(executar_backup_semanal)

    # Start background thread
    _scheduler_running = True
    _scheduler_thread = threading.Thread(target=_run_scheduler, daemon=True)
    _scheduler_thread.start()

    logger.info("[SCHEDULER] Started - Daily at %s, Weekly on %s at %s",
                hora_diaria, dia_semanal, hora_semanal)


def parar_scheduler():
    """Stop the background scheduler."""
    global _scheduler_running

    _scheduler_running = False
    schedule.clear()
    logger.info("[SCHEDULER] Stopped")


def obter_status_scheduler():
    """Get current scheduler status."""
    return {
        'running': _scheduler_running,
        'jobs': [
            {
                'job': str(job),
                'next_run': str(job.next_run) if job.next_run else None
            }
            for job in schedule.get_jobs()
        ]
    }
