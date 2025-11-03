"""
Duplicate Lead Management System
Handles merging and updating leads based on phone number
"""

from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
import logging
from .database import get_supabase_client, now_ist_iso
from .redis_cache import invalidate_on_lead_change

logger = logging.getLogger(__name__)

class DuplicateLeadManager:
    """Manages duplicate leads based on phone number"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def find_existing_lead_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        """Find existing lead by phone number"""
        try:
            # Clean phone number
            clean_phone = self._clean_phone_number(phone)
            if not clean_phone:
                return None
            
            response = self.supabase.table('lead_master')\
                .select('*')\
                .eq('customer_mobile_number', clean_phone)\
                .order('created_at', desc=True)\
                .limit(1)\
                .execute()
            
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error finding existing lead by phone {phone}: {e}")
            return None
    
    def merge_lead_data(self, existing_lead: Dict[str, Any], new_lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Merge new lead data with existing lead data
        Priority: Keep non-null values, prefer newer data for conflicts
        """
        merged_data = existing_lead.copy()
        
        # Fields that should be updated with new data if provided
        updatable_fields = [
            'customer_name', 'customer_email', 'customer_location',
            'lead_status', 'final_status', 'lead_category', 'source', 'sub_source',
            'model_interested', 'variant', 'buying_plan', 'finance_option',
            'profession', 'test_drive_type', 'trade_in', 'follow_up_date',
            'first_remark', 'branch', 'campaign'
        ]
        
        # Update fields if new data is provided and not empty
        for field in updatable_fields:
            if field in new_lead_data and new_lead_data[field] is not None:
                new_value = str(new_lead_data[field]).strip() if new_lead_data[field] else None
                if new_value:  # Only update if new value is not empty
                    merged_data[field] = new_value
        
        # Handle assignment fields specially
        if new_lead_data.get('cre_name') and new_lead_data.get('cre_id'):
            merged_data['cre_name'] = new_lead_data['cre_name']
            merged_data['cre_id'] = new_lead_data['cre_id']
            merged_data['assigned'] = 'Yes'
            merged_data['cre_assigned_at'] = now_ist_iso()
        
        # Always update metadata timestamp
        merged_data['updated_at'] = now_ist_iso()
        
        # Merge metadata if it exists
        if 'metadata' in existing_lead and 'metadata' in new_lead_data:
            existing_metadata = existing_lead.get('metadata', {}) or {}
            new_metadata = new_lead_data.get('metadata', {}) or {}
            merged_data['metadata'] = {**existing_metadata, **new_metadata}
        elif 'metadata' in new_lead_data and new_lead_data['metadata']:
            merged_data['metadata'] = new_lead_data['metadata']
        
        return merged_data
    
    def create_or_update_lead(self, lead_data: Dict[str, Any]) -> Tuple[str, str, bool]:
        """
        Create new lead or update existing one based on phone number
        Returns: (lead_uid, action, success)
        action: 'created', 'updated', 'error'
        """
        try:
            phone = lead_data.get('customer_mobile_number')
            if not phone:
                raise ValueError("Phone number is required")
            
            # Find existing lead
            existing_lead = self.find_existing_lead_by_phone(phone)
            
            if existing_lead:
                # Update existing lead
                merged_data = self.merge_lead_data(existing_lead, lead_data)
                
                # Remove fields that shouldn't be updated
                update_data = {k: v for k, v in merged_data.items() 
                             if k not in ['id', 'uid', 'created_at']}
                
                response = self.supabase.table('lead_master')\
                    .update(update_data)\
                    .eq('uid', existing_lead['uid'])\
                    .execute()
                
                if response.data:
                    lead_uid = existing_lead['uid']
                    invalidate_on_lead_change(lead_uid, 'update')
                    logger.info(f"Updated existing lead: {lead_uid} for phone: {phone}")
                    return lead_uid, 'updated', True
                else:
                    logger.error(f"Failed to update lead for phone: {phone}")
                    return existing_lead['uid'], 'error', False
            
            else:
                # Create new lead
                import uuid
                if 'uid' not in lead_data or not lead_data['uid']:
                    lead_data['uid'] = f"LD{str(uuid.uuid4())[:8].upper()}"
                
                lead_data['created_at'] = now_ist_iso()
                lead_data['updated_at'] = now_ist_iso()
                
                response = self.supabase.table('lead_master')\
                    .insert(lead_data)\
                    .execute()
                
                if response.data:
                    lead_uid = response.data[0]['uid']
                    invalidate_on_lead_change(lead_uid, 'create')
                    logger.info(f"Created new lead: {lead_uid} for phone: {phone}")
                    return lead_uid, 'created', True
                else:
                    logger.error(f"Failed to create lead for phone: {phone}")
                    return '', 'error', False
                    
        except Exception as e:
            logger.error(f"Error in create_or_update_lead: {e}")
            return '', 'error', False
    
    def bulk_deduplicate_leads(self, leads_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process multiple leads with deduplication
        Returns summary of operations
        """
        results = {
            'created': 0,
            'updated': 0,
            'errors': 0,
            'details': []
        }
        
        phone_to_lead = {}  # Track leads by phone in current batch
        
        for lead_data in leads_data:
            try:
                phone = self._clean_phone_number(lead_data.get('customer_mobile_number', ''))
                if not phone:
                    results['errors'] += 1
                    results['details'].append({
                        'phone': lead_data.get('customer_mobile_number', ''),
                        'action': 'error',
                        'message': 'Invalid phone number'
                    })
                    continue
                
                # Check if this phone number already appeared in current batch
                if phone in phone_to_lead:
                    # Merge with previous lead in batch
                    phone_to_lead[phone] = self.merge_lead_data(phone_to_lead[phone], lead_data)
                    continue
                
                phone_to_lead[phone] = lead_data
                
            except Exception as e:
                results['errors'] += 1
                results['details'].append({
                    'phone': lead_data.get('customer_mobile_number', ''),
                    'action': 'error',
                    'message': str(e)
                })
        
        # Process deduplicated leads
        for phone, lead_data in phone_to_lead.items():
            lead_uid, action, success = self.create_or_update_lead(lead_data)
            
            if success:
                results[action] += 1
                results['details'].append({
                    'phone': phone,
                    'lead_uid': lead_uid,
                    'action': action,
                    'customer_name': lead_data.get('customer_name', '')
                })
            else:
                results['errors'] += 1
                results['details'].append({
                    'phone': phone,
                    'action': 'error',
                    'message': 'Database operation failed'
                })
        
        return results
    
    def _clean_phone_number(self, phone: str) -> Optional[str]:
        """Clean and validate phone number"""
        if not phone:
            return None
        
        # Remove all non-digit characters
        clean_phone = ''.join(filter(str.isdigit, str(phone)))
        
        # Remove country code if present (assuming Indian numbers)
        if clean_phone.startswith('91') and len(clean_phone) == 12:
            clean_phone = clean_phone[2:]
        elif clean_phone.startswith('+91') and len(clean_phone) == 13:
            clean_phone = clean_phone[3:]
        
        # Validate 10-digit Indian mobile number
        if len(clean_phone) == 10 and clean_phone[0] in '6789':
            return clean_phone
        
        return None
    
    def get_duplicate_stats(self) -> Dict[str, Any]:
        """Get statistics about duplicate leads in the system"""
        try:
            # Find phone numbers with multiple leads
            response = self.supabase.rpc('get_duplicate_phone_stats').execute()
            
            if not response.data:
                # Fallback query if RPC doesn't exist
                response = self.supabase.table('lead_master')\
                    .select('customer_mobile_number')\
                    .execute()
                
                phone_counts = {}
                for lead in response.data:
                    phone = lead.get('customer_mobile_number')
                    if phone:
                        phone_counts[phone] = phone_counts.get(phone, 0) + 1
                
                duplicates = {phone: count for phone, count in phone_counts.items() if count > 1}
                
                return {
                    'total_unique_phones': len(phone_counts),
                    'duplicate_phones': len(duplicates),
                    'total_duplicate_leads': sum(duplicates.values()) - len(duplicates),
                    'duplicates': list(duplicates.items())[:10]  # Show first 10
                }
            
            return response.data[0] if response.data else {}
            
        except Exception as e:
            logger.error(f"Error getting duplicate stats: {e}")
            return {'error': str(e)}

# Global instance
duplicate_manager = DuplicateLeadManager()
