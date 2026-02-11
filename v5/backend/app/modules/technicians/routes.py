"""
SmartLamppost v5.0 - Technicians Routes
Technician management for interventions.
"""

import logging
from flask import Blueprint, request, jsonify

from ...shared.database import obter_bd
from ...shared.permissions import requer_login, requer_permissao

logger = logging.getLogger(__name__)

technicians_bp = Blueprint('technicians', __name__)


@technicians_bp.route('', methods=['GET'])
@requer_login
def list_technicians():
    """List all technicians with optional filters."""
    bd = obter_bd()

    # Get query parameters
    tipo = request.args.get('tipo')  # interno, externo
    ativo = request.args.get('ativo')
    search = request.args.get('search', '')

    # Build query
    query = 'SELECT * FROM technicians WHERE 1=1'
    params = []

    if tipo:
        query += ' AND tipo = ?'
        params.append(tipo)

    if ativo is not None:
        query += ' AND ativo = ?'
        params.append(1 if ativo == 'true' else 0)

    if search:
        query += ' AND (nome LIKE ? OR empresa LIKE ? OR especialidade LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])

    query += ' ORDER BY nome'

    technicians = bd.execute(query, params).fetchall()

    return jsonify({
        'technicians': [dict(t) for t in technicians],
        'total': len(technicians)
    }), 200


@technicians_bp.route('/<int:technician_id>', methods=['GET'])
@requer_login
def get_technician(technician_id):
    """Get a single technician by ID."""
    bd = obter_bd()

    technician = bd.execute(
        'SELECT * FROM technicians WHERE id = ?',
        (technician_id,)
    ).fetchone()

    if not technician:
        return jsonify({'error': 'Técnico não encontrado'}), 404

    # Get intervention count
    intervention_count = bd.execute('''
        SELECT COUNT(*) as count FROM intervention_technicians
        WHERE technician_id = ?
    ''', (technician_id,)).fetchone()['count']

    result = dict(technician)
    result['intervention_count'] = intervention_count

    return jsonify(result), 200


@technicians_bp.route('', methods=['POST'])
@requer_permissao('technicians', 'write')
def create_technician():
    """Create a new technician."""
    dados = request.get_json() or {}

    # Validate required fields
    required_fields = ['nome', 'tipo']
    for field in required_fields:
        if not dados.get(field):
            return jsonify({'error': f'{field} é obrigatório'}), 400

    # Validate tipo
    if dados['tipo'] not in ['interno', 'externo']:
        return jsonify({'error': 'Tipo deve ser interno ou externo'}), 400

    bd = obter_bd()

    try:
        bd.execute('''
            INSERT INTO technicians (nome, tipo, empresa, telefone, email, especialidade, notas, ativo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            dados['nome'],
            dados['tipo'],
            dados.get('empresa', ''),
            dados.get('telefone', ''),
            dados.get('email', ''),
            dados.get('especialidade', ''),
            dados.get('notas', ''),
            1 if dados.get('ativo', True) else 0
        ))
        bd.commit()

        new_id = bd.execute('SELECT last_insert_rowid()').fetchone()[0]

        return jsonify({
            'message': 'Técnico criado com sucesso',
            'id': new_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating technician: {e}")
        return jsonify({'error': 'Erro ao criar técnico'}), 500


@technicians_bp.route('/<int:technician_id>', methods=['PUT'])
@requer_permissao('technicians', 'write')
def update_technician(technician_id):
    """Update a technician."""
    dados = request.get_json() or {}
    bd = obter_bd()

    # Check if exists
    existing = bd.execute(
        'SELECT id FROM technicians WHERE id = ?',
        (technician_id,)
    ).fetchone()

    if not existing:
        return jsonify({'error': 'Técnico não encontrado'}), 404

    # Validate tipo if provided
    if dados.get('tipo') and dados['tipo'] not in ['interno', 'externo']:
        return jsonify({'error': 'Tipo deve ser interno ou externo'}), 400

    try:
        bd.execute('''
            UPDATE technicians SET
                nome = COALESCE(?, nome),
                tipo = COALESCE(?, tipo),
                empresa = COALESCE(?, empresa),
                telefone = COALESCE(?, telefone),
                email = COALESCE(?, email),
                especialidade = COALESCE(?, especialidade),
                notas = COALESCE(?, notas),
                ativo = COALESCE(?, ativo),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (
            dados.get('nome'),
            dados.get('tipo'),
            dados.get('empresa'),
            dados.get('telefone'),
            dados.get('email'),
            dados.get('especialidade'),
            dados.get('notas'),
            1 if dados.get('ativo') else 0 if 'ativo' in dados else None,
            technician_id
        ))
        bd.commit()

        return jsonify({'message': 'Técnico atualizado com sucesso'}), 200

    except Exception as e:
        logger.error(f"Error updating technician: {e}")
        return jsonify({'error': 'Erro ao atualizar técnico'}), 500


@technicians_bp.route('/<int:technician_id>', methods=['DELETE'])
@requer_permissao('technicians', 'delete')
def delete_technician(technician_id):
    """Deactivate a technician (soft delete)."""
    bd = obter_bd()

    # Check if exists
    existing = bd.execute(
        'SELECT id FROM technicians WHERE id = ?',
        (technician_id,)
    ).fetchone()

    if not existing:
        return jsonify({'error': 'Técnico não encontrado'}), 404

    # Check for active interventions
    active_interventions = bd.execute('''
        SELECT COUNT(*) as count FROM intervention_technicians it
        JOIN interventions i ON it.intervention_id = i.id
        WHERE it.technician_id = ? AND i.estado = 'em_curso'
    ''', (technician_id,)).fetchone()['count']

    if active_interventions > 0:
        return jsonify({
            'error': 'Não é possível desativar técnico com intervenções em curso'
        }), 400

    try:
        bd.execute('''
            UPDATE technicians SET ativo = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (technician_id,))
        bd.commit()

        return jsonify({'message': 'Técnico desativado com sucesso'}), 200

    except Exception as e:
        logger.error(f"Error deactivating technician: {e}")
        return jsonify({'error': 'Erro ao desativar técnico'}), 500


@technicians_bp.route('/<int:technician_id>/interventions', methods=['GET'])
@requer_login
def get_technician_interventions(technician_id):
    """Get interventions for a technician."""
    bd = obter_bd()

    # Check if exists
    existing = bd.execute(
        'SELECT id FROM technicians WHERE id = ?',
        (technician_id,)
    ).fetchone()

    if not existing:
        return jsonify({'error': 'Técnico não encontrado'}), 404

    interventions = bd.execute('''
        SELECT i.*, a.serial_number as asset_numero
        FROM interventions i
        JOIN intervention_technicians it ON i.id = it.intervention_id
        LEFT JOIN assets a ON i.asset_id = a.id
        WHERE it.technician_id = ?
        ORDER BY i.created_at DESC
        LIMIT 50
    ''', (technician_id,)).fetchall()

    return jsonify({
        'interventions': [dict(i) for i in interventions]
    }), 200


@technicians_bp.route('/stats', methods=['GET'])
@requer_login
def get_technicians_stats():
    """Get technicians statistics."""
    bd = obter_bd()

    stats = {}

    # Total counts by type
    stats['total'] = bd.execute('SELECT COUNT(*) FROM technicians').fetchone()[0]
    stats['internos'] = bd.execute("SELECT COUNT(*) FROM technicians WHERE tipo = 'interno'").fetchone()[0]
    stats['externos'] = bd.execute("SELECT COUNT(*) FROM technicians WHERE tipo = 'externo'").fetchone()[0]
    stats['ativos'] = bd.execute('SELECT COUNT(*) FROM technicians WHERE ativo = 1').fetchone()[0]

    # Top technicians by interventions
    top = bd.execute('''
        SELECT t.id, t.nome, t.tipo, COUNT(it.intervention_id) as total
        FROM technicians t
        LEFT JOIN intervention_technicians it ON t.id = it.technician_id
        WHERE t.ativo = 1
        GROUP BY t.id
        ORDER BY total DESC
        LIMIT 5
    ''').fetchall()

    stats['top_technicians'] = [dict(t) for t in top]

    return jsonify(stats), 200
