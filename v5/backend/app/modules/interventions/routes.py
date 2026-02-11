"""
SmartLamppost v5.0 - Interventions Routes
Work orders, maintenance, inspections.
"""

import os
import json
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, g, send_file, current_app
from werkzeug.utils import secure_filename

from ...shared.database import obter_bd, obter_config
from ...shared.permissions import requer_autenticacao, requer_permissao

logger = logging.getLogger(__name__)

interventions_bp = Blueprint('interventions', __name__)

INTERVENTION_TYPES = ['preventiva', 'corretiva', 'substituicao', 'inspecao']
INTERVENTION_STATUS = ['em_curso', 'concluida', 'cancelada']


def get_next_intervention_number(bd, int_type):
    """Generate next intervention number."""
    prefix_key = f'prefix_int_{int_type}'
    prefix = obter_config(prefix_key, f'INT{int_type[0].upper()}')
    digits = int(obter_config('prefix_int_digits', '9'))

    counter = bd.execute(
        'SELECT current_value FROM sequence_counters WHERE counter_type = ?',
        (f'int_{int_type}',)
    ).fetchone()

    next_val = (counter['current_value'] if counter else 0) + 1

    bd.execute('''
        INSERT OR REPLACE INTO sequence_counters (counter_type, current_value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
    ''', (f'int_{int_type}', next_val))

    return f"{prefix}{str(next_val).zfill(digits)}"


@interventions_bp.route('', methods=['GET'])
@requer_autenticacao
def list_interventions():
    """List interventions with filters."""
    bd = obter_bd()

    # Filters
    status = request.args.get('status')
    int_type = request.args.get('type')
    asset = request.args.get('asset')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    # Build query
    query = '''
        SELECT i.*, a.serial_number as asset_serial,
               u.email as created_by_email, u.first_name as created_by_name
        FROM interventions i
        LEFT JOIN assets a ON i.asset_id = a.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE 1=1
    '''
    params = []

    if status:
        query += ' AND i.status = ?'
        params.append(status)

    if int_type:
        query += ' AND i.intervention_type = ?'
        params.append(int_type)

    if asset:
        query += ' AND a.serial_number LIKE ?'
        params.append(f'%{asset}%')

    # Count total
    count_query = query.replace('SELECT i.*, a.serial_number as asset_serial, u.email as created_by_email, u.first_name as created_by_name', 'SELECT COUNT(*)')
    count_result = bd.execute(count_query, params).fetchone()
    total = count_result[0] if count_result else 0

    # Pagination
    query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])

    interventions = bd.execute(query, params).fetchall()

    return jsonify({
        'data': [dict(i) for i in interventions],
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }), 200


@interventions_bp.route('/<int:intervention_id>', methods=['GET'])
@requer_autenticacao
def get_intervention(intervention_id):
    """Get intervention details."""
    bd = obter_bd()

    intervention = bd.execute('''
        SELECT i.*, a.serial_number as asset_serial,
               u.email as created_by_email, u.first_name as created_by_name
        FROM interventions i
        LEFT JOIN assets a ON i.asset_id = a.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE i.id = ?
    ''', (intervention_id,)).fetchone()

    if not intervention:
        return jsonify({'error': 'Intervencao nao encontrada'}), 404

    result = dict(intervention)

    # Get technicians
    technicians = bd.execute('''
        SELECT it.*, u.email as user_email, u.first_name as user_name,
               et.name as external_name, et.company as external_company
        FROM intervention_technicians it
        LEFT JOIN users u ON it.user_id = u.id
        LEFT JOIN external_technicians et ON it.external_technician_id = et.id
        WHERE it.intervention_id = ?
    ''', (intervention_id,)).fetchall()
    result['technicians'] = [dict(t) for t in technicians]

    # Get files
    files = bd.execute('''
        SELECT * FROM intervention_files WHERE intervention_id = ?
    ''', (intervention_id,)).fetchall()
    result['files'] = [dict(f) for f in files]

    # Get time logs
    time_logs = bd.execute('''
        SELECT tl.*, u.email as logged_by_email
        FROM intervention_time_logs tl
        LEFT JOIN users u ON tl.logged_by = u.id
        WHERE tl.intervention_id = ?
        ORDER BY tl.work_date DESC
    ''', (intervention_id,)).fetchall()
    result['time_logs'] = [dict(t) for t in time_logs]

    # Get updates
    updates = bd.execute('''
        SELECT iu.*, u.email as created_by_email
        FROM intervention_updates iu
        LEFT JOIN users u ON iu.created_by = u.id
        WHERE iu.intervention_id = ?
        ORDER BY iu.created_at DESC
    ''', (intervention_id,)).fetchall()
    result['updates'] = [dict(u) for u in updates]

    return jsonify(result), 200


@interventions_bp.route('', methods=['POST'])
@requer_autenticacao
def create_intervention():
    """Create new intervention."""
    dados = request.get_json() or {}
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    # Validate
    asset_serial = dados.get('asset_serial')
    int_type = dados.get('intervention_type')

    if not asset_serial:
        return jsonify({'error': 'Ativo e obrigatorio'}), 400

    if int_type not in INTERVENTION_TYPES:
        return jsonify({'error': f'Tipo invalido. Use: {INTERVENTION_TYPES}'}), 400

    # Get asset
    asset = bd.execute(
        'SELECT id FROM assets WHERE serial_number = ?',
        (asset_serial,)
    ).fetchone()

    if not asset:
        return jsonify({'error': 'Ativo nao encontrado'}), 404

    # Generate intervention code
    # Note: We use a simple approach here - in production you might want a transaction
    int_code = get_next_intervention_number(bd, int_type)

    # Get current asset status
    asset_data = bd.execute(
        'SELECT field_value FROM asset_data WHERE asset_id = ? AND field_name = ?',
        (asset['id'], 'condition_status')
    ).fetchone()
    previous_status = asset_data['field_value'] if asset_data else None

    # Insert intervention
    bd.execute('''
        INSERT INTO interventions (
            asset_id, intervention_type, problem_description, notes,
            status, previous_asset_status, created_by, created_at
        ) VALUES (?, ?, ?, ?, 'em_curso', ?, ?, CURRENT_TIMESTAMP)
    ''', (
        asset['id'],
        int_type,
        dados.get('problem_description', ''),
        dados.get('notes', ''),
        previous_status,
        user_id
    ))

    intervention_id = bd.execute('SELECT last_insert_rowid()').fetchone()[0]

    # Add technicians if provided
    technicians = dados.get('technicians', [])
    for tech in technicians:
        bd.execute('''
            INSERT INTO intervention_technicians (intervention_id, user_id, external_technician_id, role)
            VALUES (?, ?, ?, ?)
        ''', (
            intervention_id,
            tech.get('user_id'),
            tech.get('external_technician_id'),
            tech.get('role', 'participante')
        ))

    # Update asset status to "Em Reparação"
    bd.execute('''
        INSERT OR REPLACE INTO asset_data (asset_id, field_name, field_value)
        VALUES (?, 'condition_status', 'Em Reparação')
    ''', (asset['id'],))

    # Log status change
    bd.execute('''
        INSERT INTO status_change_log (asset_id, previous_status, new_status, description, changed_by, intervention_id)
        VALUES (?, ?, 'Em Reparação', ?, ?, ?)
    ''', (asset['id'], previous_status, f'Intervencao {int_code} criada', user_id, intervention_id))

    bd.commit()

    return jsonify({
        'id': intervention_id,
        'code': int_code,
        'message': 'Intervencao criada com sucesso'
    }), 201


@interventions_bp.route('/<int:intervention_id>', methods=['PUT'])
@requer_autenticacao
def update_intervention(intervention_id):
    """Update intervention."""
    dados = request.get_json() or {}
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    # Check exists
    existing = bd.execute('SELECT * FROM interventions WHERE id = ?', (intervention_id,)).fetchone()
    if not existing:
        return jsonify({'error': 'Intervencao nao encontrada'}), 404

    if existing['status'] == 'concluida':
        return jsonify({'error': 'Intervencao ja concluida'}), 400

    # Update fields
    bd.execute('''
        UPDATE interventions SET
            problem_description = COALESCE(?, problem_description),
            solution_description = COALESCE(?, solution_description),
            parts_used = COALESCE(?, parts_used),
            total_cost = COALESCE(?, total_cost),
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE id = ?
    ''', (
        dados.get('problem_description'),
        dados.get('solution_description'),
        dados.get('parts_used'),
        dados.get('total_cost'),
        dados.get('notes'),
        user_id,
        intervention_id
    ))

    # Log edit
    for field, value in dados.items():
        if field in ['problem_description', 'solution_description', 'parts_used', 'total_cost', 'notes']:
            bd.execute('''
                INSERT INTO intervention_edit_log (intervention_id, edited_by, field_name, new_value)
                VALUES (?, ?, ?, ?)
            ''', (intervention_id, user_id, field, str(value)))

    bd.commit()
    return jsonify({'message': 'Intervencao atualizada'}), 200


@interventions_bp.route('/<int:intervention_id>/complete', methods=['POST'])
@requer_autenticacao
def complete_intervention(intervention_id):
    """Complete an intervention."""
    dados = request.get_json() or {}
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    intervention = bd.execute('SELECT * FROM interventions WHERE id = ?', (intervention_id,)).fetchone()
    if not intervention:
        return jsonify({'error': 'Intervencao nao encontrada'}), 404

    if intervention['status'] == 'concluida':
        return jsonify({'error': 'Intervencao ja concluida'}), 400

    final_status = dados.get('final_asset_status', 'Operacional')
    solution = dados.get('solution_description', '')

    # Calculate duration from time logs
    total_hours = bd.execute('''
        SELECT COALESCE(SUM(time_spent), 0) as total FROM intervention_time_logs WHERE intervention_id = ?
    ''', (intervention_id,)).fetchone()['total']

    # Update intervention
    bd.execute('''
        UPDATE interventions SET
            status = 'concluida',
            solution_description = COALESCE(?, solution_description),
            final_asset_status = ?,
            duration_hours = ?,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE id = ?
    ''', (solution, final_status, total_hours, user_id, intervention_id))

    # Update asset status
    bd.execute('''
        INSERT OR REPLACE INTO asset_data (asset_id, field_name, field_value)
        VALUES (?, 'condition_status', ?)
    ''', (intervention['asset_id'], final_status))

    # Log status change
    bd.execute('''
        INSERT INTO status_change_log (asset_id, previous_status, new_status, description, changed_by, intervention_id)
        VALUES (?, 'Em Reparação', ?, 'Intervencao concluida', ?, ?)
    ''', (intervention['asset_id'], final_status, user_id, intervention_id))

    bd.commit()
    return jsonify({'message': 'Intervencao concluida'}), 200


@interventions_bp.route('/<int:intervention_id>/cancel', methods=['POST'])
@requer_autenticacao
def cancel_intervention(intervention_id):
    """Cancel an intervention."""
    dados = request.get_json() or {}
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    intervention = bd.execute('SELECT * FROM interventions WHERE id = ?', (intervention_id,)).fetchone()
    if not intervention:
        return jsonify({'error': 'Intervencao nao encontrada'}), 404

    if intervention['status'] != 'em_curso':
        return jsonify({'error': 'So intervencoes em curso podem ser canceladas'}), 400

    # Update intervention
    bd.execute('''
        UPDATE interventions SET
            status = 'cancelada',
            notes = COALESCE(notes, '') || '\n[Cancelada: ' || ? || ']',
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE id = ?
    ''', (dados.get('reason', 'Sem motivo'), user_id, intervention_id))

    # Restore previous asset status
    if intervention['previous_asset_status']:
        bd.execute('''
            INSERT OR REPLACE INTO asset_data (asset_id, field_name, field_value)
            VALUES (?, 'condition_status', ?)
        ''', (intervention['asset_id'], intervention['previous_asset_status']))

    bd.commit()
    return jsonify({'message': 'Intervencao cancelada'}), 200


@interventions_bp.route('/<int:intervention_id>/time', methods=['POST'])
@requer_autenticacao
def log_time(intervention_id):
    """Log time spent on intervention."""
    dados = request.get_json() or {}
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    time_spent = dados.get('time_spent')
    if not time_spent or float(time_spent) <= 0:
        return jsonify({'error': 'Tempo invalido'}), 400

    bd.execute('''
        INSERT INTO intervention_time_logs (intervention_id, logged_by, time_spent, work_date, description)
        VALUES (?, ?, ?, COALESCE(?, DATE('now')), ?)
    ''', (
        intervention_id,
        user_id,
        float(time_spent),
        dados.get('work_date'),
        dados.get('description', '')
    ))

    bd.commit()
    return jsonify({'message': 'Tempo registado'}), 201


@interventions_bp.route('/<int:intervention_id>/files', methods=['POST'])
@requer_autenticacao
def upload_file(intervention_id):
    """Upload file to intervention."""
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    if 'file' not in request.files:
        return jsonify({'error': 'Ficheiro nao fornecido'}), 400

    file = request.files['file']
    if not file.filename:
        return jsonify({'error': 'Nome de ficheiro invalido'}), 400

    # Validate file size
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)

    if size > current_app.config.get('MAX_FILE_SIZE', 3 * 1024 * 1024):
        return jsonify({'error': 'Ficheiro demasiado grande'}), 400

    # Generate unique filename
    original_name = secure_filename(file.filename)
    ext = original_name.rsplit('.', 1)[-1] if '.' in original_name else ''
    unique_name = f"{intervention_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{original_name}"

    # Create uploads directory
    uploads_dir = os.path.join(current_app.config['UPLOADS_PATH'], 'interventions', str(intervention_id))
    os.makedirs(uploads_dir, exist_ok=True)

    file_path = os.path.join(uploads_dir, unique_name)
    file.save(file_path)

    # Save to database
    bd.execute('''
        INSERT INTO intervention_files (
            intervention_id, file_category, file_name, original_name,
            file_path, file_type, file_size, description, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        intervention_id,
        request.form.get('category', 'documento'),
        unique_name,
        original_name,
        file_path,
        ext,
        size,
        request.form.get('description', ''),
        user_id
    ))

    file_id = bd.execute('SELECT last_insert_rowid()').fetchone()[0]
    bd.commit()

    return jsonify({'id': file_id, 'message': 'Ficheiro carregado'}), 201


@interventions_bp.route('/<int:intervention_id>/files/<int:file_id>', methods=['GET'])
@requer_autenticacao
def download_file(intervention_id, file_id):
    """Download intervention file."""
    bd = obter_bd()

    file = bd.execute('''
        SELECT * FROM intervention_files WHERE id = ? AND intervention_id = ?
    ''', (file_id, intervention_id)).fetchone()

    if not file:
        return jsonify({'error': 'Ficheiro nao encontrado'}), 404

    return send_file(
        file['file_path'],
        download_name=file['original_name'],
        as_attachment=True
    )


@interventions_bp.route('/<int:intervention_id>/files/<int:file_id>', methods=['DELETE'])
@requer_autenticacao
def delete_file(intervention_id, file_id):
    """Delete intervention file."""
    bd = obter_bd()

    file = bd.execute('''
        SELECT * FROM intervention_files WHERE id = ? AND intervention_id = ?
    ''', (file_id, intervention_id)).fetchone()

    if not file:
        return jsonify({'error': 'Ficheiro nao encontrado'}), 404

    # Delete physical file
    try:
        os.remove(file['file_path'])
    except OSError:
        pass

    bd.execute('DELETE FROM intervention_files WHERE id = ?', (file_id,))
    bd.commit()

    return jsonify({'message': 'Ficheiro eliminado'}), 200


@interventions_bp.route('/<int:intervention_id>/updates', methods=['POST'])
@requer_autenticacao
def add_update(intervention_id):
    """Add update/note to intervention."""
    dados = request.get_json() or {}
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    description = dados.get('description')
    if not description:
        return jsonify({'error': 'Descricao e obrigatoria'}), 400

    # Get next update number
    last = bd.execute('''
        SELECT MAX(update_number) as max FROM intervention_updates WHERE intervention_id = ?
    ''', (intervention_id,)).fetchone()
    next_num = (last['max'] or 0) + 1

    update_code = f"UPD-{intervention_id}-{next_num}"

    bd.execute('''
        INSERT INTO intervention_updates (intervention_id, update_code, update_number, description, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        intervention_id,
        update_code,
        next_num,
        description,
        dados.get('notes', ''),
        user_id
    ))

    bd.commit()
    return jsonify({'code': update_code, 'message': 'Atualizacao adicionada'}), 201


# =========================================================================
# ENHANCED TIME LOGGING
# =========================================================================

@interventions_bp.route('/<int:intervention_id>/time', methods=['GET'])
@requer_autenticacao
def list_time_logs(intervention_id):
    """List all time logs for an intervention with statistics."""
    bd = obter_bd()

    time_logs = bd.execute('''
        SELECT tl.*, u.email as logged_by_email, u.first_name as logged_by_name
        FROM intervention_time_logs tl
        LEFT JOIN users u ON tl.logged_by = u.id
        WHERE tl.intervention_id = ?
        ORDER BY tl.work_date DESC, tl.created_at DESC
    ''', (intervention_id,)).fetchall()

    # Calculate statistics
    total_hours = 0
    by_user = {}
    by_date = {}

    for log in time_logs:
        log_dict = dict(log)
        hours = log_dict.get('time_spent', 0) or 0
        total_hours += hours

        user_email = log_dict.get('logged_by_email', 'unknown')
        by_user[user_email] = by_user.get(user_email, 0) + hours

        work_date = log_dict.get('work_date', 'unknown')
        by_date[work_date] = by_date.get(work_date, 0) + hours

    return jsonify({
        'time_logs': [dict(t) for t in time_logs],
        'statistics': {
            'total_hours': round(total_hours, 2),
            'total_entries': len(time_logs),
            'by_user': by_user,
            'by_date': dict(sorted(by_date.items(), reverse=True)[:10])  # Last 10 dates
        }
    }), 200


@interventions_bp.route('/<int:intervention_id>/time/<int:time_log_id>', methods=['PUT'])
@requer_autenticacao
def update_time_log(intervention_id, time_log_id):
    """Update a time log entry."""
    dados = request.get_json() or {}
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    # Check if exists and belongs to intervention
    existing = bd.execute('''
        SELECT * FROM intervention_time_logs WHERE id = ? AND intervention_id = ?
    ''', (time_log_id, intervention_id)).fetchone()

    if not existing:
        return jsonify({'error': 'Registo de tempo não encontrado'}), 404

    # Only allow edit by creator or admin
    if existing['logged_by'] != user_id and g.utilizador_atual.get('role') != 'admin':
        return jsonify({'error': 'Sem permissão para editar este registo'}), 403

    bd.execute('''
        UPDATE intervention_time_logs SET
            time_spent = COALESCE(?, time_spent),
            work_date = COALESCE(?, work_date),
            description = COALESCE(?, description)
        WHERE id = ?
    ''', (
        dados.get('time_spent'),
        dados.get('work_date'),
        dados.get('description'),
        time_log_id
    ))

    bd.commit()
    return jsonify({'message': 'Registo de tempo atualizado'}), 200


@interventions_bp.route('/<int:intervention_id>/time/<int:time_log_id>', methods=['DELETE'])
@requer_autenticacao
def delete_time_log(intervention_id, time_log_id):
    """Delete a time log entry."""
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    # Check if exists
    existing = bd.execute('''
        SELECT * FROM intervention_time_logs WHERE id = ? AND intervention_id = ?
    ''', (time_log_id, intervention_id)).fetchone()

    if not existing:
        return jsonify({'error': 'Registo de tempo não encontrado'}), 404

    # Only allow delete by creator or admin
    if existing['logged_by'] != user_id and g.utilizador_atual.get('role') != 'admin':
        return jsonify({'error': 'Sem permissão para eliminar este registo'}), 403

    bd.execute('DELETE FROM intervention_time_logs WHERE id = ?', (time_log_id,))
    bd.commit()

    return jsonify({'message': 'Registo de tempo eliminado'}), 200


# =========================================================================
# ENHANCED FILE MANAGEMENT
# =========================================================================

@interventions_bp.route('/<int:intervention_id>/files', methods=['GET'])
@requer_autenticacao
def list_files(intervention_id):
    """List all files for an intervention with details."""
    bd = obter_bd()

    files = bd.execute('''
        SELECT f.*, u.email as uploaded_by_email, u.first_name as uploaded_by_name
        FROM intervention_files f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.intervention_id = ?
        ORDER BY f.uploaded_at DESC
    ''', (intervention_id,)).fetchall()

    # Group by category
    by_category = {}
    total_size = 0

    for f in files:
        f_dict = dict(f)
        category = f_dict.get('file_category', 'outros')
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(f_dict)
        total_size += f_dict.get('file_size', 0) or 0

    return jsonify({
        'files': [dict(f) for f in files],
        'by_category': by_category,
        'statistics': {
            'total_files': len(files),
            'total_size': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2)
        }
    }), 200


@interventions_bp.route('/<int:intervention_id>/files/multiple', methods=['POST'])
@requer_autenticacao
def upload_multiple_files(intervention_id):
    """Upload multiple files to intervention."""
    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    if 'files' not in request.files:
        return jsonify({'error': 'Ficheiros não fornecidos'}), 400

    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'Nenhum ficheiro fornecido'}), 400

    category = request.form.get('category', 'documento')
    description = request.form.get('description', '')
    max_size = current_app.config.get('MAX_FILE_SIZE', 3 * 1024 * 1024)

    uploaded = []
    errors = []

    for file in files:
        if not file.filename:
            continue

        # Validate file size
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)

        if size > max_size:
            errors.append(f'{file.filename}: Ficheiro demasiado grande')
            continue

        # Generate unique filename
        original_name = secure_filename(file.filename)
        ext = original_name.rsplit('.', 1)[-1] if '.' in original_name else ''
        unique_name = f"{intervention_id}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}_{original_name}"

        # Create uploads directory
        uploads_dir = os.path.join(current_app.config['UPLOADS_PATH'], 'interventions', str(intervention_id))
        os.makedirs(uploads_dir, exist_ok=True)

        file_path = os.path.join(uploads_dir, unique_name)

        try:
            file.save(file_path)

            # Save to database
            bd.execute('''
                INSERT INTO intervention_files (
                    intervention_id, file_category, file_name, original_name,
                    file_path, file_type, file_size, description, uploaded_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                intervention_id,
                category,
                unique_name,
                original_name,
                file_path,
                ext,
                size,
                description,
                user_id
            ))

            file_id = bd.execute('SELECT last_insert_rowid()').fetchone()[0]
            uploaded.append({
                'id': file_id,
                'name': original_name,
                'size': size
            })
        except Exception as e:
            errors.append(f'{file.filename}: {str(e)}')

    bd.commit()

    return jsonify({
        'uploaded': uploaded,
        'errors': errors,
        'message': f'{len(uploaded)} ficheiro(s) carregado(s)'
    }), 201


@interventions_bp.route('/<int:intervention_id>/files/<int:file_id>', methods=['PUT'])
@requer_autenticacao
def update_file(intervention_id, file_id):
    """Update file metadata."""
    dados = request.get_json() or {}
    bd = obter_bd()

    file = bd.execute('''
        SELECT * FROM intervention_files WHERE id = ? AND intervention_id = ?
    ''', (file_id, intervention_id)).fetchone()

    if not file:
        return jsonify({'error': 'Ficheiro não encontrado'}), 404

    bd.execute('''
        UPDATE intervention_files SET
            file_category = COALESCE(?, file_category),
            description = COALESCE(?, description)
        WHERE id = ?
    ''', (
        dados.get('category'),
        dados.get('description'),
        file_id
    ))

    bd.commit()
    return jsonify({'message': 'Ficheiro atualizado'}), 200


# =========================================================================
# INTERVENTION STATISTICS
# =========================================================================

@interventions_bp.route('/statistics', methods=['GET'])
@requer_autenticacao
def get_statistics():
    """Get intervention statistics."""
    bd = obter_bd()

    # Overall counts by status
    by_status = bd.execute('''
        SELECT status, COUNT(*) as count FROM interventions GROUP BY status
    ''').fetchall()

    # By type
    by_type = bd.execute('''
        SELECT intervention_type, COUNT(*) as count FROM interventions GROUP BY intervention_type
    ''').fetchall()

    # This month
    this_month = bd.execute('''
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as completed
        FROM interventions
        WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    ''').fetchone()

    # Average duration
    avg_duration = bd.execute('''
        SELECT AVG(duration_hours) as avg_hours FROM interventions WHERE status = 'concluida'
    ''').fetchone()

    # Recent completions
    recent = bd.execute('''
        SELECT i.*, a.serial_number as asset_serial
        FROM interventions i
        LEFT JOIN assets a ON i.asset_id = a.id
        WHERE i.status = 'concluida'
        ORDER BY i.completed_at DESC
        LIMIT 5
    ''').fetchall()

    return jsonify({
        'by_status': {s['status']: s['count'] for s in by_status},
        'by_type': {t['intervention_type']: t['count'] for t in by_type},
        'this_month': dict(this_month) if this_month else {},
        'average_duration_hours': round(avg_duration['avg_hours'] or 0, 2),
        'recent_completions': [dict(r) for r in recent]
    }), 200
