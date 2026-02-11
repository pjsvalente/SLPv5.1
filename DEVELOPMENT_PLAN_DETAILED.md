# Plano de Desenvolvimento Detalhado - SmartLamppost v5

**Data**: 2026-02-09
**Versão**: 1.0

---

## FASE 1: Sistema de Intervenções (Semanas 1-2)

### 1.1 Backend - Tabelas SQL

```sql
-- Tabela principal de intervenções
CREATE TABLE IF NOT EXISTS interventions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    asset_id INTEGER NOT NULL,
    intervention_type TEXT NOT NULL CHECK(intervention_type IN (
        'Manutenção Preventiva',
        'Manutenção Corretiva',
        'Inspeção',
        'Substituição de Componente'
    )),
    problem_description TEXT,
    solution_description TEXT,
    parts_used TEXT,
    total_cost REAL DEFAULT 0,
    duration_hours REAL DEFAULT 0,
    status TEXT DEFAULT 'em_curso' CHECK(status IN ('em_curso', 'concluida', 'cancelada')),
    previous_asset_status TEXT,
    final_asset_status TEXT,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Técnicos participantes (internos e externos)
CREATE TABLE IF NOT EXISTS intervention_technicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intervention_id INTEGER NOT NULL,
    user_id INTEGER,                    -- Técnico interno (users)
    external_technician_id INTEGER,     -- Técnico externo
    role TEXT DEFAULT 'participante' CHECK(role IN ('responsavel', 'participante')),
    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (external_technician_id) REFERENCES external_technicians(id)
);

-- Técnicos externos
CREATE TABLE IF NOT EXISTS external_technicians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Ficheiros anexados a intervenções
CREATE TABLE IF NOT EXISTS intervention_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intervention_id INTEGER NOT NULL,
    file_category TEXT NOT NULL CHECK(file_category IN (
        'foto_antes', 'foto_depois', 'documento', 'fatura', 'relatorio', 'outros'
    )),
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    description TEXT,
    cost_value REAL,
    uploaded_by INTEGER NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Log de edições
CREATE TABLE IF NOT EXISTS intervention_edit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intervention_id INTEGER NOT NULL,
    edited_by INTEGER NOT NULL,
    edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (edited_by) REFERENCES users(id)
);

-- Registos de tempo de trabalho
CREATE TABLE IF NOT EXISTS intervention_time_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intervention_id INTEGER NOT NULL,
    logged_by INTEGER NOT NULL,
    time_spent REAL NOT NULL,
    work_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
    FOREIGN KEY (logged_by) REFERENCES users(id)
);

-- Histórico de alterações de estado dos ativos
CREATE TABLE IF NOT EXISTS status_change_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    asset_id INTEGER NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    description TEXT NOT NULL,
    changed_by INTEGER NOT NULL,
    intervention_id INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id),
    FOREIGN KEY (intervention_id) REFERENCES interventions(id)
);
```

### 1.2 Backend - Estrutura de Ficheiros

```
v5/backend/app/modules/interventions/
├── __init__.py
├── routes.py
└── manifest.json
```

**`__init__.py`**:
```python
from flask import Blueprint

interventions_bp = Blueprint('interventions', __name__, url_prefix='/api/interventions')

from . import routes
```

**`manifest.json`**:
```json
{
  "id": "interventions",
  "name": "Intervenções",
  "description": "Gestão de intervenções e manutenções",
  "version": "1.0.0",
  "author": "Smartlamppost",
  "required_plan": "base",
  "routes_prefix": "/api/interventions",
  "menu_item": {
    "label": "Intervenções",
    "icon": "Wrench",
    "path": "/interventions",
    "order": 4
  },
  "dependencies": ["assets"],
  "permissions": {
    "interventions.view": "Ver intervenções",
    "interventions.create": "Criar intervenções",
    "interventions.edit": "Editar intervenções",
    "interventions.delete": "Eliminar intervenções"
  }
}
```

### 1.3 Backend - Routes (Endpoints)

```python
# v5/backend/app/modules/interventions/routes.py

from flask import request, jsonify, g, send_file
from datetime import datetime
import os

from . import interventions_bp
from app.shared.security import require_auth, require_permission
from app.core.tenants import get_tenant_db

UPLOAD_FOLDER = 'uploads/interventions'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ─── CRUD Intervenções ───────────────────────────────────────────────────────

@interventions_bp.route('', methods=['GET'])
@require_auth
def list_interventions():
    """Lista intervenções com filtros e paginação."""
    tenant_id = g.tenant_id
    db = get_tenant_db(tenant_id)

    # Parâmetros
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status = request.args.get('status')
    intervention_type = request.args.get('type')
    asset_serial = request.args.get('serial_number')

    # Query base
    query = '''
        SELECT i.*, a.serial_number,
               u.username as created_by_name,
               (SELECT GROUP_CONCAT(COALESCE(u2.username, et.name || ' (' || et.company || ')'), ', ')
                FROM intervention_technicians it
                LEFT JOIN users u2 ON it.user_id = u2.id
                LEFT JOIN external_technicians et ON it.external_technician_id = et.id
                WHERE it.intervention_id = i.id) as technicians,
               (SELECT COUNT(*) FROM intervention_files WHERE intervention_id = i.id) as file_count
        FROM interventions i
        JOIN assets a ON i.asset_id = a.id
        LEFT JOIN users u ON i.created_by = u.id
        WHERE i.tenant_id = ?
    '''
    params = [tenant_id]

    if status:
        query += ' AND i.status = ?'
        params.append(status)

    if intervention_type:
        query += ' AND i.intervention_type = ?'
        params.append(intervention_type)

    if asset_serial:
        query += ' AND a.serial_number = ?'
        params.append(asset_serial)

    # Contagem total
    count_query = query.replace('SELECT i.*, a.serial_number', 'SELECT COUNT(*) as total')
    count_query = count_query.split('FROM interventions')[0] + 'FROM interventions' + count_query.split('FROM interventions')[1].split('GROUP BY')[0]
    total = db.execute(count_query.replace('SELECT i.*, a.serial_number,', 'SELECT COUNT(DISTINCT i.id) as total'), params).fetchone()['total']

    # Paginação
    query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?'
    params.extend([per_page, (page - 1) * per_page])

    interventions = db.execute(query, params).fetchall()

    return jsonify({
        'interventions': [dict(i) for i in interventions],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    })


@interventions_bp.route('/<int:id>', methods=['GET'])
@require_auth
def get_intervention(id):
    """Obtém detalhes de uma intervenção."""
    tenant_id = g.tenant_id
    db = get_tenant_db(tenant_id)

    intervention = db.execute('''
        SELECT i.*, a.serial_number,
               u1.username as created_by_name,
               u2.username as updated_by_name
        FROM interventions i
        JOIN assets a ON i.asset_id = a.id
        LEFT JOIN users u1 ON i.created_by = u1.id
        LEFT JOIN users u2 ON i.updated_by = u2.id
        WHERE i.id = ? AND i.tenant_id = ?
    ''', (id, tenant_id)).fetchone()

    if not intervention:
        return jsonify({'error': 'Intervenção não encontrada'}), 404

    result = dict(intervention)

    # Técnicos
    technicians = db.execute('''
        SELECT it.*, u.username, u.first_name, u.last_name,
               et.name as external_name, et.company as external_company
        FROM intervention_technicians it
        LEFT JOIN users u ON it.user_id = u.id
        LEFT JOIN external_technicians et ON it.external_technician_id = et.id
        WHERE it.intervention_id = ?
    ''', (id,)).fetchall()
    result['technicians'] = [dict(t) for t in technicians]

    # Ficheiros
    files = db.execute('''
        SELECT f.*, u.username as uploaded_by_name
        FROM intervention_files f
        LEFT JOIN users u ON f.uploaded_by = u.id
        WHERE f.intervention_id = ?
        ORDER BY f.file_category, f.uploaded_at
    ''', (id,)).fetchall()
    result['files'] = [dict(f) for f in files]

    # Histórico de edições
    edit_history = db.execute('''
        SELECT e.*, u.username as edited_by_name
        FROM intervention_edit_log e
        LEFT JOIN users u ON e.edited_by = u.id
        WHERE e.intervention_id = ?
        ORDER BY e.edited_at DESC
    ''', (id,)).fetchall()
    result['edit_history'] = [dict(e) for e in edit_history]

    # Registos de tempo
    time_logs = db.execute('''
        SELECT t.*, u.username as logged_by_name
        FROM intervention_time_logs t
        LEFT JOIN users u ON t.logged_by = u.id
        WHERE t.intervention_id = ?
        ORDER BY t.logged_at DESC
    ''', (id,)).fetchall()
    result['time_logs'] = [dict(t) for t in time_logs]
    result['total_time_spent'] = sum(t['time_spent'] for t in time_logs)

    return jsonify(result)


@interventions_bp.route('', methods=['POST'])
@require_auth
@require_permission('interventions.create')
def create_intervention():
    """Cria uma nova intervenção."""
    tenant_id = g.tenant_id
    user_id = g.user_id
    db = get_tenant_db(tenant_id)

    data = request.json

    # Validações
    if not data.get('asset_id') and not data.get('serial_number'):
        return jsonify({'error': 'Ativo obrigatório (asset_id ou serial_number)'}), 400

    if not data.get('intervention_type'):
        return jsonify({'error': 'Tipo de intervenção obrigatório'}), 400

    valid_types = ['Manutenção Preventiva', 'Manutenção Corretiva', 'Inspeção', 'Substituição de Componente']
    if data['intervention_type'] not in valid_types:
        return jsonify({'error': f'Tipo inválido. Tipos válidos: {", ".join(valid_types)}'}), 400

    if not data.get('problem_description'):
        return jsonify({'error': 'Descrição do problema obrigatória'}), 400

    # Obter asset_id
    asset_id = data.get('asset_id')
    if not asset_id and data.get('serial_number'):
        asset = db.execute(
            'SELECT id FROM assets WHERE serial_number = ? AND tenant_id = ?',
            (data['serial_number'], tenant_id)
        ).fetchone()
        if not asset:
            return jsonify({'error': 'Ativo não encontrado'}), 404
        asset_id = asset['id']

    # Obter estado atual do ativo
    current_status = db.execute('''
        SELECT field_value FROM asset_data
        WHERE asset_id = ? AND field_name = 'condition_status'
    ''', (asset_id,)).fetchone()
    previous_status = current_status['field_value'] if current_status else 'Não definido'

    try:
        cursor = db.execute('''
            INSERT INTO interventions (
                tenant_id, asset_id, intervention_type, problem_description,
                solution_description, parts_used, total_cost, duration_hours,
                status, previous_asset_status, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            tenant_id, asset_id, data['intervention_type'],
            data.get('problem_description'),
            data.get('solution_description', ''),
            data.get('parts_used', ''),
            data.get('total_cost', 0),
            data.get('duration_hours', 0),
            'em_curso', previous_status,
            data.get('notes'), user_id
        ))

        intervention_id = cursor.lastrowid

        # Adicionar criador como técnico responsável
        db.execute('''
            INSERT INTO intervention_technicians (intervention_id, user_id, role)
            VALUES (?, ?, 'responsavel')
        ''', (intervention_id, user_id))

        # Adicionar técnicos internos
        for tech_id in data.get('internal_technicians', []):
            if tech_id != user_id:
                db.execute('''
                    INSERT INTO intervention_technicians (intervention_id, user_id, role)
                    VALUES (?, ?, 'participante')
                ''', (intervention_id, tech_id))

        # Adicionar técnicos externos
        for ext_id in data.get('external_technicians', []):
            db.execute('''
                INSERT INTO intervention_technicians (intervention_id, external_technician_id, role)
                VALUES (?, ?, 'participante')
            ''', (intervention_id, ext_id))

        # Mudar estado do ativo para "Em Reparação" (exceto Inspeção)
        if data['intervention_type'] != 'Inspeção':
            db.execute('''
                INSERT OR REPLACE INTO asset_data (asset_id, field_name, field_value)
                VALUES (?, 'condition_status', 'Em Reparação')
            ''', (asset_id,))

            # Registar mudança de estado
            db.execute('''
                INSERT INTO status_change_log (
                    tenant_id, asset_id, previous_status, new_status,
                    description, changed_by, intervention_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                tenant_id, asset_id, previous_status, 'Em Reparação',
                f'Intervenção iniciada: {data["intervention_type"]}',
                user_id, intervention_id
            ))

        db.commit()

        return jsonify({
            'id': intervention_id,
            'message': 'Intervenção criada com sucesso'
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500


@interventions_bp.route('/<int:id>/complete', methods=['POST'])
@require_auth
def complete_intervention(id):
    """Conclui uma intervenção."""
    tenant_id = g.tenant_id
    user_id = g.user_id
    db = get_tenant_db(tenant_id)

    intervention = db.execute(
        'SELECT * FROM interventions WHERE id = ? AND tenant_id = ?',
        (id, tenant_id)
    ).fetchone()

    if not intervention:
        return jsonify({'error': 'Intervenção não encontrada'}), 404

    if intervention['status'] == 'concluida':
        return jsonify({'error': 'Intervenção já está concluída'}), 400

    data = request.json
    final_status = data.get('final_status', 'Operacional')

    try:
        db.execute('''
            UPDATE interventions
            SET status = 'concluida',
                final_asset_status = ?,
                solution_description = COALESCE(?, solution_description),
                parts_used = COALESCE(?, parts_used),
                duration_hours = COALESCE(?, duration_hours),
                notes = COALESCE(?, notes),
                completed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = ?
            WHERE id = ?
        ''', (
            final_status,
            data.get('solution_description'),
            data.get('parts_used'),
            data.get('duration_hours'),
            data.get('notes'),
            user_id, id
        ))

        # Actualizar estado do ativo
        db.execute('''
            INSERT OR REPLACE INTO asset_data (asset_id, field_name, field_value)
            VALUES (?, 'condition_status', ?)
        ''', (intervention['asset_id'], final_status))

        # Registar mudança de estado
        db.execute('''
            INSERT INTO status_change_log (
                tenant_id, asset_id, previous_status, new_status,
                description, changed_by, intervention_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            tenant_id, intervention['asset_id'],
            'Em Reparação', final_status,
            f'Intervenção concluída',
            user_id, id
        ))

        # Registar edição
        db.execute('''
            INSERT INTO intervention_edit_log (intervention_id, edited_by, field_name, old_value, new_value)
            VALUES (?, ?, 'status', 'em_curso', 'concluida')
        ''', (id, user_id))

        db.commit()

        return jsonify({'message': 'Intervenção concluída com sucesso'})

    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500


@interventions_bp.route('/<int:id>', methods=['DELETE'])
@require_auth
@require_permission('interventions.delete')
def delete_intervention(id):
    """Elimina uma intervenção."""
    tenant_id = g.tenant_id
    db = get_tenant_db(tenant_id)

    intervention = db.execute(
        'SELECT * FROM interventions WHERE id = ? AND tenant_id = ?',
        (id, tenant_id)
    ).fetchone()

    if not intervention:
        return jsonify({'error': 'Intervenção não encontrada'}), 404

    # Eliminar ficheiros físicos
    files = db.execute(
        'SELECT file_path FROM intervention_files WHERE intervention_id = ?',
        (id,)
    ).fetchall()

    for f in files:
        try:
            if os.path.exists(f['file_path']):
                os.remove(f['file_path'])
        except OSError:
            pass

    # DELETE CASCADE elimina registos relacionados
    db.execute('DELETE FROM interventions WHERE id = ?', (id,))
    db.commit()

    return jsonify({'message': 'Intervenção eliminada'})


# ─── Ficheiros ───────────────────────────────────────────────────────────────

@interventions_bp.route('/<int:id>/files', methods=['POST'])
@require_auth
def upload_file(id):
    """Upload de ficheiro para uma intervenção."""
    tenant_id = g.tenant_id
    user_id = g.user_id
    db = get_tenant_db(tenant_id)

    intervention = db.execute(
        'SELECT * FROM interventions WHERE id = ? AND tenant_id = ?',
        (id, tenant_id)
    ).fetchone()

    if not intervention:
        return jsonify({'error': 'Intervenção não encontrada'}), 404

    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum ficheiro enviado'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nome do ficheiro vazio'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': f'Tipo não permitido. Permitidos: {", ".join(ALLOWED_EXTENSIONS)}'}), 400

    # Verificar tamanho
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)

    if size > MAX_FILE_SIZE:
        return jsonify({'error': f'Ficheiro muito grande. Máximo: {MAX_FILE_SIZE // (1024*1024)}MB'}), 400

    category = request.form.get('category', 'outros')
    description = request.form.get('description', '')
    cost_value = request.form.get('cost_value')

    # Criar pasta
    folder = os.path.join(UPLOAD_FOLDER, tenant_id, str(id))
    os.makedirs(folder, exist_ok=True)

    # Gerar nome único
    ext = file.filename.rsplit('.', 1)[1].lower()
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    new_name = f"INT{id}_{category}_{timestamp}.{ext}"
    file_path = os.path.join(folder, new_name)

    file.save(file_path)

    cursor = db.execute('''
        INSERT INTO intervention_files (
            intervention_id, file_category, file_name, original_name,
            file_path, file_type, file_size, description, cost_value, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        id, category, new_name, file.filename,
        file_path, ext, size, description,
        float(cost_value) if cost_value else None, user_id
    ))

    db.commit()

    return jsonify({
        'id': cursor.lastrowid,
        'file_name': new_name,
        'message': 'Ficheiro carregado'
    }), 201


@interventions_bp.route('/<int:id>/files/<int:file_id>', methods=['GET'])
@require_auth
def download_file(id, file_id):
    """Download de ficheiro."""
    tenant_id = g.tenant_id
    db = get_tenant_db(tenant_id)

    file = db.execute('''
        SELECT f.* FROM intervention_files f
        JOIN interventions i ON f.intervention_id = i.id
        WHERE f.id = ? AND f.intervention_id = ? AND i.tenant_id = ?
    ''', (file_id, id, tenant_id)).fetchone()

    if not file:
        return jsonify({'error': 'Ficheiro não encontrado'}), 404

    if not os.path.exists(file['file_path']):
        return jsonify({'error': 'Ficheiro físico não encontrado'}), 404

    return send_file(file['file_path'], as_attachment=True, download_name=file['original_name'])


# ─── Tempo de Trabalho ───────────────────────────────────────────────────────

@interventions_bp.route('/<int:id>/time', methods=['POST'])
@require_auth
def log_time(id):
    """Regista tempo de trabalho."""
    tenant_id = g.tenant_id
    user_id = g.user_id
    db = get_tenant_db(tenant_id)

    intervention = db.execute(
        'SELECT * FROM interventions WHERE id = ? AND tenant_id = ?',
        (id, tenant_id)
    ).fetchone()

    if not intervention:
        return jsonify({'error': 'Intervenção não encontrada'}), 404

    data = request.json
    time_spent = data.get('time_spent', 0)

    if time_spent <= 0:
        return jsonify({'error': 'Tempo deve ser maior que zero'}), 400

    db.execute('''
        INSERT INTO intervention_time_logs (intervention_id, logged_by, time_spent, description)
        VALUES (?, ?, ?, ?)
    ''', (id, user_id, time_spent, data.get('description', '')))

    # Actualizar duração total
    db.execute('''
        UPDATE interventions SET duration_hours = duration_hours + ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (time_spent, id))

    db.commit()

    return jsonify({'message': 'Tempo registado'}), 201
```

### 1.4 Frontend - Componentes

#### Lista de Intervenções (`index.tsx`)

```typescript
// v5/frontend/src/modules/interventions/index.tsx

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { DataTable } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Plus, Eye, CheckCircle } from 'lucide-react'

interface Intervention {
  id: number
  serial_number: string
  intervention_type: string
  problem_description: string
  status: string
  created_at: string
  created_by_name: string
  technicians: string
  file_count: number
}

export const InterventionsPage: React.FC = () => {
  const { t } = useTranslation()
  const { token } = useAuth()
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchInterventions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/interventions?page=${page}&per_page=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setInterventions(data.interventions)
      setTotal(data.total)
    } catch (error) {
      console.error('Erro ao carregar intervenções:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInterventions()
  }, [page])

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (row: Intervention) => `#${row.id}`
    },
    {
      key: 'serial_number',
      label: t('interventions.asset'),
      sortable: true
    },
    {
      key: 'intervention_type',
      label: t('interventions.type'),
      render: (row: Intervention) => (
        <span className="text-sm">{row.intervention_type}</span>
      )
    },
    {
      key: 'status',
      label: t('interventions.status'),
      render: (row: Intervention) => (
        <StatusBadge status={row.status} />
      )
    },
    {
      key: 'technicians',
      label: t('interventions.technicians'),
      render: (row: Intervention) => (
        <span className="text-sm text-gray-600">{row.technicians || '-'}</span>
      )
    },
    {
      key: 'created_at',
      label: t('common.createdAt'),
      render: (row: Intervention) => new Date(row.created_at).toLocaleDateString('pt-PT')
    }
  ]

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('interventions.title')}</h1>
        <button className="btn btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('interventions.new')}
        </button>
      </div>

      <DataTable
        data={interventions}
        columns={columns}
        loading={loading}
        pagination={{
          page,
          total,
          perPage: 20,
          onPageChange: setPage
        }}
      />
    </div>
  )
}

export default InterventionsPage
```

### 1.5 i18n - Traduções

Adicionar a todos os ficheiros de idioma:

```json
{
  "interventions": {
    "title": "Intervenções",
    "new": "Nova Intervenção",
    "asset": "Ativo",
    "type": "Tipo",
    "status": "Estado",
    "technicians": "Técnicos",
    "description": "Descrição",
    "problemDescription": "Descrição do Problema",
    "solutionDescription": "Descrição da Solução",
    "partsUsed": "Peças/Materiais",
    "totalCost": "Custo Total",
    "duration": "Duração (horas)",
    "notes": "Notas",
    "types": {
      "preventive": "Manutenção Preventiva",
      "corrective": "Manutenção Corretiva",
      "inspection": "Inspeção",
      "replacement": "Substituição de Componente"
    },
    "statuses": {
      "in_progress": "Em Curso",
      "completed": "Concluída",
      "cancelled": "Cancelada"
    },
    "complete": "Concluir",
    "addTime": "Registar Tempo",
    "uploadFile": "Carregar Ficheiro",
    "fileCategories": {
      "photo_before": "Foto Antes",
      "photo_after": "Foto Depois",
      "document": "Documento",
      "invoice": "Fatura",
      "report": "Relatório",
      "other": "Outros"
    }
  }
}
```

---

## FASE 2-8: Documentação Resumida

As fases seguintes seguem o mesmo padrão:
- Tabelas SQL
- Backend routes
- Frontend componentes
- i18n traduções

Queres que detalhe alguma fase específica?

---

## Próximo Passo

Com este plano detalhado, posso começar a implementar a **Fase 1 (Sistema de Intervenções)**. Confirmas que devo avançar?
