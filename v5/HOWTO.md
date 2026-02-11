# SmartLamppost v5 - Guia de Setup

## Pre-requisitos

- Python 3.9+
- Node.js 18+

---

## INICIO RAPIDO (Copy-Paste)

### Terminal 1 - Backend:
```bash
cd /Users/paulovalente/Downloads/smartlamppost_v4_FINAL2/v5/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

### Terminal 2 - Frontend:
```bash
cd /Users/paulovalente/Downloads/smartlamppost_v4_FINAL2/v5/frontend
npm install
npm run dev
```

### Abrir no browser:
```
http://localhost:3000
```

---

## Verificar se funciona

### 1. Backend Health Check:
```bash
curl http://localhost:5001/api/health
```
Resposta esperada: `{"status": "ok", "version": "5.0.0"}`

### 2. Frontend:
Abrir `http://localhost:3000` - deve mostrar a pagina de login

---

## Setup Detalhado

### Backend

#### 1. Criar ambiente virtual
```bash
cd v5/backend
python3 -m venv venv
source venv/bin/activate
```

#### 2. Instalar dependencias
```bash
pip install -r requirements.txt
```

#### 3. Iniciar servidor
```bash
python run.py
```

Backend disponivel em: `http://localhost:5001`

### Frontend

#### 1. Instalar dependencias
```bash
cd v5/frontend
npm install
```

#### 2. Iniciar servidor
```bash
npm run dev
```

Frontend disponivel em: `http://localhost:3000`

---

## Estrutura de Pastas

```
v5/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # App factory
│   │   ├── core/                # Modulos core (auth, tenants, users)
│   │   ├── modules/             # Modulos feature (assets, dashboard)
│   │   └── shared/              # Utilitarios partilhados
│   ├── run.py                   # Entry point
│   └── requirements.txt         # Dependencias Python
│
├── frontend/
│   ├── src/
│   │   ├── core/                # Layout, auth pages
│   │   ├── modules/             # Feature pages (assets, dashboard)
│   │   ├── hooks/               # React hooks (useAuth, useTheme)
│   │   └── services/            # API client
│   └── package.json             # Dependencias Node
│
└── config/
    ├── plans.json               # Definicao de planos
    └── modules.json             # Definicao de modulos
```

---

## Comandos Uteis

```bash
# Backend - ver logs
python run.py 2>&1 | tee server.log

# Frontend - build producao
npm run build

# Frontend - preview producao
npm run preview

# Matar processo na porta 5001
lsof -ti:5001 | xargs kill -9

# Matar processo na porta 3000
lsof -ti:3000 | xargs kill -9
```

---

## Problemas Comuns

### CORS Error
O CORS ja esta configurado no backend para aceitar `*` em desenvolvimento.

### Module not found (Python)
```bash
pip install -r requirements.txt
```

### Module not found (Node)
```bash
npm install
```

### Port already in use
```bash
lsof -ti:5001 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```
