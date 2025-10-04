#!/usr/bin/env python3

import os
import sys
sys.path.append('backend')

# Set environment variables
os.environ['SUPABASE_URL'] = 'https://qjqjqjqjqjqjqjqjqjqj.supabase.co'
os.environ['SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcWpxanFqcWpxanFqcWpxanFqcWoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNzQ5NzYwMCwiZXhwIjoyMDUzMDczNjAwfQ.example'

from supabase import create_client, Client

def cleanup_leads():
    print("=== Cleaning up test leads ===")
    
    # Initialize Supabase client
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    supabase: Client = create_client(url, key)
    
    # Get all leads for Mount Road
    response = supabase.table('lead_master').select('*').eq('branch', 'Mount Road').execute()
    print(f"Found {len(response.data or [])} leads for Mount Road")
    
    if response.data:
        print("\nMount Road leads:")
        for i, lead in enumerate(response.data):
            print(f"{i+1}. {lead.get('customer_name', 'Unknown')} - {lead.get('source', 'Unknown')} - {lead.get('created_at', 'Unknown')}")
        
        # Delete all Mount Road leads
        print(f"\nDeleting {len(response.data)} leads...")
        delete_response = supabase.table('lead_master').delete().eq('branch', 'Mount Road').execute()
        print(f"Deleted {len(delete_response.data or [])} leads")
    
    # Also clean up ps_followup_master
    ps_response = supabase.table('ps_followup_master').select('*').eq('ps_branch', 'Mount Road').execute()
    print(f"\nFound {len(ps_response.data or [])} PS followup records for Mount Road")
    
    if ps_response.data:
        print(f"Deleting {len(ps_response.data)} PS followup records...")
        ps_delete_response = supabase.table('ps_followup_master').delete().eq('ps_branch', 'Mount Road').execute()
        print(f"Deleted {len(ps_delete_response.data or [])} PS followup records")

if __name__ == "__main__":
    cleanup_leads()
