"""
EPIC CRM 2.0 - Lead Background Worker
Processes lead operations in background for ultra-fast UI
"""

import logging
import os
import time
import traceback
import concurrent.futures
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Callable, Tuple, Optional
from .database import get_supabase_client
from .redis_cache import cache, invalidate_on_lead_change
import json
import hashlib

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION CONSTANTS
# ============================================================================

# Batch processing
BATCH_SIZE = 50

# Thread pool configuration
BULK_UPDATE_WORKERS = int(os.getenv('BACKGROUND_WORKER_THREADS', '20'))

# Bulk operation limits
MAX_BULK_UPDATE_SIZE = 10000

# Idempotency configuration
IDEMPOTENCY_TTL_SECONDS = 86400  # 24 hours
IDEMPOTENCY_RESULT_TTL_SECONDS = 86400 * 7  # 7 days
LOCK_TIMEOUT_SECONDS = 3600  # 1 hour for processing lock

# Retry configuration
DEFAULT_MAX_RETRIES = 3
DEFAULT_RETRY_DELAY = 1.0
DEFAULT_RETRY_BACKOFF = 2.0


# ============================================================================
# IDEMPOTENCY HELPERS
# ============================================================================

def _get_idempotency_key(operation: str, lead_id: str, data: Dict[str, Any]) -> str:
    """Generate idempotency key for an operation"""
    # Create a stable key from operation and data
    # Handle edge case: data might not be dict or might have non-hashable values
    try:
        if isinstance(data, dict):
            # Convert all values to strings for consistent hashing
            safe_data = {k: str(v) for k, v in data.items()}
            data_hash = hashlib.md5(
                json.dumps(sorted(safe_data.items()), sort_keys=True).encode()
            ).hexdigest()[:16]
        else:
            # Fallback for non-dict data
            data_hash = hashlib.md5(str(data).encode()).hexdigest()[:16]
    except Exception:
        # Ultimate fallback
        data_hash = hashlib.md5(str(data).encode()).hexdigest()[:16]
    
    key_data = {
        'operation': operation,
        'lead_id': lead_id,
        'data_hash': data_hash
    }
    
    if operation == 'qualify':
        # Include first_remark for qualification to catch duplicate qualifications
        form_data = data.get('form_data', {}) if isinstance(data, dict) else {}
        first_remark = form_data.get('first_remark', '')[:50] if isinstance(form_data, dict) else ''
        key_data['first_remark'] = first_remark
    
    key_str = json.dumps(key_data, sort_keys=True)
    return f"idempotency:{operation}:{lead_id}:{hashlib.sha256(key_str.encode()).hexdigest()[:16]}"


def _check_idempotency(idempotency_key: str) -> Tuple[bool, Optional[str]]:
    """
    Check if operation was already processed (idempotency check)
    
    Returns:
        Tuple of (is_duplicate: bool, existing_result: Optional[str])
    """
    try:
        # Use Redis directly for atomic operations
        if cache.redis_client:
            existing = cache.redis_client.get(idempotency_key)
            if existing:
                return True, existing
        return False, None
    except Exception as e:
        logger.warning(f"Idempotency check failed: {e}. Proceeding with operation.")
        return False, None


def _set_idempotency_lock(idempotency_key: str) -> bool:
    """Set processing lock for idempotency (atomic SETNX)"""
    try:
        if cache.redis_client:
            # Use SETNX for atomic lock acquisition
            lock_key = f"{idempotency_key}:lock"
            return cache.redis_client.set(lock_key, 'processing', ex=LOCK_TIMEOUT_SECONDS, nx=True)
        return True  # Proceed if Redis unavailable
    except Exception as e:
        logger.warning(f"Idempotency lock failed: {e}. Proceeding with operation.")
        return True


def _set_idempotency_result(idempotency_key: str, result: Dict[str, Any]) -> None:
    """Mark operation as completed in idempotency cache"""
    try:
        if cache.redis_client:
            result_str = json.dumps(result, default=str)
            # Store result for 7 days
            cache.redis_client.setex(
                idempotency_key,
                IDEMPOTENCY_RESULT_TTL_SECONDS,
                result_str
            )
    except Exception as e:
        logger.warning(f"Failed to set idempotency result: {e}")


def retry_db_operation(
    operation: Callable,
    max_retries: int = None,
    delay: float = None,
    backoff: float = None
) -> Tuple[bool, Any, Optional[Exception]]:
    """
    Retry database operations with exponential backoff
    
    Args:
        operation: Function to execute (should return a tuple of (success, result))
        max_retries: Maximum number of retry attempts (defaults to DEFAULT_MAX_RETRIES)
        delay: Initial delay between retries in seconds (defaults to DEFAULT_RETRY_DELAY)
        backoff: Backoff multiplier for delay (defaults to DEFAULT_RETRY_BACKOFF)
    
    Returns:
        Tuple of (success: bool, result: Any, error: Optional[Exception])
    """
    max_retries = max_retries or DEFAULT_MAX_RETRIES
    delay = delay or DEFAULT_RETRY_DELAY
    backoff = backoff or DEFAULT_RETRY_BACKOFF
    
    last_error = None
    current_delay = delay
    
    for attempt in range(max_retries):
        try:
            success, result = operation()
            if success:
                return True, result, None
            # If operation returns False but no exception, don't retry
            return False, result, None
        except Exception as e:
            last_error = e
            if attempt < max_retries - 1:
                logger.warning(f"Database operation failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {current_delay}s...")
                time.sleep(current_delay)
                current_delay *= backoff
            else:
                logger.error(f"Database operation failed after {max_retries} attempts: {e}")
    
    return False, None, last_error


def execute_multi_table_operation(
    operations: list[Callable],
    rollback_operations: list[Callable] = None
) -> Tuple[bool, Dict[str, Any]]:
    """
    Execute multiple database operations with transaction-like safety
    
    Note: Supabase doesn't support true transactions via Python client,
    so we implement best-effort rollback using inverse operations
    
    NOTE: This function is currently not used in the codebase, but kept for potential
    future multi-table transaction needs. Individual operations now use retry_db_operation
    which provides better granular error handling.
    
    Args:
        operations: List of operations to execute (each returns (success, result))
        rollback_operations: Optional list of rollback operations (inverse of operations)
    
    Returns:
        Tuple of (success: bool, results: Dict[str, Any])
    """
    results = {}
    executed_operations = []
    
    try:
        for i, operation in enumerate(operations):
            success, result, error = retry_db_operation(operation)
            results[f'operation_{i}'] = {
                'success': success,
                'result': result,
                'error': str(error) if error else None
            }
            
            if not success:
                logger.error(f"Operation {i} failed: {error}")
                # Attempt rollback for all executed operations
                if rollback_operations and len(rollback_operations) >= i:
                    logger.warning(f"Attempting rollback for {len(executed_operations)} operations...")
                    for rollback_op in reversed(executed_operations):
                        try:
                            rollback_op()
                        except Exception as rollback_error:
                            logger.error(f"Rollback operation failed: {rollback_error}")
                
                return False, results
            
            executed_operations.append(rollback_operations[i] if rollback_operations and len(rollback_operations) > i else None)
        
        return True, results
        
    except Exception as e:
        logger.error(f"Multi-table operation failed: {e}")
        # Attempt rollback
        if rollback_operations:
            for rollback_op in reversed([op for op in executed_operations if op]):
                try:
                    rollback_op()
                except Exception as rollback_error:
                    logger.error(f"Rollback operation failed: {rollback_error}")
        
        return False, {'error': str(e)}

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
    """Create new lead in background with idempotency protection"""
    start_time = time.time()
    lead_data = data.get('lead_data', {})
    # Use mobile number for idempotency key if available (more stable than lead_id)
    mobile_number = lead_data.get('customer_mobile_number', '')
    idempotency_id = f"create_{mobile_number}" if mobile_number else None
    
    try:
        # Idempotency protection (using mobile number as stable identifier)
        if idempotency_id:
            idempotency_key = _get_idempotency_key('create', idempotency_id, data)
            is_duplicate, existing_result = _check_idempotency(idempotency_key)
            if is_duplicate:
                logger.warning(f"Lead creation already processed (idempotent) for mobile: {mobile_number}")
                try:
                    result = json.loads(existing_result)
                    result['idempotent'] = True
                    return result
                except:
                    return {'success': True, 'message': 'Already processed', 'idempotent': True}
        
        supabase = get_supabase_client()
        user_info = data.get('user_info', {})
        
        # Add metadata - use correct column names for lead_master table
        lead_data.update({
            'created_at': now_ist_iso(),
            'updated_at': now_ist_iso()
        })
        
        # Insert into lead_master table with retry
        def create_operation():
            response = supabase.table('lead_master').insert(lead_data).execute()
            return bool(response.data), response
        
        success, response, error = retry_db_operation(create_operation)
        if not success:
            error_response = {
                'success': False,
                'message': f'Failed to create lead: {str(error)}',
                'operation': 'create_lead',
                'timestamp': now_ist_iso(),
                'error_type': type(error).__name__ if error else 'DatabaseError',
                'duration_seconds': round(time.time() - start_time, 2)
            }
            if idempotency_id:
                idempotency_key = _get_idempotency_key('create', idempotency_id, data)
                _set_idempotency_result(idempotency_key, error_response)
            logger.error(f"Lead creation failed after retries: {error}")
            return error_response
        
        if response.data:
            lead_id_actual = response.data[0].get('id')
            lead_uid = response.data[0].get('uid')
            
            # Invalidate cache
            invalidate_on_lead_change(lead_uid, 'create')
            
            duration = time.time() - start_time
            result = {
                'success': True,
                'lead_id': lead_id_actual,
                'lead_uid': lead_uid,
                'duration_seconds': round(duration, 2),
                'message': 'Lead created successfully',
                'timestamp': now_ist_iso()
            }
            
            # Store idempotency result
            if idempotency_id:
                idempotency_key = _get_idempotency_key('create', idempotency_id, data)
                _set_idempotency_result(idempotency_key, result)
            
            logger.info(f"Lead {lead_uid}: Created successfully in {duration:.2f}s", extra={
                'lead_uid': lead_uid,
                'duration_seconds': duration
            })
            
            return result
        else:
            error_response = {
                'success': False,
                'message': 'Failed to create lead - no data returned',
                'operation': 'create_lead',
                'timestamp': now_ist_iso(),
                'error_type': 'DatabaseError',
                'duration_seconds': round(time.time() - start_time, 2)
            }
            if idempotency_id:
                idempotency_key = _get_idempotency_key('create', idempotency_id, data)
                _set_idempotency_result(idempotency_key, error_response)
            return error_response
            
    except Exception as e:
        duration = time.time() - start_time
        error_response = {
            'success': False,
            'message': str(e),
            'operation': 'create_lead',
            'timestamp': now_ist_iso(),
            'error_type': type(e).__name__,
            'duration_seconds': round(duration, 2),
            'traceback': traceback.format_exc()
        }
        
        # Store error result for idempotency
        try:
            if idempotency_id:
                idempotency_key = _get_idempotency_key('create', idempotency_id, data)
                _set_idempotency_result(idempotency_key, error_response)
        except:
            pass
        
        logger.error(f"Lead creation failed after {duration:.2f}s: {e}", exc_info=True, extra={
            'duration_seconds': duration,
            'error_type': type(e).__name__
        })
        
        return error_response

def _update_lead(data: Dict[str, Any]) -> Dict[str, Any]:
    """Sync qualified_leads and tradein_master after lead_master has been updated directly with idempotency protection"""
    start_time = time.time()
    lead_id = data.get('lead_id')
    
    try:
        # Idempotency protection
        idempotency_key = _get_idempotency_key('update', lead_id, data)
        is_duplicate, existing_result = _check_idempotency(idempotency_key)
        if is_duplicate:
            logger.warning(f"Lead {lead_id} update already processed (idempotent)")
            import json
            try:
                result = json.loads(existing_result)
                result['idempotent'] = True
                return result
            except:
                return {'success': True, 'lead_id': lead_id, 'message': 'Already processed', 'idempotent': True}
        
        # Acquire processing lock
        if not _set_idempotency_lock(idempotency_key):
            logger.warning(f"Lead {lead_id} update is already being processed by another worker")
            return {'success': False, 'message': 'Operation already in progress'}
        
        supabase = get_supabase_client()
        update_data = data.get('update_data', {})
        user_info = data.get('user_info', {})
        
        logger.debug(f"Starting _update_lead for lead: {lead_id}")
        logger.debug(f"Update data received: {update_data}")
        
        if not lead_id:
            error_response = {
                'success': False,
                'message': 'Lead ID is required',
                'lead_id': None,
                'operation': 'update_lead',
                'timestamp': now_ist_iso(),
                'error_type': 'ValidationError'
            }
            _set_idempotency_result(idempotency_key, error_response)
            return error_response
        
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
        logger.info(f"Lead {lead_id}: Checking follow-up logic. followup_note in update_data: {'followup_note' in update_data}")
        if 'followup_note' in update_data:
            logger.info(f"Lead {lead_id}: followup_note value: '{update_data.get('followup_note')}'")
        
        # OPTIMIZATION: Fetch lead data ONCE at the beginning and reuse throughout with optimistic locking
        def fetch_lead_data():
            response = supabase.table('lead_master').select('*').eq('uid', lead_id).execute()
            if not response.data:
                return False, None
            return True, response.data[0]
        
        success, lead_info, error = retry_db_operation(fetch_lead_data)
        if not success or not lead_info:
            error_response = {
                'success': False,
                'message': f'Lead {lead_id} not found in lead_master',
                'lead_id': lead_id,
                'operation': 'update_lead',
                'timestamp': now_ist_iso(),
                'error_type': 'NotFoundError'
            }
            _set_idempotency_result(idempotency_key, error_response)
            logger.error(f"Lead {lead_id} not found in lead_master")
            return error_response
        
        # Store original updated_at for optimistic locking
        original_updated_at = lead_info.get('updated_at')
        
        if 'followup_note' in update_data and update_data.get('followup_note'):
            note = update_data.get('followup_note', '').strip()
            logger.info(f"Lead {lead_id}: Processing followup_note: '{note}'")
            if note:
                # Use the already-fetched lead_info
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
                    try:
                        from zoneinfo import ZoneInfo
                        next_followup = datetime.now(ZoneInfo("Asia/Kolkata")) + timedelta(days=2)
                    except ImportError:
                        # Fallback for systems without zoneinfo
                        next_followup = datetime.now() + timedelta(days=2)
                    update_data['follow_up_date'] = next_followup.isoformat()
                    logger.info(f"Lead {lead_id}: Auto-set next follow-up date for '{call_status}' status")
        
        # Update lead_master with processed followup data (if any followup processing occurred)
        followup_keys = ['second_remark', 'third_remark', 'fourth_remark', 'fifth_remark', 'sixth_remark', 'second_call_date', 'third_call_date', 'fourth_call_date', 'fifth_call_date', 'sixth_call_date']
        has_followup_data = any(key in update_data for key in followup_keys)
        logger.debug(f"Lead {lead_id}: Has followup data to save: {has_followup_data}")
        
        if update_data and has_followup_data:
            logger.info(f"Lead {lead_id}: Updating lead_master with followup data: {list(update_data.keys())}")
            # Add updated_at for optimistic locking
            update_data['updated_at'] = now_ist_iso()
            
            def update_lead_master():
                # Use optimistic locking: only update if updated_at hasn't changed
                response = supabase.table('lead_master')\
                    .update(update_data)\
                    .eq('uid', lead_id)\
                    .eq('updated_at', original_updated_at)\
                    .execute()
                if not response.data:
                    # Race condition detected - lead was modified by another process
                    logger.warning(f"Lead {lead_id} was modified by another process (optimistic lock failed). Fetching latest data...")
                    # Fetch latest data and retry once
                    latest_resp = supabase.table('lead_master').select('*').eq('uid', lead_id).execute()
                    if latest_resp.data:
                        # Update with latest updated_at
                        latest_updated_at = latest_resp.data[0].get('updated_at')
                        response = supabase.table('lead_master')\
                            .update(update_data)\
                            .eq('uid', lead_id)\
                            .eq('updated_at', latest_updated_at)\
                            .execute()
                return bool(response.data), response
            
            success, response, error = retry_db_operation(update_lead_master)
            if not success:
                logger.error(f"Lead {lead_id}: Failed to update lead_master after retries: {error}")
                error_response = {
                    'success': False,
                    'message': f'Failed to update lead_master: {str(error)}',
                    'lead_id': lead_id,
                    'operation': 'update_lead',
                    'timestamp': now_ist_iso(),
                    'error_type': type(error).__name__ if error else 'DatabaseError'
                }
                _set_idempotency_result(idempotency_key, error_response)
                return error_response
            
            if response and response.data:
                logger.info(f"Lead {lead_id}: Successfully updated lead_master with followup data")
            else:
                logger.warning(f"Lead {lead_id}: No data returned from lead_master update")
        else:
            logger.debug(f"Lead {lead_id}: No followup data to save to lead_master")
        
        # Lead_master is already updated directly, now sync qualified_leads and tradein_master
        # Invalidate cache since lead_master was updated
        invalidate_on_lead_change(lead_id, 'update')

        # Check if this update qualifies the lead and sync to qualified_leads
        # OPTIMIZATION: Reuse lead_info fetched earlier instead of fetching again
        try:
            logger.debug(f"Lead {lead_id}: Checking if lead should be synced to qualified_leads")
            # Use the already-fetched lead_info instead of fetching again
            ld = lead_info
            if ld:
                lead_status_val = (ld.get('lead_status') or ld.get('status') or '').strip()
                final_status_val = (ld.get('final_status') or '').strip()
                first_remark_val = (ld.get('first_remark') or '').strip()
                
                logger.debug(f"Lead {lead_id}: Lead status: {lead_status_val}, Final status: {final_status_val}, First remark: {first_remark_val[:50]}...")
                
                # Check if lead_status is being set to "Qualified" (new qualification) or is already "Qualified"
                # Note: lead_status_val might already be updated if lead_status was in update_data
                lead_status_in_update = 'lead_status' in update_data
                new_lead_status = str(update_data.get('lead_status', '')).strip() if lead_status_in_update else None
                
                # If lead_status is in update_data and equals "Qualified", this is likely a new qualification
                # (unless it was already "Qualified" before, but we can't check that easily here)
                is_new_qualification = (
                    lead_status_in_update and 
                    new_lead_status == 'Qualified'
                )
                is_already_qualified = (lead_status_val == 'Qualified')
                
                # Check if lead already exists in qualified_leads
                def check_qualified_exists():
                    response = supabase.table('qualified_leads').select('id').eq('lead_uid', lead_id).execute()
                    return bool(response.data), response
                
                success, existing_q_response, error = retry_db_operation(check_qualified_exists)
                if not success:
                    logger.warning(f"Lead {lead_id}: Failed to check qualified_leads existence, skipping sync")
                else:
                    lead_exists_in_qualified = bool(existing_q_response.data) if existing_q_response else False
                    
                    # Check if lead has progressed to follow-up stages (has any follow-up call dates)
                    has_followup_progress = bool(
                        ld.get('second_call_date') or 
                        ld.get('third_call_date') or 
                        ld.get('fourth_call_date') or 
                        ld.get('fifth_call_date') or 
                        ld.get('sixth_call_date')
                    )
                    
                    # CRITICAL FIX: Only sync to qualified_leads if:
                    # 1. It's a NEW qualification (lead_status is being changed TO "Qualified" AND no follow-up progress), OR
                    # 2. Lead is qualified but doesn't exist in qualified_leads yet (new qualification), OR
                    # 3. Lead is qualified, exists in qualified_leads, but hasn't progressed to follow-ups yet (initial qualification data fix)
                    # DO NOT sync if lead already exists in qualified_leads AND has progressed to follow-up stages
                    # This prevents already-qualified leads in follow-up stages from being re-qualified
                    
                    should_sync_qualified = False
                    
                    # PRIMARY SAFEGUARD: If lead exists in qualified_leads AND has follow-up progress, BLOCK re-sync
                    # This is the main fix for the bug where follow-up updates cause re-qualification
                    if lead_exists_in_qualified and has_followup_progress:
                        should_sync_qualified = False
                        logger.warning(f"Lead {lead_id}: BLOCKED re-qualification - lead already qualified and has follow-up progress (second_call_date or beyond exists)")
                    elif is_new_qualification and not has_followup_progress:
                        # New qualification (lead_status being set to "Qualified" in update) AND no follow-up progress - sync
                        should_sync_qualified = True
                        logger.info(f"Lead {lead_id}: NEW qualification detected (no follow-up progress) - will sync to qualified_leads")
                    elif is_already_qualified and not lead_exists_in_qualified:
                        # Qualified but not in qualified_leads yet - sync (new qualification)
                        should_sync_qualified = True
                        logger.info(f"Lead {lead_id}: Already qualified but not in qualified_leads - will sync")
                    elif is_already_qualified and lead_exists_in_qualified and not has_followup_progress:
                        # Qualified, exists in qualified_leads, but no follow-up progress - allow update (might be initial qualification data fix)
                        should_sync_qualified = True
                        logger.info(f"Lead {lead_id}: Qualified lead without follow-up progress - will update")
                    else:
                        # All other cases - don't sync (safety default)
                        should_sync_qualified = False
                        logger.debug(f"Lead {lead_id}: Not syncing to qualified_leads (doesn't meet criteria)")
                    
                    logger.debug(f"Lead {lead_id}: Should sync to qualified_leads: {should_sync_qualified}")
                    logger.debug(f"Lead {lead_id}: Lead exists in qualified_leads: {lead_exists_in_qualified}, Has follow-up progress: {has_followup_progress}")
                    
                    if should_sync_qualified:
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
                        
                        def sync_qualified_leads():
                            if lead_exists_in_qualified:
                                logger.info(f"Lead {lead_id}: Updating existing qualified_leads row with customer_location='{q_data.get('customer_location')}'")
                                response = supabase.table('qualified_leads').update(q_data).eq('lead_uid', lead_id).execute()
                                return bool(response.data), response
                            else:
                                logger.info(f"Lead {lead_id}: Inserting new qualified_leads row with customer_location='{q_data.get('customer_location')}'")
                                q_data['created_at'] = now_ts
                                response = supabase.table('qualified_leads').insert(q_data).execute()
                                return bool(response.data), response
                        
                        success, sync_response, sync_error = retry_db_operation(sync_qualified_leads)
                        if not success:
                            logger.warning(f"Lead {lead_id}: Failed to sync qualified_leads: {sync_error}")
                        else:
                            logger.info(f"Lead {lead_id}: Successfully synced qualified_leads")
                        
                        # IMPORTANT: Skip trade-in processing on generic update path.
                        # Trade-in insert/update is handled exclusively in the 'qualify' operation
                        logger.debug(f"Lead {lead_id}: Skipping trade-in processing on update path")
                        
        except Exception as sync_err:
            logger.warning(f"Lead {lead_id}: Failed to sync qualified_leads on update: {sync_err}", exc_info=True)
        
        duration = time.time() - start_time
        result = {
            'success': True,
            'lead_id': lead_id,
            'message': 'Background sync completed successfully',
            'duration_seconds': round(duration, 2),
            'has_followup': 'followup_note' in data.get('update_data', {}),
            'timestamp': now_ist_iso()
        }
        
        # Store idempotency result
        _set_idempotency_result(idempotency_key, result)
        
        logger.info(f"Lead {lead_id}: Background sync completed in {duration:.2f}s", extra={
            'lead_id': lead_id,
            'duration_seconds': duration,
            'has_followup': result['has_followup']
        })
        
        return result
            
    except Exception as e:
        duration = time.time() - start_time
        error_response = {
            'success': False,
            'message': str(e),
            'lead_id': lead_id,
            'operation': 'update_lead',
            'timestamp': now_ist_iso(),
            'error_type': type(e).__name__,
            'duration_seconds': round(duration, 2),
            'traceback': traceback.format_exc()
        }
        
        # Store error result for idempotency
        try:
            idempotency_key = _get_idempotency_key('update', lead_id, data)
            _set_idempotency_result(idempotency_key, error_response)
        except:
            pass
        
        logger.error(f"Lead {lead_id}: Update failed after {duration:.2f}s: {e}", exc_info=True, extra={
            'lead_id': lead_id,
            'duration_seconds': duration,
            'error_type': type(e).__name__
        })
        
        return error_response

def _delete_lead(data: Dict[str, Any]) -> Dict[str, Any]:
    """Delete lead in background with idempotency protection"""
    start_time = time.time()
    lead_id = data.get('lead_id')
    
    try:
        # Idempotency protection
        idempotency_key = _get_idempotency_key('delete', lead_id, data)
        is_duplicate, existing_result = _check_idempotency(idempotency_key)
        if is_duplicate:
            logger.warning(f"Lead {lead_id} deletion already processed (idempotent)")
            try:
                result = json.loads(existing_result)
                result['idempotent'] = True
                return result
            except:
                return {'success': True, 'lead_id': lead_id, 'message': 'Already processed', 'idempotent': True}
        
        # Acquire processing lock
        if not _set_idempotency_lock(idempotency_key):
            logger.warning(f"Lead {lead_id} deletion is already being processed by another worker")
            return {'success': False, 'message': 'Operation already in progress'}
        
        supabase = get_supabase_client()
        
        if not lead_id:
            error_response = {
                'success': False,
                'message': 'Lead ID is required',
                'lead_id': None,
                'operation': 'delete_lead',
                'timestamp': now_ist_iso(),
                'error_type': 'ValidationError'
            }
            _set_idempotency_result(idempotency_key, error_response)
            return error_response
        
        # Delete from lead_master table with retry
        def delete_operation():
            response = supabase.table('lead_master').delete().eq('uid', lead_id).execute()
            # Note: Delete operations may return empty data even on success
            return True, response
        
        success, response, error = retry_db_operation(delete_operation)
        if not success:
            error_response = {
                'success': False,
                'message': f'Failed to delete lead: {str(error)}',
                'lead_id': lead_id,
                'operation': 'delete_lead',
                'timestamp': now_ist_iso(),
                'error_type': type(error).__name__ if error else 'DatabaseError'
            }
            _set_idempotency_result(idempotency_key, error_response)
            logger.error(f"Lead {lead_id}: Failed to delete after retries: {error}")
            return error_response
        
        # Invalidate cache
        invalidate_on_lead_change(lead_id, 'delete')
        
        duration = time.time() - start_time
        result = {
            'success': True,
            'lead_id': lead_id,
            'duration_seconds': round(duration, 2),
            'message': 'Lead deleted successfully',
            'timestamp': now_ist_iso()
        }
        
        # Store idempotency result
        _set_idempotency_result(idempotency_key, result)
        
        logger.info(f"Lead {lead_id}: Deleted successfully in {duration:.2f}s", extra={
            'lead_id': lead_id,
            'duration_seconds': duration
        })
        
        return result
        
    except Exception as e:
        duration = time.time() - start_time
        error_response = {
            'success': False,
            'message': str(e),
            'lead_id': lead_id,
            'operation': 'delete_lead',
            'timestamp': now_ist_iso(),
            'error_type': type(e).__name__,
            'duration_seconds': round(duration, 2),
            'traceback': traceback.format_exc()
        }
        
        # Store error result for idempotency
        try:
            idempotency_key = _get_idempotency_key('delete', lead_id, data)
            _set_idempotency_result(idempotency_key, error_response)
        except:
            pass
        
        logger.error(f"Lead {lead_id}: Deletion failed after {duration:.2f}s: {e}", exc_info=True, extra={
            'lead_id': lead_id,
            'duration_seconds': duration,
            'error_type': type(e).__name__
        })
        
        return error_response

def _bulk_update_leads(data: Dict[str, Any]) -> Dict[str, Any]:
    """Bulk update leads in background with idempotency and optimized threading"""
    start_time = time.time()
    lead_ids = data.get('lead_ids', [])
    
    try:
        # Hard limit to prevent memory issues
        if len(lead_ids) > MAX_BULK_UPDATE_SIZE:
            error_response = {
                'success': False,
                'message': f'Bulk update limited to {MAX_BULK_UPDATE_SIZE} leads. Got {len(lead_ids)}.',
                'total_count': len(lead_ids),
                'max_allowed': MAX_BULK_UPDATE_SIZE,
                'operation': 'bulk_update_leads',
                'timestamp': now_ist_iso(),
                'error_type': 'ValidationError'
            }
            logger.error(f"Bulk update rejected: {len(lead_ids)} leads exceeds limit of {MAX_BULK_UPDATE_SIZE}")
            return error_response
        
        supabase = get_supabase_client()
        update_data = data.get('update_data', {})
        user_info = data.get('user_info', {})
        
        if not lead_ids:
            error_response = {
                'success': False,
                'message': 'No lead IDs provided',
                'operation': 'bulk_update_leads',
                'timestamp': now_ist_iso(),
                'error_type': 'ValidationError'
            }
            return error_response
        
        # Add metadata - use correct column names for lead_master table
        update_data.update({
            'updated_at': now_ist_iso()
        })
        
        updated_count = 0
        failed_count = 0
        failed_lead_ids = []
        
        # Use optimal worker count (2-4x CPU cores for I/O bound, but cap at reasonable max)
        optimal_workers = min(BULK_UPDATE_WORKERS, len(lead_ids), 50)
        logger.info(f"Bulk update: Processing {len(lead_ids)} leads with {optimal_workers} workers")
        
        # Process leads in batches
        for i in range(0, len(lead_ids), BATCH_SIZE):
            batch = lead_ids[i:i + BATCH_SIZE]
            
            try:
                def update_single_lead(lead_uid):
                    """Update a single lead with retry logic"""
                    def update_operation():
                        response = supabase.table('lead_master').update(update_data).eq('uid', lead_uid).execute()
                        if response.data:
                            invalidate_on_lead_change(lead_uid, 'bulk_update')
                            return True, lead_uid
                        else:
                            return False, lead_uid
                    
                    try:
                        success, result, error = retry_db_operation(update_operation)
                        return success, result, error
                    except Exception as e:
                        logger.error(f"Failed to update lead {lead_uid}: {e}")
                        return False, lead_uid, e
                
                # Use ThreadPoolExecutor with as_completed for better error handling
                with concurrent.futures.ThreadPoolExecutor(max_workers=optimal_workers) as executor:
                    future_to_lead = {
                        executor.submit(update_single_lead, lead_uid): lead_uid 
                        for lead_uid in batch
                    }
                    
                    for future in concurrent.futures.as_completed(future_to_lead):
                        lead_uid = future_to_lead[future]
                        try:
                            success, result, error = future.result()
                            if success:
                                updated_count += 1
                            else:
                                failed_count += 1
                                failed_lead_ids.append(lead_uid)
                        except Exception as exc:
                            logger.error(f"Lead {lead_uid} update raised exception: {exc}", exc_info=True)
                            failed_count += 1
                            failed_lead_ids.append(lead_uid)
                            
            except Exception as batch_error:
                logger.error(f"Batch update failed for batch starting at index {i}: {batch_error}", exc_info=True)
                # Fallback to sequential processing for this batch
                for lead_uid in batch:
                    try:
                        def update_op():
                            response = supabase.table('lead_master').update(update_data).eq('uid', lead_uid).execute()
                            return bool(response.data), response
                        
                        success, result, error = retry_db_operation(update_op)
                        if success:
                            updated_count += 1
                            invalidate_on_lead_change(lead_uid, 'bulk_update')
                        else:
                            failed_count += 1
                            failed_lead_ids.append(lead_uid)
                    except Exception as e:
                        logger.error(f"Failed to update lead {lead_uid} (fallback): {e}", exc_info=True)
                        failed_count += 1
                        failed_lead_ids.append(lead_uid)
        
        duration = time.time() - start_time
        result = {
            'success': True,
            'updated_count': updated_count,
            'failed_count': failed_count,
            'total_count': len(lead_ids),
            'failed_lead_ids': failed_lead_ids[:100],  # Limit to first 100 for response size
            'duration_seconds': round(duration, 2),
            'message': f'Bulk update completed: {updated_count}/{len(lead_ids)} leads updated',
            'timestamp': now_ist_iso()
        }
        
        logger.info(f"Bulk update completed in {duration:.2f}s: {updated_count} updated, {failed_count} failed", extra={
            'updated_count': updated_count,
            'failed_count': failed_count,
            'total_count': len(lead_ids),
            'duration_seconds': duration
        })
        
        return result
        
    except Exception as e:
        duration = time.time() - start_time
        error_response = {
            'success': False,
            'message': str(e),
            'lead_ids_count': len(lead_ids) if lead_ids else 0,
            'operation': 'bulk_update_leads',
            'timestamp': now_ist_iso(),
            'error_type': type(e).__name__,
            'duration_seconds': round(duration, 2),
            'traceback': traceback.format_exc()
        }
        
        logger.error(f"Bulk update failed after {duration:.2f}s: {e}", exc_info=True, extra={
            'lead_ids_count': len(lead_ids) if lead_ids else 0,
            'duration_seconds': duration,
            'error_type': type(e).__name__
        })
        
        return error_response

def _qualify_lead(data: Dict[str, Any]) -> Dict[str, Any]:
    """Qualify lead in background with idempotency protection"""
    start_time = time.time()
    lead_id = data.get('lead_id')
    
    try:
        # Idempotency protection
        idempotency_key = _get_idempotency_key('qualify', lead_id, data)
        is_duplicate, existing_result = _check_idempotency(idempotency_key)
        if is_duplicate:
            logger.warning(f"Lead {lead_id} qualification already processed (idempotent)")
            try:
                result = json.loads(existing_result)
                result['idempotent'] = True
                return result
            except:
                return {'success': True, 'lead_id': lead_id, 'message': 'Already processed', 'idempotent': True}
        
        # Acquire processing lock
        if not _set_idempotency_lock(idempotency_key):
            logger.warning(f"Lead {lead_id} qualification is already being processed by another worker")
            return {'success': False, 'message': 'Operation already in progress'}
        
        supabase = get_supabase_client()
        user_info = data.get('user_info', {})
        trade_in_info = data.get('trade_in_info', {})
        
        if not lead_id:
            error_response = {
                'success': False,
                'message': 'Lead ID is required',
                'lead_id': None,
                'operation': 'qualify_lead',
                'timestamp': now_ist_iso(),
                'error_type': 'ValidationError'
            }
            _set_idempotency_result(idempotency_key, error_response)
            return error_response
        
        # Get the lead from lead_master with retry
        def fetch_lead():
            response = supabase.table('lead_master').select('*').eq('uid', lead_id).execute()
            if not response.data:
                return False, None
            return True, response.data[0]
        
        success, lead_data, error = retry_db_operation(fetch_lead)
        if not success or not lead_data:
            error_response = {
                'success': False,
                'message': 'Lead not found',
                'lead_id': lead_id,
                'operation': 'qualify_lead',
                'timestamp': now_ist_iso(),
                'error_type': 'NotFoundError'
            }
            _set_idempotency_result(idempotency_key, error_response)
            return error_response
        
        # Check if already qualified - do not return early; we still want to process trade-in
        def check_qualified():
            response = supabase.table('qualified_leads').select('id').eq('lead_uid', lead_id).execute()
            return bool(response.data), response
        
        success, existing_q_response, error = retry_db_operation(check_qualified)
        already_qualified = bool(existing_q_response.data) if success and existing_q_response else False
        
        current_time = now_ist_iso()
        
        # Update lead_master with F1 (qualifying call) with retry
        form_data = data.get('form_data', {})
        lead_update_data = {
            'final_status': 'Pending',
            'first_remark': form_data.get('first_remark', '') or 'Lead qualified successfully',  # F1 - Qualifying call
            'first_call_date': current_time,  # F1 date
            'updated_at': current_time
        }
        
        def update_lead_master_f1():
            response = supabase.table('lead_master').update(lead_update_data).eq('uid', lead_id).execute()
            return bool(response.data), response
        
        success, update_response, error = retry_db_operation(update_lead_master_f1)
        if not success:
            error_response = {
                'success': False,
                'message': f'Failed to update lead_master: {str(error)}',
                'lead_id': lead_id,
                'operation': 'qualify_lead',
                'timestamp': now_ist_iso(),
                'error_type': type(error).__name__ if error else 'DatabaseError'
            }
            _set_idempotency_result(idempotency_key, error_response)
            logger.error(f"Lead {lead_id}: Failed to update lead_master after retries: {error}")
            return error_response
        
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
            def insert_qualified_lead():
                response = supabase.table('qualified_leads').insert(qualified_lead_data).execute()
                return bool(response.data), response
            
            success, qualified_response, error = retry_db_operation(insert_qualified_lead)
            if not success:
                logger.warning(f"Lead {lead_id}: Failed to insert qualified_leads after retries: {error}")
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
            
            def upsert_trade_in():
                # Check if trade-in exists
                existing_tradein = supabase.table('trade_in_master').select('id').eq('lead_uid', lead_id).execute()
                operation = 'updated' if existing_tradein.data else 'inserted'
                if existing_tradein.data:
                    response = supabase.table('trade_in_master').update(trade_in_data).eq('lead_uid', lead_id).execute()
                    return bool(response.data), {'response': response, 'operation': operation}
                else:
                    response = supabase.table('trade_in_master').insert(trade_in_data).execute()
                    return bool(response.data), {'response': response, 'operation': operation}
            
            try:
                success, result, error = retry_db_operation(upsert_trade_in)
                if success:
                    operation = result.get('operation', 'processed') if isinstance(result, dict) else 'processed'
                    logger.info(f"Trade-in data {operation} successfully for lead {lead_id}")
                else:
                    logger.warning(f"Failed to upsert trade-in data for lead {lead_id} after retries: {error}")
            except Exception as e:
                logger.error(f"Failed to upsert trade-in data for lead {lead_id}: {e}", exc_info=True)
        else:
            logger.info(f"Lead {lead_id} has no trade-in (status: {trade_in_status})")
        
        # Invalidate cache
        invalidate_on_lead_change(lead_id, 'qualify')
        
        duration = time.time() - start_time
        result = {
            'success': True,
            'lead_id': lead_id,
            'qualified_lead_id': (qualified_response.data[0].get('id') if qualified_response and qualified_response.data else None),
            'has_trade_in': str(lead_data.get('trade_in', '')).lower() == 'yes',
            'duration_seconds': round(duration, 2),
            'message': 'Lead qualified successfully',
            'timestamp': now_ist_iso()
        }
        
        # Store idempotency result
        _set_idempotency_result(idempotency_key, result)
        
        logger.info(f"Lead {lead_id}: Qualified successfully in {duration:.2f}s", extra={
            'lead_id': lead_id,
            'duration_seconds': duration,
            'has_trade_in': result['has_trade_in']
        })
        
        return result
        
    except Exception as e:
        duration = time.time() - start_time
        error_response = {
            'success': False,
            'message': str(e),
            'lead_id': lead_id,
            'operation': 'qualify_lead',
            'timestamp': now_ist_iso(),
            'error_type': type(e).__name__,
            'duration_seconds': round(duration, 2),
            'traceback': traceback.format_exc()
        }
        
        # Store error result for idempotency
        try:
            idempotency_key = _get_idempotency_key('qualify', lead_id, data)
            _set_idempotency_result(idempotency_key, error_response)
        except:
            pass
        
        logger.error(f"Lead {lead_id}: Qualification failed after {duration:.2f}s: {e}", exc_info=True, extra={
            'lead_id': lead_id,
            'duration_seconds': duration,
            'error_type': type(e).__name__
        })
        
        return error_response
