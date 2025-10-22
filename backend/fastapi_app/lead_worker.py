"""
EPIC CRM 2.0 - Lead Background Worker
Processes lead operations in background for ultra-fast UI
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any
from .database import get_supabase_client
from .redis_cache import cache, invalidate_on_lead_change

logger = logging.getLogger(__name__)

def now_ist_iso() -> str:
    """Get current IST time as ISO string"""
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    except ImportError:
        # Fallback for systems without zoneinfo
        return datetime.now(timezone.utc).replace(tzinfo=None).isoformat()

def process_lead_operation(job_data: Dict[str, Any], timeout: int = None) -> Dict[str, Any]:
    """Process lead operation in background"""
    try:
        operation = job_data.get('operation')
        data = job_data.get('data', {})
        
        logger.info(f"Processing lead operation: {operation}")
        
        if operation == 'create':
            return _create_lead(data)
        elif operation == 'update':
            return _update_lead(data)
        elif operation == 'delete':
            return _delete_lead(data)
        elif operation == 'bulk_update':
            return _bulk_update_leads(data)
        elif operation == 'qualify':
            return _qualify_lead(data)
        else:
            return {'success': False, 'message': f'Unknown operation: {operation}'}
            
    except Exception as e:
        logger.error(f"Lead operation failed: {e}")
        return {'success': False, 'message': str(e)}

def _create_lead(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create new lead in background"""
    try:
        supabase = get_supabase_client()
        lead_data = data.get('lead_data', {})
        user_info = data.get('user_info', {})
        
        # Add metadata - use correct column names for lead_master table
        lead_data.update({
            'created_at': now_ist_iso(),
            'updated_at': now_ist_iso()
            # No created_by column in lead_master
        })
        
        # Insert into lead_master table
        response = supabase.table('lead_master').insert(lead_data).execute()
        
        if response.data:
            lead_id = response.data[0].get('id')
            lead_uid = response.data[0].get('uid')
            
            # Invalidate cache
            invalidate_on_lead_change(lead_uid, 'create')
            
            logger.info(f"Lead created successfully: {lead_uid}")
            return {
                'success': True,
                'lead_id': lead_id,
                'lead_uid': lead_uid,
                'message': 'Lead created successfully'
            }
        else:
            return {'success': False, 'message': 'Failed to create lead'}
            
    except Exception as e:
        logger.error(f"Lead creation failed: {e}")
        return {'success': False, 'message': str(e)}

def _update_lead(data: Dict[str, Any]) -> Dict[str, Any]:
    """Sync qualified_leads and tradein_master after lead_master has been updated directly"""
    try:
        supabase = get_supabase_client()
        lead_id = data.get('lead_id')
        update_data = data.get('update_data', {})
        user_info = data.get('user_info', {})
        
        print(f"🔄 [Background Worker] STARTING _update_lead for lead: {lead_id}")
        print(f"🔄 [Background Worker] update_data received: {update_data}")
        print(f"🔄 [Background Worker] Syncing qualified_leads and tradein_master for lead: {lead_id}")
        print(f"🔄 [Background Worker] Lead_master already updated directly, syncing secondary tables...")
        
        if not lead_id:
            return {'success': False, 'message': 'Lead ID is required'}
        
        # Skip lead_master update since it's already done directly
        # Just sync qualified_leads and tradein_master
        
        # Handle follow-up date logic
        if 'follow_up_date' in update_data:
            fud = (update_data.get('follow_up_date') or "").strip()
            if fud:
                # If client sent only a date (YYYY-MM-DD), add current time
                if len(fud) == 10 and fud.count('-') == 2 and 'T' not in fud:
                    current_time = now_ist_iso().split('T')[1]
                    update_data["follow_up_date"] = f"{fud}T{current_time}"
                else:
                    update_data["follow_up_date"] = fud
        
        # CRITICAL: Prevent overwriting F1 (qualifying call) data
        # Check if this is a follow-up first (has followup_note)
        f1_remark_removed = False
        f1_date_removed = False
        
        # If this is a follow-up (has followup_note), block first_remark completely
        if 'followup_note' in update_data and update_data.get('followup_note'):
            logger.info(f"Lead {lead_id}: Detected follow-up operation with followup_note: '{update_data.get('followup_note')}'")
            
            # Block first_remark and first_call_date for follow-ups
            if 'first_remark' in update_data:
                logger.warning(f"Lead {lead_id}: Blocked attempt to overwrite F1 remark during follow-up. Original F1 remark preserved.")
                update_data.pop('first_remark', None)
                f1_remark_removed = True
            
            if 'first_call_date' in update_data:
                logger.warning(f"Lead {lead_id}: Blocked attempt to overwrite F1 date during follow-up. Original F1 date preserved.")
                update_data.pop('first_call_date', None)
                f1_date_removed = True
        else:
            # For qualification (no followup_note), allow first_remark but log it
            if 'first_remark' in update_data and update_data['first_remark'] is not None:
                logger.info(f"Lead {lead_id}: Processing first_remark for qualification: '{update_data['first_remark']}'")
            
            if 'first_call_date' in update_data and update_data['first_call_date'] is not None:
                logger.info(f"Lead {lead_id}: Processing first_call_date for qualification: '{update_data['first_call_date']}'")

        # Handle follow-up notes and call progression (F1, F2, F3, etc.)
        print(f"🔍 [Background Worker] Checking follow-up logic for lead: {lead_id}")
        print(f"🔍 [Background Worker] followup_note in update_data: {'followup_note' in update_data}")
        logger.info(f"Lead {lead_id}: Checking follow-up logic. followup_note in update_data: {'followup_note' in update_data}")
        if 'followup_note' in update_data:
            print(f"🔍 [Background Worker] followup_note value: '{update_data.get('followup_note')}'")
            logger.info(f"Lead {lead_id}: followup_note value: '{update_data.get('followup_note')}'")
        
        if 'followup_note' in update_data and update_data.get('followup_note'):
            note = update_data.get('followup_note', '').strip()
            logger.info(f"Lead {lead_id}: Processing followup_note: '{note}'")
            if note:
                # Get current lead data to determine which call we're on
                current_lead = supabase.table('lead_master').select('*').eq('uid', lead_id).execute()
                if current_lead.data:
                    lead_info = current_lead.data[0]
                    
                    # Call progression logic:
                    # Qualification = first_remark (qualifying call - PROTECTED, cannot be overwritten)
                    # F1 = second_remark (first follow-up)
                    # F2 = third_remark (second follow-up)
                    # F3 = fourth_remark (third follow-up)
                    # F4 = fifth_remark (fourth follow-up)
                    # F5 = sixth_remark (fifth follow-up)
                    
                    # Note: Using actual database column names from lead_master schema
                    call_sequence = [
                        ('second_remark', 'second_call_date'),       # F1 - First follow-up
                        ('third_remark', 'third_call_date'),         # F2 - Second follow-up
                        ('fourth_remark', 'fourth_call_date'),       # F3 - Third follow-up
                        ('fifth_remark', 'fifth_call_date'),         # F4 - Fourth follow-up
                        ('sixth_remark', 'sixth_call_date')          # F5 - Fifth follow-up
                    ]
                    
                    # Find the next empty call slot (start from F1, skip qualification as it's the first call)
                    next_call_remark = None
                    next_call_date = None
                    for remark_field, date_field in call_sequence:
                        if not lead_info.get(remark_field):
                            next_call_remark = remark_field
                            next_call_date = date_field
                            break
                    
                    if next_call_remark:
                        # Set the remark and date for this call
                        update_data[next_call_remark] = note
                        update_data[next_call_date] = now_ist_iso()
                        # Map column names to call numbers for logging
                        call_mapping = {
                            'second_remark': 'F1',
                            'third_remark': 'F2', 
                            'fourth_remark': 'F3',
                            'fifth_remark': 'F4',
                            'sixth_remark': 'F5'
                        }
                        call_number = call_mapping.get(next_call_remark, next_call_remark)
                        logger.info(f"Lead {lead_id}: Set {next_call_remark} = '{note}' (Follow-up {call_number})")
                    else:
                        # All follow-up slots filled, append to last remark
                        update_data["sixth_remark"] = f"{lead_info.get('sixth_remark', '')} | {note}".strip()
                        update_data["sixth_call_date"] = now_ist_iso()
                        logger.info(f"Lead {lead_id}: All follow-up slots full, appended to sixth_remark")
                
                # Remove followup_note as it's not a column in lead_master
                update_data.pop('followup_note', None)
        
        # Handle automatic next follow-up date based on call status
        if 'call_status' in update_data or 'lead_status' in update_data:
            call_status = update_data.get('call_status', '') or update_data.get('lead_status', '')
            if call_status and call_status.lower() in ['call me back', 'pending']:
                # If no follow_up_date provided, set next follow-up date
                if 'follow_up_date' not in update_data or not update_data.get('follow_up_date'):
                    # Set follow-up date to next business day or 2 days from now
                    from datetime import timedelta
                    next_followup = datetime.now(ZoneInfo("Asia/Kolkata")) + timedelta(days=2)
                    update_data['follow_up_date'] = next_followup.isoformat()
                    logger.info(f"Lead {lead_id}: Auto-set next follow-up date for '{call_status}' status")
        
        # Update lead_master with processed followup data (if any followup processing occurred)
        print(f"🔍 [Background Worker] Checking if followup data needs to be saved to lead_master")
        print(f"🔍 [Background Worker] update_data keys: {list(update_data.keys())}")
        followup_keys = ['second_remark', 'third_remark', 'fourth_remark', 'fifth_remark', 'sixth_remark', 'second_call_date', 'third_call_date', 'fourth_call_date', 'fifth_call_date', 'sixth_call_date']
        has_followup_data = any(key in update_data for key in followup_keys)
        print(f"🔍 [Background Worker] Has followup data to save: {has_followup_data}")
        
        if update_data and has_followup_data:
            print(f"🔄 [Background Worker] Updating lead_master with processed followup data: {lead_id}")
            print(f"🔄 [Background Worker] Followup data to save: {[(k, v) for k, v in update_data.items() if k in followup_keys]}")
            logger.info(f"Lead {lead_id}: Updating lead_master with followup data: {list(update_data.keys())}")
            try:
                followup_update_response = supabase.table('lead_master').update(update_data).eq('uid', lead_id).execute()
                if followup_update_response.data:
                    print(f"✅ [Background Worker] Lead_master updated with followup data: {lead_id}")
                    logger.info(f"Lead {lead_id}: Successfully updated lead_master with followup data")
                else:
                    print(f"❌ [Background Worker] Failed to update lead_master with followup data: {lead_id}")
                    logger.error(f"Lead {lead_id}: Failed to update lead_master with followup data")
            except Exception as e:
                print(f"❌ [Background Worker] Error updating lead_master with followup data: {e}")
                logger.error(f"Lead {lead_id}: Error updating lead_master with followup data: {e}")
        else:
            print(f"ℹ️ [Background Worker] No followup data to save to lead_master for lead: {lead_id}")
        
        # Lead_master is already updated directly, now sync qualified_leads and tradein_master
        # Invalidate cache since lead_master was updated
        invalidate_on_lead_change(lead_id, 'update')

        # Check if this update qualifies the lead and sync to qualified_leads
        try:
            print(f"🔄 [Background Worker] Checking if lead should be synced to qualified_leads: {lead_id}")
            current_lead_resp = supabase.table('lead_master').select('*').eq('uid', lead_id).execute()
            if current_lead_resp.data:
                ld = current_lead_resp.data[0]
                lead_status_val = (ld.get('lead_status') or ld.get('status') or '').strip()
                final_status_val = (ld.get('final_status') or '').strip()
                first_remark_val = (ld.get('first_remark') or '').strip()
                
                print(f"🔄 [Background Worker] Lead status: {lead_status_val}, Final status: {final_status_val}, First remark: {first_remark_val[:50]}...")
                
                should_sync_qualified = (
                    (lead_status_val == 'Qualified')
                    or ('lead_status' in update_data and str(update_data.get('lead_status', '')).strip() == 'Qualified')
                )
                
                print(f"🔄 [Background Worker] Should sync to qualified_leads: {should_sync_qualified}")
                
                if should_sync_qualified:
                    print(f"✅ [Background Worker] Syncing lead to qualified_leads: {lead_id}")
                    logger.info(f"Lead {lead_id}: Syncing qualified_leads from update path")
                    # Build payload similar to qualification flow
                    now_ts = now_ist_iso()
                    q_data = {
                        'lead_uid': ld.get('uid'),
                        'customer_name': ld.get('customer_name', ''),
                        'customer_mobile_number': ld.get('customer_mobile_number', ''),
                        'customer_location': ld.get('customer_location', ''),
                        'source': ld.get('source', ''),
                        'sub_source': ld.get('sub_source', ''),
                        'cre_name': ld.get('cre_name', ''),
                        'lead_category': ld.get('lead_category', ''),
                        'model_interested': ld.get('model_interested', ''),
                        'first_remark': first_remark_val,
                        'variant': ld.get('variant', ''),
                        'buying_plan': ld.get('buying_plan', ''),
                        'finance_option': ld.get('finance_option', ''),
                        'profession': ld.get('profession', ''),
                        'test_drive_type': ld.get('test_drive_type', ''),
                        'trade_in': ld.get('trade_in', ''),
                        'branch': ld.get('branch', ''),
                        'ps_name': ld.get('ps_name', ''),
                        'updated_at': now_ts,
                        # Explicitly set booking/retail timestamps to null to override database defaults
                        'booking_requested_at': None,
                        'retailed_requested_at': None,
                        'booking_approved_timestamp': None,
                        'retailed_approved_timestamp': None,
                        'booking_approved_by': None,
                        'retailed_approved_by': None
                    }
                    # Insert or update depending on existence
                    existing_q = supabase.table('qualified_leads').select('id').eq('lead_uid', lead_id).execute()
                    if existing_q.data:
                        print(f"✅ [Background Worker] Updating existing qualified_leads row for lead: {lead_id}")
                        logger.info(f"Lead {lead_id}: Updating existing qualified_leads row with customer_location='{q_data.get('customer_location')}'")
                        supabase.table('qualified_leads').update(q_data).eq('lead_uid', lead_id).execute()
                    else:
                        print(f"✅ [Background Worker] Inserting new qualified_leads row for lead: {lead_id}")
                        logger.info(f"Lead {lead_id}: Inserting new qualified_leads row with customer_location='{q_data.get('customer_location')}'")
                        q_data['created_at'] = now_ts
                        supabase.table('qualified_leads').insert(q_data).execute()
                    
                    # IMPORTANT: Skip trade-in processing on generic update path.
                    # Trade-in insert/update is handled exclusively in the 'qualify' operation
                    print(f"ℹ️ [Background Worker] Skipping trade-in processing on update path for lead: {lead_id}")
                        
        except Exception as sync_err:
            logger.warning(f"Lead {lead_id}: Failed to sync qualified_leads on update: {sync_err}")
            print(f"❌ [Background Worker] Failed to sync qualified_leads: {sync_err}")
        
        print(f"✅ [Background Worker] Background sync completed: {lead_id}")
        logger.info(f"Background sync completed for lead: {lead_id}")
        return {
            'success': True,
            'lead_id': lead_id,
            'message': 'Background sync completed successfully'
        }
            
    except Exception as e:
        logger.error(f"Lead update failed: {e}")
        return {'success': False, 'message': str(e)}

def _delete_lead(data: Dict[str, Any]) -> Dict[str, Any]:
    """Delete lead in background"""
    try:
        supabase = get_supabase_client()
        lead_id = data.get('lead_id')
        
        if not lead_id:
            return {'success': False, 'message': 'Lead ID is required'}
        
        # Delete from lead_master table
        response = supabase.table('lead_master').delete().eq('uid', lead_id).execute()
        
        # Invalidate cache
        invalidate_on_lead_change(lead_id, 'delete')
        
        logger.info(f"Lead deleted successfully: {lead_id}")
        return {
            'success': True,
            'lead_id': lead_id,
            'message': 'Lead deleted successfully'
        }
        
    except Exception as e:
        logger.error(f"Lead deletion failed: {e}")
        return {'success': False, 'message': str(e)}

def _bulk_update_leads(data: Dict[str, Any]) -> Dict[str, Any]:
    """Bulk update leads in background"""
    try:
        supabase = get_supabase_client()
        lead_ids = data.get('lead_ids', [])
        update_data = data.get('update_data', {})
        user_info = data.get('user_info', {})
        
        if not lead_ids:
            return {'success': False, 'message': 'No lead IDs provided'}
        
        # Add metadata - use correct column names for lead_master table
        update_data.update({
            'updated_at': now_ist_iso()
            # No updated_by column in lead_master
        })
        
        updated_count = 0
        failed_count = 0
        
        # Update each lead
        for lead_id in lead_ids:
            try:
                response = supabase.table('lead_master').update(update_data).eq('uid', lead_id).execute()
                if response.data:
                    updated_count += 1
                    # Invalidate cache for each lead
                    invalidate_on_lead_change(lead_id, 'bulk_update')
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"Failed to update lead {lead_id}: {e}")
                failed_count += 1
        
        logger.info(f"Bulk update completed: {updated_count} updated, {failed_count} failed")
        return {
            'success': True,
            'updated_count': updated_count,
            'failed_count': failed_count,
            'total_count': len(lead_ids),
            'message': f'Bulk update completed: {updated_count}/{len(lead_ids)} leads updated'
        }
        
    except Exception as e:
        logger.error(f"Bulk update failed: {e}")
        return {'success': False, 'message': str(e)}

def _qualify_lead(data: Dict[str, Any]) -> Dict[str, Any]:
    """Qualify lead in background"""
    try:
        supabase = get_supabase_client()
        lead_id = data.get('lead_id')
        user_info = data.get('user_info', {})
        trade_in_info = data.get('trade_in_info', {})
        
        if not lead_id:
            return {'success': False, 'message': 'Lead ID is required'}
        
        # Get the lead from lead_master
        lead_response = supabase.table('lead_master').select('*').eq('uid', lead_id).execute()
        
        if not lead_response.data:
            return {'success': False, 'message': 'Lead not found'}
        
        lead_data = lead_response.data[0]
        
        # Check if already qualified - do not return early; we still want to process trade-in
        existing_qualified = supabase.table('qualified_leads').select('id').eq('lead_uid', lead_id).execute()
        already_qualified = bool(existing_qualified.data)
        
        current_time = now_ist_iso()
        
        # Update lead_master with F1 (qualifying call)
        form_data = data.get('form_data', {})
        lead_update_data = {
            'final_status': 'Pending',
            'first_remark': form_data.get('first_remark', '') or 'Lead qualified successfully',  # F1 - Qualifying call
            'first_call_date': current_time,  # F1 date
            'updated_at': current_time
        }
        supabase.table('lead_master').update(lead_update_data).eq('uid', lead_id).execute()
        
        # Create qualified lead entry using form data and original lead data
        qualified_lead_data = {
            'lead_uid': lead_data['uid'],
            'customer_name': lead_data.get('customer_name', ''),
            'customer_mobile_number': lead_data.get('customer_mobile_number', ''),
            'customer_location': lead_data.get('customer_location', ''),
            'source': lead_data.get('source', ''),
            'sub_source': lead_data.get('sub_source', ''),
            'cre_name': lead_data.get('cre_name', ''),
            'lead_category': form_data.get('lead_category') or lead_data.get('lead_category', ''),
            'model_interested': form_data.get('model_interested') or lead_data.get('model_interested', ''),
            'first_remark': form_data.get('first_remark') or lead_data.get('first_remark', ''),
            'variant': form_data.get('variant') or lead_data.get('variant', ''),
            'buying_plan': form_data.get('buying_plan') or lead_data.get('buying_plan', ''),
            'finance_option': form_data.get('finance_option') or lead_data.get('finance_option', ''),
            'profession': form_data.get('profession') or lead_data.get('profession', ''),
            'test_drive_type': form_data.get('test_drive_type') or lead_data.get('test_drive_type', ''),
            'trade_in': form_data.get('trade_in') or lead_data.get('trade_in', ''),
            'branch': lead_data.get('branch', ''),
            'created_at': current_time,
            'updated_at': current_time,
            # Explicitly set booking/retail timestamps to null to override database defaults
            'booking_requested_at': None,
            'retailed_requested_at': None,
            'booking_approved_timestamp': None,
            'retailed_approved_timestamp': None,
            'booking_approved_by': None,
            'retailed_approved_by': None
        }
        
        logger.info(f"Lead {lead_id} qualification: Using form data with model_interested='{form_data.get('model_interested')}', variant='{form_data.get('variant')}', first_remark='{form_data.get('first_remark')}'")
        
        qualified_response = None
        if not already_qualified:
            qualified_response = supabase.table('qualified_leads').insert(qualified_lead_data).execute()
        else:
            logger.info(f"Lead {lead_id} already qualified - skipping qualified_leads insert, proceeding with trade-in processing")
        
        # Check if trade-in is "yes" and insert into tradein_master table
        # Check trade_in_info from the request first, then fallback to lead_data
        trade_in_value = ''
        if trade_in_info and (trade_in_info.get('trade_in_make') or trade_in_info.get('trade_in_model')):
            # If trade_in_info has details, assume trade_in is "yes"
            trade_in_value = 'yes'
        else:
            # Fallback to checking form data, then lead data
            trade_in_value = form_data.get('trade_in') or lead_data.get('trade_in', '')
        
        trade_in_status = str(trade_in_value).lower() if trade_in_value else ''
        
        logger.info(f"Lead {lead_id} trade-in check: status='{trade_in_status}', trade_in_info={trade_in_info}")
        
        if trade_in_status == 'yes':
            # Use trade-in details from the request, fallback to lead_master values if empty
            trade_in_make = (trade_in_info.get('trade_in_make') or lead_data.get('trade_in_make', '') or '')
            trade_in_model = (trade_in_info.get('trade_in_model') or lead_data.get('trade_in_model', '') or '')
            trade_in_year = (trade_in_info.get('trade_in_year') or lead_data.get('trade_in_year', '') or '')
            trade_in_km = (trade_in_info.get('trade_in_km') or lead_data.get('trade_in_km', '') or '')
            trade_in_ownership = (trade_in_info.get('trade_in_ownership') or lead_data.get('trade_in_ownership', '') or '')
            
            logger.info(f"Lead {lead_id} has trade-in: {trade_in_make} {trade_in_model} ({trade_in_year})")
            
            # Insert trade-in details into tradein_master table
            trade_in_data = {
                'lead_uid': lead_data['uid'],
                'customer_name': lead_data.get('customer_name', ''),
                'customer_mobile_number': lead_data.get('customer_mobile_number', ''),
                'trade_in_make': trade_in_make,
                'trade_in_model': trade_in_model,
                'trade_in_year': trade_in_year,
                'trade_in_km': trade_in_km,
                'trade_in_ownership': trade_in_ownership,
                'created_at': current_time,
                'updated_at': current_time
            }
            
            try:
                # Upsert: insert if not exists, else update details
                existing_tradein = supabase.table('trade_in_master').select('id').eq('lead_uid', lead_id).execute()
                if existing_tradein.data:
                    supabase.table('trade_in_master').update(trade_in_data).eq('lead_uid', lead_id).execute()
                    logger.info(f"Trade-in data updated successfully for lead {lead_id}")
                else:
                    tradein_response = supabase.table('trade_in_master').insert(trade_in_data).execute()
                    logger.info(f"Trade-in data inserted successfully for lead {lead_id}: {tradein_response.data}")
            except Exception as e:
                logger.error(f"Failed to upsert trade-in data for lead {lead_id}: {e}")
        else:
            logger.info(f"Lead {lead_id} has no trade-in (status: {trade_in_status})")
        
        # Invalidate cache
        invalidate_on_lead_change(lead_id, 'qualify')
        
        logger.info(f"Lead qualified successfully: {lead_id}")
        return {
            'success': True,
            'lead_id': lead_id,
            'qualified_lead_id': (qualified_response.data[0].get('id') if qualified_response and qualified_response.data else None),
            'has_trade_in': str(lead_data.get('trade_in', '')).lower() == 'yes',
            'message': 'Lead qualified successfully'
        }
        
    except Exception as e:
        logger.error(f"Lead qualification failed: {e}")
        return {'success': False, 'message': str(e)}
