"""
SmartLamppost v5.0 - Assets Module Routes
CRUD operations for asset management.
"""

import json
import logging
from datetime import datetime

from flask import Blueprint, request, jsonify, g

from ...shared.database import obter_bd, obter_config, registar_auditoria, extrair_valor
from ...shared.permissions import requer_autenticacao, requer_permissao
from ...shared.plans import TenantPlanService

logger = logging.getLogger(__name__)

assets_bp = Blueprint('assets', __name__)


def gerar_proximo_numero():
    """Generate the next serial number with collision detection."""
    bd = obter_bd()

    prefixo = obter_config('prefix_assets', 'SLP')
    digitos = int(obter_config('prefix_assets_digits', '9'))

    # Get current counter
    contador = bd.execute(
        'SELECT current_value FROM sequence_counters WHERE counter_type = ?',
        ('assets',)
    ).fetchone()

    valor_atual = contador['current_value'] if contador else 0
    proximo = valor_atual + 1

    # Collision detection: check if serial already exists (e.g., from imports)
    for _ in range(1000):  # Safety limit
        serial = f"{prefixo}{str(proximo).zfill(digitos)}"
        existente = bd.execute(
            'SELECT 1 FROM assets WHERE serial_number = ?',
            (serial,)
        ).fetchone()
        if not existente:
            break
        proximo += 1

    # Update counter
    if contador:
        bd.execute(
            'UPDATE sequence_counters SET current_value = ?, updated_at = ? WHERE counter_type = ?',
            (proximo, datetime.now().isoformat(), 'assets')
        )
    else:
        bd.execute(
            'INSERT INTO sequence_counters (counter_type, current_value) VALUES (?, ?)',
            ('assets', proximo)
        )

    bd.commit()
    return f"{prefixo}{str(proximo).zfill(digitos)}"


@assets_bp.route('', methods=['GET'])
@requer_permissao('assets', 'view')
def list_assets():
    """List all assets with pagination."""
    bd = obter_bd()

    page = int(request.args.get('page', 1))
    per_page = min(int(request.args.get('per_page', 50)), 100)
    search = request.args.get('search', '')
    status = request.args.get('status', '')

    offset = (page - 1) * per_page

    # Build query
    query = 'SELECT a.* FROM assets a WHERE 1=1'
    params = []

    if search:
        query += ' AND a.serial_number LIKE ?'
        params.append(f'%{search}%')

    # Get total count
    count_query = query.replace('SELECT a.*', 'SELECT COUNT(*) as cnt')
    total = extrair_valor(bd.execute(count_query, params).fetchone(), 0) or 0

    # Add pagination
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?'
    params.extend([per_page, offset])

    assets = bd.execute(query, params).fetchall()

    # Get dynamic field values for each asset
    result = []
    for asset in assets:
        asset_dict = dict(asset)

        # Get dynamic field values
        fields = bd.execute(
            'SELECT field_name, field_value FROM asset_data WHERE asset_id = ?',
            (asset['id'],)
        ).fetchall()

        for field in fields:
            asset_dict[field['field_name']] = field['field_value']

        result.append(asset_dict)

    return jsonify({
        'data': result,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }), 200


@assets_bp.route('/search', methods=['GET'])
@requer_permissao('assets', 'view')
def search_assets():
    """Search assets by RFID tag, product reference, or serial number."""
    bd = obter_bd()
    q = request.args.get('q', '').strip()

    if not q:
        return jsonify({'assets': []}), 200

    # Search across multiple fields
    assets = bd.execute('''
        SELECT a.*, ad_rfid.field_value as rfid_tag, ad_ref.field_value as product_reference
        FROM assets a
        LEFT JOIN asset_data ad_rfid ON a.id = ad_rfid.asset_id AND ad_rfid.field_name = 'rfid_tag'
        LEFT JOIN asset_data ad_ref ON a.id = ad_ref.asset_id AND ad_ref.field_name = 'product_reference'
        WHERE a.serial_number = ?
           OR ad_rfid.field_value = ?
           OR ad_ref.field_value = ?
           OR a.serial_number LIKE ?
           OR ad_rfid.field_value LIKE ?
           OR ad_ref.field_value LIKE ?
        LIMIT 10
    ''', (q, q, q, f'%{q}%', f'%{q}%', f'%{q}%')).fetchall()

    result = []
    for asset in assets:
        asset_dict = dict(asset)

        # Get all dynamic field values
        fields = bd.execute(
            'SELECT field_name, field_value FROM asset_data WHERE asset_id = ?',
            (asset['id'],)
        ).fetchall()

        for field in fields:
            asset_dict[field['field_name']] = field['field_value']

        result.append(asset_dict)

    return jsonify({'assets': result}), 200


@assets_bp.route('/<string:serial_number>', methods=['GET'])
@requer_permissao('assets', 'view')
def get_asset(serial_number):
    """Get asset by serial number."""
    bd = obter_bd()

    asset = bd.execute(
        'SELECT * FROM assets WHERE serial_number = ?',
        (serial_number,)
    ).fetchone()

    if not asset:
        return jsonify({'error': 'Ativo não encontrado'}), 404

    asset_dict = dict(asset)

    # Get dynamic field values
    fields = bd.execute(
        'SELECT field_name, field_value FROM asset_data WHERE asset_id = ?',
        (asset['id'],)
    ).fetchall()

    for field in fields:
        asset_dict[field['field_name']] = field['field_value']

    # Get status history
    history = bd.execute('''
        SELECT scl.*, u.first_name, u.last_name
        FROM status_change_log scl
        LEFT JOIN users u ON scl.changed_by = u.id
        WHERE scl.asset_id = ?
        ORDER BY scl.changed_at DESC
        LIMIT 10
    ''', (asset['id'],)).fetchall()

    asset_dict['status_history'] = [dict(h) for h in history]

    return jsonify(asset_dict), 200


def parse_gps_coordinates(dados):
    """Parse gps_coordinates field into separate lat/lng values."""
    gps_coords = dados.get('gps_coordinates', '')
    if gps_coords and ',' in str(gps_coords):
        parts = str(gps_coords).split(',')
        if len(parts) >= 2:
            try:
                lat = parts[0].strip()
                lng = parts[1].strip()
                # Validate that they are valid numbers
                float(lat)
                float(lng)
                dados['gps_latitude'] = lat
                dados['gps_longitude'] = lng
            except (ValueError, IndexError):
                pass
    return dados


@assets_bp.route('', methods=['POST'])
@requer_permissao('assets', 'create')
def create_asset():
    """Create a new asset."""
    dados = request.get_json() or {}

    # Parse GPS coordinates if provided in combined format
    dados = parse_gps_coordinates(dados)

    # Check asset limit
    bd = obter_bd()
    current_count = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM assets').fetchone(), 0) or 0
    within_limit, limit, _ = TenantPlanService.check_tenant_limit(
        g.tenant_id, 'max_assets', current_count
    )

    if not within_limit:
        return jsonify({
            'error': f'Limite de ativos atingido ({limit}). Atualize o seu plano.'
        }), 403

    # Get serial number
    serial_number = dados.get('serial_number')
    if not serial_number:
        serial_number = gerar_proximo_numero()

    # Check if serial number exists
    existing = bd.execute(
        'SELECT id FROM assets WHERE serial_number = ?',
        (serial_number,)
    ).fetchone()

    if existing:
        return jsonify({'error': 'Número de série já existe'}), 400

    # Create asset
    cursor = bd.execute('''
        INSERT INTO assets (serial_number, created_by, created_at)
        VALUES (?, ?, ?)
    ''', (serial_number, g.utilizador_atual['user_id'], datetime.now().isoformat()))

    asset_id = cursor.lastrowid

    # Save dynamic fields
    schema_fields = bd.execute('SELECT field_name FROM schema_fields').fetchall()
    field_names = {f['field_name'] for f in schema_fields}

    # Also allow GPS fields even if not in schema
    field_names.add('gps_latitude')
    field_names.add('gps_longitude')
    field_names.add('gps_coordinates')

    for key, value in dados.items():
        if key in field_names and key != 'serial_number':
            bd.execute('''
                INSERT OR REPLACE INTO asset_data (asset_id, field_name, field_value)
                VALUES (?, ?, ?)
            ''', (asset_id, key, str(value) if value is not None else None))

    # Log audit
    registar_auditoria(bd, g.utilizador_atual['user_id'], 'CREATE', 'assets', asset_id, None, dados)
    bd.commit()

    logger.info("Asset created: %s", serial_number)
    return jsonify({
        'id': asset_id,
        'serial_number': serial_number,
        'message': 'Ativo criado com sucesso'
    }), 201


@assets_bp.route('/<string:serial_number>', methods=['PUT'])
@requer_permissao('assets', 'edit')
def update_asset(serial_number):
    """Update an asset."""
    bd = obter_bd()

    asset = bd.execute(
        'SELECT * FROM assets WHERE serial_number = ?',
        (serial_number,)
    ).fetchone()

    if not asset:
        return jsonify({'error': 'Ativo não encontrado'}), 404

    dados = request.get_json() or {}

    # Parse GPS coordinates if provided in combined format
    dados = parse_gps_coordinates(dados)

    asset_id = asset['id']

    # Get old values for audit
    old_fields = bd.execute(
        'SELECT field_name, field_value FROM asset_data WHERE asset_id = ?',
        (asset_id,)
    ).fetchall()
    old_values = {f['field_name']: f['field_value'] for f in old_fields}

    # Check for status change
    old_status = old_values.get('status') or old_values.get('condition_status')
    new_status = dados.get('status') or dados.get('condition_status')

    if new_status and old_status != new_status:
        bd.execute('''
            INSERT INTO status_change_log
            (asset_id, previous_status, new_status, description, changed_by)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            asset_id, old_status, new_status,
            dados.get('status_change_reason', 'Alteração manual'),
            g.utilizador_atual['user_id']
        ))

    # Update dynamic fields
    schema_fields = bd.execute('SELECT field_name FROM schema_fields').fetchall()
    field_names = {f['field_name'] for f in schema_fields}

    # Also allow GPS fields even if not in schema
    field_names.add('gps_latitude')
    field_names.add('gps_longitude')
    field_names.add('gps_coordinates')

    for key, value in dados.items():
        if key in field_names:
            bd.execute('''
                INSERT OR REPLACE INTO asset_data (asset_id, field_name, field_value)
                VALUES (?, ?, ?)
            ''', (asset_id, key, str(value) if value is not None else None))

    # Update timestamp
    bd.execute(
        'UPDATE assets SET updated_at = ?, updated_by = ? WHERE id = ?',
        (datetime.now().isoformat(), g.utilizador_atual['user_id'], asset_id)
    )

    # Log audit
    registar_auditoria(bd, g.utilizador_atual['user_id'], 'UPDATE', 'assets', asset_id,
                       old_values, dados)
    bd.commit()

    logger.info("Asset updated: %s", serial_number)
    return jsonify({'message': 'Ativo atualizado com sucesso'}), 200


@assets_bp.route('/<string:serial_number>', methods=['DELETE'])
@requer_permissao('assets', 'delete')
def delete_asset(serial_number):
    """Delete an asset."""
    bd = obter_bd()

    asset = bd.execute(
        'SELECT id FROM assets WHERE serial_number = ?',
        (serial_number,)
    ).fetchone()

    if not asset:
        return jsonify({'error': 'Ativo não encontrado'}), 404

    # Delete asset data first (cascade should handle this, but be explicit)
    bd.execute('DELETE FROM asset_data WHERE asset_id = ?', (asset['id'],))
    bd.execute('DELETE FROM assets WHERE id = ?', (asset['id'],))

    registar_auditoria(bd, g.utilizador_atual['user_id'], 'DELETE', 'assets', asset['id'],
                       {'serial_number': serial_number}, None)
    bd.commit()

    logger.info("Asset deleted: %s", serial_number)
    return jsonify({'message': 'Ativo eliminado'}), 200


@assets_bp.route('/next-number', methods=['GET'])
@requer_permissao('assets', 'create')
def get_next_number():
    """Get the next serial number (preview, doesn't increment)."""
    bd = obter_bd()

    prefixo = obter_config('prefix_assets', 'SLP')
    digitos = int(obter_config('prefix_assets_digits', '9'))

    contador = bd.execute(
        'SELECT current_value FROM sequence_counters WHERE counter_type = ?',
        ('assets',)
    ).fetchone()

    valor = (contador['current_value'] if contador else 0) + 1
    numero = f"{prefixo}{str(valor).zfill(digitos)}"

    return jsonify({'number': numero, 'next_number': numero, 'type': 'assets'}), 200


@assets_bp.route('/map', methods=['GET'])
@requer_permissao('assets', 'view')
def get_assets_for_map():
    """Get assets with GPS coordinates for map display."""
    bd = obter_bd()

    assets = bd.execute('''
        SELECT a.id, a.serial_number,
               MAX(CASE WHEN ad.field_name = 'gps_latitude' THEN ad.field_value END) as lat,
               MAX(CASE WHEN ad.field_name = 'gps_longitude' THEN ad.field_value END) as lng,
               MAX(CASE WHEN ad.field_name = 'status' THEN ad.field_value END) as status,
               MAX(CASE WHEN ad.field_name = 'condition_status' THEN ad.field_value END) as condition_status,
               MAX(CASE WHEN ad.field_name = 'installation_location' THEN ad.field_value END) as location,
               MAX(CASE WHEN ad.field_name = 'street_address' THEN ad.field_value END) as address
        FROM assets a
        LEFT JOIN asset_data ad ON a.id = ad.asset_id
        GROUP BY a.id
        HAVING lat IS NOT NULL AND lng IS NOT NULL
    ''').fetchall()

    return jsonify([dict(a) for a in assets]), 200


@assets_bp.route('/schema', methods=['GET'])
@requer_autenticacao
def get_schema():
    """Get the dynamic schema fields."""
    bd = obter_bd()

    fields = bd.execute('''
        SELECT * FROM schema_fields ORDER BY field_order
    ''').fetchall()

    result = []
    for field in fields:
        field_dict = dict(field)
        if field_dict.get('field_options'):
            try:
                field_dict['field_options'] = json.loads(field_dict['field_options'])
            except (json.JSONDecodeError, TypeError):
                pass
        result.append(field_dict)

    return jsonify(result), 200


@assets_bp.route('/schema', methods=['POST'])
@requer_permissao('assets', 'edit')
def add_schema_field():
    """Add a new dynamic field to the schema."""
    dados = request.get_json() or {}

    field_name = dados.get('field_name', '').strip().lower().replace(' ', '_')
    field_type = dados.get('field_type', 'text')
    field_label = dados.get('field_label', '')

    if not field_name or not field_label:
        return jsonify({'error': 'Nome e label são obrigatórios'}), 400

    if not field_name.replace('_', '').isalnum():
        return jsonify({'error': 'Nome deve conter apenas letras, números e underscores'}), 400

    bd = obter_bd()

    # Check if field exists
    existing = bd.execute(
        'SELECT id FROM schema_fields WHERE field_name = ?',
        (field_name,)
    ).fetchone()

    if existing:
        return jsonify({'error': 'Já existe um campo com este nome'}), 400

    # Get max order
    max_order = extrair_valor(bd.execute('SELECT MAX(field_order) as max_order FROM schema_fields').fetchone(), 0) or 0

    # Process options
    options = dados.get('field_options')
    if options and isinstance(options, list):
        options = json.dumps(options)

    cursor = bd.execute('''
        INSERT INTO schema_fields (field_name, field_type, field_label, required,
                                   field_order, field_category, field_options)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        field_name, field_type, field_label,
        1 if dados.get('required') else 0,
        max_order + 1,
        dados.get('field_category', 'general'),
        options
    ))
    bd.commit()

    logger.info("Schema field added: %s", field_name)
    return jsonify({
        'id': cursor.lastrowid,
        'field_name': field_name,
        'message': 'Campo adicionado com sucesso'
    }), 201


# =========================================================================
# BULK OPERATIONS
# =========================================================================

@assets_bp.route('/bulk', methods=['DELETE'])
@requer_permissao('assets', 'delete')
def delete_assets_bulk():
    """Delete multiple assets at once."""
    dados = request.get_json() or {}
    serial_numbers = dados.get('serial_numbers', [])

    if not serial_numbers:
        return jsonify({'error': 'Nenhum ativo selecionado'}), 400

    if not isinstance(serial_numbers, list):
        return jsonify({'error': 'serial_numbers deve ser uma lista'}), 400

    if len(serial_numbers) > 200:
        return jsonify({'error': 'Máximo 200 ativos por pedido'}), 400

    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    deleted = []
    failed = []

    for sn in serial_numbers:
        try:
            asset = bd.execute(
                'SELECT id FROM assets WHERE serial_number = ?',
                (sn,)
            ).fetchone()

            if not asset:
                failed.append({'serial_number': sn, 'error': 'Ativo não encontrado'})
                continue

            # Get old data for audit
            old_data = bd.execute(
                'SELECT field_name, field_value FROM asset_data WHERE asset_id = ?',
                (asset['id'],)
            ).fetchall()
            old_data_dict = {d['field_name']: d['field_value'] for d in old_data}

            # Delete related data
            bd.execute('DELETE FROM asset_data WHERE asset_id = ?', (asset['id'],))
            bd.execute('DELETE FROM asset_module_serials WHERE asset_id = ?', (asset['id'],))
            bd.execute('DELETE FROM status_change_log WHERE asset_id = ?', (asset['id'],))
            bd.execute('DELETE FROM assets WHERE id = ?', (asset['id'],))

            # Audit
            registar_auditoria(bd, user_id, 'BULK_DELETE', 'assets', asset['id'],
                               {'serial_number': sn, **old_data_dict}, None)

            deleted.append(sn)

        except Exception as e:
            failed.append({'serial_number': sn, 'error': str(e)})

    bd.commit()

    logger.info("Bulk delete: %d deleted, %d failed", len(deleted), len(failed))

    return jsonify({
        'success': True,
        'deleted': len(deleted),
        'failed': len(failed),
        'deleted_serials': deleted,
        'failed_details': failed
    }), 200


@assets_bp.route('/duplicate', methods=['POST'])
@requer_permissao('assets', 'create')
def duplicate_asset():
    """Duplicate an asset N times with auto-generated serial and suspended status."""
    dados = request.get_json() or {}
    serial_number = dados.get('serial_number', '').strip()
    quantity = dados.get('quantity', 1)

    if not serial_number:
        return jsonify({'error': 'serial_number obrigatório'}), 400

    if not isinstance(quantity, int) or quantity < 1 or quantity > 99:
        return jsonify({'error': 'quantity deve ser entre 1 e 99'}), 400

    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    # Check asset limit
    current_count = extrair_valor(bd.execute('SELECT COUNT(*) as cnt FROM assets').fetchone(), 0) or 0
    within_limit, limit, _ = TenantPlanService.check_tenant_limit(
        g.tenant_id, 'max_assets', current_count + quantity
    )

    if not within_limit:
        return jsonify({
            'error': f'Limite de ativos atingido ({limit}). Atualize o seu plano.'
        }), 403

    # Get original asset
    original = bd.execute(
        'SELECT * FROM assets WHERE serial_number = ?',
        (serial_number,)
    ).fetchone()

    if not original:
        return jsonify({'error': 'Ativo não encontrado'}), 404

    # Get original data
    original_data = bd.execute(
        'SELECT field_name, field_value FROM asset_data WHERE asset_id = ?',
        (original['id'],)
    ).fetchall()
    data_dict = {d['field_name']: d['field_value'] for d in original_data}

    # Get original modules
    original_modules = bd.execute(
        'SELECT module_name, module_description FROM asset_module_serials WHERE asset_id = ?',
        (original['id'],)
    ).fetchall()

    # Fields to exclude from duplication
    exclude_fields = {'rfid_tag', 'gps_latitude', 'gps_longitude'}

    created_serials = []
    failed = []

    for i in range(quantity):
        try:
            # Generate new serial
            new_serial = gerar_proximo_numero()

            # Create new asset
            cursor = bd.execute(
                'INSERT INTO assets (serial_number, created_by, created_at) VALUES (?, ?, ?)',
                (new_serial, user_id, datetime.now().isoformat())
            )
            new_id = cursor.lastrowid

            # Copy data (except excluded fields)
            for field_name, field_value in data_dict.items():
                if field_name in exclude_fields:
                    continue
                # Force condition_status = 'Suspenso'
                if field_name == 'condition_status':
                    field_value = 'Suspenso'
                if field_value is not None:
                    bd.execute(
                        'INSERT INTO asset_data (asset_id, field_name, field_value) VALUES (?, ?, ?)',
                        (new_id, field_name, field_value)
                    )

            # Ensure condition_status exists as Suspenso
            if 'condition_status' not in data_dict:
                bd.execute(
                    'INSERT INTO asset_data (asset_id, field_name, field_value) VALUES (?, ?, ?)',
                    (new_id, 'condition_status', 'Suspenso')
                )

            # Copy modules without serial_number
            for mod in original_modules:
                bd.execute('''
                    INSERT INTO asset_module_serials (asset_id, module_name, module_description, serial_number)
                    VALUES (?, ?, ?, ?)
                ''', (new_id, mod['module_name'], mod['module_description'], ''))

            created_serials.append(new_serial)

        except Exception as e:
            failed.append({'index': i + 1, 'error': str(e)})

    bd.commit()

    # Audit
    registar_auditoria(bd, user_id, 'DUPLICATE', 'assets', original['id'], None, {
        'source_serial': serial_number,
        'quantity_requested': quantity,
        'created_count': len(created_serials),
        'created_serials': created_serials[:20]
    })
    bd.commit()

    logger.info("Duplicated %s -> %d copies", serial_number, len(created_serials))

    return jsonify({
        'success': True,
        'source_serial': serial_number,
        'created': len(created_serials),
        'created_serials': created_serials,
        'failed': len(failed),
        'failed_details': failed
    }), 201


@assets_bp.route('/change-status', methods=['POST'])
@requer_permissao('assets', 'edit')
def change_assets_status():
    """Change status of one or more assets."""
    dados = request.get_json() or {}
    serial_numbers = dados.get('serial_numbers', [])
    new_status = dados.get('new_status')
    description = dados.get('description', '').strip()

    if not serial_numbers:
        return jsonify({'error': 'Nenhum ativo selecionado'}), 400

    if not new_status:
        return jsonify({'error': 'Estado não especificado'}), 400

    if not description:
        return jsonify({'error': 'Descrição obrigatória'}), 400

    valid_statuses = ['Operacional', 'Manutenção Necessária', 'Em Reparação', 'Desativado', 'Suspenso']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Estado inválido. Estados válidos: {", ".join(valid_statuses)}'}), 400

    bd = obter_bd()
    user_id = g.utilizador_atual['user_id']

    results = {'success': [], 'errors': []}

    for sn in serial_numbers:
        try:
            asset = bd.execute(
                'SELECT id FROM assets WHERE serial_number = ?',
                (sn,)
            ).fetchone()

            if not asset:
                results['errors'].append({'serial_number': sn, 'error': 'Ativo não encontrado'})
                continue

            asset_id = asset['id']

            # Get previous status
            prev_status_row = bd.execute('''
                SELECT field_value FROM asset_data
                WHERE asset_id = ? AND field_name = 'condition_status'
            ''', (asset_id,)).fetchone()
            prev_status = prev_status_row['field_value'] if prev_status_row else None

            # Update status
            bd.execute('''
                INSERT OR REPLACE INTO asset_data (asset_id, field_name, field_value)
                VALUES (?, 'condition_status', ?)
            ''', (asset_id, new_status))

            # Update timestamp
            bd.execute('''
                UPDATE assets SET updated_at = CURRENT_TIMESTAMP, updated_by = ?
                WHERE id = ?
            ''', (user_id, asset_id))

            # Log status change
            bd.execute('''
                INSERT INTO status_change_log (asset_id, previous_status, new_status, description, changed_by)
                VALUES (?, ?, ?, ?, ?)
            ''', (asset_id, prev_status, new_status, description, user_id))

            results['success'].append({
                'serial_number': sn,
                'previous_status': prev_status,
                'new_status': new_status
            })

        except Exception as e:
            results['errors'].append({'serial_number': sn, 'error': str(e)})

    bd.commit()

    return jsonify({
        'message': f'{len(results["success"])} ativo(s) atualizado(s)',
        'results': results
    }), 200


@assets_bp.route('/check-serial', methods=['GET'])
@requer_permissao('assets', 'view')
def check_serial_collision():
    """Check if a serial number already exists (collision detection)."""
    serial = request.args.get('serial', '').strip()

    if not serial:
        return jsonify({'error': 'Serial number obrigatório'}), 400

    bd = obter_bd()

    existing = bd.execute(
        'SELECT id, serial_number FROM assets WHERE serial_number = ?',
        (serial,)
    ).fetchone()

    return jsonify({
        'exists': existing is not None,
        'serial': serial
    }), 200


@assets_bp.route('/validate', methods=['POST'])
@requer_permissao('assets', 'view')
def validate_asset_data():
    """Validate asset data for Operational status requirements."""
    dados = request.get_json() or {}
    condition_status = dados.get('condition_status', '').strip()

    errors = []

    if condition_status == 'Operacional':
        required_fields = {
            'rfid_tag': 'RFID Tag',
            'manufacturer': 'Fabricante',
            'model': 'Modelo'
        }

        for field, label in required_fields.items():
            if not dados.get(field, '').strip():
                errors.append({
                    'field': field,
                    'label': label,
                    'message': f'{label} é obrigatório para estado Operacional'
                })

    return jsonify({
        'valid': len(errors) == 0,
        'errors': errors
    }), 200


# =========================================================================
# ASSET MODULE SERIALS MANAGEMENT
# =========================================================================

@assets_bp.route('/<string:serial_number>/modules', methods=['GET'])
@requer_permissao('assets', 'view')
def get_asset_modules(serial_number):
    """Get module serials for an asset."""
    bd = obter_bd()

    asset = bd.execute(
        'SELECT id FROM assets WHERE serial_number = ?',
        (serial_number,)
    ).fetchone()

    if not asset:
        return jsonify({'error': 'Ativo não encontrado'}), 404

    modules = bd.execute('''
        SELECT id, module_name, module_description, serial_number, updated_at
        FROM asset_module_serials
        WHERE asset_id = ?
        ORDER BY module_name
    ''', (asset['id'],)).fetchall()

    return jsonify({
        'asset_serial_number': serial_number,
        'modules': [dict(m) for m in modules]
    }), 200


@assets_bp.route('/<string:serial_number>/modules', methods=['POST'])
@requer_permissao('assets', 'edit')
def add_asset_module(serial_number):
    """Add or update a module serial for an asset."""
    bd = obter_bd()

    asset = bd.execute(
        'SELECT id FROM assets WHERE serial_number = ?',
        (serial_number,)
    ).fetchone()

    if not asset:
        return jsonify({'error': 'Ativo não encontrado'}), 404

    dados = request.get_json() or {}
    module_name = dados.get('module_name')
    module_description = dados.get('module_description', '')
    module_serial = dados.get('serial_number', '')

    if not module_name:
        return jsonify({'error': 'Nome do módulo obrigatório'}), 400

    user_id = g.utilizador_atual['user_id']

    # Ensure table exists
    bd.execute('''
        CREATE TABLE IF NOT EXISTS asset_module_serials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER NOT NULL,
            module_name TEXT NOT NULL,
            module_description TEXT,
            serial_number TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            FOREIGN KEY (asset_id) REFERENCES assets(id),
            UNIQUE(asset_id, module_name)
        )
    ''')

    bd.execute('''
        INSERT INTO asset_module_serials (asset_id, module_name, module_description, serial_number, updated_by, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(asset_id, module_name) DO UPDATE SET
            module_description = excluded.module_description,
            serial_number = excluded.serial_number,
            updated_by = excluded.updated_by,
            updated_at = CURRENT_TIMESTAMP
    ''', (asset['id'], module_name, module_description, module_serial, user_id))

    bd.commit()

    registar_auditoria(bd, user_id, 'UPDATE_MODULE', 'asset_module_serials', asset['id'],
                       None, {'module_name': module_name, 'serial_number': module_serial})

    return jsonify({'message': 'Módulo atualizado com sucesso'}), 200


@assets_bp.route('/<string:serial_number>/modules/bulk', methods=['POST'])
@requer_permissao('assets', 'edit')
def update_asset_modules_bulk(serial_number):
    """Update multiple modules at once."""
    bd = obter_bd()

    asset = bd.execute(
        'SELECT id FROM assets WHERE serial_number = ?',
        (serial_number,)
    ).fetchone()

    if not asset:
        return jsonify({'error': 'Ativo não encontrado'}), 404

    dados = request.get_json() or {}
    modules = dados.get('modules', [])

    user_id = g.utilizador_atual['user_id']

    # Ensure table exists
    bd.execute('''
        CREATE TABLE IF NOT EXISTS asset_module_serials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id INTEGER NOT NULL,
            module_name TEXT NOT NULL,
            module_description TEXT,
            serial_number TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_by INTEGER,
            FOREIGN KEY (asset_id) REFERENCES assets(id),
            UNIQUE(asset_id, module_name)
        )
    ''')

    for module in modules:
        module_name = module.get('module_name')
        module_description = module.get('module_description', '')
        module_serial = module.get('serial_number', '')

        if module_name:
            bd.execute('''
                INSERT INTO asset_module_serials (asset_id, module_name, module_description, serial_number, updated_by, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(asset_id, module_name) DO UPDATE SET
                    module_description = CASE
                        WHEN excluded.module_description != '' THEN excluded.module_description
                        ELSE asset_module_serials.module_description
                    END,
                    serial_number = excluded.serial_number,
                    updated_by = excluded.updated_by,
                    updated_at = CURRENT_TIMESTAMP
            ''', (asset['id'], module_name, module_description, module_serial, user_id))

    bd.commit()

    registar_auditoria(bd, user_id, 'BULK_UPDATE_MODULES', 'asset_module_serials', asset['id'],
                       None, {'modules_count': len(modules)})

    return jsonify({'message': f'{len(modules)} módulo(s) atualizado(s)'}), 200


@assets_bp.route('/<string:serial_number>/modules/<string:module_name>', methods=['DELETE'])
@requer_permissao('assets', 'edit')
def delete_asset_module(serial_number, module_name):
    """Delete a module from an asset."""
    bd = obter_bd()

    asset = bd.execute(
        'SELECT id FROM assets WHERE serial_number = ?',
        (serial_number,)
    ).fetchone()

    if not asset:
        return jsonify({'error': 'Ativo não encontrado'}), 404

    bd.execute('''
        DELETE FROM asset_module_serials
        WHERE asset_id = ? AND module_name = ?
    ''', (asset['id'], module_name))

    bd.commit()

    return jsonify({'message': 'Módulo removido'}), 200
