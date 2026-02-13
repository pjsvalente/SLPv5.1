# SmartLamppost - Railway Deployment Guide

## Persistência de Dados com PostgreSQL (Recomendado)

O sistema agora suporta **PostgreSQL** automaticamente quando a variável `DATABASE_URL` está configurada.

### Passos para Configurar PostgreSQL no Railway:

1. **Aceder ao projeto** em https://railway.app

2. **Adicionar PostgreSQL:**
   - Clicar em **"+ New"** ou **"Add Service"**
   - Selecionar **"Database"** → **"PostgreSQL"**
   - Aguardar a criação da instância

3. **Ligar PostgreSQL ao Backend:**
   - Clicar no serviço backend
   - Ir a **Variables**
   - Clicar **"Add Variable Reference"** ou **"Connect"**
   - Selecionar a variável `DATABASE_URL` do PostgreSQL

4. **Fazer Redeploy** do backend

### Verificar que Está a Funcionar:

Após o deploy, verificar nos logs:
```
Database mode: PostgreSQL
PostgreSQL tenant schema initialized: smartlamppost
```

### Bootstrap do Admin:

Na primeira vez após configurar, criar o admin:
```bash
curl -X POST https://SEU-DOMINIO.railway.app/api/auth/bootstrap
```

Credenciais:
- Email: `admin@smartlamppost.com`
- Password: `Admin123!`

---

## Alternativa: Volumes (SQLite)

Se preferir usar SQLite com volumes persistentes:

### Passos:

1. Ir a **Settings** → **Volumes** no serviço backend
2. Adicionar volume com **Mount Path:** `/app/data`
3. Fazer Redeploy

**Nota:** Volumes podem não estar disponíveis em todos os planos Railway.

---

## Como Funciona

O sistema detecta automaticamente qual base de dados usar:

| Condição | Base de Dados |
|----------|---------------|
| `DATABASE_URL` definida | PostgreSQL |
| Sem `DATABASE_URL` | SQLite (ficheiros locais) |

### PostgreSQL
- Cada tenant tem o seu próprio **schema** (ex: `tenant_smartlamppost`)
- Catálogo partilhado no schema `catalog`
- Dados persistem entre deploys automaticamente

### SQLite (desenvolvimento local)
- Cada tenant tem o seu próprio ficheiro `.db`
- Ficheiros em `/app/data/tenants/`
- Necessita de volume para persistir em produção

---

## Migração de SQLite para PostgreSQL

Se já tem dados em SQLite e quer migrar para PostgreSQL:

1. **Exportar dados** via menu Backup
2. Configurar PostgreSQL no Railway
3. Fazer Redeploy
4. **Importar dados** via menu Dados → Import

---

## Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL do PostgreSQL (automática) | `postgresql://user:pass@host:5432/db` |
| `SECRET_KEY` | Chave para tokens JWT | `sua-chave-secreta-longa` |
| `CORS_ORIGINS` | Origens CORS permitidas | `https://seudominio.com` |

---

## Troubleshooting

### "Connection refused" ou "Database does not exist"
- Verificar se PostgreSQL está a correr
- Verificar se `DATABASE_URL` está correctamente configurada

### Dados não persistem
- Verificar se está a usar PostgreSQL (ver logs: "Database mode: PostgreSQL")
- Se usar SQLite, verificar se o volume está configurado

### Erro de permissões
- O schema do tenant é criado automaticamente na primeira ligação
