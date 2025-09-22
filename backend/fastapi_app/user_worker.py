"""
EPIC CRM 2.0 - User Background Worker
Processes user operations in background for ultra-fast UI
"""

import logging
from datetime import datetime
from typing import Dict, Any
from .database import get_supabase_client
from .redis_cache import cache, invalidate_on_user_change

logger = logging.getLogger(__name__)

def process_user_operation(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process user operation in background"""
    try:
        operation = job_data.get('operation')
        data = job_data.get('data', {})
        
        logger.info(f"Processing user operation: {operation}")
        
        if operation == 'create':
            return _create_user(data)
        elif operation == 'update':
            return _update_user(data)
        elif operation == 'delete':
            return _delete_user(data)
        elif operation == 'bulk_update':
            return _bulk_update_users(data)
        else:
            return {'success': False, 'message': f'Unknown operation: {operation}'}
            
    except Exception as e:
        logger.error(f"User operation failed: {e}")
        return {'success': False, 'message': str(e)}

def _create_user(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create new user in background"""
    try:
        supabase = get_supabase_client()
        user_data = data.get('user_data', {})
        user_info = data.get('user_info', {})
        table_name = data.get('table_name', 'users')
        
        # Add metadata - use correct column names
        user_data.update({
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
            # created_by column may not exist in all user tables
        })
        
        # Insert into appropriate table
        response = supabase.table(table_name).insert(user_data).execute()
        
        if response.data:
            user_id = response.data[0].get('id')
            
            # Invalidate cache
            invalidate_on_user_change(user_id, 'create')
            
            logger.info(f"User created successfully in {table_name}: {user_id}")
            return {
                'success': True,
                'user_id': user_id,
                'table_name': table_name,
                'message': 'User created successfully'
            }
        else:
            return {'success': False, 'message': 'Failed to create user'}
            
    except Exception as e:
        logger.error(f"User creation failed: {e}")
        return {'success': False, 'message': str(e)}

def _update_user(data: Dict[str, Any]) -> Dict[str, Any]:
    """Update user in background"""
    try:
        supabase = get_supabase_client()
        user_id = data.get('user_id')
        update_data = data.get('update_data', {})
        user_info = data.get('user_info', {})
        table_name = data.get('table_name', 'users')
        
        if not user_id:
            return {'success': False, 'message': 'User ID is required'}
        
        # Add metadata - use correct column names
        update_data.update({
            'updated_at': datetime.now().isoformat()
            # updated_by column may not exist in all user tables
        })
        
        # Update user table
        response = supabase.table(table_name).update(update_data).eq('id', user_id).execute()
        
        if response.data:
            # Invalidate cache
            invalidate_on_user_change(user_id, 'update')
            
            logger.info(f"User updated successfully in {table_name}: {user_id}")
            return {
                'success': True,
                'user_id': user_id,
                'table_name': table_name,
                'message': 'User updated successfully'
            }
        else:
            return {'success': False, 'message': 'User not found or update failed'}
            
    except Exception as e:
        logger.error(f"User update failed: {e}")
        return {'success': False, 'message': str(e)}

def _delete_user(data: Dict[str, Any]) -> Dict[str, Any]:
    """Delete user in background"""
    try:
        supabase = get_supabase_client()
        user_id = data.get('user_id')
        table_name = data.get('table_name', 'users')
        
        if not user_id:
            return {'success': False, 'message': 'User ID is required'}
        
        # Delete from user table
        response = supabase.table(table_name).delete().eq('id', user_id).execute()
        
        # Invalidate cache
        invalidate_on_user_change(user_id, 'delete')
        
        logger.info(f"User deleted successfully from {table_name}: {user_id}")
        return {
            'success': True,
            'user_id': user_id,
            'table_name': table_name,
            'message': 'User deleted successfully'
        }
        
    except Exception as e:
        logger.error(f"User deletion failed: {e}")
        return {'success': False, 'message': str(e)}

def _bulk_update_users(data: Dict[str, Any]) -> Dict[str, Any]:
    """Bulk update users in background"""
    try:
        supabase = get_supabase_client()
        user_ids = data.get('user_ids', [])
        update_data = data.get('update_data', {})
        user_info = data.get('user_info', {})
        table_name = data.get('table_name', 'users')
        
        if not user_ids:
            return {'success': False, 'message': 'No user IDs provided'}
        
        # Add metadata - use correct column names
        update_data.update({
            'updated_at': datetime.now().isoformat()
            # updated_by column may not exist in all user tables
        })
        
        updated_count = 0
        failed_count = 0
        
        # Update each user
        for user_id in user_ids:
            try:
                response = supabase.table(table_name).update(update_data).eq('id', user_id).execute()
                if response.data:
                    updated_count += 1
                    # Invalidate cache for each user
                    invalidate_on_user_change(user_id, 'bulk_update')
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"Failed to update user {user_id}: {e}")
                failed_count += 1
        
        logger.info(f"Bulk update completed in {table_name}: {updated_count} updated, {failed_count} failed")
        return {
            'success': True,
            'updated_count': updated_count,
            'failed_count': failed_count,
            'total_count': len(user_ids),
            'table_name': table_name,
            'message': f'Bulk update completed: {updated_count}/{len(user_ids)} users updated'
        }
        
    except Exception as e:
        logger.error(f"Bulk update failed: {e}")
        return {'success': False, 'message': str(e)}
