#!/usr/bin/env python3
"""
Script to add follow-up columns to lead_master table
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection
DB_URL = "postgresql://postgres.raticwohyvxcyoqzqnwj:EpicCrm2024@aws-0-ap-south-1.pooler.supabase.com:6543/postgres"

def add_followup_columns():
    """Add follow-up columns to lead_master table"""
    
    sql_commands = [
        # Add second call columns (F1 - First Follow-up)
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS second_call_remark TEXT",
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS second_call_date TIMESTAMP WITH TIME ZONE",
        
        # Add third call columns (F2 - Second Follow-up)
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS third_call_remark TEXT",
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS third_call_date TIMESTAMP WITH TIME ZONE",
        
        # Add fourth call columns (F3 - Third Follow-up)
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS fourth_call_remark TEXT",
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS fourth_call_date TIMESTAMP WITH TIME ZONE",
        
        # Add fifth call columns (F4 - Fourth Follow-up)
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS fifth_call_remark TEXT",
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS fifth_call_date TIMESTAMP WITH TIME ZONE",
        
        # Add sixth call columns (F5 - Fifth Follow-up)
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS sixth_call_remark TEXT",
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS sixth_call_date TIMESTAMP WITH TIME ZONE",
        
        # Add seventh call columns (F6 - Sixth Follow-up)
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS seventh_call_remark TEXT",
        "ALTER TABLE lead_master ADD COLUMN IF NOT EXISTS seventh_call_date TIMESTAMP WITH TIME ZONE",
        
        # Add comments
        "COMMENT ON COLUMN lead_master.second_call_remark IS 'F1 - First follow-up remark'",
        "COMMENT ON COLUMN lead_master.second_call_date IS 'F1 - First follow-up date'",
        "COMMENT ON COLUMN lead_master.third_call_remark IS 'F2 - Second follow-up remark'",
        "COMMENT ON COLUMN lead_master.third_call_date IS 'F2 - Second follow-up date'",
        "COMMENT ON COLUMN lead_master.fourth_call_remark IS 'F3 - Third follow-up remark'",
        "COMMENT ON COLUMN lead_master.fourth_call_date IS 'F3 - Third follow-up date'",
        "COMMENT ON COLUMN lead_master.fifth_call_remark IS 'F4 - Fourth follow-up remark'",
        "COMMENT ON COLUMN lead_master.fifth_call_date IS 'F4 - Fourth follow-up date'",
        "COMMENT ON COLUMN lead_master.sixth_call_remark IS 'F5 - Fifth follow-up remark'",
        "COMMENT ON COLUMN lead_master.sixth_call_date IS 'F5 - Fifth follow-up date'",
        "COMMENT ON COLUMN lead_master.seventh_call_remark IS 'F6 - Sixth follow-up remark'",
        "COMMENT ON COLUMN lead_master.seventh_call_date IS 'F6 - Sixth follow-up date'",
    ]
    
    try:
        print("🔌 Connecting to database...")
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        print("📝 Adding follow-up columns to lead_master table...")
        
        for i, sql in enumerate(sql_commands, 1):
            print(f"  [{i:2d}/{len(sql_commands)}] {sql[:50]}...")
            cursor.execute(sql)
        
        conn.commit()
        print("✅ All columns added successfully!")
        
        # Verify the columns were added
        print("\n🔍 Verifying columns...")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'lead_master' 
            AND column_name LIKE '%call_%'
            ORDER BY column_name
        """)
        
        columns = cursor.fetchall()
        print(f"Found {len(columns)} call-related columns:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]})")
        
        cursor.close()
        conn.close()
        print("\n🎉 Database update completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = add_followup_columns()
    if success:
        print("\n✅ Ready to test follow-up functionality!")
    else:
        print("\n❌ Failed to add columns. Please check the error above.")
