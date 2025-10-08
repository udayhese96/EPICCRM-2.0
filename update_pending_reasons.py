"""
Script to manually update pending_reasons for a lead
Usage: python update_pending_reasons.py
"""
import sys
sys.path.append('backend')
from fastapi_app.main import supabase

def update_lead_pending_reasons(lead_uid, pending_reasons_data):
    """
    Update pending_reasons for a specific lead
    
    Args:
        lead_uid: The UID of the lead (e.g., 'CD556536')
        pending_reasons_data: List of pending reason dictionaries
    """
    try:
        print(f'\n📝 Updating pending_reasons for lead: {lead_uid}')
        print(f'   Data: {pending_reasons_data}\n')
        
        # Update the lead
        response = supabase.table('lead_master').update({
            'pending_reasons': pending_reasons_data
        }).eq('uid', lead_uid).execute()
        
        if response.data:
            print('✅ Update successful!')
            
            # Verify the update
            verify = supabase.table('lead_master').select('uid, pending_reasons, cre_name, lead_status').eq('uid', lead_uid).execute()
            if verify.data:
                lead = verify.data[0]
                print(f'\n📊 Verified data:')
                print(f'   Lead UID: {lead["uid"]}')
                print(f'   CRE Name: {lead.get("cre_name", "N/A")}')
                print(f'   Lead Status: {lead.get("lead_status", "N/A")}')
                print(f'   Pending Reasons ({len(lead["pending_reasons"])} attempts):')
                for reason in lead['pending_reasons']:
                    print(f'      - Attempt #{reason.get("attempt")}: {reason.get("status")} - {reason.get("reason")}')
                    print(f'        User: {reason.get("user")}, Date: {reason.get("date")}')
        else:
            print('❌ Update failed - no data returned')
            
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    # Example 1: Single pending reason
    lead_uid = input("Enter Lead UID (e.g., CD556536): ").strip()
    user_name = input("Enter User Name (e.g., Priya): ").strip()
    reason_text = input("Enter Reason (e.g., Customer did not respond to call): ").strip()
    status = input("Enter Status (e.g., RNR): ").strip()
    
    pending_reasons = [
        {
            'date': '2025-10-08T14:55:19.246282+05:30',
            'user': user_name,
            'reason': reason_text,
            'status': status,
            'attempt': 1
        }
    ]
    
    update_lead_pending_reasons(lead_uid, pending_reasons)
    
    # Example 2: Multiple pending reasons (uncomment to use)
    # lead_uid = 'LD000576'
    # pending_reasons = [
    #     {
    #         'date': '2025-10-08T14:55:19.246282+05:30',
    #         'user': 'Sanjay',
    #         'reason': 'Customer did not respond to call',
    #         'status': 'RNR',
    #         'attempt': 1
    #     },
    #     {
    #         'date': '2025-10-08T15:01:20.516940+05:30',
    #         'user': 'Sanjay',
    #         'reason': 'Customer phone is on DND, will try again later',
    #         'status': 'DND',
    #         'attempt': 2
    #     },
    #     {
    #         'date': '2025-10-08T16:30:00.000000+05:30',
    #         'user': 'Sanjay',
    #         'reason': 'Customer requested call back tomorrow',
    #         'status': 'Call me back',
    #         'attempt': 3
    #     }
    # ]
    # 
    # update_lead_pending_reasons(lead_uid, pending_reasons)

