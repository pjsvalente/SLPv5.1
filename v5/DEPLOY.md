# SmartLamppost v5.0 - Deploy Guide

## 🚀 Railway Deploy (Recomendado)

### Opção 1: Full-Stack no Railway (Mais Simples)

1. **Criar conta Railway**: https://railway.app

2. **Criar novo projeto**:
   - New Project → Deploy from GitHub repo
   - Ou: `railway init` no terminal

3. **Configurar Backend**:
   ```bash
   cd v5/backend
   railway link
   railway up
   ```

4. **Variáveis de Ambiente** (Railway Dashboard):
   ```
   SECRET_KEY=gerar-chave-segura-aqui
   FLASK_ENV=production
   CORS_ORIGINS=*
   ```

5. **Frontend** (no mesmo projeto):
   ```bash
   cd v5/frontend
   npm run build
   ```
   Copiar `dist/` para `v5/backend/static/`

### Opção 2: Separado (Backend Railway + Frontend Vercel)

#### Backend no Railway:

1. Criar projeto no Railway
2. Ligar ao repo GitHub (pasta `v5/backend`)
3. Adicionar variáveis:
   ```
   SECRET_KEY=sua-chave-secreta
   FLASK_ENV=production
   CORS_ORIGINS=https://seu-frontend.vercel.app
   ```

#### Frontend no Vercel:

1. Criar projeto no Vercel: https://vercel.com
2. Importar repo GitHub
3. Configurar:
   - Framework: Vite
   - Root Directory: `v5/frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Variáveis de Ambiente:
   ```
   VITE_API_URL=https://seu-backend.railway.app/api
   ```

5. Editar `vercel.json`:
   - Substituir `YOUR-RAILWAY-BACKEND.railway.app` pelo URL do seu backend

---

## 📋 Checklist Pré-Deploy

- [ ] Gerar SECRET_KEY segura: `python -c "import secrets; print(secrets.token_hex(32))"`
- [ ] Verificar CORS_ORIGINS com URL correto
- [ ] Build do frontend sem erros: `npm run build`
- [ ] Testar localmente: `gunicorn wsgi:app`

---

## 🔧 Comandos Úteis

### Railway CLI:
```bash
# Instalar
npm install -g @railway/cli

# Login
railway login

# Criar projeto
railway init

# Deploy
railway up

# Ver logs
railway logs

# Variáveis
railway variables set SECRET_KEY=xxx
```

### Testar localmente como produção:
```bash
cd v5/backend
pip install gunicorn
gunicorn --bind 0.0.0.0:5000 wsgi:app
```

---

## 🌐 URLs Após Deploy

- **Backend**: `https://smartlamppost-backend.railway.app`
- **API Health**: `https://smartlamppost-backend.railway.app/api/health`
- **Frontend**: `https://smartlamppost.vercel.app`

---

## ⚠️ Notas Importantes

1. **SQLite no Railway**: Funciona, mas dados são efêmeros (perdem-se em redeploy). Para produção real, use PostgreSQL.

2. **Weather API**: OpenWeatherMap precisa de API key válida. Novas keys demoram até 2h a ativar.

3. **Backups**: Configurar backup automático da base de dados.

4. **HTTPS**: Railway e Vercel providenciam HTTPS automaticamente.
