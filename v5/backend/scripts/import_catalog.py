#!/usr/bin/env python3
"""
SmartLamppost v5.0 - Catalog Import Script
Imports catalog data from CATALOGO-01.xlsx into catalog.db
"""

import os
import sys
import sqlite3
import pandas as pd
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def import_catalog(excel_path: str, db_path: str, clear_existing: bool = False):
    """
    Import catalog data from Excel file.

    Args:
        excel_path: Path to CATALOGO-01.xlsx
        db_path: Path to catalog.db
        clear_existing: If True, clear existing data before import
    """

    # Read Excel file
    print(f"Reading Excel file: {excel_path}")
    df = pd.read_excel(excel_path)

    # Skip the header row (row 0 is a duplicate header)
    df = df.iloc[1:]

    # Rename columns to match expected structure
    column_mapping = {
        'Descrição': 'description',
        'Referência Coluna': 'reference',
        'Leitura da referência da coluna Smartlamppost': 'pack',
        'Unnamed: 3': 'column_type',
        'Unnamed: 4': 'fixing',
        'Unnamed: 5': 'height_m',
        'Unnamed: 6': 'arm_count',
        'Unnamed: 7': 'arm_street',
        'Unnamed: 8': 'arm_sidewalk',
        'Unnamed: 9': 'luminaire_included',
        'Módulo da coluna Smartlamppost': 'mod1_luminaire',
        'Unnamed: 11': 'mod2_electrical',
        'Unnamed: 12': 'mod3_fuse_box',
        'Unnamed: 13': 'mod4_telemetry',
        'Unnamed: 14': 'mod5_ev',
        'Unnamed: 15': 'mod6_mupi',
        'Unnamed: 16': 'mod7_lateral',
        'Unnamed: 17': 'mod8_antenna'
    }

    df = df.rename(columns=column_mapping)

    # Filter only expected columns
    expected_cols = list(column_mapping.values())
    df = df[[col for col in expected_cols if col in df.columns]]

    # Clean data
    df['height_m'] = pd.to_numeric(df['height_m'], errors='coerce').fillna(0).astype(int)
    df['arm_count'] = pd.to_numeric(df['arm_count'], errors='coerce').fillna(0).astype(int)
    df['arm_street'] = pd.to_numeric(df['arm_street'], errors='coerce').fillna(0).astype(int)
    df['arm_sidewalk'] = pd.to_numeric(df['arm_sidewalk'], errors='coerce').fillna(0).astype(int)

    # Filter valid rows (must have reference)
    df = df[df['reference'].notna() & (df['reference'] != '')]

    print(f"Found {len(df)} valid catalog entries")

    # Connect to database
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Ensure table exists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS catalog_columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT,
            reference TEXT UNIQUE NOT NULL,
            pack TEXT NOT NULL,
            column_type TEXT DEFAULT 'Standard',
            fixing TEXT DEFAULT 'Flange',
            height_m INTEGER,
            arm_count INTEGER DEFAULT 0,
            arm_street INTEGER DEFAULT 0,
            arm_sidewalk INTEGER DEFAULT 0,
            luminaire_included TEXT DEFAULT 'Não',
            mod1_luminaire TEXT DEFAULT 'Não',
            mod2_electrical TEXT DEFAULT 'Não',
            mod3_fuse_box TEXT DEFAULT 'Não',
            mod4_telemetry TEXT DEFAULT 'Não',
            mod5_ev TEXT DEFAULT 'Não',
            mod6_mupi TEXT DEFAULT 'Não',
            mod7_lateral TEXT DEFAULT 'Sim',
            mod8_antenna TEXT DEFAULT 'Sim'
        )
    ''')

    if clear_existing:
        print("Clearing existing catalog data...")
        cursor.execute('DELETE FROM catalog_columns')

    # Import data
    imported = 0
    updated = 0
    errors = 0

    for idx, row in df.iterrows():
        try:
            # Check if reference already exists
            cursor.execute('SELECT id FROM catalog_columns WHERE reference = ?', (row['reference'],))
            existing = cursor.fetchone()

            if existing:
                # Update existing
                cursor.execute('''
                    UPDATE catalog_columns SET
                        description = ?,
                        pack = ?,
                        column_type = ?,
                        fixing = ?,
                        height_m = ?,
                        arm_count = ?,
                        arm_street = ?,
                        arm_sidewalk = ?,
                        luminaire_included = ?,
                        mod1_luminaire = ?,
                        mod2_electrical = ?,
                        mod3_fuse_box = ?,
                        mod4_telemetry = ?,
                        mod5_ev = ?,
                        mod6_mupi = ?,
                        mod7_lateral = ?,
                        mod8_antenna = ?
                    WHERE reference = ?
                ''', (
                    row.get('description', ''),
                    row.get('pack', 'BAREBONE'),
                    row.get('column_type', 'Standard'),
                    row.get('fixing', 'Flange'),
                    row.get('height_m', 0),
                    row.get('arm_count', 0),
                    row.get('arm_street', 0),
                    row.get('arm_sidewalk', 0),
                    row.get('luminaire_included', 'Não'),
                    row.get('mod1_luminaire', 'Não'),
                    row.get('mod2_electrical', 'Não'),
                    row.get('mod3_fuse_box', 'Não'),
                    row.get('mod4_telemetry', 'Não'),
                    row.get('mod5_ev', 'Não'),
                    row.get('mod6_mupi', 'Não'),
                    row.get('mod7_lateral', 'Sim'),
                    row.get('mod8_antenna', 'Sim'),
                    row['reference']
                ))
                updated += 1
            else:
                # Insert new
                cursor.execute('''
                    INSERT INTO catalog_columns (
                        description, reference, pack, column_type, fixing, height_m,
                        arm_count, arm_street, arm_sidewalk, luminaire_included,
                        mod1_luminaire, mod2_electrical, mod3_fuse_box, mod4_telemetry,
                        mod5_ev, mod6_mupi, mod7_lateral, mod8_antenna
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    row.get('description', ''),
                    row['reference'],
                    row.get('pack', 'BAREBONE'),
                    row.get('column_type', 'Standard'),
                    row.get('fixing', 'Flange'),
                    row.get('height_m', 0),
                    row.get('arm_count', 0),
                    row.get('arm_street', 0),
                    row.get('arm_sidewalk', 0),
                    row.get('luminaire_included', 'Não'),
                    row.get('mod1_luminaire', 'Não'),
                    row.get('mod2_electrical', 'Não'),
                    row.get('mod3_fuse_box', 'Não'),
                    row.get('mod4_telemetry', 'Não'),
                    row.get('mod5_ev', 'Não'),
                    row.get('mod6_mupi', 'Não'),
                    row.get('mod7_lateral', 'Sim'),
                    row.get('mod8_antenna', 'Sim')
                ))
                imported += 1

        except Exception as e:
            print(f"Error importing row {idx}: {e}")
            errors += 1

    conn.commit()
    conn.close()

    print(f"\n=== Import Summary ===")
    print(f"New entries imported: {imported}")
    print(f"Entries updated: {updated}")
    print(f"Errors: {errors}")
    print(f"Total processed: {imported + updated + errors}")

    return {
        'imported': imported,
        'updated': updated,
        'errors': errors
    }


def main():
    """Main entry point for command line usage."""
    import argparse

    parser = argparse.ArgumentParser(description='Import catalog from Excel')
    parser.add_argument('excel_path', help='Path to CATALOGO-01.xlsx')
    parser.add_argument('--db', default=None, help='Path to catalog.db (auto-detected if not specified)')
    parser.add_argument('--clear', action='store_true', help='Clear existing data before import')

    args = parser.parse_args()

    # Auto-detect database path
    if args.db is None:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(script_dir)
        v5_dir = os.path.dirname(backend_dir)
        db_path = os.path.join(v5_dir, 'data', 'shared', 'catalog.db')
    else:
        db_path = args.db

    # Check files exist
    if not os.path.exists(args.excel_path):
        print(f"Error: Excel file not found: {args.excel_path}")
        sys.exit(1)

    # Create data directory if needed
    db_dir = os.path.dirname(db_path)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)
        print(f"Created directory: {db_dir}")

    # Run import
    result = import_catalog(args.excel_path, db_path, args.clear)

    if result['errors'] > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
