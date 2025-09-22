"""
EPIC CRM 2.0 - Lead Background Worker
Processes lead operations in background for ultra-fast UI
"""

import logging
from datetime import datetime
from typing import Dict, Any
from .database import get_supabase_client
from .redis_cache import cache, invalidate_on_lead_change

logger = logging.getLogger(__name__)

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
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
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
    """Update lead in background with follow-up logic"""
    try:
        supabase = get_supabase_client()
        lead_id = data.get('lead_id')
        update_data = data.get('update_data', {})
        user_info = data.get('user_info', {})
        
        if not lead_id:
            return {'success': False, 'message': 'Lead ID is required'}
        
        # Handle follow-up date logic
        if 'follow_up_date' in update_data:
            fud = (update_data.get('follow_up_date') or "").strip()
            if fud:
                # If client sent only a date (YYYY-MM-DD), add current time
                if len(fud) == 10 and fud.count('-') == 2 and 'T' not in fud:
                    current_time = datetime.now().isoformat().split('T')[1]
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
        logger.info(f"Lead {lead_id}: Checking follow-up logic. followup_note in update_data: {'followup_note' in update_data}")
        if 'followup_note' in update_data:
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
                        update_data[next_call_date] = datetime.now().isoformat()
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
                        update_data["sixth_call_date"] = datetime.now().isoformat()
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
                    next_followup = datetime.now() + timedelta(days=2)
                    update_data['follow_up_date'] = next_followup.isoformat()
                    logger.info(f"Lead {lead_id}: Auto-set next follow-up date for '{call_status}' status")
        
        # Add metadata - use correct column names for lead_master table
        update_data.update({
            'updated_at': datetime.now().isoformat()
            # No updated_by column in lead_master
        })
        
        # Update lead_master table
        response = supabase.table('lead_master').update(update_data).eq('uid', lead_id).execute()
        
        if response.data:
            # Invalidate cache
            invalidate_on_lead_change(lead_id, 'update')
            
            logger.info(f"Lead updated successfully: {lead_id}")
            return {
                'success': True,
                'lead_id': lead_id,
                'message': 'Lead updated successfully'
            }
        else:
            return {'success': False, 'message': 'Lead not found or update failed'}
            
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
            'updated_at': datetime.now().isoformat()
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
        
        # Check if already qualified
        existing_qualified = supabase.table('qualified_leads').select('id').eq('lead_uid', lead_id).execute()
        if existing_qualified.data:
            return {'success': False, 'message': 'Lead already qualified'}
        
        current_time = datetime.now().isoformat()
        
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
            'updated_at': current_time
        }
        
        logger.info(f"Lead {lead_id} qualification: Using form data with model_interested='{form_data.get('model_interested')}', variant='{form_data.get('variant')}', first_remark='{form_data.get('first_remark')}'")
        
        qualified_response = supabase.table('qualified_leads').insert(qualified_lead_data).execute()
        
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
            # Use trade-in details from the request
            trade_in_make = trade_in_info.get('trade_in_make', '')
            trade_in_model = trade_in_info.get('trade_in_model', '')
            trade_in_year = trade_in_info.get('trade_in_year', '')
            trade_in_km = trade_in_info.get('trade_in_km', '')
            trade_in_ownership = trade_in_info.get('trade_in_ownership', '')
            
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
                tradein_response = supabase.table('trade_in_master').insert(trade_in_data).execute()
                logger.info(f"Trade-in data inserted successfully for lead {lead_id}: {tradein_response.data}")
            except Exception as e:
                logger.error(f"Failed to insert trade-in data for lead {lead_id}: {e}")
        else:
            logger.info(f"Lead {lead_id} has no trade-in (status: {trade_in_status})")
        
        # Invalidate cache
        invalidate_on_lead_change(lead_id, 'qualify')
        
        logger.info(f"Lead qualified successfully: {lead_id}")
        return {
            'success': True,
            'lead_id': lead_id,
            'qualified_lead_id': qualified_response.data[0].get('id') if qualified_response.data else None,
            'has_trade_in': str(lead_data.get('trade_in', '')).lower() == 'yes',
            'message': 'Lead qualified successfully'
        }
        
    except Exception as e:
        logger.error(f"Lead qualification failed: {e}")
        return {'success': False, 'message': str(e)}
