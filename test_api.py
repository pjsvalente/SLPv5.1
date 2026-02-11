#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para testar API endpoints diretamente
Execute: python3.10 test_api.py
"""

import os
import sys

# Adicionar diretório ao path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
os.chdir(BASE_DIR)

print("=" * 60)
print("SMARTLAMPPOST - TESTE DE API")
print("=" * 60)

# Importar app
try:
    from app import app, obter_bd, inicializar_bd_tenant
    print("✅ App importado com sucesso")
except Exception as e:
    print(f"❌ Erro ao importar app: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Criar contexto de teste
with app.test_client() as client:
    with app.app_context():
        
        # 1. Login para obter token
        print("\n1. LOGIN")
        print("-" * 40)
        login_data = {
            'email': 'admin@smartlamppost.com',
            'password': 'admin123'
        }
        response = client.post('/api/auth/login', 
                               json=login_data,
                               content_type='application/json')
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.get_json()
            token = data.get('token')
            print(f"   ✅ Token obtido: {token[:20]}...")
        else:
            print(f"   ❌ Erro: {response.get_json()}")
            print("   Tentando com admin/admin123...")
            
            # Tentar outra password
            login_data['password'] = 'Admin123!'
            response = client.post('/api/auth/login', 
                                   json=login_data,
                                   content_type='application/json')
            if response.status_code == 200:
                data = response.get_json()
                token = data.get('token')
                print(f"   ✅ Token obtido: {token[:20]}...")
            else:
                print(f"   ❌ Falhou novamente: {response.get_json()}")
                token = None
        
        if not token:
            print("\n❌ Sem token, não é possível continuar")
            sys.exit(1)
        
        headers = {'Authorization': f'Bearer {token}'}
        
        # 2. Testar GET /api/external-technicians
        print("\n2. GET /api/external-technicians")
        print("-" * 40)
        response = client.get('/api/external-technicians', headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            techs = response.get_json()
            print(f"   ✅ Técnicos: {len(techs) if isinstance(techs, list) else techs}")
        else:
            print(f"   ❌ Erro: {response.get_json()}")
        
        # 3. Testar POST /api/external-technicians
        print("\n3. POST /api/external-technicians")
        print("-" * 40)
        tech_data = {
            'name': 'Técnico API Teste',
            'company': 'Empresa API',
            'phone': '912345678',
            'email': 'api@teste.pt'
        }
        response = client.post('/api/external-technicians', 
                               json=tech_data, 
                               headers=headers,
                               content_type='application/json')
        print(f"   Status: {response.status_code}")
        result = response.get_json()
        print(f"   Response: {result}")
        
        if response.status_code in [200, 201]:
            print(f"   ✅ Técnico criado!")
            tech_id = result.get('id')
            
            # Apagar técnico de teste
            if tech_id:
                del_response = client.delete(f'/api/external-technicians/{tech_id}', headers=headers)
                print(f"   🗑️  Técnico removido: {del_response.status_code}")
        else:
            print(f"   ❌ Erro ao criar técnico")
        
        # 4. Verificar assets disponíveis
        print("\n4. GET /api/assets")
        print("-" * 40)
        response = client.get('/api/assets?per_page=5', headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.get_json()
            assets = data.get('assets', [])
            print(f"   ✅ Assets: {len(assets)}")
            if assets:
                asset = assets[0]
                print(f"   Primeiro: {asset.get('serial_number')}")
                serial = asset.get('serial_number')
            else:
                serial = None
        else:
            print(f"   ❌ Erro: {response.get_json()}")
            serial = None
        
        # 5. Testar POST /api/interventions
        print("\n5. POST /api/interventions")
        print("-" * 40)
        if serial:
            int_data = {
                'serial_number': serial,
                'intervention_type': 'Manutenção Preventiva',
                'problem_description': 'Teste via API',
                'solution_description': 'Resolução teste',
                'parts_used': 'Nenhuma',
                'duration_hours': 1.5,
                'total_cost': 0
            }
            response = client.post('/api/interventions', 
                                   json=int_data, 
                                   headers=headers,
                                   content_type='application/json')
            print(f"   Status: {response.status_code}")
            result = response.get_json()
            print(f"   Response: {result}")
            
            if response.status_code in [200, 201]:
                print(f"   ✅ Intervenção criada!")
            else:
                print(f"   ❌ Erro ao criar intervenção")
        else:
            print("   ⏭️  Ignorado (sem assets)")
        
        # 6. GET /api/interventions
        print("\n6. GET /api/interventions")
        print("-" * 40)
        response = client.get('/api/interventions', headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.get_json()
            ints = data.get('interventions', [])
            print(f"   ✅ Intervenções: {len(ints)}")
        else:
            print(f"   ❌ Erro: {response.get_json()}")

print("\n" + "=" * 60)
print("TESTE API COMPLETO")
print("=" * 60)
