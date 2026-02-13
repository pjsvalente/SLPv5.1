"""
SmartLamppost v5.0 - Catalog Routes
RFID v3 Migration: Complete catalog management with 8 module types and power calculations.

Module Types:
- Mod.1: Luminaires (catalog_luminaires)
- Mod.2: Electrical Panels (catalog_electrical_panels)
- Mod.3: Fuse Boxes (catalog_fuse_boxes)
- Mod.4: Telemetry Panels (catalog_telemetry_panels)
- Mod.5: EV Chargers (catalog_module_ev)
- Mod.6: MUPI (catalog_module_mupi)
- Mod.7: Lateral Modules (catalog_module_lateral)
- Mod.8: Antennas (catalog_module_antenna)
"""

import json
import logging
from flask import Blueprint, request, jsonify

from ...shared.database import obter_bd_catalogo, extrair_valor
from ...shared.permissions import requer_autenticacao, requer_admin

logger = logging.getLogger(__name__)

catalog_bp = Blueprint('catalog', __name__)


@catalog_bp.route('/test-packs', methods=['GET'])
def test_packs():
    """Test endpoint to verify packs data without auth."""
    try:
        bd = obter_bd_catalogo()
        packs = bd.execute('''
            SELECT * FROM catalog_packs WHERE active = 1 ORDER BY pack_name
        ''').fetchall()

        result = []
        for pack in packs:
            pack_dict = dict(pack)
            # Count columns per pack
            count = extrair_valor(bd.execute(
                'SELECT COUNT(*) as cnt FROM catalog_columns WHERE pack = ? AND active = 1',
                (pack['pack_name'],)
            ).fetchone(), 0) or 0
            pack_dict['column_count'] = count
            result.append(pack_dict)

        return jsonify({
            'packs': result,
            'count': len(result),
            'message': 'Test endpoint working'
        }), 200
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@catalog_bp.route('/debug', methods=['GET'])
def debug_catalog():
    """Debug endpoint to check catalog database status."""
    try:
        bd = obter_bd_catalogo()

        # Check current search_path
        result = bd.execute("SHOW search_path").fetchone()
        # Handle both dict (PostgreSQL RealDictCursor) and tuple (SQLite)
        if result:
            if isinstance(result, dict):
                search_path = result.get('search_path', list(result.values())[0] if result else 'unknown')
            else:
                search_path = result[0]
        else:
            search_path = 'unknown'

        # List all tables in current schema
        tables_result = bd.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'catalog'
            ORDER BY table_name
        """).fetchall()
        tables = []
        for t in tables_result:
            if isinstance(t, dict):
                tables.append(t.get('table_name', ''))
            else:
                tables.append(t[0])

        # Try to count packs
        try:
            packs_count = bd.execute("SELECT COUNT(*) as cnt FROM catalog_packs").fetchone()
            if isinstance(packs_count, dict):
                packs = packs_count.get('cnt', 0)
            else:
                packs = packs_count[0] if packs_count else 0
        except Exception as e:
            packs = f"Error: {e}"

        # List all packs
        try:
            packs_list = bd.execute("SELECT * FROM catalog_packs LIMIT 5").fetchall()
            packs_data = [dict(p) if hasattr(p, 'keys') else list(p) for p in packs_list]
        except Exception as e:
            packs_data = f"Error: {e}"

        # Check all schemas in database
        schemas_result = bd.execute("""
            SELECT schema_name
            FROM information_schema.schemata
            ORDER BY schema_name
        """).fetchall()
        schemas = []
        for s in schemas_result:
            if isinstance(s, dict):
                schemas.append(s.get('schema_name', ''))
            else:
                schemas.append(s[0])

        return jsonify({
            'search_path': search_path,
            'all_schemas': schemas,
            'tables_in_catalog_schema': tables,
            'packs_count': packs,
            'packs_sample': packs_data
        }), 200

    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


# =============================================================================
# STATISTICS
# =============================================================================

@catalog_bp.route('/stats', methods=['GET'])
@requer_autenticacao
def get_catalog_stats():
    """Get statistics for all catalog tables."""
    try:
        bd = obter_bd_catalogo()

        stats = {
            'packs': extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_packs WHERE active = 1').fetchone(), 0) or 0,
            'columns': extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_columns WHERE active = 1').fetchone(), 0) or 0,
            'luminaires': extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_luminaires WHERE active = 1').fetchone(), 0) or 0,
            'electrical_panels': extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_electrical_panels WHERE active = 1').fetchone(), 0) or 0,
            'fuse_boxes': extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_fuse_boxes WHERE active = 1').fetchone(), 0) or 0,
            'telemetry_panels': extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_telemetry_panels WHERE active = 1').fetchone(), 0) or 0,
            'ev_chargers': extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_module_ev WHERE active = 1').fetchone(), 0) or 0,
            'mupi': extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_module_mupi WHERE active = 1').fetchone(), 0) or 0,
            'lateral': extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_module_lateral WHERE active = 1').fetchone(), 0) or 0,
            'antennas': extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM catalog_module_antenna WHERE active = 1').fetchone(), 0) or 0,
        }

        stats['total_references'] = sum([
            stats['columns'], stats['luminaires'], stats['electrical_panels'],
            stats['fuse_boxes'], stats['telemetry_panels'], stats['ev_chargers'],
            stats['mupi'], stats['lateral'], stats['antennas']
        ])

        return jsonify(stats), 200
    except Exception as e:
        logger.error(f"Error getting catalog stats: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'packs': 0, 'columns': 0, 'luminaires': 0, 'electrical_panels': 0, 'fuse_boxes': 0, 'telemetry_panels': 0, 'ev_chargers': 0, 'mupi': 0, 'lateral': 0, 'antennas': 0, 'total_references': 0}), 200


# =============================================================================
# PACKS
# =============================================================================

@catalog_bp.route('/packs', methods=['GET'])
@requer_autenticacao
def get_packs():
    """Get all catalog packs."""
    bd = obter_bd_catalogo()

    packs = bd.execute('''
        SELECT * FROM catalog_packs WHERE active = 1 ORDER BY pack_name
    ''').fetchall()

    result = []
    for pack in packs:
        pack_dict = dict(pack)
        # Count columns per pack
        count = extrair_valor(bd.execute(
            'SELECT COUNT(*) as cnt FROM catalog_columns WHERE pack = ? AND active = 1',
            (pack['pack_name'],)
        ).fetchone(), 0) or 0
        pack_dict['column_count'] = count
        result.append(pack_dict)

    return jsonify({'packs': result}), 200


@catalog_bp.route('/packs', methods=['POST'])
@requer_admin
def add_pack():
    """Add a new catalog pack."""
    dados = request.get_json() or {}

    if not dados.get('pack_name'):
        return jsonify({'error': 'Nome do pack é obrigatório'}), 400

    bd = obter_bd_catalogo()

    # Check if exists
    existing = bd.execute(
        'SELECT id FROM catalog_packs WHERE pack_name = ?',
        (dados['pack_name'],)
    ).fetchone()
    if existing:
        return jsonify({'error': 'Pack já existe'}), 400

    try:
        bd.execute('''
            INSERT INTO catalog_packs (pack_name, pack_description, active)
            VALUES (?, ?, 1)
        ''', (dados['pack_name'], dados.get('pack_description', '')))
        bd.commit()

        # Get the newly inserted ID
        new_pack = bd.execute(
            'SELECT id FROM catalog_packs WHERE pack_name = ?',
            (dados['pack_name'],)
        ).fetchone()
        new_id = new_pack['id'] if new_pack else None

        return jsonify({
            'message': 'Pack adicionado',
            'id': new_id
        }), 201
    except Exception as e:
        logger.error(f"Error adding pack: {e}")
        return jsonify({'error': 'Erro ao adicionar pack'}), 500


@catalog_bp.route('/packs/<int:pack_id>', methods=['DELETE'])
@requer_admin
def delete_pack(pack_id):
    """Delete a catalog pack (soft delete)."""
    bd = obter_bd_catalogo()

    try:
        bd.execute('UPDATE catalog_packs SET active = 0 WHERE id = ?', (pack_id,))
        bd.commit()
        return jsonify({'message': 'Pack eliminado'}), 200
    except Exception as e:
        logger.error(f"Error deleting pack: {e}")
        return jsonify({'error': 'Erro ao eliminar pack'}), 500


# =============================================================================
# COLUMNS (Base Posts)
# =============================================================================

@catalog_bp.route('/columns', methods=['GET'])
@requer_autenticacao
def get_columns():
    """Get all catalog columns."""
    bd = obter_bd_catalogo()
    pack_filter = request.args.get('pack')

    if pack_filter:
        columns = bd.execute('''
            SELECT * FROM catalog_columns WHERE pack = ? AND active = 1 ORDER BY reference
        ''', (pack_filter,)).fetchall()
    else:
        columns = bd.execute('''
            SELECT * FROM catalog_columns WHERE active = 1 ORDER BY pack, reference
        ''').fetchall()

    return jsonify({'columns': [dict(c) for c in columns]}), 200


@catalog_bp.route('/columns', methods=['POST'])
@requer_admin
def add_column():
    """Add a new catalog column."""
    dados = request.get_json() or {}

    if not dados.get('reference') or not dados.get('pack'):
        return jsonify({'error': 'Referência e pack são obrigatórios'}), 400

    bd = obter_bd_catalogo()

    # Check if exists
    existing = bd.execute(
        'SELECT id FROM catalog_columns WHERE reference = ?',
        (dados['reference'],)
    ).fetchone()
    if existing:
        return jsonify({'error': 'Referência já existe'}), 400

    try:
        bd.execute('''
            INSERT INTO catalog_columns (
                reference, description, pack, column_type, fixing, height_m, arm_count,
                mod1, mod2, mod3, mod4, mod5, mod6, mod7, mod8, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ''', (
            dados['reference'],
            dados.get('description', ''),
            dados['pack'],
            dados.get('column_type', 'Standard'),
            dados.get('fixing', 'Flange'),
            dados.get('height_m'),
            dados.get('arm_count', 1),
            1 if dados.get('mod1') else 0,
            1 if dados.get('mod2') else 0,
            1 if dados.get('mod3') else 0,
            1 if dados.get('mod4') else 0,
            1 if dados.get('mod5') else 0,
            1 if dados.get('mod6') else 0,
            1 if dados.get('mod7') else 0,
            1 if dados.get('mod8') else 0,
        ))
        bd.commit()

        # Get the newly inserted ID
        new_col = bd.execute(
            'SELECT id FROM catalog_columns WHERE reference = ?',
            (dados['reference'],)
        ).fetchone()
        new_id = new_col['id'] if new_col else None

        return jsonify({
            'message': 'Coluna adicionada',
            'id': new_id
        }), 201
    except Exception as e:
        logger.error(f"Error adding column: {e}")
        return jsonify({'error': 'Erro ao adicionar coluna'}), 500


@catalog_bp.route('/columns/<int:column_id>', methods=['PUT'])
@requer_admin
def update_column(column_id):
    """Update a catalog column."""
    dados = request.get_json() or {}
    bd = obter_bd_catalogo()

    existing = bd.execute('SELECT id FROM catalog_columns WHERE id = ?', (column_id,)).fetchone()
    if not existing:
        return jsonify({'error': 'Coluna não encontrada'}), 404

    try:
        bd.execute('''
            UPDATE catalog_columns SET
                reference = COALESCE(?, reference),
                description = COALESCE(?, description),
                pack = COALESCE(?, pack),
                column_type = COALESCE(?, column_type),
                fixing = COALESCE(?, fixing),
                height_m = COALESCE(?, height_m),
                arm_count = COALESCE(?, arm_count),
                mod1 = COALESCE(?, mod1),
                mod2 = COALESCE(?, mod2),
                mod3 = COALESCE(?, mod3),
                mod4 = COALESCE(?, mod4),
                mod5 = COALESCE(?, mod5),
                mod6 = COALESCE(?, mod6),
                mod7 = COALESCE(?, mod7),
                mod8 = COALESCE(?, mod8)
            WHERE id = ?
        ''', (
            dados.get('reference'),
            dados.get('description'),
            dados.get('pack'),
            dados.get('column_type'),
            dados.get('fixing'),
            dados.get('height_m'),
            dados.get('arm_count'),
            1 if dados.get('mod1') else 0 if 'mod1' in dados else None,
            1 if dados.get('mod2') else 0 if 'mod2' in dados else None,
            1 if dados.get('mod3') else 0 if 'mod3' in dados else None,
            1 if dados.get('mod4') else 0 if 'mod4' in dados else None,
            1 if dados.get('mod5') else 0 if 'mod5' in dados else None,
            1 if dados.get('mod6') else 0 if 'mod6' in dados else None,
            1 if dados.get('mod7') else 0 if 'mod7' in dados else None,
            1 if dados.get('mod8') else 0 if 'mod8' in dados else None,
            column_id
        ))
        bd.commit()

        return jsonify({'message': 'Coluna atualizada'}), 200
    except Exception as e:
        logger.error(f"Error updating column: {e}")
        return jsonify({'error': 'Erro ao atualizar coluna'}), 500


@catalog_bp.route('/columns/<int:column_id>', methods=['DELETE'])
@requer_admin
def delete_column(column_id):
    """Delete a catalog column (soft delete)."""
    bd = obter_bd_catalogo()

    try:
        bd.execute('UPDATE catalog_columns SET active = 0 WHERE id = ?', (column_id,))
        bd.commit()
        return jsonify({'message': 'Coluna eliminada'}), 200
    except Exception as e:
        logger.error(f"Error deleting column: {e}")
        return jsonify({'error': 'Erro ao eliminar coluna'}), 500


# =============================================================================
# MOD.1: LUMINAIRES
# =============================================================================

@catalog_bp.route('/luminaires', methods=['GET'])
@requer_autenticacao
def get_luminaires():
    """Get all luminaires."""
    bd = obter_bd_catalogo()

    luminaires = bd.execute('''
        SELECT * FROM catalog_luminaires WHERE active = 1 ORDER BY reference
    ''').fetchall()

    return jsonify({'luminaires': [dict(l) for l in luminaires]}), 200


@catalog_bp.route('/luminaires', methods=['POST'])
@requer_admin
def add_luminaire():
    """Add a new luminaire."""
    dados = request.get_json() or {}

    if not dados.get('reference'):
        return jsonify({'error': 'Referência é obrigatória'}), 400

    bd = obter_bd_catalogo()

    try:
        bd.execute('''
            INSERT INTO catalog_luminaires (
                reference, description, luminaire_type, manufacturer_ref,
                power_watts, voltage, current_amps, type_1, type_2, column_height_m, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ''', (
            dados['reference'],
            dados.get('description', ''),
            dados.get('luminaire_type', ''),
            dados.get('manufacturer_ref', ''),
            dados.get('power_watts', 0),
            dados.get('voltage', '230V'),
            dados.get('current_amps'),
            1 if dados.get('type_1', True) else 0,
            1 if dados.get('type_2') else 0,
            dados.get('column_height_m'),
        ))
        bd.commit()

        # Get the newly inserted ID
        new_item = bd.execute(
            'SELECT id FROM catalog_luminaires WHERE reference = ?',
            (dados['reference'],)
        ).fetchone()
        new_id = new_item['id'] if new_item else None

        return jsonify({
            'message': 'Luminária adicionada',
            'id': new_id
        }), 201
    except Exception as e:
        logger.error(f"Error adding luminaire: {e}")
        return jsonify({'error': 'Erro ao adicionar luminária'}), 500


@catalog_bp.route('/luminaires/<int:item_id>', methods=['PUT'])
@requer_admin
def update_luminaire(item_id):
    """Update a luminaire."""
    dados = request.get_json() or {}
    bd = obter_bd_catalogo()

    try:
        bd.execute('''
            UPDATE catalog_luminaires SET
                reference = COALESCE(?, reference),
                description = COALESCE(?, description),
                luminaire_type = COALESCE(?, luminaire_type),
                manufacturer_ref = COALESCE(?, manufacturer_ref),
                power_watts = COALESCE(?, power_watts),
                voltage = COALESCE(?, voltage),
                current_amps = COALESCE(?, current_amps),
                type_1 = COALESCE(?, type_1),
                type_2 = COALESCE(?, type_2),
                column_height_m = COALESCE(?, column_height_m)
            WHERE id = ?
        ''', (
            dados.get('reference'),
            dados.get('description'),
            dados.get('luminaire_type'),
            dados.get('manufacturer_ref'),
            dados.get('power_watts'),
            dados.get('voltage'),
            dados.get('current_amps'),
            1 if dados.get('type_1') else 0 if 'type_1' in dados else None,
            1 if dados.get('type_2') else 0 if 'type_2' in dados else None,
            dados.get('column_height_m'),
            item_id
        ))
        bd.commit()
        return jsonify({'message': 'Luminária atualizada'}), 200
    except Exception as e:
        logger.error(f"Error updating luminaire: {e}")
        return jsonify({'error': 'Erro ao atualizar luminária'}), 500


@catalog_bp.route('/luminaires/<int:item_id>', methods=['DELETE'])
@requer_admin
def delete_luminaire(item_id):
    """Delete a luminaire (soft delete)."""
    bd = obter_bd_catalogo()
    bd.execute('UPDATE catalog_luminaires SET active = 0 WHERE id = ?', (item_id,))
    bd.commit()
    return jsonify({'message': 'Luminária eliminada'}), 200


# =============================================================================
# MOD.2: ELECTRICAL PANELS
# =============================================================================

@catalog_bp.route('/electrical-panels', methods=['GET'])
@requer_autenticacao
def get_electrical_panels():
    """Get all electrical panels."""
    bd = obter_bd_catalogo()

    panels = bd.execute('''
        SELECT * FROM catalog_electrical_panels WHERE active = 1 ORDER BY reference
    ''').fetchall()

    return jsonify({'electrical_panels': [dict(p) for p in panels]}), 200


@catalog_bp.route('/electrical-panels', methods=['POST'])
@requer_admin
def add_electrical_panel():
    """Add a new electrical panel."""
    dados = request.get_json() or {}

    if not dados.get('reference'):
        return jsonify({'error': 'Referência é obrigatória'}), 400

    bd = obter_bd_catalogo()

    try:
        bd.execute('''
            INSERT INTO catalog_electrical_panels (
                reference, description, panel_type, short_reference,
                max_power_total, max_power_per_phase, phases, voltage, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ''', (
            dados['reference'],
            dados.get('description', ''),
            dados.get('panel_type', ''),
            dados.get('short_reference', dados['reference'][:10]),
            dados.get('max_power_total', 0),
            dados.get('max_power_per_phase'),
            dados.get('phases', 1),
            dados.get('voltage', '230V'),
        ))
        bd.commit()

        # Get the newly inserted ID
        new_item = bd.execute(
            'SELECT id FROM catalog_electrical_panels WHERE reference = ?',
            (dados['reference'],)
        ).fetchone()
        new_id = new_item['id'] if new_item else None

        return jsonify({
            'message': 'Quadro elétrico adicionado',
            'id': new_id
        }), 201
    except Exception as e:
        logger.error(f"Error adding electrical panel: {e}")
        return jsonify({'error': 'Erro ao adicionar quadro elétrico'}), 500


@catalog_bp.route('/electrical-panels/<int:item_id>', methods=['PUT'])
@requer_admin
def update_electrical_panel(item_id):
    """Update an electrical panel."""
    dados = request.get_json() or {}
    bd = obter_bd_catalogo()

    try:
        bd.execute('''
            UPDATE catalog_electrical_panels SET
                reference = COALESCE(?, reference),
                description = COALESCE(?, description),
                panel_type = COALESCE(?, panel_type),
                short_reference = COALESCE(?, short_reference),
                max_power_total = COALESCE(?, max_power_total),
                max_power_per_phase = COALESCE(?, max_power_per_phase),
                phases = COALESCE(?, phases),
                voltage = COALESCE(?, voltage)
            WHERE id = ?
        ''', (
            dados.get('reference'),
            dados.get('description'),
            dados.get('panel_type'),
            dados.get('short_reference'),
            dados.get('max_power_total'),
            dados.get('max_power_per_phase'),
            dados.get('phases'),
            dados.get('voltage'),
            item_id
        ))
        bd.commit()
        return jsonify({'message': 'Quadro elétrico atualizado'}), 200
    except Exception as e:
        logger.error(f"Error updating electrical panel: {e}")
        return jsonify({'error': 'Erro ao atualizar quadro elétrico'}), 500


@catalog_bp.route('/electrical-panels/<int:item_id>', methods=['DELETE'])
@requer_admin
def delete_electrical_panel(item_id):
    """Delete an electrical panel (soft delete)."""
    bd = obter_bd_catalogo()
    bd.execute('UPDATE catalog_electrical_panels SET active = 0 WHERE id = ?', (item_id,))
    bd.commit()
    return jsonify({'message': 'Quadro elétrico eliminado'}), 200


# =============================================================================
# MOD.3: FUSE BOXES
# =============================================================================

@catalog_bp.route('/fuse-boxes', methods=['GET'])
@requer_autenticacao
def get_fuse_boxes():
    """Get all fuse boxes."""
    bd = obter_bd_catalogo()

    boxes = bd.execute('''
        SELECT * FROM catalog_fuse_boxes WHERE active = 1 ORDER BY reference
    ''').fetchall()

    return jsonify({'fuse_boxes': [dict(b) for b in boxes]}), 200


@catalog_bp.route('/fuse-boxes', methods=['POST'])
@requer_admin
def add_fuse_box():
    """Add a new fuse box."""
    dados = request.get_json() or {}

    if not dados.get('reference'):
        return jsonify({'error': 'Referência é obrigatória'}), 400

    bd = obter_bd_catalogo()

    try:
        bd.execute('''
            INSERT INTO catalog_fuse_boxes (
                reference, description, fuse_type, short_reference,
                max_power, voltage, type_s, type_d, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ''', (
            dados['reference'],
            dados.get('description', ''),
            dados.get('fuse_type', ''),
            dados.get('short_reference', dados['reference'][:10]),
            dados.get('max_power', 0),
            dados.get('voltage', '230V'),
            1 if dados.get('type_s') else 0,
            1 if dados.get('type_d') else 0,
        ))
        bd.commit()

        # Get the newly inserted ID
        new_item = bd.execute(
            'SELECT id FROM catalog_fuse_boxes WHERE reference = ?',
            (dados['reference'],)
        ).fetchone()
        new_id = new_item['id'] if new_item else None

        return jsonify({
            'message': 'Cofrete adicionado',
            'id': new_id
        }), 201
    except Exception as e:
        logger.error(f"Error adding fuse box: {e}")
        return jsonify({'error': 'Erro ao adicionar cofrete'}), 500


@catalog_bp.route('/fuse-boxes/<int:item_id>', methods=['DELETE'])
@requer_admin
def delete_fuse_box(item_id):
    """Delete a fuse box (soft delete)."""
    bd = obter_bd_catalogo()
    bd.execute('UPDATE catalog_fuse_boxes SET active = 0 WHERE id = ?', (item_id,))
    bd.commit()
    return jsonify({'message': 'Cofrete eliminado'}), 200


# =============================================================================
# MOD.4: TELEMETRY PANELS
# =============================================================================

@catalog_bp.route('/telemetry-panels', methods=['GET'])
@requer_autenticacao
def get_telemetry_panels():
    """Get all telemetry panels."""
    bd = obter_bd_catalogo()

    panels = bd.execute('''
        SELECT * FROM catalog_telemetry_panels WHERE active = 1 ORDER BY reference
    ''').fetchall()

    return jsonify({'telemetry_panels': [dict(p) for p in panels]}), 200


@catalog_bp.route('/telemetry-panels', methods=['POST'])
@requer_admin
def add_telemetry_panel():
    """Add a new telemetry panel."""
    dados = request.get_json() or {}

    if not dados.get('reference'):
        return jsonify({'error': 'Referência é obrigatória'}), 400

    bd = obter_bd_catalogo()

    try:
        bd.execute('''
            INSERT INTO catalog_telemetry_panels (
                reference, description, panel_type, short_reference,
                power_watts, voltage, active
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
        ''', (
            dados['reference'],
            dados.get('description', ''),
            dados.get('panel_type', ''),
            dados.get('short_reference', dados['reference'][:10]),
            dados.get('power_watts', 0),
            dados.get('voltage', '230V'),
        ))
        bd.commit()

        # Get the newly inserted ID
        new_item = bd.execute(
            'SELECT id FROM catalog_telemetry_panels WHERE reference = ?',
            (dados['reference'],)
        ).fetchone()
        new_id = new_item['id'] if new_item else None

        return jsonify({
            'message': 'Painel de telemetria adicionado',
            'id': new_id
        }), 201
    except Exception as e:
        logger.error(f"Error adding telemetry panel: {e}")
        return jsonify({'error': 'Erro ao adicionar painel de telemetria'}), 500


@catalog_bp.route('/telemetry-panels/<int:item_id>', methods=['DELETE'])
@requer_admin
def delete_telemetry_panel(item_id):
    """Delete a telemetry panel (soft delete)."""
    bd = obter_bd_catalogo()
    bd.execute('UPDATE catalog_telemetry_panels SET active = 0 WHERE id = ?', (item_id,))
    bd.commit()
    return jsonify({'message': 'Painel de telemetria eliminado'}), 200


# =============================================================================
# MOD.5: EV CHARGERS
# =============================================================================

@catalog_bp.route('/modules/ev', methods=['GET'])
@requer_autenticacao
def get_ev_chargers():
    """Get all EV chargers."""
    bd = obter_bd_catalogo()

    chargers = bd.execute('''
        SELECT * FROM catalog_module_ev WHERE active = 1 ORDER BY reference
    ''').fetchall()

    return jsonify({'ev_chargers': [dict(c) for c in chargers]}), 200


@catalog_bp.route('/modules/ev', methods=['POST'])
@requer_admin
def add_ev_charger():
    """Add a new EV charger."""
    dados = request.get_json() or {}

    if not dados.get('reference'):
        return jsonify({'error': 'Referência é obrigatória'}), 400

    bd = obter_bd_catalogo()

    try:
        bd.execute('''
            INSERT INTO catalog_module_ev (
                reference, description, module_type, short_reference,
                power_watts, current_amps, voltage, connector_type, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        ''', (
            dados['reference'],
            dados.get('description', ''),
            dados.get('module_type', ''),
            dados.get('short_reference', dados['reference'][:10]),
            dados.get('power_watts', 0),
            dados.get('current_amps'),
            dados.get('voltage', '230V'),
            dados.get('connector_type', ''),
        ))
        bd.commit()

        # Get the newly inserted ID
        new_item = bd.execute(
            'SELECT id FROM catalog_module_ev WHERE reference = ?',
            (dados['reference'],)
        ).fetchone()
        new_id = new_item['id'] if new_item else None

        return jsonify({
            'message': 'Carregador EV adicionado',
            'id': new_id
        }), 201
    except Exception as e:
        logger.error(f"Error adding EV charger: {e}")
        return jsonify({'error': 'Erro ao adicionar carregador EV'}), 500


@catalog_bp.route('/modules/ev/<int:item_id>', methods=['DELETE'])
@requer_admin
def delete_ev_charger(item_id):
    """Delete an EV charger (soft delete)."""
    bd = obter_bd_catalogo()
    bd.execute('UPDATE catalog_module_ev SET active = 0 WHERE id = ?', (item_id,))
    bd.commit()
    return jsonify({'message': 'Carregador EV eliminado'}), 200


# =============================================================================
# MOD.6: MUPI
# =============================================================================

@catalog_bp.route('/modules/mupi', methods=['GET'])
@requer_autenticacao
def get_mupi():
    """Get all MUPI modules."""
    bd = obter_bd_catalogo()

    modules = bd.execute('''
        SELECT * FROM catalog_module_mupi WHERE active = 1 ORDER BY reference
    ''').fetchall()

    return jsonify({'mupi': [dict(m) for m in modules]}), 200


@catalog_bp.route('/modules/mupi', methods=['POST'])
@requer_admin
def add_mupi():
    """Add a new MUPI module."""
    dados = request.get_json() or {}

    if not dados.get('reference'):
        return jsonify({'error': 'Referência é obrigatória'}), 400

    bd = obter_bd_catalogo()

    try:
        bd.execute('''
            INSERT INTO catalog_module_mupi (
                reference, description, module_type, short_reference,
                power_watts, size, active
            ) VALUES (?, ?, ?, ?, ?, ?, 1)
        ''', (
            dados['reference'],
            dados.get('description', ''),
            dados.get('module_type', ''),
            dados.get('short_reference', dados['reference'][:10]),
            dados.get('power_watts', 0),
            dados.get('size', ''),
        ))
        bd.commit()

        # Get the newly inserted ID
        new_item = bd.execute(
            'SELECT id FROM catalog_module_mupi WHERE reference = ?',
            (dados['reference'],)
        ).fetchone()
        new_id = new_item['id'] if new_item else None

        return jsonify({
            'message': 'MUPI adicionado',
            'id': new_id
        }), 201
    except Exception as e:
        logger.error(f"Error adding MUPI: {e}")
        return jsonify({'error': 'Erro ao adicionar MUPI'}), 500


@catalog_bp.route('/modules/mupi/<int:item_id>', methods=['DELETE'])
@requer_admin
def delete_mupi(item_id):
    """Delete a MUPI module (soft delete)."""
    bd = obter_bd_catalogo()
    bd.execute('UPDATE catalog_module_mupi SET active = 0 WHERE id = ?', (item_id,))
    bd.commit()
    return jsonify({'message': 'MUPI eliminado'}), 200


# =============================================================================
# MOD.7: LATERAL MODULES
# =============================================================================

@catalog_bp.route('/modules/lateral', methods=['GET'])
@requer_autenticacao
def get_lateral():
    """Get all lateral modules."""
    bd = obter_bd_catalogo()

    modules = bd.execute('''
        SELECT * FROM catalog_module_lateral WHERE active = 1 ORDER BY reference
    ''').fetchall()

    return jsonify({'lateral': [dict(m) for m in modules]}), 200


@catalog_bp.route('/modules/lateral', methods=['POST'])
@requer_admin
def add_lateral():
    """Add a new lateral module."""
    dados = request.get_json() or {}

    if not dados.get('reference'):
        return jsonify({'error': 'Referência é obrigatória'}), 400

    bd = obter_bd_catalogo()

    try:
        bd.execute('''
            INSERT INTO catalog_module_lateral (
                reference, description, module_type, short_reference,
                lateral_type, active
            ) VALUES (?, ?, ?, ?, ?, 1)
        ''', (
            dados['reference'],
            dados.get('description', ''),
            dados.get('module_type', ''),
            dados.get('short_reference', dados['reference'][:10]),
            dados.get('lateral_type', ''),
        ))
        bd.commit()

        # Get the newly inserted ID
        new_item = bd.execute(
            'SELECT id FROM catalog_module_lateral WHERE reference = ?',
            (dados['reference'],)
        ).fetchone()
        new_id = new_item['id'] if new_item else None

        return jsonify({
            'message': 'Módulo lateral adicionado',
            'id': new_id
        }), 201
    except Exception as e:
        logger.error(f"Error adding lateral module: {e}")
        return jsonify({'error': 'Erro ao adicionar módulo lateral'}), 500


@catalog_bp.route('/modules/lateral/<int:item_id>', methods=['DELETE'])
@requer_admin
def delete_lateral(item_id):
    """Delete a lateral module (soft delete)."""
    bd = obter_bd_catalogo()
    bd.execute('UPDATE catalog_module_lateral SET active = 0 WHERE id = ?', (item_id,))
    bd.commit()
    return jsonify({'message': 'Módulo lateral eliminado'}), 200


# =============================================================================
# MOD.8: ANTENNAS
# =============================================================================

@catalog_bp.route('/modules/antenna', methods=['GET'])
@requer_autenticacao
def get_antennas():
    """Get all antennas."""
    bd = obter_bd_catalogo()

    antennas = bd.execute('''
        SELECT * FROM catalog_module_antenna WHERE active = 1 ORDER BY reference
    ''').fetchall()

    return jsonify({'antennas': [dict(a) for a in antennas]}), 200


@catalog_bp.route('/modules/antenna', methods=['POST'])
@requer_admin
def add_antenna():
    """Add a new antenna."""
    dados = request.get_json() or {}

    if not dados.get('reference'):
        return jsonify({'error': 'Referência é obrigatória'}), 400

    bd = obter_bd_catalogo()

    try:
        bd.execute('''
            INSERT INTO catalog_module_antenna (
                reference, description, module_type, short_reference,
                column_height_m, frequency, power_watts, active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ''', (
            dados['reference'],
            dados.get('description', ''),
            dados.get('module_type', ''),
            dados.get('short_reference', dados['reference'][:10]),
            dados.get('column_height_m'),
            dados.get('frequency', ''),
            dados.get('power_watts', 0),
        ))
        bd.commit()

        # Get the newly inserted ID
        new_item = bd.execute(
            'SELECT id FROM catalog_module_antenna WHERE reference = ?',
            (dados['reference'],)
        ).fetchone()
        new_id = new_item['id'] if new_item else None

        return jsonify({
            'message': 'Antena adicionada',
            'id': new_id
        }), 201
    except Exception as e:
        logger.error(f"Error adding antenna: {e}")
        return jsonify({'error': 'Erro ao adicionar antena'}), 500


@catalog_bp.route('/modules/antenna/<int:item_id>', methods=['DELETE'])
@requer_admin
def delete_antenna(item_id):
    """Delete an antenna (soft delete)."""
    bd = obter_bd_catalogo()
    bd.execute('UPDATE catalog_module_antenna SET active = 0 WHERE id = ?', (item_id,))
    bd.commit()
    return jsonify({'message': 'Antena eliminada'}), 200


# =============================================================================
# COMPATIBLE MODULES
# =============================================================================

@catalog_bp.route('/compatible-modules/<int:column_id>', methods=['GET'])
@requer_autenticacao
def get_compatible_modules(column_id):
    """Get all modules compatible with a specific column based on mod1-mod8 flags."""
    bd = obter_bd_catalogo()

    column = bd.execute('SELECT * FROM catalog_columns WHERE id = ?', (column_id,)).fetchone()
    if not column:
        return jsonify({'error': 'Coluna não encontrada'}), 404

    result = {
        'column': dict(column),
        'compatible_modules': {}
    }

    # Mod.1: Luminaires
    if column['mod1']:
        luminaires = bd.execute('''
            SELECT * FROM catalog_luminaires WHERE active = 1 ORDER BY reference
        ''').fetchall()
        result['compatible_modules']['luminaires'] = [dict(l) for l in luminaires]

    # Mod.2: Electrical Panels
    if column['mod2']:
        panels = bd.execute('''
            SELECT * FROM catalog_electrical_panels WHERE active = 1 ORDER BY reference
        ''').fetchall()
        result['compatible_modules']['electrical_panels'] = [dict(p) for p in panels]

    # Mod.3: Fuse Boxes
    if column['mod3']:
        boxes = bd.execute('''
            SELECT * FROM catalog_fuse_boxes WHERE active = 1 ORDER BY reference
        ''').fetchall()
        result['compatible_modules']['fuse_boxes'] = [dict(b) for b in boxes]

    # Mod.4: Telemetry
    if column['mod4']:
        telemetry = bd.execute('''
            SELECT * FROM catalog_telemetry_panels WHERE active = 1 ORDER BY reference
        ''').fetchall()
        result['compatible_modules']['telemetry_panels'] = [dict(t) for t in telemetry]

    # Mod.5: EV Chargers
    if column['mod5']:
        ev = bd.execute('''
            SELECT * FROM catalog_module_ev WHERE active = 1 ORDER BY reference
        ''').fetchall()
        result['compatible_modules']['ev_chargers'] = [dict(e) for e in ev]

    # Mod.6: MUPI
    if column['mod6']:
        mupi = bd.execute('''
            SELECT * FROM catalog_module_mupi WHERE active = 1 ORDER BY reference
        ''').fetchall()
        result['compatible_modules']['mupi'] = [dict(m) for m in mupi]

    # Mod.7: Lateral
    if column['mod7']:
        lateral = bd.execute('''
            SELECT * FROM catalog_module_lateral WHERE active = 1 ORDER BY reference
        ''').fetchall()
        result['compatible_modules']['lateral'] = [dict(l) for l in lateral]

    # Mod.8: Antennas
    if column['mod8']:
        antennas = bd.execute('''
            SELECT * FROM catalog_module_antenna WHERE active = 1 ORDER BY reference
        ''').fetchall()
        result['compatible_modules']['antennas'] = [dict(a) for a in antennas]

    return jsonify(result), 200


@catalog_bp.route('/compatible-modules-by-ref/<string:reference>', methods=['GET'])
@requer_autenticacao
def get_compatible_modules_by_ref(reference):
    """Get compatible modules by column reference."""
    bd = obter_bd_catalogo()

    column = bd.execute(
        'SELECT * FROM catalog_columns WHERE reference = ? AND active = 1',
        (reference,)
    ).fetchone()

    if not column:
        return jsonify({'error': 'Coluna não encontrada'}), 404

    # Reuse the ID-based endpoint
    return get_compatible_modules(column['id'])


# =============================================================================
# POWER CALCULATION
# =============================================================================

@catalog_bp.route('/calculate-power', methods=['POST'])
@requer_autenticacao
def calculate_power():
    """Calculate electrical balance based on selected modules.

    Request body:
    {
        "electrical_panel_id": 5,  // OR "fuse_box_id": 3
        "modules": [
            {"type": "luminaire", "id": 3, "quantity": 2},
            {"type": "ev", "id": 1, "quantity": 1},
            {"type": "telemetry", "id": 2, "quantity": 1},
            {"type": "mupi", "id": 1, "quantity": 1},
            {"type": "antenna", "id": 1, "quantity": 1}
        ]
    }
    """
    dados = request.get_json() or {}
    bd = obter_bd_catalogo()

    # Get power source (electrical panel or fuse box)
    max_power = 0
    connection_type = 'Monofásico'
    power_source = None

    if dados.get('electrical_panel_id'):
        panel = bd.execute(
            'SELECT * FROM catalog_electrical_panels WHERE id = ?',
            (dados['electrical_panel_id'],)
        ).fetchone()
        if panel:
            max_power = panel['max_power_total'] or 0
            connection_type = 'Trifásico' if panel['phases'] == 3 else 'Monofásico'
            power_source = {'type': 'electrical_panel', 'reference': panel['reference']}

    elif dados.get('fuse_box_id'):
        box = bd.execute(
            'SELECT * FROM catalog_fuse_boxes WHERE id = ?',
            (dados['fuse_box_id'],)
        ).fetchone()
        if box:
            max_power = box['max_power'] or 0
            connection_type = 'Monofásico'  # Fuse boxes are typically single-phase
            power_source = {'type': 'fuse_box', 'reference': box['reference']}

    # Calculate installed power from modules
    installed_power = 0
    modules_breakdown = []

    for module in dados.get('modules', []):
        module_type = module.get('type', '').lower()
        module_id = module.get('id')
        quantity = module.get('quantity', 1)

        if not module_id:
            continue

        power = 0
        reference = ''

        if module_type == 'luminaire':
            item = bd.execute(
                'SELECT reference, power_watts FROM catalog_luminaires WHERE id = ?',
                (module_id,)
            ).fetchone()
            if item:
                power = (item['power_watts'] or 0) * quantity
                reference = item['reference']

        elif module_type == 'telemetry':
            item = bd.execute(
                'SELECT reference, power_watts FROM catalog_telemetry_panels WHERE id = ?',
                (module_id,)
            ).fetchone()
            if item:
                power = (item['power_watts'] or 0) * quantity
                reference = item['reference']

        elif module_type == 'ev':
            item = bd.execute(
                'SELECT reference, power_watts FROM catalog_module_ev WHERE id = ?',
                (module_id,)
            ).fetchone()
            if item:
                power = (item['power_watts'] or 0) * quantity
                reference = item['reference']

        elif module_type == 'mupi':
            item = bd.execute(
                'SELECT reference, power_watts FROM catalog_module_mupi WHERE id = ?',
                (module_id,)
            ).fetchone()
            if item:
                power = (item['power_watts'] or 0) * quantity
                reference = item['reference']

        elif module_type == 'antenna':
            item = bd.execute(
                'SELECT reference, power_watts FROM catalog_module_antenna WHERE id = ?',
                (module_id,)
            ).fetchone()
            if item:
                power = (item['power_watts'] or 0) * quantity
                reference = item['reference']

        if power > 0:
            installed_power += power
            modules_breakdown.append({
                'type': module_type,
                'reference': reference,
                'power': power,
                'quantity': quantity
            })

    remaining_power = max_power - installed_power

    return jsonify({
        'max_power': max_power,
        'installed_power': installed_power,
        'remaining_power': remaining_power,
        'connection_type': connection_type,
        'power_source': power_source,
        'modules_breakdown': modules_breakdown,
        'is_valid': remaining_power >= 0
    }), 200


# =============================================================================
# GENERIC ITEM MANAGEMENT
# =============================================================================

@catalog_bp.route('/item/<string:tab>', methods=['POST'])
@requer_admin
def add_item(tab):
    """Generic endpoint to add an item to any catalog table."""
    # Map tab to the correct POST endpoint
    tab_endpoints = {
        'columns': add_column,
        'luminaires': add_luminaire,
        'electrical-panels': add_electrical_panel,
        'fuse-boxes': add_fuse_box,
        'telemetry-panels': add_telemetry_panel,
        'ev': add_ev_charger,
        'mupi': add_mupi,
        'lateral': add_lateral,
        'antenna': add_antenna,
        'packs': add_pack,
    }

    if tab not in tab_endpoints:
        return jsonify({'error': f'Tab desconhecida: {tab}'}), 400

    return tab_endpoints[tab]()


@catalog_bp.route('/item/<string:tab>/<int:item_id>', methods=['DELETE'])
@requer_admin
def delete_item(tab, item_id):
    """Generic endpoint to delete an item from any catalog table."""
    # Map tab to table name
    tab_tables = {
        'columns': 'catalog_columns',
        'luminaires': 'catalog_luminaires',
        'electrical-panels': 'catalog_electrical_panels',
        'fuse-boxes': 'catalog_fuse_boxes',
        'telemetry-panels': 'catalog_telemetry_panels',
        'ev': 'catalog_module_ev',
        'mupi': 'catalog_module_mupi',
        'lateral': 'catalog_module_lateral',
        'antenna': 'catalog_module_antenna',
        'packs': 'catalog_packs',
    }

    if tab not in tab_tables:
        return jsonify({'error': f'Tab desconhecida: {tab}'}), 400

    bd = obter_bd_catalogo()

    try:
        bd.execute(f'UPDATE {tab_tables[tab]} SET active = 0 WHERE id = ?', (item_id,))
        bd.commit()
        return jsonify({'message': 'Item eliminado'}), 200
    except Exception as e:
        logger.error(f"Error deleting item: {e}")
        return jsonify({'error': 'Erro ao eliminar item'}), 500


# =============================================================================
# CATALOG MANAGEMENT
# =============================================================================

@catalog_bp.route('/clear', methods=['DELETE'])
@requer_admin
def clear_catalog():
    """Clear all catalog data (soft delete all items)."""
    bd = obter_bd_catalogo()

    tables = [
        'catalog_columns', 'catalog_luminaires', 'catalog_electrical_panels',
        'catalog_fuse_boxes', 'catalog_telemetry_panels', 'catalog_module_ev',
        'catalog_module_mupi', 'catalog_module_lateral', 'catalog_module_antenna'
    ]

    for table in tables:
        bd.execute(f'UPDATE {table} SET active = 0')

    bd.commit()
    return jsonify({'message': 'Catálogo limpo'}), 200


@catalog_bp.route('/export', methods=['GET'])
@requer_admin
def export_catalog():
    """Export full catalog as JSON."""
    bd = obter_bd_catalogo()

    catalog = {
        'packs': [dict(r) for r in bd.execute('SELECT * FROM catalog_packs WHERE active = 1').fetchall()],
        'columns': [dict(r) for r in bd.execute('SELECT * FROM catalog_columns WHERE active = 1').fetchall()],
        'luminaires': [dict(r) for r in bd.execute('SELECT * FROM catalog_luminaires WHERE active = 1').fetchall()],
        'electrical_panels': [dict(r) for r in bd.execute('SELECT * FROM catalog_electrical_panels WHERE active = 1').fetchall()],
        'fuse_boxes': [dict(r) for r in bd.execute('SELECT * FROM catalog_fuse_boxes WHERE active = 1').fetchall()],
        'telemetry_panels': [dict(r) for r in bd.execute('SELECT * FROM catalog_telemetry_panels WHERE active = 1').fetchall()],
        'ev_chargers': [dict(r) for r in bd.execute('SELECT * FROM catalog_module_ev WHERE active = 1').fetchall()],
        'mupi': [dict(r) for r in bd.execute('SELECT * FROM catalog_module_mupi WHERE active = 1').fetchall()],
        'lateral': [dict(r) for r in bd.execute('SELECT * FROM catalog_module_lateral WHERE active = 1').fetchall()],
        'antennas': [dict(r) for r in bd.execute('SELECT * FROM catalog_module_antenna WHERE active = 1').fetchall()],
    }

    return jsonify(catalog), 200


@catalog_bp.route('/values', methods=['GET'])
@requer_autenticacao
def get_values():
    """Get catalog values for dropdowns."""
    bd = obter_bd_catalogo()
    column_name = request.args.get('column')

    if column_name:
        values = bd.execute('''
            SELECT * FROM catalog_values WHERE column_name = ? ORDER BY value_order
        ''', (column_name,)).fetchall()
    else:
        values = bd.execute('SELECT * FROM catalog_values ORDER BY column_name, value_order').fetchall()

    return jsonify({'values': [dict(v) for v in values]}), 200
