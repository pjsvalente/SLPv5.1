# SmartLamppost v5 - Plano de Migração RFID v3

> **Data**: 2026-02-11
> **Backup**: `v5_BACKUP_20260211_094049_PRE_RFID_MIGRATION.zip`
> **Objetivo**: Integrar funcionalidades da versão RFID v3 na v5 multi-tenant

---

## FASE 1: Catálogo Completo + ReferenceConfigurator

### 1.1 Schema BD - Novas Tabelas (9 tabelas)

**Ficheiro**: `v5/backend/app/shared/database.py`

```sql
-- 1. catalog_columns (colunas/postes base)
CREATE TABLE IF NOT EXISTS catalog_columns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL,
    description TEXT,
    pack TEXT,
    height_m REAL,
    arm_count INTEGER DEFAULT 1,
    mod1 INTEGER DEFAULT 0,  -- Luminária
    mod2 INTEGER DEFAULT 0,  -- Quadro Elétrico
    mod3 INTEGER DEFAULT 0,  -- Cofrete Fusível
    mod4 INTEGER DEFAULT 0,  -- Telemetria
    mod5 INTEGER DEFAULT 0,  -- EV Charger
    mod6 INTEGER DEFAULT 0,  -- MUPI
    mod7 INTEGER DEFAULT 0,  -- Lateral
    mod8 INTEGER DEFAULT 0,  -- Antena
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. catalog_luminaires (Mod.1 - Luminárias)
CREATE TABLE IF NOT EXISTS catalog_luminaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL,
    description TEXT,
    type_1 INTEGER DEFAULT 1,  -- Compatível com braço 1
    type_2 INTEGER DEFAULT 0,  -- Compatível com braço 2
    power_watts REAL,
    voltage TEXT,
    current_amps REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. catalog_electrical_panels (Mod.2 - Quadros Elétricos)
CREATE TABLE IF NOT EXISTS catalog_electrical_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL,
    description TEXT,
    max_power_total REAL,
    max_power_per_phase REAL,
    phases INTEGER DEFAULT 1,  -- 1=Monofásico, 3=Trifásico
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. catalog_fuse_boxes (Mod.3 - Cofretes Fusível)
CREATE TABLE IF NOT EXISTS catalog_fuse_boxes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL,
    description TEXT,
    type_s INTEGER DEFAULT 0,
    type_d INTEGER DEFAULT 0,
    voltage TEXT,
    max_power REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. catalog_telemetry_panels (Mod.4 - Telemetria)
CREATE TABLE IF NOT EXISTS catalog_telemetry_panels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL,
    description TEXT,
    power_watts REAL,
    voltage TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. catalog_module_ev (Mod.5 - Carregadores EV)
CREATE TABLE IF NOT EXISTS catalog_module_ev (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL,
    description TEXT,
    power_watts REAL,
    current_amps REAL,
    connector_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. catalog_module_mupi (Mod.6 - MUPI/Publicidade)
CREATE TABLE IF NOT EXISTS catalog_module_mupi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL,
    description TEXT,
    power_watts REAL,
    size TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. catalog_module_lateral (Mod.7 - Módulos Laterais)
CREATE TABLE IF NOT EXISTS catalog_module_lateral (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL,
    description TEXT,
    type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. catalog_module_antenna (Mod.8 - Antenas)
CREATE TABLE IF NOT EXISTS catalog_module_antenna (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL,
    description TEXT,
    column_height_m REAL,
    frequency TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. catalog_packs (agrupamento de colunas)
CREATE TABLE IF NOT EXISTS catalog_packs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.2 Backend Catálogo - Endpoints Completos

**Ficheiro**: `v5/backend/app/modules/catalog/routes.py`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/catalog/stats` | Estatísticas do catálogo |
| GET | `/api/catalog/packs` | Listar packs disponíveis |
| GET | `/api/catalog/columns` | Listar colunas |
| POST | `/api/catalog/columns` | Criar coluna |
| PUT | `/api/catalog/columns/<id>` | Atualizar coluna |
| DELETE | `/api/catalog/columns/<id>` | Eliminar coluna |
| GET | `/api/catalog/luminaires` | Mod.1 - Luminárias |
| POST | `/api/catalog/luminaires` | Criar luminária |
| DELETE | `/api/catalog/luminaires/<id>` | Eliminar luminária |
| GET | `/api/catalog/electrical-panels` | Mod.2 - Quadros |
| POST | `/api/catalog/electrical-panels` | Criar quadro |
| DELETE | `/api/catalog/electrical-panels/<id>` | Eliminar quadro |
| GET | `/api/catalog/fuse-boxes` | Mod.3 - Cofretes |
| POST | `/api/catalog/fuse-boxes` | Criar cofrete |
| DELETE | `/api/catalog/fuse-boxes/<id>` | Eliminar cofrete |
| GET | `/api/catalog/telemetry-panels` | Mod.4 - Telemetria |
| POST | `/api/catalog/telemetry-panels` | Criar telemetria |
| DELETE | `/api/catalog/telemetry-panels/<id>` | Eliminar telemetria |
| GET | `/api/catalog/modules/ev` | Mod.5 - EV Chargers |
| POST | `/api/catalog/modules/ev` | Criar EV |
| DELETE | `/api/catalog/modules/ev/<id>` | Eliminar EV |
| GET | `/api/catalog/modules/mupi` | Mod.6 - MUPI |
| POST | `/api/catalog/modules/mupi` | Criar MUPI |
| DELETE | `/api/catalog/modules/mupi/<id>` | Eliminar MUPI |
| GET | `/api/catalog/modules/lateral` | Mod.7 - Laterais |
| POST | `/api/catalog/modules/lateral` | Criar lateral |
| DELETE | `/api/catalog/modules/lateral/<id>` | Eliminar lateral |
| GET | `/api/catalog/modules/antenna` | Mod.8 - Antenas |
| POST | `/api/catalog/modules/antenna` | Criar antena |
| DELETE | `/api/catalog/modules/antenna/<id>` | Eliminar antena |
| GET | `/api/catalog/compatible-modules/<column_id>` | Módulos compatíveis |
| GET | `/api/catalog/compatible-modules-by-ref/<ref>` | Compatíveis por referência |
| POST | `/api/catalog/calculate-power` | Calcular balanço elétrico |
| POST | `/api/catalog/import` | Importar Excel |
| GET | `/api/catalog/export` | Exportar Excel |
| DELETE | `/api/catalog/clear` | Limpar catálogo |
| POST | `/api/catalog/reset` | Reset para defaults |

### 1.3 Backend - Lógica de Cálculo de Potência

```python
# POST /api/catalog/calculate-power
# Request:
{
    "electrical_panel_id": 5,  # ou "fuse_box_id": 3
    "modules": [
        {"type": "luminaire", "id": 3, "quantity": 2},
        {"type": "ev", "id": 1, "quantity": 1},
        {"type": "telemetry", "id": 2, "quantity": 1}
    ]
}

# Response:
{
    "max_power": 14490,           # Do quadro/cofrete
    "installed_power": 3724,      # Soma dos módulos
    "remaining_power": 10766,     # max - installed
    "connection_type": "Monofásico",
    "modules_breakdown": [
        {"type": "luminaire", "reference": "LUM-100W", "power": 200, "quantity": 2},
        {"type": "ev", "reference": "EV-7KW", "power": 7000, "quantity": 1}
    ]
}
```

### 1.4 Frontend Catálogo - UI Completa

**Ficheiro**: `v5/frontend/src/modules/catalog/index.tsx`

**Estrutura de Tabs:**
1. Referências (visão geral com estatísticas)
2. Colunas (catalog_columns)
3. Luminárias (catalog_luminaires)
4. Quadros Elétricos (catalog_electrical_panels)
5. Cofretes (catalog_fuse_boxes)
6. Telemetria (catalog_telemetry_panels)
7. EV Chargers (catalog_module_ev)
8. MUPI (catalog_module_mupi)
9. Laterais (catalog_module_lateral)
10. Antenas (catalog_module_antenna)

**Funcionalidades por tab:**
- Listagem com pesquisa
- Criar novo item
- Editar item
- Eliminar item
- Estatísticas (contagem por tipo)
- Botões Import/Export Excel

### 1.5 Frontend - ReferenceConfigurator

**Ficheiro**: `v5/frontend/src/modules/assets/components/ReferenceConfigurator.tsx`

**Wizard de 3 Passos:**

```
┌─────────────────────────────────────────────────────────────┐
│ PASSO 1: Selecionar Pack                                    │
├─────────────────────────────────────────────────────────────┤
│ ○ Pack Standard    ○ Pack Premium    ○ Pack Industrial     │
│                                                             │
│ [Seguinte →]                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PASSO 2: Selecionar Coluna                                  │
├─────────────────────────────────────────────────────────────┤
│ Colunas disponíveis para "Pack Standard":                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○ COL-4M-1B    Coluna 4m, 1 braço    [Mod1][Mod2][Mod4] │ │
│ │ ○ COL-6M-2B    Coluna 6m, 2 braços   [Mod1][Mod2][Mod5] │ │
│ │ ○ COL-8M-2B    Coluna 8m, 2 braços   [Todos módulos]    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [← Anterior]                        [Seguinte →]            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PASSO 3: Configurar Módulos                                 │
├─────────────────────────────────────────────────────────────┤
│ Coluna selecionada: COL-6M-2B (6m, 2 braços)               │
│                                                             │
│ Luminária 1:    [Dropdown: LUM-60W, LUM-100W, LUM-150W]    │
│ Luminária 2:    [Dropdown: LUM-60W, LUM-100W, LUM-150W]    │
│ Q. Elétrico:    [Dropdown: QE-MONO-5KW, QE-TRI-15KW]       │
│ Telemetria:     [Dropdown: TEL-BASIC, TEL-PRO]             │
│ EV Charger:     [Dropdown: EV-7KW, EV-22KW] (opcional)     │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ BALANÇO ELÉTRICO                                        │ │
│ │ Potência Máxima:    5000 W                              │ │
│ │ Potência Instalada: 3200 W  [████████░░] 64%           │ │
│ │ Potência Restante:  1800 W                              │ │
│ │ Tipologia: Monofásico                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [← Anterior]                        [Aplicar Configuração]  │
└─────────────────────────────────────────────────────────────┘
```

**Output do Configurador:**
```javascript
{
    product_reference: "COL-6M-2B",
    attached_equipment: "LUM-100W x2, QE-MONO-5KW, TEL-BASIC, EV-7KW",
    electrical_max_power: 5000,
    total_installed_power: 3200,
    remaining_power: 1800,
    electrical_connection_type: "Monofásico",
    modules: [
        { type: "luminaire_1", id: 5, reference: "LUM-100W" },
        { type: "luminaire_2", id: 5, reference: "LUM-100W" },
        { type: "electrical_panel", id: 2, reference: "QE-MONO-5KW" },
        { type: "telemetry", id: 1, reference: "TEL-BASIC" },
        { type: "ev", id: 1, reference: "EV-7KW" }
    ]
}
```

### 1.6 Frontend - Integração no AssetForm

**Ficheiro**: `v5/frontend/src/modules/assets/index.tsx`

**Alterações:**
1. Adicionar toggle "Usar Configurador" vs "Modo Manual"
2. Quando configurador ativo, mostrar ReferenceConfigurator
3. Campos de balanço elétrico (read-only quando configurador usado)
4. Toggle W/kW para visualização
5. Botão "Usar localização atual" para GPS

---

## FASE 2: Import/Export Excel

### 2.1 Backend Export - Novos Endpoints

**Ficheiro**: `v5/backend/app/modules/data/routes.py`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/export/excel/fields` | Campos disponíveis por categoria |
| POST | `/api/export/excel` | Exportar ativos para Excel |
| POST | `/api/import/preview` | Preview de importação |
| POST | `/api/import/excel` | Importar ativos de Excel |

### 2.2 Estrutura do Excel Exportado

**Folha 1 - "Ativos":**
```
| Nº Série | Tag RFID | Referência | Fabricante | Modelo | Estado | ... |
| Localização | Morada | Código Postal | Município | GPS Lat | GPS Lng | ... |
| Altura | Material | Cor | Potência Max | Potência Instalada | Restante | ... |
| Fim Garantia | Certificado | ... |
| Luminária 1 Ref | Luminária 1 Serial | Luminária 2 Ref | Luminária 2 Serial | ... |
| Q. Elétrico Ref | Q. Elétrico Serial | Cofrete Ref | Cofrete Serial | ... |
| Módulo Extra 1 Nome | Módulo Extra 1 Serial | ... (até 5 extras) |
```

**Folha 2 - "Histórico Estados":**
```
| Nº Série Ativo | Estado Anterior | Novo Estado | Descrição | Data | Alterado Por |
```

**Folha 3 - "Intervenções":**
```
| ID | Nº Série Ativo | Tipo | Estado | Descrição | Data Criação | Técnicos |
```

### 2.3 Modos de Importação

| Modo | Comportamento |
|------|---------------|
| `create` | Só criar novos ativos (ignorar existentes) |
| `update` | Só atualizar existentes (ignorar novos) |
| `upsert` | Criar novos e atualizar existentes |

### 2.4 Preview de Importação

```javascript
// POST /api/import/preview response:
{
    "stats": {
        "total_rows": 150,
        "to_create": 45,
        "to_update": 80,
        "no_changes": 20,
        "errors": 5
    },
    "preview": [
        { "row": 2, "serial": "SLP000000001", "action": "update", "changes": ["status", "gps"] },
        { "row": 3, "serial": "SLP000000150", "action": "create", "changes": [] },
        { "row": 4, "serial": "SLP000000002", "action": "no_change", "changes": [] },
        { "row": 5, "serial": "", "action": "error", "error": "RFID obrigatório" }
    ]
}
```

### 2.5 Frontend - ExportModal

**Ficheiro**: `v5/frontend/src/modules/data/components/ExportModal.tsx`

**Funcionalidades:**
- Seleção de campos por categoria (checkboxes)
- Filtros opcionais (estado, município, data)
- Botão "Exportar" → download Excel

### 2.6 Frontend - ImportModal

**Ficheiro**: `v5/frontend/src/modules/data/components/ImportModal.tsx`

**Funcionalidades:**
- Drag & drop de ficheiro Excel
- Preview com cores:
  - 🟢 Verde = Criar
  - 🟡 Amarelo = Atualizar
  - ⚪ Cinza = Sem alterações
  - 🔴 Vermelho = Erro
- Seleção de modo (create/update/upsert)
- Barra de progresso durante importação
- Resumo final com estatísticas

---

## FASE 3: Intervenções Completas

### 3.1 Schema BD - Tabelas Adicionais

```sql
-- intervention_files (ficheiros anexos)
CREATE TABLE IF NOT EXISTS intervention_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intervention_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT,
    file_type TEXT,
    file_size INTEGER,
    description TEXT,
    cost REAL DEFAULT 0,
    uploaded_by INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intervention_id) REFERENCES interventions(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- intervention_time_logs (registo de tempo)
CREATE TABLE IF NOT EXISTS intervention_time_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intervention_id INTEGER NOT NULL,
    technician_id INTEGER,
    work_date DATE,
    time_spent_minutes INTEGER,
    description TEXT,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intervention_id) REFERENCES interventions(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id)
);

-- intervention_edit_log (histórico de edições)
CREATE TABLE IF NOT EXISTS intervention_edit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    intervention_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intervention_id) REFERENCES interventions(id)
);
```

### 3.2 Backend Intervenções - Novos Endpoints

**Ficheiro**: `v5/backend/app/modules/interventions/routes.py`

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/interventions/<id>/files` | Upload ficheiro |
| GET | `/api/interventions/<id>/files` | Listar ficheiros |
| GET | `/api/interventions/<id>/files/<fid>` | Download ficheiro |
| DELETE | `/api/interventions/<id>/files/<fid>` | Eliminar ficheiro |
| POST | `/api/interventions/<id>/time` | Registar tempo |
| GET | `/api/interventions/<id>/time` | Listar registos de tempo |
| DELETE | `/api/interventions/<id>/time/<tid>` | Eliminar registo |
| GET | `/api/interventions/<id>/history` | Histórico de edições |

### 3.3 Frontend Intervenções - Melhorias

**Ficheiro**: `v5/frontend/src/modules/interventions/index.tsx`

**Novas secções no formulário:**
1. **Ficheiros Anexos**
   - Drag & drop upload
   - Lista com preview (imagens) / ícone (PDF)
   - Campo de custo por ficheiro
   - Botão download / eliminar

2. **Registo de Tempo**
   - Data do trabalho
   - Técnico responsável
   - Tempo (horas:minutos)
   - Descrição do trabalho
   - Total de horas acumulado

3. **Histórico de Edições**
   - Timeline de alterações
   - Campo alterado, valor anterior, novo valor
   - Quem alterou e quando

---

## FASE 4: Funcionalidades Extra

### 4.1 Backup Automático

**Ficheiro**: `v5/backend/app/shared/scheduler.py`

```python
from apscheduler.schedulers.background import BackgroundScheduler

scheduler = BackgroundScheduler()

def configurar_backup_automatico(dia_semana, hora):
    """
    dia_semana: 0=Segunda, 1=Terça, ..., 6=Domingo
    hora: "16:00"
    """
    scheduler.add_job(
        func=executar_backup_automatico,
        trigger='cron',
        day_of_week=dia_semana,
        hour=int(hora.split(':')[0]),
        minute=int(hora.split(':')[1]),
        id='backup_automatico',
        replace_existing=True
    )
```

**Endpoints:**
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/config/auto-backup` | Obter configuração |
| PUT | `/api/config/auto-backup` | Atualizar configuração |

### 4.2 Planeamento de Rotas no Mapa

**Ficheiro**: `v5/frontend/src/modules/map/index.tsx`

**Funcionalidades:**
- Botão "Planear Rota"
- Modo seleção de pontos (clique nos markers)
- Linha conectando os pontos selecionados
- Lista ordenada dos pontos
- Reordenar com drag & drop
- Botão "Limpar Rota"
- Exportar rota (lista de coordenadas)

### 4.3 Melhorias UI na Lista de Ativos

**Ficheiro**: `v5/frontend/src/modules/assets/index.tsx`

**Alterações:**
1. Checkboxes para seleção múltipla
2. Barra de ações bulk (quando há seleção)
3. Ordenação por coluna (clique no header)
4. Indicador de ordenação (↑/↓)
5. Botão "Selecionar Todos" / "Limpar Seleção"

---

## FASE 5: Testes e Deploy

### 5.1 Testes a Realizar

- [ ] Criar item em cada tipo de catálogo
- [ ] Usar ReferenceConfigurator para criar ativo
- [ ] Verificar cálculo de potência
- [ ] Exportar ativos para Excel
- [ ] Importar ativos de Excel (cada modo)
- [ ] Upload de ficheiro em intervenção
- [ ] Registar tempo em intervenção
- [ ] Configurar backup automático
- [ ] Planear rota no mapa
- [ ] Seleção múltipla e ações bulk

### 5.2 Build e Deploy

```bash
# Frontend
cd v5/frontend
npm run build

# Copiar build para backend
cp -r dist/* ../backend/static/

# Deploy Railway
cd ../backend
git add -A
git commit -m "feat: RFID v3 features migration"
git push
```

---

## Resumo de Ficheiros a Criar/Modificar

### Backend (Python)

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `app/shared/database.py` | MODIFICAR | +10 tabelas catálogo |
| `app/modules/catalog/routes.py` | REESCREVER | ~40 endpoints |
| `app/modules/data/routes.py` | MODIFICAR | +4 endpoints export/import |
| `app/modules/interventions/routes.py` | MODIFICAR | +8 endpoints ficheiros/tempo |
| `app/shared/scheduler.py` | CRIAR | APScheduler para backups |
| `app/core/settings/routes.py` | MODIFICAR | +2 endpoints auto-backup |

### Frontend (TypeScript/React)

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `modules/catalog/index.tsx` | REESCREVER | UI completa 10 tabs |
| `modules/assets/components/ReferenceConfigurator.tsx` | CRIAR | Wizard 3 passos |
| `modules/assets/index.tsx` | MODIFICAR | Integrar configurador |
| `modules/data/components/ExportModal.tsx` | CRIAR | Modal exportação |
| `modules/data/components/ImportModal.tsx` | CRIAR | Modal importação |
| `modules/data/index.tsx` | MODIFICAR | Integrar modals |
| `modules/interventions/index.tsx` | MODIFICAR | Ficheiros + tempo |
| `modules/map/index.tsx` | MODIFICAR | Planeamento rotas |

---

## Estimativa de Tempo

| Fase | Duração Estimada |
|------|------------------|
| Fase 1 - Catálogo + Configurador | 3-4 dias |
| Fase 2 - Import/Export Excel | 2-3 dias |
| Fase 3 - Intervenções | 1-2 dias |
| Fase 4 - Extras | 1-2 dias |
| Fase 5 - Testes + Deploy | 1 dia |
| **TOTAL** | **8-12 dias** |

---

*Documento gerado em 2026-02-11*
*Backup de referência: v5_BACKUP_20260211_094049_PRE_RFID_MIGRATION.zip*
