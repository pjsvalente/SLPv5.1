#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de diagnóstico para testar criação de técnicos e intervenções
Execute: python3.10 test_debug.py
"""

import os
import sys
import sqlite3
import json

# Diretório base
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TENANT_ID = 'smartlamppost'
DB_PATH = os.path.join(BASE_DIR, 'tenants', TENANT_ID, 'database.db')

print("=" * 60)
print("SMARTLAMPPOST - DIAGNÓSTICO DE BASE DE DADOS")
print("=" * 60)

# 1. Verificar se BD existe
print("\n1. VERIFICAR BASE DE DADOS")
print("-" * 40)
if os.path.exists(DB_PATH):
    print(f"   ✅ BD encontrada: {DB_PATH}")
    print(f"   📊 Tamanho: {os.path.getsize(DB_PATH)} bytes")
else:
    print(f"   ❌ BD NÃO ENCONTRADA: {DB_PATH}")
    print("   Execute: python3.10 init_system.py")
    sys.exit(1)

# 2. Verificar permissões
print("\n2. VERIFICAR PERMISSÕES")
print("-" * 40)
can_read = os.access(DB_PATH, os.R_OK)
can_write = os.access(DB_PATH, os.W_OK)
print(f"   Leitura: {'✅' if can_read else '❌'}")
print(f"   Escrita: {'✅' if can_write else '❌'}")

if not can_write:
    print("   ⚠️  SEM PERMISSÃO DE ESCRITA!")
    print("   Execute: chmod 777 " + DB_PATH)

# 3. Conectar e verificar tabelas
print("\n3. VERIFICAR TABELAS")
print("-" * 40)

try:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Listar todas as tabelas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in cursor.fetchall()]
    
    print(f"   Total de tabelas: {len(tables)}")
    
    required_tables = [
        'users', 'assets', 'asset_data', 'schema_fields',
        'external_technicians', 'interventions', 
        'intervention_technicians', 'intervention_files'
    ]
    
    for table in required_tables:
        if table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"   ✅ {table}: {count} registos")
        else:
            print(f"   ❌ {table}: NÃO EXISTE!")
            
except Exception as e:
    print(f"   ❌ ERRO: {e}")
    sys.exit(1)

# 4. Verificar estrutura da tabela external_technicians
print("\n4. ESTRUTURA: external_technicians")
print("-" * 40)
try:
    cursor.execute("PRAGMA table_info(external_technicians)")
    columns = cursor.fetchall()
    if columns:
        for col in columns:
            print(f"   - {col[1]} ({col[2]})")
    else:
        print("   ❌ Tabela não existe ou está vazia")
except Exception as e:
    print(f"   ❌ ERRO: {e}")

# 5. Verificar estrutura da tabela interventions
print("\n5. ESTRUTURA: interventions")
print("-" * 40)
try:
    cursor.execute("PRAGMA table_info(interventions)")
    columns = cursor.fetchall()
    if columns:
        for col in columns:
            print(f"   - {col[1]} ({col[2]})")
    else:
        print("   ❌ Tabela não existe ou está vazia")
except Exception as e:
    print(f"   ❌ ERRO: {e}")

# 6. Testar INSERT de técnico externo
print("\n6. TESTE: Criar técnico externo")
print("-" * 40)
try:
    cursor.execute('''
        INSERT INTO external_technicians (name, company, phone, email, notes, active, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', ('Técnico Teste', 'Empresa Teste', '912345678', 'teste@teste.pt', 'Criado por script de teste', 1, 1))
    conn.commit()
    tech_id = cursor.lastrowid
    print(f"   ✅ Técnico criado com ID: {tech_id}")
    
    # Verificar se foi criado
    cursor.execute("SELECT * FROM external_technicians WHERE id = ?", (tech_id,))
    tech = cursor.fetchone()
    if tech:
        print(f"   ✅ Verificado: {dict(tech)}")
    
    # Apagar o teste
    cursor.execute("DELETE FROM external_technicians WHERE id = ?", (tech_id,))
    conn.commit()
    print(f"   🗑️  Técnico de teste removido")
    
except Exception as e:
    print(f"   ❌ ERRO ao criar técnico: {e}")
    import traceback
    traceback.print_exc()

# 7. Verificar se há assets para criar intervenção
print("\n7. VERIFICAR ASSETS")
print("-" * 40)
try:
    cursor.execute("SELECT id, serial_number FROM assets LIMIT 5")
    assets = cursor.fetchall()
    if assets:
        print(f"   ✅ {len(assets)} assets encontrados:")
        for a in assets:
            print(f"      - ID {a[0]}: {a[1]}")
        asset_id = assets[0][0]
    else:
        print("   ⚠️  Nenhum asset encontrado. Criar um primeiro.")
        asset_id = None
except Exception as e:
    print(f"   ❌ ERRO: {e}")
    asset_id = None

# 8. Testar INSERT de intervenção
print("\n8. TESTE: Criar intervenção")
print("-" * 40)
if asset_id:
    try:
        cursor.execute('''
            INSERT INTO interventions (
                asset_id, intervention_type, problem_description, 
                parts_used, duration_hours, status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (asset_id, 'Manutenção Preventiva', 'Teste de diagnóstico', 
              'Nenhuma', 1.0, 'em_curso', 1))
        conn.commit()
        int_id = cursor.lastrowid
        print(f"   ✅ Intervenção criada com ID: {int_id}")
        
        # Verificar
        cursor.execute("SELECT * FROM interventions WHERE id = ?", (int_id,))
        interv = cursor.fetchone()
        if interv:
            print(f"   ✅ Verificado: tipo={interv['intervention_type']}, status={interv['status']}")
        
        # Apagar teste
        cursor.execute("DELETE FROM interventions WHERE id = ?", (int_id,))
        conn.commit()
        print(f"   🗑️  Intervenção de teste removida")
        
    except Exception as e:
        print(f"   ❌ ERRO ao criar intervenção: {e}")
        import traceback
        traceback.print_exc()
else:
    print("   ⏭️  Ignorado (sem assets)")

# 9. Verificar utilizadores
print("\n9. VERIFICAR UTILIZADORES")
print("-" * 40)
try:
    cursor.execute("SELECT id, email, role, active FROM users")
    users = cursor.fetchall()
    for u in users:
        status = '✅' if u[3] else '❌'
        print(f"   {status} ID {u[0]}: {u[1]} ({u[2]})")
except Exception as e:
    print(f"   ❌ ERRO: {e}")

conn.close()

print("\n" + "=" * 60)
print("DIAGNÓSTICO COMPLETO")
print("=" * 60)
print("\nSe houver tabelas em falta, execute:")
print("   python3.10 init_system.py")
print("\nSe houver erros de permissão, execute:")
print("   chmod -R 777 ~/smartlamppost/tenants/")
print()
