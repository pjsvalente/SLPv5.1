#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corrigir estrutura da base de dados
Execute: python3.10 fix_database.py
"""

import os
import sqlite3
import shutil
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TENANT_ID = 'smartlamppost'
DB_PATH = os.path.join(BASE_DIR, 'tenants', TENANT_ID, 'database.db')

print("=" * 60)
print("SMARTLAMPPOST - CORREÇÃO DE BASE DE DADOS")
print("=" * 60)

# Backup
backup_path = DB_PATH + f'.backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}'
print(f"\n1. Criar backup: {backup_path}")
shutil.copy2(DB_PATH, backup_path)
print("   ✅ Backup criado")

# Conectar
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# 2. Corrigir tabela interventions
print("\n2. Corrigir tabela INTERVENTIONS")
print("-" * 40)

cursor.execute("DROP TABLE IF EXISTS interventions")
print("   🗑️  Tabela antiga removida")

cursor.execute('''
    CREATE TABLE interventions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        intervention_type TEXT NOT NULL,
        problem_description TEXT,
        solution_description TEXT,
        parts_used TEXT,
        total_cost REAL DEFAULT 0,
        duration_hours REAL,
        status TEXT DEFAULT 'em_curso',
        previous_asset_status TEXT,
        new_asset_status TEXT,
        status_description TEXT,
        notes TEXT,
        created_by INTEGER NOT NULL,
        completed_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (completed_by) REFERENCES users(id)
    )
''')
print("   ✅ Tabela interventions recriada")

# 3. Corrigir tabela intervention_technicians
print("\n3. Corrigir tabela INTERVENTION_TECHNICIANS")
print("-" * 40)

cursor.execute("DROP TABLE IF EXISTS intervention_technicians")
print("   🗑️  Tabela antiga removida")

cursor.execute('''
    CREATE TABLE intervention_technicians (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        intervention_id INTEGER NOT NULL,
        user_id INTEGER,
        external_technician_id INTEGER,
        role TEXT DEFAULT 'participante',
        FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (external_technician_id) REFERENCES external_technicians(id)
    )
''')
print("   ✅ Tabela intervention_technicians recriada com coluna 'role'")

# 4. Corrigir tabela intervention_files
print("\n4. Corrigir tabela INTERVENTION_FILES")
print("-" * 40)

cursor.execute("DROP TABLE IF EXISTS intervention_files")
print("   🗑️  Tabela antiga removida")

cursor.execute('''
    CREATE TABLE intervention_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        intervention_id INTEGER NOT NULL,
        file_category TEXT NOT NULL,
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
    )
''')
print("   ✅ Tabela intervention_files recriada")

# 5. Verificar tabela users
print("\n5. Verificar estrutura USERS")
print("-" * 40)
cursor.execute("PRAGMA table_info(users)")
columns = [col[1] for col in cursor.fetchall()]

if 'first_name' not in columns:
    cursor.execute("ALTER TABLE users ADD COLUMN first_name TEXT DEFAULT ''")
    print("   ➕ Adicionado first_name")
    
if 'last_name' not in columns:
    cursor.execute("ALTER TABLE users ADD COLUMN last_name TEXT DEFAULT ''")
    print("   ➕ Adicionado last_name")

print("   ✅ Estrutura users OK")

# Commit
conn.commit()

# 6. Verificar resultado final
print("\n6. VERIFICAÇÃO FINAL")
print("-" * 40)

# interventions
cursor.execute("PRAGMA table_info(interventions)")
cols = [col[1] for col in cursor.fetchall()]
print(f"   interventions: {len(cols)} colunas")
print(f"      ✅ asset_id: {'asset_id' in cols}")

# intervention_technicians
cursor.execute("PRAGMA table_info(intervention_technicians)")
cols = [col[1] for col in cursor.fetchall()]
print(f"   intervention_technicians: {len(cols)} colunas")
print(f"      ✅ role: {'role' in cols}")

# external_technicians
cursor.execute("SELECT COUNT(*) FROM external_technicians WHERE active = 1")
count = cursor.fetchone()[0]
print(f"   external_technicians: {count} técnicos externos activos")

# users com role operator/admin (técnicos internos)
cursor.execute("SELECT COUNT(*) FROM users WHERE role IN ('admin', 'operator') AND active = 1")
count = cursor.fetchone()[0]
print(f"   técnicos internos (users): {count} utilizadores (admin/operator)")

conn.close()

print("\n" + "=" * 60)
print("✅ CORREÇÃO COMPLETA!")
print("=" * 60)
print("\n⚠️  NOTA: Técnicos internos são utilizadores com role")
print("   'admin' ou 'operator'. Crie-os em Definições → Utilizadores")
print("\nAgora vá ao Web tab e clique RELOAD")
print()
