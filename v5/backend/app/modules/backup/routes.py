"""
SmartLamppost v5.0 - Backup Routes
Database backup management with automatic scheduled backups.
"""

import os
import shutil
import logging
import zipfile
import json
import threading
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, send_file, current_app, g

from ...shared.database import obter_bd, obter_config
from ...shared.permissions import requer_admin

logger = logging.getLogger(__name__)

backup_bp = Blueprint('backup', __name__)

# Global scheduler state
_scheduler_thread = None
_scheduler_running = False
_scheduler_config = {
    'enabled': False,
    'schedule_type': 'daily',  # daily, weekly, monthly
    'time': '03:00',  # HH:MM format
    'day_of_week': 0,  # 0=Monday, 6=Sunday (for weekly)
    'day_of_month': 1,  # 1-28 (for monthly)
    'max_backups': 10,  # Maximum number of auto backups to keep
    'include_uploads': True  # Include uploads folder in backup
}


def get_backup_dir(base_path=None):
    """Get or create backup directory."""
    if base_path is None:
        base_path = current_app.config.get('BASE_PATH', os.getcwd())
    backup_dir = os.path.join(base_path, 'data', 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir


def load_scheduler_config(base_path):
    """Load scheduler configuration from file."""
    global _scheduler_config
    config_path = os.path.join(base_path, 'data', 'backup_scheduler.json')
    try:
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                stored_config = json.load(f)
                _scheduler_config.update(stored_config)
    except Exception as e:
        logger.error(f"Error loading scheduler config: {e}")
    return _scheduler_config


def save_scheduler_config(base_path, config):
    """Save scheduler configuration to file."""
    global _scheduler_config
    _scheduler_config.update(config)
    config_path = os.path.join(base_path, 'data', 'backup_scheduler.json')
    try:
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        with open(config_path, 'w') as f:
            json.dump(_scheduler_config, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving scheduler config: {e}")


def create_automatic_backup(base_path, tenant_id='smartlamppost'):
    """Create an automatic backup (ZIP with DB + uploads)."""
    try:
        config = load_scheduler_config(base_path)
        backup_dir = get_backup_dir(base_path)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'auto_backup_{timestamp}.zip'
        backup_path = os.path.join(backup_dir, backup_filename)

        tenant_dir = os.path.join(base_path, 'data', 'tenants', tenant_id)
        db_path = os.path.join(tenant_dir, 'database.db')

        if not os.path.exists(db_path):
            logger.error(f"Database not found at {db_path}")
            return None

        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add database
            zf.write(db_path, 'database.db')

            # Add uploads if enabled
            if config.get('include_uploads', True):
                uploads_dir = os.path.join(tenant_dir, 'uploads')
                if os.path.exists(uploads_dir):
                    for root, dirs, files in os.walk(uploads_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arc_name = os.path.join('uploads', os.path.relpath(file_path, uploads_dir))
                            zf.write(file_path, arc_name)

            # Add backup metadata
            metadata = {
                'created_at': datetime.now().isoformat(),
                'type': 'automatic',
                'tenant_id': tenant_id,
                'include_uploads': config.get('include_uploads', True)
            }
            zf.writestr('backup_metadata.json', json.dumps(metadata, indent=2))

        file_size = os.path.getsize(backup_path)
        logger.info(f"Automatic backup created: {backup_filename} ({file_size} bytes)")

        # Cleanup old auto backups
        cleanup_old_auto_backups(backup_dir, config.get('max_backups', 10))

        return backup_filename

    except Exception as e:
        logger.error(f"Error creating automatic backup: {e}")
        return None


def cleanup_old_auto_backups(backup_dir, max_backups):
    """Remove old automatic backups to keep only the most recent ones."""
    try:
        auto_backups = []
        for filename in os.listdir(backup_dir):
            if filename.startswith('auto_backup_') and filename.endswith('.zip'):
                file_path = os.path.join(backup_dir, filename)
                auto_backups.append((filename, os.path.getmtime(file_path)))

        # Sort by modification time (newest first)
        auto_backups.sort(key=lambda x: x[1], reverse=True)

        # Remove old backups
        for filename, _ in auto_backups[max_backups:]:
            file_path = os.path.join(backup_dir, filename)
            os.remove(file_path)
            logger.info(f"Removed old auto backup: {filename}")

    except Exception as e:
        logger.error(f"Error cleaning up old backups: {e}")


@backup_bp.route('/create', methods=['POST'])
@requer_admin
def create_backup():
    """Create a new database backup."""
    dados = request.get_json() or {}
    description = dados.get('description', '')

    try:
        base_path = current_app.config.get('BASE_PATH', os.getcwd())
        db_path = os.path.join(base_path, 'data', 'tenants', 'smartlamppost', 'database.db')

        if not os.path.exists(db_path):
            return jsonify({'error': 'Base de dados não encontrada'}), 404

        backup_dir = get_backup_dir()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'backup_{timestamp}.db'
        backup_path = os.path.join(backup_dir, backup_filename)

        # Copy database
        shutil.copy2(db_path, backup_path)

        # Get file size
        file_size = os.path.getsize(backup_path)

        # Save metadata
        bd = obter_bd()
        bd.execute('''
            INSERT INTO backup_history (filename, description, file_size, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ''', (backup_filename, description, file_size))
        bd.commit()

        return jsonify({
            'message': 'Backup criado com sucesso',
            'filename': backup_filename,
            'size': file_size
        }), 201

    except Exception as e:
        logger.error(f"Error creating backup: {e}")
        return jsonify({'error': f'Erro ao criar backup: {str(e)}'}), 500


@backup_bp.route('/list', methods=['GET'])
@requer_admin
def list_backups():
    """List all available backups."""
    backup_dir = get_backup_dir()

    backups = []

    # Check for backup files
    if os.path.exists(backup_dir):
        for filename in os.listdir(backup_dir):
            if filename.endswith('.db'):
                file_path = os.path.join(backup_dir, filename)
                file_stat = os.stat(file_path)
                backups.append({
                    'filename': filename,
                    'size': file_stat.st_size,
                    'created_at': datetime.fromtimestamp(file_stat.st_mtime).isoformat()
                })

    # Sort by date descending
    backups.sort(key=lambda x: x['created_at'], reverse=True)

    return jsonify({'backups': backups}), 200


@backup_bp.route('/<filename>', methods=['GET'])
@requer_admin
def download_backup(filename):
    """Download a backup file."""
    # Validate filename
    if '..' in filename or '/' in filename:
        return jsonify({'error': 'Nome de ficheiro inválido'}), 400

    backup_dir = get_backup_dir()
    file_path = os.path.join(backup_dir, filename)

    if not os.path.exists(file_path):
        return jsonify({'error': 'Backup não encontrado'}), 404

    return send_file(
        file_path,
        as_attachment=True,
        download_name=filename,
        mimetype='application/octet-stream'
    )


@backup_bp.route('/<filename>', methods=['DELETE'])
@requer_admin
def delete_backup(filename):
    """Delete a backup file."""
    # Validate filename
    if '..' in filename or '/' in filename:
        return jsonify({'error': 'Nome de ficheiro inválido'}), 400

    backup_dir = get_backup_dir()
    file_path = os.path.join(backup_dir, filename)

    if not os.path.exists(file_path):
        return jsonify({'error': 'Backup não encontrado'}), 404

    try:
        os.remove(file_path)

        # Remove from history if exists
        bd = obter_bd()
        bd.execute('DELETE FROM backup_history WHERE filename = ?', (filename,))
        bd.commit()

        return jsonify({'message': 'Backup eliminado'}), 200

    except Exception as e:
        logger.error(f"Error deleting backup: {e}")
        return jsonify({'error': f'Erro ao eliminar backup: {str(e)}'}), 500


@backup_bp.route('/restore/<filename>', methods=['POST'])
@requer_admin
def restore_backup(filename):
    """Restore a backup (requires confirmation)."""
    dados = request.get_json() or {}

    if not dados.get('confirm'):
        return jsonify({
            'error': 'Confirmação necessária. Envie confirm: true para restaurar.'
        }), 400

    # Validate filename
    if '..' in filename or '/' in filename:
        return jsonify({'error': 'Nome de ficheiro inválido'}), 400

    backup_dir = get_backup_dir()
    backup_path = os.path.join(backup_dir, filename)

    if not os.path.exists(backup_path):
        return jsonify({'error': 'Backup não encontrado'}), 404

    try:
        base_path = current_app.config.get('BASE_PATH', os.getcwd())
        tenant_dir = os.path.join(base_path, 'data', 'tenants', 'smartlamppost')
        db_path = os.path.join(tenant_dir, 'database.db')

        # Create backup of current before restore
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        pre_restore_backup = os.path.join(backup_dir, f'pre_restore_{timestamp}.db')
        shutil.copy2(db_path, pre_restore_backup)

        # Check if it's a ZIP backup or plain DB
        if filename.endswith('.zip'):
            # Extract ZIP backup
            with zipfile.ZipFile(backup_path, 'r') as zf:
                # Extract database
                zf.extract('database.db', tenant_dir)

                # Extract uploads if present
                for name in zf.namelist():
                    if name.startswith('uploads/'):
                        zf.extract(name, tenant_dir)
        else:
            # Plain DB file
            shutil.copy2(backup_path, db_path)

        return jsonify({
            'message': 'Backup restaurado com sucesso',
            'pre_restore_backup': f'pre_restore_{timestamp}.db'
        }), 200

    except Exception as e:
        logger.error(f"Error restoring backup: {e}")
        return jsonify({'error': f'Erro ao restaurar backup: {str(e)}'}), 500


# =========================================================================
# AUTOMATIC BACKUP SCHEDULER
# =========================================================================

@backup_bp.route('/scheduler/config', methods=['GET'])
@requer_admin
def get_scheduler_config():
    """Get current scheduler configuration."""
    base_path = current_app.config.get('BASE_PATH', os.getcwd())
    config = load_scheduler_config(base_path)

    return jsonify({
        'config': config,
        'running': _scheduler_running
    }), 200


@backup_bp.route('/scheduler/config', methods=['PUT'])
@requer_admin
def update_scheduler_config():
    """Update scheduler configuration."""
    dados = request.get_json() or {}
    base_path = current_app.config.get('BASE_PATH', os.getcwd())

    allowed_keys = ['enabled', 'schedule_type', 'time', 'day_of_week', 'day_of_month',
                    'max_backups', 'include_uploads']

    new_config = {}
    for key in allowed_keys:
        if key in dados:
            new_config[key] = dados[key]

    # Validate
    if 'schedule_type' in new_config:
        if new_config['schedule_type'] not in ['daily', 'weekly', 'monthly']:
            return jsonify({'error': 'Tipo de agendamento inválido'}), 400

    if 'time' in new_config:
        try:
            datetime.strptime(new_config['time'], '%H:%M')
        except ValueError:
            return jsonify({'error': 'Formato de hora inválido (use HH:MM)'}), 400

    if 'day_of_week' in new_config:
        if not 0 <= new_config['day_of_week'] <= 6:
            return jsonify({'error': 'Dia da semana inválido (0-6)'}), 400

    if 'day_of_month' in new_config:
        if not 1 <= new_config['day_of_month'] <= 28:
            return jsonify({'error': 'Dia do mês inválido (1-28)'}), 400

    if 'max_backups' in new_config:
        if not 1 <= new_config['max_backups'] <= 100:
            return jsonify({'error': 'Número máximo de backups inválido (1-100)'}), 400

    save_scheduler_config(base_path, new_config)

    return jsonify({
        'message': 'Configuração atualizada',
        'config': _scheduler_config
    }), 200


@backup_bp.route('/scheduler/run-now', methods=['POST'])
@requer_admin
def run_backup_now():
    """Trigger an immediate backup."""
    base_path = current_app.config.get('BASE_PATH', os.getcwd())

    filename = create_automatic_backup(base_path)

    if filename:
        return jsonify({
            'message': 'Backup criado com sucesso',
            'filename': filename
        }), 201
    else:
        return jsonify({'error': 'Erro ao criar backup'}), 500


@backup_bp.route('/scheduler/next-run', methods=['GET'])
@requer_admin
def get_next_run():
    """Get the next scheduled backup time."""
    base_path = current_app.config.get('BASE_PATH', os.getcwd())
    config = load_scheduler_config(base_path)

    if not config.get('enabled'):
        return jsonify({'next_run': None, 'message': 'Agendamento desativado'}), 200

    now = datetime.now()
    scheduled_time = datetime.strptime(config.get('time', '03:00'), '%H:%M').time()

    if config['schedule_type'] == 'daily':
        next_run = datetime.combine(now.date(), scheduled_time)
        if next_run <= now:
            next_run += timedelta(days=1)

    elif config['schedule_type'] == 'weekly':
        days_ahead = config.get('day_of_week', 0) - now.weekday()
        if days_ahead < 0:
            days_ahead += 7
        next_run = datetime.combine(now.date() + timedelta(days=days_ahead), scheduled_time)
        if next_run <= now:
            next_run += timedelta(weeks=1)

    elif config['schedule_type'] == 'monthly':
        day = config.get('day_of_month', 1)
        next_run = datetime.combine(now.replace(day=day).date(), scheduled_time)
        if next_run <= now:
            # Move to next month
            if now.month == 12:
                next_run = next_run.replace(year=now.year + 1, month=1)
            else:
                next_run = next_run.replace(month=now.month + 1)

    else:
        next_run = None

    return jsonify({
        'next_run': next_run.isoformat() if next_run else None,
        'schedule_type': config['schedule_type'],
        'time': config.get('time', '03:00')
    }), 200


@backup_bp.route('/scheduler/history', methods=['GET'])
@requer_admin
def get_backup_history():
    """Get history of automatic backups."""
    backup_dir = get_backup_dir()
    history = []

    if os.path.exists(backup_dir):
        for filename in os.listdir(backup_dir):
            if filename.startswith('auto_backup_') and filename.endswith('.zip'):
                file_path = os.path.join(backup_dir, filename)
                file_stat = os.stat(file_path)

                # Try to read metadata from ZIP
                metadata = {}
                try:
                    with zipfile.ZipFile(file_path, 'r') as zf:
                        if 'backup_metadata.json' in zf.namelist():
                            metadata = json.loads(zf.read('backup_metadata.json'))
                except Exception:
                    pass

                history.append({
                    'filename': filename,
                    'size': file_stat.st_size,
                    'created_at': metadata.get('created_at') or datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                    'type': metadata.get('type', 'automatic'),
                    'include_uploads': metadata.get('include_uploads', True)
                })

    # Sort by date descending
    history.sort(key=lambda x: x['created_at'], reverse=True)

    return jsonify({'history': history}), 200


# =========================================================================
# ENHANCED BACKUP CREATION (ZIP with uploads)
# =========================================================================

@backup_bp.route('/create-full', methods=['POST'])
@requer_admin
def create_full_backup():
    """Create a full backup (ZIP with database and uploads)."""
    dados = request.get_json() or {}
    description = dados.get('description', '')
    include_uploads = dados.get('include_uploads', True)

    try:
        base_path = current_app.config.get('BASE_PATH', os.getcwd())
        tenant_dir = os.path.join(base_path, 'data', 'tenants', 'smartlamppost')
        db_path = os.path.join(tenant_dir, 'database.db')

        if not os.path.exists(db_path):
            return jsonify({'error': 'Base de dados não encontrada'}), 404

        backup_dir = get_backup_dir()
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f'backup_{timestamp}.zip'
        backup_path = os.path.join(backup_dir, backup_filename)

        with zipfile.ZipFile(backup_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add database
            zf.write(db_path, 'database.db')

            # Add uploads if requested
            if include_uploads:
                uploads_dir = os.path.join(tenant_dir, 'uploads')
                if os.path.exists(uploads_dir):
                    for root, dirs, files in os.walk(uploads_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arc_name = os.path.join('uploads', os.path.relpath(file_path, uploads_dir))
                            zf.write(file_path, arc_name)

            # Add metadata
            metadata = {
                'created_at': datetime.now().isoformat(),
                'type': 'manual',
                'description': description,
                'include_uploads': include_uploads
            }
            zf.writestr('backup_metadata.json', json.dumps(metadata, indent=2))

        file_size = os.path.getsize(backup_path)

        return jsonify({
            'message': 'Backup completo criado com sucesso',
            'filename': backup_filename,
            'size': file_size,
            'include_uploads': include_uploads
        }), 201

    except Exception as e:
        logger.error(f"Error creating full backup: {e}")
        return jsonify({'error': f'Erro ao criar backup: {str(e)}'}), 500
