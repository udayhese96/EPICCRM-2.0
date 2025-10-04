#!/usr/bin/env python3

import os
import sys
sys.path.append('backend')

from backend.fastapi_app.database import supabase

def check_leads():
    print("=== Checking leads in database ===")
    
    # Get all leads
    response = supabase.table('lead_master').select('*').execute()
    print(f"Total leads in database: {len(response.data or [])}")
    
    if response.data:
        print("\nAll leads:")
        for i, lead in enumerate(response.data):
            print(f"{i+1}. {lead.get('customer_name', 'Unknown')} - {lead.get('source', 'Unknown')} - {lead.get('branch', 'Unknown')} - {lead.get('created_at', 'Unknown')}")
    
    # Get leads for Mount Road branch
    mount_road_response = supabase.table('lead_master').select('*').eq('branch', 'Mount Road').execute()
    print(f"\nMount Road leads: {len(mount_road_response.data or [])}")
    
    if mount_road_response.data:
        print("\nMount Road leads:")
        for i, lead in enumerate(mount_road_response.data):
            print(f"{i+1}. {lead.get('customer_name', 'Unknown')} - {lead.get('source', 'Unknown')} - {lead.get('created_at', 'Unknown')}")
    
    # Get Walk-in and Digital leads for Mount Road
    walkin_digital_response = supabase.table('lead_master').select('*').eq('branch', 'Mount Road').in_('source', ['Walk-in', 'Digital']).execute()
    print(f"\nMount Road Walk-in/Digital leads: {len(walkin_digital_response.data or [])}")
    
    if walkin_digital_response.data:
        print("\nMount Road Walk-in/Digital leads:")
        for i, lead in enumerate(walkin_digital_response.data):
            print(f"{i+1}. {lead.get('customer_name', 'Unknown')} - {lead.get('source', 'Unknown')} - {lead.get('created_at', 'Unknown')}")

if __name__ == "__main__":
    check_leads()
