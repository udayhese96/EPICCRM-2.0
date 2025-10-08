"""
EPIC CRM 2.0 - Background Workers for Lead Processing
Implements chunked upsert and batch processing for performance optimization
"""

import os
import json
import psycopg2
from psycopg2.extras import execute_values, RealDictCursor
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import List, Dict, Any, Optional
import logging
from dataclasses import asdict

from .queue_system import BatchTask, LeadUpdatePayload, TaskStatus, QueueManager

# Import database with error handling
try:
    from .database import get_database_connection
    DATABASE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Database import failed: {e}")
    DATABASE_AVAILABLE = False
    def get_database_connection():
        return None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Time utilities
def now_ist_iso() -> str:
    """Return current timestamp in Asia/Kolkata (IST) as ISO string without timezone."""
    try:
        # Return IST timestamp without timezone info (naive datetime)
        return datetime.now(ZoneInfo("Asia/Kolkata")).replace(tzinfo=None).isoformat()
    except Exception:
        # Fallback to UTC if ZoneInfo fails
        return datetime.now(timezone.utc).replace(tzinfo=None).isoformat()

class LeadBatchProcessor:
    """Processes batches of lead updates with chunked upserts"""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.queue_manager = QueueManager(supabase_client)
        self.BATCH_SIZE = 50  # Process leads in chunks of 50
    
    def process_lead_batch(self, task_id: str):
        """Main worker function - processes a batch of lead updates"""
        try:
            logger.info(f"Processing task {task_id}")
            # Get task from database
            task = self.queue_manager.get_task_by_id(task_id)
            if not task:
                logger.error(f"Task {task_id} not found")
                return
            
            logger.info(f"Task {task_id} found with {len(task.payload)} leads")
            
            # Update status to processing
            self.queue_manager.update_task_status(task_id, TaskStatus.PROCESSING)
            
            # Process in chunks
            total_processed = 0
            total_errors = 0
            
            for i in range(0, len(task.payload), self.BATCH_SIZE):
                chunk = task.payload[i:i + self.BATCH_SIZE]
                processed, errors = self.process_chunk(chunk)
                total_processed += processed
                total_errors += errors
            
            # Update final status
            if total_errors == 0:
                self.queue_manager.update_task_status(task_id, TaskStatus.COMPLETED)
                logger.info(f"Task {task_id} completed successfully. Processed: {total_processed}")
            else:
                error_msg = f"Task {task_id} completed with {total_errors} errors out of {len(task.payload)} leads"
                self.queue_manager.update_task_status(task_id, TaskStatus.FAILED, error_msg)
                logger.warning(error_msg)
            
            # Update dashboard metrics
            self.update_dashboard_metrics(total_processed, total_errors)
            
        except Exception as e:
            logger.error(f"Error processing task {task_id}: {str(e)}")
            self.queue_manager.update_task_status(task_id, TaskStatus.FAILED, str(e))
            raise
    
    def process_chunk(self, leads: List[LeadUpdatePayload]) -> tuple[int, int]:
        """Process a chunk of leads with transactional upsert"""
        processed = 0
        errors = 0
        
        try:
            with get_database_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    # Start transaction
                    cur.execute("BEGIN")
                    
                    try:
                        # 1. Upsert leads into lead_master
                        processed = self.upsert_leads(cur, leads)
                        
                        # 2. Update related tables for each lead
                        for lead in leads:
                            self.update_related_tables(cur, lead)
                        
                        # Commit transaction
                        cur.execute("COMMIT")
                        logger.info(f"Successfully processed {processed} leads")
                        
                    except Exception as e:
                        # Rollback on error
                        cur.execute("ROLLBACK")
                        logger.error(f"Error in chunk processing: {str(e)}")
                        errors = len(leads)
                        processed = 0
                        
        except Exception as e:
            logger.error(f"Database connection error: {str(e)}")
            errors = len(leads)
        
        return processed, errors
    
    def upsert_leads(self, cur, leads: List[LeadUpdatePayload]) -> int:
        """Upsert leads into lead_master table"""
        if not leads:
            return 0
        
        # Prepare data for upsert
        values = []
        for lead in leads:
            # Build update data
            update_data = {
                "updated_at": now_ist_iso()
            }
            
            # Map fields from LeadUpdatePayload to lead_master columns
            if lead.customer_name:
                update_data["customer_name"] = lead.customer_name
            if lead.customer_mobile_number:
                update_data["customer_mobile_number"] = lead.customer_mobile_number
            if lead.customer_email:
                update_data["customer_email"] = lead.customer_email
            if lead.customer_location:
                update_data["customer_location"] = lead.customer_location
            if lead.lead_status:
                update_data["lead_status"] = lead.lead_status
            if lead.final_status:
                update_data["final_status"] = lead.final_status
            if lead.first_remark:
                update_data["first_remark"] = lead.first_remark
            if lead.model_interested:
                update_data["model_interested"] = lead.model_interested
            if lead.variant:
                update_data["variant"] = lead.variant
            if lead.lead_category:
                update_data["lead_category"] = lead.lead_category
            if lead.buying_plan:
                update_data["buying_plan"] = lead.buying_plan
            if lead.finance_option:
                update_data["finance_option"] = lead.finance_option
            if lead.profession:
                update_data["profession"] = lead.profession
            if lead.test_drive_type:
                update_data["test_drive_type"] = lead.test_drive_type
            if lead.trade_in:
                update_data["trade_in"] = lead.trade_in
            if lead.follow_up_date:
                update_data["follow_up_date"] = lead.follow_up_date
            if lead.call_status:
                update_data["call_status"] = lead.call_status
            if lead.cre_name:
                update_data["cre_name"] = lead.cre_name
            if lead.ps_name:
                update_data["ps_name"] = lead.ps_name
            if lead.branch:
                update_data["branch"] = lead.branch
            if lead.metadata:
                update_data["metadata"] = json.dumps(lead.metadata)
            
            # Auto-stamp first call date if first_remark is provided
            if lead.first_remark and not lead.followup_note:
                update_data["first_call_date"] = now_ist_iso()
            
            # Create upsert values tuple
            value_tuple = (
                lead.uid,
                lead.customer_name or '',
                lead.customer_mobile_number or '',
                lead.customer_email or '',
                lead.customer_location or '',
                lead.lead_status or '',
                lead.final_status or '',
                lead.first_remark or '',
                lead.model_interested or '',
                lead.variant or '',
                lead.lead_category or '',
                lead.buying_plan or '',
                lead.finance_option or '',
                lead.profession or '',
                lead.test_drive_type or '',
                lead.trade_in or '',
                lead.follow_up_date or '',
                lead.call_status or '',
                lead.cre_name or '',
                lead.ps_name or '',
                lead.branch or '',
                json.dumps(lead.metadata or {}),
                now_ist_iso(),
                now_ist_iso()
            )
            values.append(value_tuple)
        
        # Execute upsert
        sql = """
        INSERT INTO lead_master (
            uid, customer_name, customer_mobile_number, customer_email, customer_location,
            lead_status, final_status, first_remark, model_interested, variant, lead_category,
            buying_plan, finance_option, profession, test_drive_type, trade_in, follow_up_date,
            call_status, cre_name, ps_name, branch, metadata, created_at, updated_at
        ) VALUES %s
        ON CONFLICT (uid) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            customer_mobile_number = EXCLUDED.customer_mobile_number,
            customer_email = EXCLUDED.customer_email,
            customer_location = EXCLUDED.customer_location,
            lead_status = EXCLUDED.lead_status,
            final_status = EXCLUDED.final_status,
            first_remark = EXCLUDED.first_remark,
            model_interested = EXCLUDED.model_interested,
            variant = EXCLUDED.variant,
            lead_category = EXCLUDED.lead_category,
            buying_plan = EXCLUDED.buying_plan,
            finance_option = EXCLUDED.finance_option,
            profession = EXCLUDED.profession,
            test_drive_type = EXCLUDED.test_drive_type,
            trade_in = EXCLUDED.trade_in,
            follow_up_date = EXCLUDED.follow_up_date,
            call_status = EXCLUDED.call_status,
            cre_name = EXCLUDED.cre_name,
            ps_name = EXCLUDED.ps_name,
            branch = EXCLUDED.branch,
            metadata = lead_master.metadata || EXCLUDED.metadata,
            updated_at = EXCLUDED.updated_at
        RETURNING uid
        """
        
        execute_values(cur, sql, values, page_size=100)
        return len(values)
    
    def update_related_tables(self, cur, lead: LeadUpdatePayload):
        """Update related tables (qualified_leads, ps_followup_master, trade_in_master)"""
        
        # Update qualified_leads if lead is qualified
        if lead.final_status == "Pending" and lead.lead_status in ["Qualified", "Pending"]:
            self.upsert_qualified_lead(cur, lead)

        # Always sync customer_location to qualified_leads if present
        if lead.customer_location:
            try:
                cur.execute(
                    """
                    UPDATE qualified_leads
                    SET customer_location = %s,
                        updated_at = %s
                    WHERE lead_uid = %s
                    """,
                    (
                        lead.customer_location,
                        now_ist_iso(),
                        lead.uid,
                    ),
                )
            except Exception as e:
                logger.warning(f"Failed to sync customer_location to qualified_leads for {lead.uid}: {str(e)}")
        
        # Update ps_followup_master if PS is assigned
        if lead.ps_name:
            self.upsert_ps_followup(cur, lead)
        
        # Update trade_in_master if trade-in details provided
        if any([lead.trade_in_make, lead.trade_in_model, lead.trade_in_year, lead.trade_in_km]):
            logger.info(f"Processing trade-in data for lead {lead.uid}: make={lead.trade_in_make}, model={lead.trade_in_model}, year={lead.trade_in_year}")
            self.upsert_trade_in(cur, lead)
    
    def upsert_qualified_lead(self, cur, lead: LeadUpdatePayload):
        """Upsert into qualified_leads table"""
        sql = """
        INSERT INTO qualified_leads (
            lead_uid, customer_name, customer_mobile_number, customer_location, source, sub_source, cre_name,
            lead_category, model_interested, first_remark, variant, buying_plan,
            finance_option, profession, test_drive_type, trade_in, branch, ps_name,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (lead_uid) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            customer_mobile_number = EXCLUDED.customer_mobile_number,
            customer_location = EXCLUDED.customer_location,
            source = EXCLUDED.source,
            sub_source = EXCLUDED.sub_source,
            lead_category = EXCLUDED.lead_category,
            model_interested = EXCLUDED.model_interested,
            first_remark = EXCLUDED.first_remark,
            variant = EXCLUDED.variant,
            buying_plan = EXCLUDED.buying_plan,
            finance_option = EXCLUDED.finance_option,
            profession = EXCLUDED.profession,
            test_drive_type = EXCLUDED.test_drive_type,
            trade_in = EXCLUDED.trade_in,
            branch = EXCLUDED.branch,
            ps_name = EXCLUDED.ps_name,
            updated_at = EXCLUDED.updated_at
        """
        
        cur.execute(sql, (
            lead.uid,
            lead.customer_name or '',
            lead.customer_mobile_number or '',
            lead.customer_location or '',
            'website',  # Default source
            '',  # sub_source (empty for now)
            lead.cre_name or '',
            lead.lead_category or '',
            lead.model_interested or '',
            lead.first_remark or '',
            lead.variant or '',
            lead.buying_plan or '',
            lead.finance_option or '',
            lead.profession or '',
            lead.test_drive_type or '',
            lead.trade_in or '',
            lead.branch or '',
            lead.ps_name or '',
            now_ist_iso(),
            now_ist_iso()
        ))
    
    def upsert_ps_followup(self, cur, lead: LeadUpdatePayload):
        """Upsert into ps_followup_master table"""
        sql = """
        INSERT INTO ps_followup_master (
            lead_uid, ps_name, customer_name, customer_mobile_number, source,
            cre_name, lead_category, model_interested, variant, buying_plan,
            finance_option, follow_up_date, lead_status, final_status,
            ps_assigned_at, created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (lead_uid) DO UPDATE SET
            ps_name = EXCLUDED.ps_name,
            customer_name = EXCLUDED.customer_name,
            customer_mobile_number = EXCLUDED.customer_mobile_number,
            lead_category = EXCLUDED.lead_category,
            model_interested = EXCLUDED.model_interested,
            variant = EXCLUDED.variant,
            buying_plan = EXCLUDED.buying_plan,
            finance_option = EXCLUDED.finance_option,
            follow_up_date = EXCLUDED.follow_up_date,
            lead_status = EXCLUDED.lead_status,
            final_status = EXCLUDED.final_status,
            updated_at = EXCLUDED.updated_at
        """
        
        cur.execute(sql, (
            lead.uid,
            lead.ps_name,
            lead.customer_name or '',
            lead.customer_mobile_number or '',
            'website',  # Default source
            lead.cre_name or '',
            lead.lead_category or '',
            lead.model_interested or '',
            lead.variant or '',
            lead.buying_plan or '',
            lead.finance_option or '',
            lead.follow_up_date or now_ist_iso(),
            lead.lead_status or 'Pending',
            lead.final_status or 'Pending',
            now_ist_iso(),
            now_ist_iso(),
            now_ist_iso()
        ))
    
    def upsert_trade_in(self, cur, lead: LeadUpdatePayload):
        """Upsert into trade_in_master table"""
        sql = """
        INSERT INTO trade_in_master (
            lead_uid, customer_name, customer_mobile_number, trade_in_make,
            trade_in_model, trade_in_year, trade_in_km, trade_in_ownership,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        ON CONFLICT (lead_uid) DO UPDATE SET
            trade_in_make = EXCLUDED.trade_in_make,
            trade_in_model = EXCLUDED.trade_in_model,
            trade_in_year = EXCLUDED.trade_in_year,
            trade_in_km = EXCLUDED.trade_in_km,
            trade_in_ownership = EXCLUDED.trade_in_ownership,
            updated_at = EXCLUDED.updated_at
        """
        
        cur.execute(sql, (
            lead.uid,
            lead.customer_name or '',
            lead.customer_mobile_number or '',
            lead.trade_in_make or '',
            lead.trade_in_model or '',
            lead.trade_in_year or '',
            lead.trade_in_km or '',
            lead.trade_in_ownership or '',
            now_ist_iso(),
            now_ist_iso()
        ))
    
    def update_dashboard_metrics(self, processed_count: int, error_count: int):
        """Update dashboard metrics after batch processing"""
        try:
            # Update processing metrics
            metrics_data = {
                "metric": "leads_processed_today",
                "value": {"count": processed_count, "errors": error_count, "timestamp": now_ist_iso()},
                "updated_at": now_ist_iso()
            }
            
            self.supabase.table('dashboard_metrics').upsert(
                metrics_data, 
                on_conflict='metric'
            ).execute()
            
        except Exception as e:
            logger.error(f"Error updating dashboard metrics: {str(e)}")

def process_cre_lead(task_data: dict):
    """Process CRE lead creation - insert into qualified_leads ONLY if lead is qualified"""
    try:
        from .database import get_supabase_client
        supabase = get_supabase_client()
        
        lead_uid = task_data.get('lead_uid')
        if not lead_uid:
            logger.error("No lead_uid provided in task data")
            return
        
        # Check if lead is actually qualified before inserting into qualified_leads
        lead_response = supabase.table('lead_master').select('lead_status, final_status').eq('uid', lead_uid).execute()
        
        if not lead_response.data:
            logger.error(f"Lead {lead_uid} not found in lead_master")
            return
            
        lead = lead_response.data[0]
        lead_status = lead.get('lead_status', '')
        final_status = lead.get('final_status', '')
        
        # Only insert into qualified_leads if lead is actually qualified
        if lead_status == 'Qualified':
            logger.info(f"Lead {lead_uid} is qualified - inserting into qualified_leads")
            
            # Insert into qualified_leads
            qualified_lead_data = {
                "lead_uid": lead_uid,
                "customer_name": task_data.get('customer_name', ''),
                "customer_mobile_number": task_data.get('customer_mobile_number', ''),
                "source": task_data.get('source', ''),
                "sub_source": task_data.get('sub_source', ''),
                "cre_name": task_data.get('cre_name', ''),
                "first_remark": task_data.get('remarks', ''),
                "created_at": now_ist_iso(),
                "updated_at": now_ist_iso()
            }
            
            # Insert qualified lead
            qualified_response = supabase.table('qualified_leads').insert(qualified_lead_data).execute()
            if not qualified_response.data:
                logger.error(f"Failed to insert qualified lead for {lead_uid}")
                return
            
            # Insert into trade_in_master if trade-in details provided
            trade_in_data = {
                "lead_uid": lead_uid,
                "customer_name": task_data.get('customer_name', ''),
                "customer_mobile_number": task_data.get('customer_mobile_number', ''),
                "trade_in_make": task_data.get('trade_in_make'),
                "trade_in_model": task_data.get('trade_in_model'),
                "trade_in_year": task_data.get('trade_in_year'),
                "trade_in_km": task_data.get('trade_in_km'),
                "trade_in_ownership": task_data.get('trade_in_ownership'),
                "created_at": now_ist_iso(),
                "updated_at": now_ist_iso()
            }
            
            # Only insert if any trade-in details are provided
            if any([trade_in_data.get('trade_in_make'), trade_in_data.get('trade_in_model'), 
                    trade_in_data.get('trade_in_year'), trade_in_data.get('trade_in_km'), 
                    trade_in_data.get('trade_in_ownership')]):
                
                trade_in_response = supabase.table('trade_in_master').upsert(trade_in_data).execute()
                if not trade_in_response.data:
                    logger.error(f"Failed to insert trade-in data for {lead_uid}")
                else:
                    logger.info(f"Successfully inserted trade-in data for {lead_uid}")
        else:
            logger.info(f"Lead {lead_uid} is not qualified (status: {lead_status}, final: {final_status}) - skipping qualified_leads insertion")
        
        logger.info(f"Successfully processed CRE lead {lead_uid}")
        
    except Exception as e:
        logger.error(f"Error processing CRE lead: {str(e)}")
        raise

# Worker function for RQ
def process_lead_batch(task_id: str):
    """RQ worker function - entry point for background processing"""
    try:
        from .database import get_supabase_client
        supabase = get_supabase_client()
        processor = LeadBatchProcessor(supabase)
        processor.process_lead_batch(task_id)
    except Exception as e:
        logger.error(f"Worker error for task {task_id}: {str(e)}")
        raise
