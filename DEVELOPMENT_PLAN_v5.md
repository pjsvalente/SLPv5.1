# Plano de Desenvolvimento v5 - Funcionalidades Baseadas no RFID

**Data**: 2026-02-09
**Abordagem**: Desenvolvimento de raiz usando RFID como referência funcional
**Arquitectura base**: v5 (Multi-tenant, React/TypeScript, Flask modular)

---

## Filosofia

> **NÃO INTEGRAR** código do RFID.
> **ANALISAR** funcionalidades do RFID.
> **DESENVOLVER** de raiz seguindo padrões v5.

---

## 1. Funcionalidades a Desenvolver (Por Prioridade)

### 📦 Fase 1: Core Business (Essencial)

#### 1.1 Sistema de Intervenções
**Referência RFID**: `app/routes/interventions.py` (599 linhas)

| Funcionalidade | Descrição | Complexidade |
|----------------|-----------|--------------|
| CRUD Intervenções | Criar, ler, atualizar, eliminar | Média |
| Tipos de intervenção | Preventiva, Corretiva, Inspeção, Substituição | Baixa |
| Estados | em_curso → concluída | Baixa |
| Técnicos participantes | Internos + Externos | Média |
| Upload de ficheiros | Fotos, documentos por intervenção | Média |
| Registo de tempo | Horas trabalhadas por técnico | Baixa |
| Histórico de edições | Quem alterou o quê e quando | Baixa |

**Estrutura v5 a criar**:
```
v5/backend/app/modules/interventions/
├── __init__.py
├── routes.py
├── models.py (se usar SQLAlchemy)
└── manifest.json

v5/frontend/src/modules/interventions/
├── index.tsx (lista)
├── InterventionForm.tsx
├── InterventionDetail.tsx
└── components/
    ├── TechnicianSelector.tsx
    ├── FileUploader.tsx
    └── TimeLogger.tsx
```

**Tabelas a criar (SQLite)**:
```sql
-- Por tenant
interventions
intervention_technicians
intervention_files
intervention_edit_log
intervention_time_logs
```

---

#### 1.2 Gestão de Técnicos Externos
**Referência RFID**: `app/routes/technicians.py`

| Funcionalidade | Descrição |
|----------------|-----------|
| CRUD Técnicos | Nome, empresa, contacto |
| Associar a intervenções | Selecção em dropdown |
| Activo/Inactivo | Soft delete |

**Estrutura v5**:
```
v5/backend/app/modules/technicians/
v5/frontend/src/modules/technicians/
```

---

#### 1.3 Histórico de Estados dos Ativos
**Referência RFID**: `status_change_log` table

| Funcionalidade | Descrição |
|----------------|-----------|
| Log automático | Quando estado muda |
| Visualização | Timeline no detalhe do ativo |
| Ligação a intervenções | Qual intervenção causou a mudança |

**Implementação**: Adicionar ao módulo `assets` existente

---

### 📊 Fase 2: Dados e Relatórios

#### 2.1 Export Excel
**Referência RFID**: `app/routes/export.py` (1797 linhas)

| Funcionalidade | Descrição |
|----------------|-----------|
| Export Ativos | Todos os campos + módulos |
| Export Intervenções | Com técnicos e ficheiros |
| Export Histórico | Estados e actualizações |
| Formato | 4 folhas Excel, headers bilingues |

**Biblioteca**: `openpyxl`

**Estrutura v5**:
```
v5/backend/app/modules/data/
├── export.py
├── import_preview.py
└── import_execute.py
```

---

#### 2.2 Import Excel
**Referência RFID**: Mesmo ficheiro

| Funcionalidade | Descrição |
|----------------|-----------|
| Preview | Mostrar o que vai ser importado |
| Modos | Criar, Actualizar, Upsert |
| Validação | Campos obrigatórios |
| Conversão automática | Suspenso → Operacional se campos ok |

---

#### 2.3 Sistema de Backup
**Referência RFID**: `app/routes/backup.py` (297 linhas)

| Funcionalidade | Descrição |
|----------------|-----------|
| Backup manual | Admin cria quando quer |
| Backup automático | Scheduler (opcional) |
| Download | ZIP com DB + uploads |
| Restore | Upload de ZIP |
| Limpeza | Manter últimos N backups |

**Nota v5**: Backup por tenant, não global

---

### 🗂️ Fase 3: Catálogo e Configuração

#### 3.1 Catálogo de Módulos/Equipamentos
**Referência RFID**: `app/routes/catalog.py` + 8 tabelas

| Tabela | Descrição |
|--------|-----------|
| catalog_columns | Colunas base (postes) |
| catalog_luminaires | Luminárias (Mod. 1) |
| catalog_electrical_panels | Quadros eléctricos (Mod. 2) |
| catalog_fuse_boxes | Cofretes (Mod. 3) |
| catalog_telemetry_panels | Telemetria (Mod. 4) |
| catalog_module_ev | Carregadores EV (Mod. 5) |
| catalog_module_mupi | MUPI (Mod. 6) |
| catalog_module_lateral | Laterais (Mod. 7) |
| catalog_module_antenna | Antenas (Mod. 8) |

**UI**: Tabs para cada tipo de módulo

---

#### 3.2 Schema Dinâmico (Campos Custom)
**Referência RFID**: `schema_fields` table

| Funcionalidade | Descrição |
|----------------|-----------|
| Definir campos | Nome, tipo, obrigatório |
| Tipos suportados | text, number, date, select, textarea |
| Categorias | Agrupamento visual |
| Ordem | Drag & drop para reordenar |

**Decisão necessária**: Implementar ou usar schema fixo?

---

#### 3.3 Configurações do Sistema
**Referência RFID**: `system_config` table

| Configuração | Exemplo |
|--------------|---------|
| Prefixos de serial | SLP, INTP, INTC |
| Dígitos de numeração | 9 |
| Listas dropdown | Cores, fabricantes, materiais |
| Backup automático | Dia, hora, activo/inactivo |

---

### 🗺️ Fase 4: Visualização

#### 4.1 Mapa GPS
**Referência RFID**: `index.html` (Leaflet)

| Funcionalidade | Descrição |
|----------------|-----------|
| Visualização | Ativos com coordenadas no mapa |
| Filtros | Por município, estado |
| Popup | Info do ativo ao clicar |
| Clustering | Agrupar pontos próximos |

**Biblioteca v5**: `react-leaflet`

**Estrutura**:
```
v5/frontend/src/modules/map/
├── index.tsx
├── AssetMarker.tsx
├── MapFilters.tsx
└── MapPopup.tsx
```

---

#### 4.2 Dashboard Avançado
**Referência RFID**: Secção dashboard do index.html

| Widget | Descrição |
|--------|-----------|
| Total ativos | Por estado |
| Intervenções | Em curso / Concluídas |
| Gráfico estados | Pie chart |
| Próximas manutenções | Lista |
| Alertas | Garantias a expirar |

---

### 🔒 Fase 5: Auditoria e Segurança

#### 5.1 Audit Log
**Referência RFID**: `audit_log` table

| Funcionalidade | Descrição |
|----------------|-----------|
| Log automático | Todas as operações CRUD |
| Dados guardados | user, action, table, old_values, new_values |
| Visualização | Filtros por data, user, tabela |
| Export | Para compliance |

---

## 2. Ordem de Desenvolvimento Recomendada

```
Semana 1-2: Intervenções (Core)
├── Backend: routes, tabelas
├── Frontend: lista, form, detalhe
└── Teste: CRUD completo

Semana 3: Técnicos + Histórico Estados
├── CRUD técnicos externos
├── Timeline de estados no ativo
└── Integração intervenções ↔ estados

Semana 4: Export/Import Excel
├── Export 4 folhas
├── Import com preview
└── Validações

Semana 5: Backup + Catálogo
├── Sistema backup por tenant
├── Tabelas catálogo
├── UI catálogo (tabs)

Semana 6: Mapa + Dashboard
├── react-leaflet
├── Widgets dashboard
└── Gráficos

Semana 7: Audit + Config
├── Audit log automático
├── Configurações sistema
└── Schema dinâmico (se decidido)

Semana 8: Testes + Polish
├── Testes integração
├── i18n para novas funcionalidades
└── Documentação
```

---

## 3. Checklist de Decisões Necessárias

Antes de começar, preciso das tuas decisões:

| # | Questão | Opção A | Opção B |
|---|---------|---------|---------|
| 1 | Schema dinâmico? | Sim (campos custom) | Não (schema fixo) |
| 2 | Backup automático? | Sim (scheduler) | Não (só manual) |
| 3 | Mapa GPS? | Sim (react-leaflet) | Não (lista apenas) |
| 4 | Catálogo completo? | 8 tabelas | Simplificado (1 tabela) |
| 5 | Ordem de prioridade? | Como está | Outra ordem |
| 6 | Começar por qual fase? | Fase 1 (Intervenções) | Outra |

---

## 4. Padrões v5 a Seguir

### Backend
```python
# Estrutura de route
@module_bp.route('/endpoint', methods=['GET'])
@require_auth
@require_tenant
def endpoint():
    tenant_id = g.tenant_id
    db = get_tenant_db(tenant_id)
    # ...
```

### Frontend
```typescript
// Componente padrão
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'

export const Component: React.FC = () => {
  const { t } = useTranslation()
  const { token } = useAuth()
  // ...
}
```

### i18n
- Adicionar keys a `pt.json`, `en.json`, `fr.json`, `de.json`
- Usar `t('module.key')` em vez de strings hardcoded

### Tabelas
- Criar no schema do tenant
- Usar `tenant_id` em queries quando aplicável
- Manter FKs e cascades

---

## 5. Vantagens desta Abordagem

| Aspecto | Integração | Desenvolvimento de Raiz |
|---------|------------|------------------------|
| Código limpo | ❌ Legacy misturado | ✅ Consistente |
| Bugs herdados | ❌ Possíveis | ✅ Evitados |
| Multi-tenant | ❌ Adaptar | ✅ Nativo |
| i18n | ❌ Adicionar depois | ✅ Desde início |
| TypeScript | ❌ JavaScript legacy | ✅ Tipado |
| Testes | ❌ Difícil | ✅ Desde início |
| Manutenção | ❌ Complexa | ✅ Clara |

---

## Próximo Passo

Responde às **6 questões da secção 3** e indico qual a primeira funcionalidade a desenvolver.

---

*Documento gerado para planeamento. Requer validação do utilizador.*
