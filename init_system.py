#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SmartLamppost v4.0 - Script de Inicialização do Sistema
Executa este script para configurar o sistema pela primeira vez ou para resetar.
"""

import os
import sys
import shutil
import sqlite3
import json
from datetime import datetime
from werkzeug.security import generate_password_hash

# Diretórios
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TENANTS_DIR = os.path.join(BASE_DIR, 'tenants')
SHARED_DIR = os.path.join(BASE_DIR, 'shared')
CONFIG_DIR = os.path.join(BASE_DIR, 'config')
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')
BACKUPS_DIR = os.path.join(BASE_DIR, 'backups')

MASTER_TENANT_ID = 'smartlamppost'


def criar_diretorios():
    """Cria estrutura de diretórios."""
    dirs = [TENANTS_DIR, SHARED_DIR, CONFIG_DIR, UPLOADS_DIR, BACKUPS_DIR]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
        print(f"✓ Diretório: {d}")


def criar_config_tenants():
    """Cria ficheiro de configuração de tenants."""
    config_file = os.path.join(CONFIG_DIR, 'tenants.json')
    config = {
        'tenants': [
            {
                'id': MASTER_TENANT_ID,
                'name': 'SmartLamppost',
                'short_name': 'SLP',
                'is_master': True,
                'active': True,
                'created_at': datetime.now().isoformat()
            }
        ]
    }
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"✓ Configuração: {config_file}")


def criar_bd_catalogo():
    """Cria base de dados do catálogo partilhado."""
    db_path = os.path.join(SHARED_DIR, 'catalog.db')
    bd = sqlite3.connect(db_path)
    
    # Tabelas do catálogo
    bd.execute('''CREATE TABLE IF NOT EXISTS catalog_columns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT, reference TEXT, pack TEXT DEFAULT 'BAREBONE',
        column_type TEXT, fixing TEXT, height_m REAL, arm_count INTEGER DEFAULT 0,
        arm_street INTEGER DEFAULT 0, arm_sidewalk INTEGER DEFAULT 0,
        luminaire_included TEXT DEFAULT 'Não',
        mod1_luminaire TEXT DEFAULT 'Não', mod2_electrical TEXT DEFAULT 'Não',
        mod3_fuse_box TEXT DEFAULT 'Não', mod4_telemetry TEXT DEFAULT 'Não',
        mod5_ev TEXT DEFAULT 'Não', mod6_mupi TEXT DEFAULT 'Não',
        mod7_lateral TEXT DEFAULT 'Sim', mod8_antenna TEXT DEFAULT 'Sim'
    )''')
    
    bd.execute('''CREATE TABLE IF NOT EXISTS catalog_luminaires (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        luminaire_type TEXT, description TEXT, reference TEXT,
        manufacturer_ref TEXT, column_height_m REAL,
        type_1 INTEGER DEFAULT 0, type_2 INTEGER DEFAULT 0
    )''')
    
    bd.execute('''CREATE TABLE IF NOT EXISTS catalog_electrical_panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        panel_type TEXT, description TEXT, reference TEXT, short_reference TEXT
    )''')
    
    bd.execute('''CREATE TABLE IF NOT EXISTS catalog_fuse_boxes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fuse_type TEXT, description TEXT, reference TEXT, short_reference TEXT,
        type_s INTEGER DEFAULT 0, type_d INTEGER DEFAULT 0
    )''')
    
    bd.execute('''CREATE TABLE IF NOT EXISTS catalog_telemetry_panels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        panel_type TEXT, description TEXT, reference TEXT, short_reference TEXT
    )''')
    
    bd.execute('''CREATE TABLE IF NOT EXISTS catalog_module_ev (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_type TEXT, description TEXT, reference TEXT, short_reference TEXT
    )''')
    
    bd.execute('''CREATE TABLE IF NOT EXISTS catalog_module_mupi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_type TEXT, description TEXT, reference TEXT, short_reference TEXT
    )''')
    
    bd.execute('''CREATE TABLE IF NOT EXISTS catalog_module_lateral (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_type TEXT, description TEXT, reference TEXT, short_reference TEXT
    )''')
    
    bd.execute('''CREATE TABLE IF NOT EXISTS catalog_module_antenna (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_type TEXT, description TEXT, reference TEXT, short_reference TEXT,
        column_height_m REAL
    )''')
    
    bd.commit()
    bd.close()
    print(f"✓ Catálogo: {db_path}")


def criar_bd_tenant(tenant_id):
    """Cria base de dados de um tenant."""
    tenant_dir = os.path.join(TENANTS_DIR, tenant_id)
    os.makedirs(tenant_dir, exist_ok=True)
    
    db_path = os.path.join(tenant_dir, 'database.db')
    bd = sqlite3.connect(db_path)
    
    # Tabela de utilizadores
    bd.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        first_name TEXT,
        last_name TEXT,
        phone TEXT,
        two_factor_enabled INTEGER DEFAULT 0,
        two_factor_method TEXT DEFAULT 'email',
        must_change_password INTEGER DEFAULT 0,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        created_by INTEGER
    )''')
    
    # Tabela de sessões
    bd.execute('''CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')
    
    # Tabela de códigos 2FA
    bd.execute('''CREATE TABLE IF NOT EXISTS two_factor_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )''')
    
    # Tabela de schema
    bd.execute('''CREATE TABLE IF NOT EXISTS schema_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        field_name TEXT UNIQUE NOT NULL,
        field_type TEXT NOT NULL,
        field_label TEXT NOT NULL,
        required INTEGER DEFAULT 0,
        field_order INTEGER DEFAULT 0,
        field_category TEXT DEFAULT 'general',
        field_options TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Tabela de ativos
    bd.execute('''CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serial_number TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        updated_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (updated_by) REFERENCES users(id)
    )''')
    
    # Tabela de dados de ativos
    bd.execute('''CREATE TABLE IF NOT EXISTS asset_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        field_name TEXT NOT NULL,
        field_value TEXT,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        UNIQUE(asset_id, field_name)
    )''')
    
    # Tabela de manutenção
    bd.execute('''CREATE TABLE IF NOT EXISTS maintenance_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        description TEXT,
        performed_by INTEGER,
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        FOREIGN KEY (performed_by) REFERENCES users(id)
    )''')
    
    # Tabela de auditoria
    bd.execute('''CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        table_name TEXT,
        record_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    
    # Tabela de configurações
    bd.execute('''CREATE TABLE IF NOT EXISTS system_config (
        config_key TEXT PRIMARY KEY,
        config_value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Tabela de contadores
    bd.execute('''CREATE TABLE IF NOT EXISTS sequence_counters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        counter_type TEXT UNIQUE NOT NULL,
        current_value INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Tabela de intervenções
    bd.execute('''CREATE TABLE IF NOT EXISTS interventions (
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
    )''')
    
    # Tabela de histórico de estado
    bd.execute('''CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        description TEXT,
        changed_by INTEGER NOT NULL,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users(id)
    )''')
    
    # Tabela de permissões
    bd.execute('''CREATE TABLE IF NOT EXISTS user_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        section TEXT NOT NULL,
        field_name TEXT,
        can_view INTEGER DEFAULT 1,
        can_create INTEGER DEFAULT 0,
        can_edit INTEGER DEFAULT 0,
        can_delete INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, section, field_name)
    )''')
    
    # Tabela de técnicos externos
    bd.execute('''CREATE TABLE IF NOT EXISTS external_technicians (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        notes TEXT,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        FOREIGN KEY (created_by) REFERENCES users(id)
    )''')
    
    # Tabela de técnicos atribuídos a intervenções
    bd.execute('''CREATE TABLE IF NOT EXISTS intervention_technicians (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        intervention_id INTEGER NOT NULL,
        user_id INTEGER,
        external_technician_id INTEGER,
        role TEXT DEFAULT 'participante',
        FOREIGN KEY (intervention_id) REFERENCES interventions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (external_technician_id) REFERENCES external_technicians(id)
    )''')
    
    # Tabela de ficheiros de intervenções
    bd.execute('''CREATE TABLE IF NOT EXISTS intervention_files (
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
    )''')
    
    bd.commit()
    
    # Adicionar campos padrão ao schema
    campos_predefinidos = [
        ('product_reference', 'text', 'Referência do Produto', 1, 1, 'identification', None),
        ('status', 'select', 'Estado', 1, 2, 'identification', 'Operacional,Manutenção,Avariado,Desativado'),
        ('municipality', 'text', 'Município', 0, 3, 'installation', None),
        ('parish', 'text', 'Freguesia', 0, 4, 'installation', None),
        ('address', 'text', 'Morada', 0, 5, 'installation', None),
        ('gps_latitude', 'number', 'Latitude GPS', 0, 6, 'installation', None),
        ('gps_longitude', 'number', 'Longitude GPS', 0, 7, 'installation', None),
        ('installation_date', 'date', 'Data de Instalação', 0, 8, 'installation', None),
        ('height_meters', 'number', 'Altura (metros)', 0, 9, 'specifications', None),
        ('luminaire_type', 'text', 'Tipo de Luminária', 0, 10, 'specifications', None),
        ('power_watts', 'number', 'Potência (W)', 0, 11, 'specifications', None),
        ('associated_equipment', 'textarea', 'Equipamento Associado', 0, 12, 'equipment', None),
        ('warranty_start', 'date', 'Início Garantia', 0, 13, 'warranty', None),
        ('warranty_end', 'date', 'Fim Garantia', 0, 14, 'warranty', None),
        ('warranty_provider', 'text', 'Fornecedor Garantia', 0, 15, 'warranty', None),
        ('notes', 'textarea', 'Observações', 0, 16, 'other', None),
    ]
    for campo in campos_predefinidos:
        bd.execute('''INSERT OR IGNORE INTO schema_fields 
            (field_name, field_type, field_label, required, field_order, field_category, field_options)
            VALUES (?, ?, ?, ?, ?, ?, ?)''', campo)
    
    # Inicializar contadores de sequência
    contadores = ['assets', 'int_preventiva', 'int_corretiva', 'int_substituicao', 'int_inspecao']
    for contador in contadores:
        bd.execute('''INSERT OR IGNORE INTO sequence_counters (counter_type, current_value)
            VALUES (?, 0)''', (contador,))
    
    # Configurações de prefixos
    configs_prefixos = [
        ('prefix_assets', 'SLP', 'Prefixo para números de série de ativos'),
        ('prefix_assets_digits', '9', 'Número de dígitos para numeração de ativos'),
        ('prefix_int_preventiva', 'INTP', 'Prefixo para intervenções preventivas'),
        ('prefix_int_corretiva', 'INTC', 'Prefixo para intervenções corretivas'),
        ('prefix_int_substituicao', 'INTS', 'Prefixo para intervenções de substituição'),
        ('prefix_int_inspecao', 'INSP', 'Prefixo para intervenções de inspeção'),
        ('prefix_int_digits', '9', 'Número de dígitos para numeração de intervenções'),
    ]
    for config_key, config_value, description in configs_prefixos:
        bd.execute('''INSERT OR IGNORE INTO system_config (config_key, config_value, description)
            VALUES (?, ?, ?)''', (config_key, config_value, description))
    
    # Criar superadmin (must_change_password=1 forces secure password on first login)
    hash_pwd = generate_password_hash('admin123', method='pbkdf2:sha256')
    bd.execute('''INSERT OR IGNORE INTO users
        (email, password_hash, role, first_name, active, must_change_password)
        VALUES (?, ?, 'superadmin', 'Administrador', 1, 1)
    ''', ('admin@smartlamppost.com', hash_pwd))
    
    bd.commit()
    bd.close()
    print(f"✓ Tenant: {tenant_id} ({db_path})")


def main():
    print("=" * 60)
    print("SmartLamppost v4.0 - Inicialização do Sistema")
    print("=" * 60)
    print()
    
    # Verificar se deve resetar
    if '--reset' in sys.argv:
        print("⚠️  ATENÇÃO: Isto irá apagar todos os dados!")
        resposta = input("Tem a certeza? (sim/não): ")
        if resposta.lower() != 'sim':
            print("Operação cancelada.")
            return
        
        # Apagar diretórios existentes
        for d in [TENANTS_DIR, SHARED_DIR]:
            if os.path.exists(d):
                shutil.rmtree(d)
                print(f"✗ Removido: {d}")
    
    print("\n1. A criar estrutura de diretórios...")
    criar_diretorios()
    
    print("\n2. A criar configuração de tenants...")
    criar_config_tenants()
    
    print("\n3. A criar base de dados do catálogo...")
    criar_bd_catalogo()
    
    print("\n4. A criar base de dados do tenant principal...")
    criar_bd_tenant(MASTER_TENANT_ID)
    
    print("\n" + "=" * 60)
    print("✅ Sistema inicializado com sucesso!")
    print("=" * 60)
    print()
    print("Credenciais de acesso:")
    print(f"  Email:    admin@smartlamppost.com")
    print(f"  Password: admin123")
    print(f"  Role:     superadmin")
    print()
    print("Para iniciar o servidor:")
    print("  python3 app.py")
    print()
    print("Para resetar o sistema (apagar todos os dados):")
    print("  python3 init_system.py --reset")
    print()


if __name__ == '__main__':
    main()
