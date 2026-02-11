# SmartLamppost v5.0 - Plano de Fusão de Projetos

## Objetivo
Fundir o trabalho desenvolvido em dois projetos Claude separados numa única solução v5.0, sem perda de informação e com decisões sempre tomadas pelo utilizador.

---

## Regras Fundamentais

### 1. Claude NUNCA decide sozinho
- Toda a funcionalidade encontrada deve ser **apresentada ao utilizador**
- Conflitos entre versões requerem **pergunta explícita**
- Código a ignorar requer **confirmação do utilizador**
- Em caso de dúvida: **PERGUNTAR, nunca assumir**

### 2. Nada é descartado sem autorização
- Código "duplicado" pode ter nuances diferentes
- Funcionalidades "obsoletas" podem ser necessárias
- Antes de ignorar qualquer coisa: **listar e pedir confirmação**

### 3. Rastreabilidade total
- Cada decisão fica documentada neste ficheiro
- Origem de cada funcionalidade é registada
- Conflitos resolvidos ficam com histórico

---

## Fase 0: Preparação

### 0.1 Inventário do Projeto Atual (Este Chat)
> Claude deve executar antes de iniciar a fusão

- [ ] Listar todos os ficheiros Python (.py)
- [ ] Listar todos os ficheiros Frontend (.html, .js, .tsx)
- [ ] Listar todas as tabelas de base de dados
- [ ] Listar todos os endpoints da API (/api/*)
- [ ] Listar todas as funcionalidades de UI (componentes React)
- [ ] Listar configurações (tenants.json, etc.)

**Output esperado**: Tabela com [Ficheiro | Tipo | Funcionalidade | Linhas]

### 0.2 Inventário do Projeto a Importar
> O utilizador deve fornecer os ficheiros ou o Claude deve analisar o PDF/ZIP

- [ ] Repetir o mesmo inventário para o projeto importado
- [ ] Identificar ficheiros com o mesmo nome
- [ ] Identificar funcionalidades com o mesmo propósito

**Output esperado**: Tabela com [Ficheiro | Tipo | Funcionalidade | Linhas | Existe no atual?]

### 0.3 Mapa de Correspondências
> Claude cria, utilizador valida

| Funcionalidade | Projeto Atual | Projeto Importado | Ação Sugerida |
|----------------|---------------|-------------------|---------------|
| Login          | app.py:388    | modules/auth/login.py | PERGUNTAR |
| 2FA            | app.py:522    | modules/auth/two_factor.py | PERGUNTAR |
| Gestão Assets  | app.py:1500   | modules/assets/manager.py | PERGUNTAR |
| ...            | ...           | ...               | ... |

**Ações possíveis**:
- `MANTER_ATUAL` - Usar versão do projeto atual
- `IMPORTAR` - Usar versão do projeto importado
- `FUNDIR` - Combinar ambas as versões
- `PERGUNTAR` - Requer decisão do utilizador

---

## Fase 1: Análise de Conflitos

### 1.1 Para cada funcionalidade duplicada, Claude deve apresentar:

```
┌─────────────────────────────────────────────────────────────────┐
│ CONFLITO #001: Sistema de Autenticação                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ VERSÃO ATUAL (app.py:388-520)                                  │
│ ├── Login por email                                            │
│ ├── 2FA por email/SMS                                          │
│ ├── Tokens simples (não JWT)                                   │
│ └── Sessões em SQLite                                          │
│                                                                 │
│ VERSÃO IMPORTADA (modules/auth/)                               │
│ ├── Login por email                                            │
│ ├── 2FA por email/SMS/TOTP                                     │
│ ├── JWT com refresh tokens                                     │
│ └── Sessões em Redis                                           │
│                                                                 │
│ DIFERENÇAS IDENTIFICADAS:                                      │
│ • Importada tem TOTP (authenticator apps) - ATUAL não tem      │
│ • Importada usa JWT - ATUAL usa tokens simples                 │
│ • Importada usa Redis - ATUAL usa SQLite                       │
│                                                                 │
│ PERGUNTA AO UTILIZADOR:                                        │
│ 1. Usar versão ATUAL (mais simples, já testada)               │
│ 2. Usar versão IMPORTADA (mais features, requer Redis)        │
│ 3. FUNDIR: Manter estrutura atual + adicionar TOTP            │
│ 4. Mostrar código de ambas para comparação detalhada          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Critérios de Análise (Claude deve verificar)

Para cada funcionalidade, comparar:

| Critério | Como verificar |
|----------|----------------|
| **Completude** | A versão tem todas as sub-funcionalidades? |
| **Segurança** | Qual versão tem melhor proteção? |
| **Performance** | Qual versão é mais eficiente? |
| **Compatibilidade** | Funciona com a nova arquitetura v5? |
| **Dependências** | Que bibliotecas/serviços requer? |
| **Testes** | Tem testes associados? |

---

## Fase 2: Decisões de Fusão

### 2.1 Template de Decisão

Cada decisão tomada pelo utilizador deve ser registada:

```markdown
### DECISÃO #001
**Data**: YYYY-MM-DD
**Funcionalidade**: Sistema de Autenticação
**Escolha**: FUNDIR
**Detalhes**:
- Base: Usar estrutura do projeto atual
- Adicionar: TOTP do projeto importado
- Ignorar: Redis (manter SQLite por agora)
**Razão do utilizador**: "Quero TOTP mas não quero complexidade de Redis nesta fase"
**Ficheiros afetados**:
- app.py (modificar)
- utils/security.py (adicionar função)
**Estado**: PENDENTE / EM PROGRESSO / CONCLUÍDO
```

### 2.2 Registo de Decisões

| # | Funcionalidade | Decisão | Estado |
|---|----------------|---------|--------|
| 001 | Autenticação | PENDENTE | - |
| 002 | Gestão Tenants | PENDENTE | - |
| 003 | Gestão Assets | PENDENTE | - |
| 004 | Intervenções | PENDENTE | - |
| 005 | Dashboard | PENDENTE | - |
| 006 | Mapa | PENDENTE | - |
| 007 | Planeador Rotas | PENDENTE | - |
| 008 | Relatórios | PENDENTE | - |
| 009 | Permissões | PENDENTE | - |
| 010 | Módulos/Planos | PENDENTE | - |

---

## Fase 3: Execução da Fusão

### 3.1 Ordem de Execução

A fusão deve seguir esta ordem (dependências primeiro):

```
1. Infraestrutura (config, paths, database setup)
   ↓
2. Segurança (hashing, tokens, validações)
   ↓
3. Autenticação (login, 2FA, sessões)
   ↓
4. Multi-tenancy (tenants, isolamento)
   ↓
5. Utilizadores e Permissões (RBAC)
   ↓
6. Core Features (assets, schema dinâmico)
   ↓
7. Módulos Opcionais (intervenções, relatórios, etc.)
   ↓
8. Frontend (componentes React)
   ↓
9. Testes e Validação
```

### 3.2 Checklist por Componente

Para cada componente fundido:

- [ ] Código backend migrado/adaptado
- [ ] Código frontend migrado/adaptado
- [ ] Base de dados migrada (se aplicável)
- [ ] Testes existentes passam
- [ ] Novos testes adicionados (se necessário)
- [ ] Documentação atualizada
- [ ] **VALIDADO PELO UTILIZADOR**

### 3.3 Rollback Plan

Antes de cada alteração major:

```bash
# Claude deve sugerir
git add -A && git commit -m "CHECKPOINT antes de fusão: [componente]"
```

Se algo correr mal:
```bash
git log --oneline -10  # Ver checkpoints
git checkout [hash]    # Voltar ao checkpoint
```

---

## Fase 4: Adaptação à Arquitetura v5

### 4.1 Mapeamento para Nova Estrutura

| Código Original | Destino v5 | Adaptações Necessárias |
|-----------------|------------|------------------------|
| app.py:388-520 (auth) | backend/app/core/auth/ | Separar em routes/services/models |
| app.py:752-850 (tenants) | backend/app/core/tenants/ | Separar em routes/services/models |
| app.py:1500-2000 (assets) | backend/app/modules/assets/ | Criar manifest.json |
| index.html (React) | frontend/src/ | Separar em componentes .tsx |

### 4.2 Questões Obrigatórias ao Utilizador

Antes de adaptar cada componente, Claude DEVE perguntar:

1. **"Este componente deve ser CORE (sempre ativo) ou MÓDULO (por plano)?"**
2. **"Que plano mínimo deve ter acesso? (base/pro/premium)"**
3. **"Existem dependências de outros componentes?"**
4. **"Queres manter compatibilidade com API atual ou posso alterar endpoints?"**

---

## Fase 5: Validação Final

### 5.1 Checklist de Validação

- [ ] Todas as funcionalidades do projeto ATUAL funcionam
- [ ] Todas as funcionalidades do projeto IMPORTADO estão disponíveis (ou documentadas como ignoradas)
- [ ] Nenhum dado foi perdido na migração
- [ ] Testes passam (backend)
- [ ] Frontend funciona (manual testing)
- [ ] Login/2FA funciona
- [ ] Multi-tenant funciona
- [ ] Permissões funcionam
- [ ] Cada decisão está documentada neste ficheiro

### 5.2 Relatório de Fusão

No final, Claude deve gerar:

```markdown
## Relatório Final de Fusão

### Estatísticas
- Total de funcionalidades analisadas: XX
- Mantidas do projeto atual: XX
- Importadas do outro projeto: XX
- Fundidas (merge): XX
- Ignoradas (com autorização): XX

### Funcionalidades por Origem
| Funcionalidade | Origem | Plano | Estado |
|----------------|--------|-------|--------|
| Login | Atual | Core | OK |
| TOTP 2FA | Importado | Pro | OK |
| Analytics | Importado | Premium | OK |

### Decisões Tomadas
[Lista de todas as decisões com razões]

### Ficheiros Modificados
[Lista completa]

### Próximos Passos Recomendados
[Sugestões de Claude, a validar pelo utilizador]
```

---

## Anexo A: Comandos Úteis para Claude

### Iniciar Processo de Fusão
```
"Inicia a Fase 0 do MERGE_PLAN.md - faz o inventário do projeto atual"
```

### Continuar Após Decisão
```
"Decisão #001: escolho opção 3 (FUNDIR). Continua com o próximo conflito."
```

### Ver Estado Atual
```
"Mostra o estado atual do MERGE_PLAN.md - que decisões faltam?"
```

### Rollback
```
"Algo correu mal na fusão de [componente]. Volta ao checkpoint anterior."
```

---

## Anexo B: Perguntas Frequentes

### "E se as duas versões tiverem bugs diferentes?"
Claude deve identificar bugs conhecidos em ambas e perguntar qual corrigir primeiro.

### "E se uma funcionalidade só existir num projeto?"
Claude deve perguntar: "Esta funcionalidade [X] só existe no projeto [Y]. Queres incluí-la na v5?"

### "E se eu mudar de ideias depois?"
Cada decisão pode ser revertida. Claude deve perguntar: "Queres alterar a decisão #XXX?"

### "E se o merge for muito complexo?"
Claude deve sugerir: "Este merge é complexo. Preferes: (1) fazer em sub-partes, (2) manter separado como módulo opcional, (3) simplificar removendo features?"

---

## Histórico de Alterações deste Documento

| Data | Alteração | Autor |
|------|-----------|-------|
| 2024-XX-XX | Criação inicial | Claude (a pedido do utilizador) |

---

## Assinatura

Este plano foi criado para garantir uma fusão controlada e sem perdas.

**Regra de ouro**: Em caso de dúvida, Claude PERGUNTA. Nunca assume, nunca decide sozinho.
