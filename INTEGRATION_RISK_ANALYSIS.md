# Relatório de Análise de Integração: RFID → v5

**Data**: 2026-02-09
**Analista**: Claude
**Ficheiros analisados**: `RFID 20260209 171800.zip` → `rfid_extracted/RFID/`

---

## 1. Resumo Executivo

### Projeto RFID (Single-Tenant Flask)
- **Backend**: Flask monolítico (~7.542 linhas Python)
- **Frontend**: Single HTML file com React inline (via Babel)
- **Database**: SQLite único (`smartlamppost.db`)
- **Arquitectura**: Single-tenant, sem isolamento

### Projeto v5 (Multi-Tenant SaaS)
- **Backend**: Flask modular com blueprints
- **Frontend**: React/TypeScript com Vite
- **Database**: SQLite por tenant (isolado)
- **Arquitectura**: Multi-tenant completo com planos e módulos

---

## 2. Mapa de Funcionalidades

| Funcionalidade | RFID | v5 | Estado |
|----------------|------|-----|--------|
| **Autenticação básica** | ✅ | ✅ | Duplicada |
| **Autenticação 2FA** | ❌ | ✅ | Só v5 |
| **Multi-tenancy** | ❌ | ✅ | Só v5 |
| **Gestão de Ativos** | ✅ (completa) | ✅ (básica) | RFID mais completa |
| **Intervenções** | ✅ (completa) | ❌ | Só RFID |
| **Mapa GPS** | ✅ | ❌ | Só RFID |
| **Export/Import Excel** | ✅ | ❌ | Só RFID |
| **Backup/Restore** | ✅ | ❌ | Só RFID |
| **Catálogo Módulos** | ✅ | ❌ | Só RFID |
| **Técnicos Externos** | ✅ | ❌ | Só RFID |
| **Schema Dinâmico** | ✅ | ❌ | Só RFID |
| **Audit Log** | ✅ | ❌ | Só RFID |
| **i18n Multi-idioma** | ❌ | ✅ | Só v5 |
| **Sistema de Planos** | ❌ | ✅ | Só v5 |
| **Módulos Activáveis** | ❌ | ✅ | Só v5 |

---

## 3. Análise de Risco por Componente

### 🟢 SEGURO - Pode integrar sem sobressaltos

#### 3.1 Sistema de Backup (`backup.py`)
- **Risco**: BAIXO
- **Razão**: Funcionalidade completamente independente, não existe no v5
- **Ficheiros**: `app/routes/backup.py` (297 linhas)
- **Dependências**: Apenas `os`, `shutil`, `zipfile`
- **Integração**:
  1. Copiar ficheiro para `v5/backend/app/modules/backup/`
  2. Adaptar para usar `get_tenant_db()` em vez de `obter_bd()`
  3. Ajustar caminhos de backup por tenant

#### 3.2 Sistema de Export/Import Excel (`export.py`)
- **Risco**: BAIXO
- **Razão**: Funcionalidade standalone, usa openpyxl
- **Ficheiros**: `app/routes/export.py` (1797 linhas)
- **Dependências**: `openpyxl`
- **Integração**:
  1. Copiar para `v5/backend/app/modules/data/export.py`
  2. Adaptar queries para tenant-aware
  3. Manter mesma estrutura de Excel (4 folhas)

#### 3.3 Catálogo de Módulos (`catalog.py`)
- **Risco**: BAIXO
- **Razão**: Tabelas de referência independentes
- **Ficheiros**: `app/routes/catalog.py`
- **Integração**:
  1. Criar tabelas de catálogo na DB do tenant
  2. Copiar routes para `v5/backend/app/modules/catalog/`

#### 3.4 Gestão de Técnicos Externos (`technicians.py`)
- **Risco**: BAIXO
- **Razão**: Entidade independente com relações simples
- **Integração**:
  1. Copiar tabela `external_technicians` para schema do tenant
  2. Adaptar routes para v5

---

### 🟡 RISCO MÉDIO - Requer cuidado na integração

#### 3.5 Sistema de Intervenções (`interventions.py`)
- **Risco**: MÉDIO
- **Razão**: Relações complexas com assets, users, ficheiros
- **Ficheiros**: `app/routes/interventions.py` (599 linhas)
- **Tabelas relacionadas**:
  - `interventions`
  - `intervention_technicians`
  - `intervention_files`
  - `intervention_edit_log`
  - `intervention_time_logs`
  - `status_change_log`
- **Integração**:
  1. Migrar todas as 6 tabelas
  2. Adaptar FKs para multi-tenant
  3. **CUIDADO**: Upload de ficheiros precisa pasta por tenant
  4. Testar cascades (DELETE ON CASCADE)

**Mitigação**:
- Criar backup antes de integrar
- Testar em ambiente isolado primeiro
- Migrar tabelas numa transação

#### 3.6 Gestão de Ativos Avançada (`assets.py`)
- **Risco**: MÉDIO
- **Razão**: v5 já tem assets básico, RFID tem versão mais completa
- **Ficheiros**: `app/routes/assets.py` (865 linhas)
- **Funcionalidades únicas RFID**:
  - Mapa GPS (`/map`)
  - Duplicação em massa (`/duplicate`)
  - Eliminação em massa (`/bulk`)
  - Alteração de estado em massa (`/change-status`)
  - Módulos de equipamento (`/modules`)
  - Histórico de estado (`/status-history`)
- **Integração**:
  1. **NÃO SUBSTITUIR** o assets.py do v5
  2. Adicionar endpoints em falta ao v5
  3. Preservar lógica multi-tenant do v5

**Mitigação**:
- Fazer merge manual endpoint a endpoint
- Verificar compatibilidade de schemas
- Preservar validações de tenant

#### 3.7 Schema Dinâmico (`schema.py`)
- **Risco**: MÉDIO
- **Razão**: Permite campos custom, pode conflitar com schema fixo do v5
- **Ficheiros**: `app/routes/schema.py`
- **Tabela**: `schema_fields`
- **Integração**:
  1. Avaliar se v5 precisa de campos dinâmicos
  2. Se sim, migrar tabela e lógica
  3. Se não, ignorar

---

### 🔴 ALTO RISCO - Requer decisão do utilizador

#### 3.8 Autenticação (`auth.py`)
- **Risco**: ALTO
- **Razão**: v5 tem 2FA, tokens JWT, RFID tem tokens simples
- **RECOMENDAÇÃO**: **MANTER v5**
- **Razão**:
  - v5 tem 2FA (mais seguro)
  - v5 tem multi-tenant
  - RFID usa hash SHA256 simples (menos seguro)
- **Integração**: Não integrar, manter autenticação v5

#### 3.9 Frontend (`index.html`)
- **Risco**: ALTO
- **Razão**: Arquitecturas completamente diferentes
- **RFID**: Single HTML, React via CDN, Babel inline
- **v5**: React/TypeScript, Vite, componentes modulares
- **RECOMENDAÇÃO**: **NÃO MIGRAR**
- **Integração**:
  1. Extrair lógica de UI do RFID
  2. Recriar componentes em TypeScript no v5
  3. **NÃO** copiar o index.html

---

## 4. Base de Dados - Tabelas a Migrar

### Tabelas NOVAS (não existem no v5)
```sql
-- Sistema de Intervenções
interventions
intervention_technicians
intervention_files
intervention_edit_log
intervention_time_logs

-- Histórico
status_change_log
audit_log
maintenance_log

-- Catálogo
catalog_columns
catalog_luminaires
catalog_electrical_panels
catalog_fuse_boxes
catalog_telemetry_panels
catalog_module_ev
catalog_module_mupi
catalog_module_lateral
catalog_module_antenna

-- Configuração
system_config
sequence_counters
external_technicians

-- Schema dinâmico
schema_fields
asset_module_serials
```

### Tabelas EXISTENTES (já existem no v5)
```sql
users          -- NÃO MIGRAR (v5 tem multi-tenant)
sessions       -- NÃO MIGRAR (v5 usa JWT)
assets         -- MERGE (adicionar campos)
asset_data     -- MERGE (estrutura compatível)
```

---

## 5. Plano de Mitigação de Riscos

### 5.1 Antes de Iniciar
1. ✅ Backup completo do v5 (já feito em `backup_i18n_20260209/`)
2. Criar branch git para integração
3. Documentar estado actual do v5

### 5.2 Ordem de Integração (Dependências primeiro)
```
1. Tabelas de catálogo (sem dependências)
2. external_technicians (sem dependências)
3. schema_fields + asset_module_serials (depende de assets)
4. system_config + sequence_counters
5. audit_log + status_change_log (depende de assets, users)
6. interventions + tabelas relacionadas (depende de tudo)
7. Routes de backup e export
8. Endpoints adicionais de assets
```

### 5.3 Testes Obrigatórios
- [ ] Login/2FA funciona após merge
- [ ] Multi-tenant preservado
- [ ] Assets CRUD funciona
- [ ] Novas funcionalidades (intervenções) funcionam
- [ ] Export Excel gera ficheiro válido
- [ ] Backup/restore funciona

---

## 6. Decisões Pendentes (Requer Utilizador)

| # | Questão | Opções | Impacto |
|---|---------|--------|---------|
| 1 | Migrar schema dinâmico? | Sim/Não | Permite campos custom |
| 2 | Mapa GPS no frontend? | Recriar em TypeScript / Ignorar | Funcionalidade visual |
| 3 | Dark mode do RFID? | Já existe no v5 | Nenhum |
| 4 | Manter prefixos de serial? | SLP/INTP/INTC | Nomenclatura |
| 5 | Backup automático agendado? | Sim/Não | Usa scheduler Flask |

---

## 7. Conclusão

### Integração SEGURA (pode avançar):
- ✅ Backup/Restore
- ✅ Export/Import Excel
- ✅ Catálogo de módulos
- ✅ Técnicos externos
- ✅ Audit log

### Integração com CUIDADO:
- ⚠️ Sistema de intervenções (testar bem)
- ⚠️ Endpoints avançados de assets (merge manual)

### NÃO INTEGRAR:
- ❌ Autenticação (v5 é superior)
- ❌ Frontend HTML (arquitectura incompatível)
- ❌ Tabelas users/sessions (multi-tenant)

---

## 8. Próximos Passos Recomendados

1. **Validar este documento** com o utilizador
2. **Responder às 5 questões pendentes** (secção 6)
3. **Criar checkpoint git** antes de começar
4. **Iniciar integração** pela ordem definida (secção 5.2)
5. **Testar cada componente** antes de avançar para o próximo

---

*Documento gerado automaticamente. Requer validação do utilizador antes de prosseguir com qualquer integração.*
