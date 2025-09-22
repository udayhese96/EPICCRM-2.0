"""
EPIC CRM 2.0 - Optimized API Endpoints
Implements the performance optimization plan with unified endpoints and cursor pagination
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import logging

from .queue_system import (
    QueueManager, LeadUpdatePayload, BatchTask, TaskStatus, 
    CursorPagination, get_queue_manager
)
from .database import get_supabase_client, get_database_connection
from .auth import get_current_user

logger = logging.getLogger(__name__)

# Create router for optimized endpoints
router = APIRouter(prefix="/api/optimized", tags=["optimized"])

@router.post("/leads/process")
async def process_leads(
    payload: List[LeadUpdatePayload],
    idempotency_key: Optional[str] = Header(None),
    current_user=Depends(get_current_user)
):
    """
    Unified endpoint for lead processing with instant response
    Enqueues leads for background processing and returns immediately
    """
    try:
        if not payload:
            raise HTTPException(status_code=400, detail="No leads provided")
        
        # Get queue manager
        supabase = get_supabase_client()
        queue_manager = get_queue_manager(supabase)
        
        # Create batch task
        batch_task = queue_manager.create_batch_task(payload, idempotency_key)
        
        # Enqueue for processing
        queue_manager.enqueue_task(batch_task)
        
        return {
            "status": "queued",
            "task_id": batch_task.task_id,
            "leads_count": len(payload),
            "message": "Leads queued for processing"
        }
        
    except Exception as e:
        logger.error(f"Error processing leads: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leads/batch-status/{task_id}")
async def get_batch_status(task_id: str):
    """Get status of a batch processing task"""
    try:
        supabase = get_supabase_client()
        queue_manager = get_queue_manager(supabase)
        
        task = queue_manager.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {
            "task_id": task.task_id,
            "status": task.status.value,
            "created_at": task.created_at.isoformat(),
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "error_message": task.error_message,
            "retry_count": task.retry_count,
            "leads_count": len(task.payload)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting batch status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/updates")
async def get_dashboard_updates(
    cursor: Optional[str] = Query(None, description="Cursor for pagination"),
    limit: int = Query(500, ge=1, le=1000, description="Number of records to return"),
    current_user=Depends(get_current_user)
):
    """
    Cursor-based pagination for dashboard updates
    Returns leads with optimized JOIN queries to avoid N+1 problem
    """
    try:
        supabase = get_supabase_client()
        
        # Build optimized query with JOINs to avoid N+1
        if cursor:
            try:
                updated_at, uid = CursorPagination.decode_cursor(cursor)
                where_clause = f"(updated_at, uid) > ('{updated_at.isoformat()}', '{uid}')"
                order_clause = "ORDER BY updated_at ASC, uid ASC"
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid cursor: {str(e)}")
        else:
            where_clause = "1=1"
            order_clause = "ORDER BY updated_at DESC, uid DESC"
        
        # Optimized query with JOINs to get all related data in one query
        query = f"""
        SELECT 
            l.*,
            COALESCE(q.status, 'not_qualified') as qualified_status,
            f.last_followup_at,
            f.last_followup_remark,
            t.trade_in_status,
            t.trade_in_make,
            t.trade_in_model,
            COALESCE(activity_counts.activity_count, 0) as activity_count,
            last_activity.activity_type as last_activity_type,
            last_activity.subject as last_activity_subject,
            last_activity.created_at as last_activity_date
        FROM lead_master l
        LEFT JOIN qualified_leads q ON q.lead_uid = l.uid
        LEFT JOIN (
            SELECT 
                lead_uid, 
                MAX(created_at) as last_followup_at,
                (ARRAY_AGG(notes ORDER BY created_at DESC))[1] as last_followup_remark
            FROM ps_followup_master
            GROUP BY lead_uid
        ) f ON f.lead_uid = l.uid
        LEFT JOIN trade_in_master t ON t.lead_uid = l.uid
        LEFT JOIN (
            SELECT lead_uid, COUNT(*) as activity_count
            FROM ps_followup_master
            GROUP BY lead_uid
        ) activity_counts ON activity_counts.lead_uid = l.uid
        LEFT JOIN LATERAL (
            SELECT 'followup' as activity_type, 'Follow-up' as subject, created_at
            FROM ps_followup_master pf
            WHERE pf.lead_uid = l.uid
            ORDER BY created_at DESC
            LIMIT 1
        ) last_activity ON true
        WHERE {where_clause}
        {order_clause}
        LIMIT {limit}
        """
        
        # Execute query using direct database connection for better performance
        with get_database_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                rows = cur.fetchall()
                
                # Convert to list of dicts
                columns = [desc[0] for desc in cur.description]
                leads = [dict(zip(columns, row)) for row in rows]
        
        # Create new cursor from last row
        new_cursor = None
        if leads:
            last_row = leads[-1]
            new_cursor = CursorPagination.create_cursor_from_row(last_row)
        
        return {
            "cursor": new_cursor,
            "rows": leads,
            "count": len(leads),
            "has_more": len(leads) == limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dashboard updates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/leads/statistics")
async def get_lead_statistics(current_user=Depends(get_current_user)):
    """
    Get lead statistics with optimized queries
    Uses materialized views or cached data for better performance
    """
    try:
        supabase = get_supabase_client()
        
        # Get statistics from dashboard_metrics table (updated by workers)
        metrics_response = supabase.table('dashboard_metrics').select('*').execute()
        metrics = {m['metric']: m['value'] for m in metrics_response.data or []}
        
        # If no cached metrics, calculate from database
        if not metrics:
            with get_database_connection() as conn:
                with conn.cursor() as cur:
                    # Get basic statistics
                    cur.execute("""
                        SELECT 
                            COUNT(*) as total_leads,
                            COUNT(CASE WHEN final_status = 'Pending' THEN 1 END) as pending_leads,
                            COUNT(CASE WHEN final_status = 'Won' THEN 1 END) as won_leads,
                            COUNT(CASE WHEN final_status = 'Lost' THEN 1 END) as lost_leads,
                            COUNT(CASE WHEN lead_status = 'Qualified' THEN 1 END) as qualified_leads
                        FROM lead_master
                    """)
                    stats = cur.fetchone()
                    
                    # Get status distribution
                    cur.execute("""
                        SELECT final_status, COUNT(*) as count
                        FROM lead_master
                        GROUP BY final_status
                        ORDER BY count DESC
                    """)
                    status_distribution = [{"status": row[0], "count": row[1]} for row in cur.fetchall()]
                    
                    # Get source distribution
                    cur.execute("""
                        SELECT source, COUNT(*) as count
                        FROM lead_master
                        GROUP BY source
                        ORDER BY count DESC
                    """)
                    source_distribution = [{"source": row[0], "count": row[1]} for row in cur.fetchall()]
            
            return {
                "total_leads": stats[0],
                "pending_leads": stats[1],
                "won_leads": stats[2],
                "lost_leads": stats[3],
                "qualified_leads": stats[4],
                "status_distribution": status_distribution,
                "source_distribution": source_distribution,
                "conversion_rate": round((stats[2] / stats[0] * 100) if stats[0] > 0 else 0, 2)
            }
        
        # Return cached metrics
        return {
            "cached": True,
            "metrics": metrics,
            "last_updated": metrics.get('leads_processed_today', {}).get('timestamp')
        }
        
    except Exception as e:
        logger.error(f"Error getting lead statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/queue/stats")
async def get_queue_stats(current_user=Depends(get_current_user)):
    """Get queue statistics for monitoring"""
    try:
        supabase = get_supabase_client()
        queue_manager = get_queue_manager(supabase)
        
        stats = queue_manager.get_queue_stats()
        
        # Get additional stats from database
        with get_database_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        status,
                        COUNT(*) as count,
                        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time
                    FROM batch_tasks
                    WHERE created_at > NOW() - INTERVAL '24 hours'
                    GROUP BY status
                """)
                task_stats = {row[0]: {"count": row[1], "avg_time": row[2]} for row in cur.fetchall()}
        
        return {
            "queue_stats": stats,
            "task_stats": task_stats,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting queue stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/leads/single-update")
async def single_lead_update(
    lead: LeadUpdatePayload,
    current_user=Depends(get_current_user)
):
    """
    Single lead update endpoint for critical updates that need immediate processing
    Use sparingly - prefer batch processing for better performance
    """
    try:
        # Process single lead immediately (synchronous)
        supabase = get_supabase_client()
        queue_manager = get_queue_manager(supabase)
        
        # Create batch with single lead
        batch_task = queue_manager.create_batch_task([lead])
        
        # Process immediately (not queued)
        from .workers import LeadBatchProcessor
        processor = LeadBatchProcessor(supabase)
        processor.process_lead_batch(batch_task.task_id)
        
        return {
            "status": "completed",
            "task_id": batch_task.task_id,
            "message": "Lead updated successfully"
        }
        
    except Exception as e:
        logger.error(f"Error updating single lead: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
