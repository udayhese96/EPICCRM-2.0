"""
EPIC CRM 2.0 - Queue System for Performance Optimization
Implements the lean queue + cursor plan for instant UI updates
"""

import uuid
import hashlib
import json
import base64
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from fastapi import HTTPException
import redis
from rq import Queue, Worker
import psycopg2
from psycopg2.extras import execute_values

# Import Supabase with error handling
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Supabase import failed: {e}")
    SUPABASE_AVAILABLE = False
    # Create dummy classes for testing
    class Client:
        pass
    def create_client(*args, **kwargs):
        return Client()

# Redis connection for RQ
redis_conn = redis.Redis(host='localhost', port=6379, db=0)
q = Queue('lead_processing', connection=redis_conn)

class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class LeadUpdatePayload:
    """Standardized lead update payload"""
    uid: str
    customer_name: Optional[str] = None
    customer_mobile_number: Optional[str] = None
    customer_email: Optional[str] = None
    customer_location: Optional[str] = None
    lead_status: Optional[str] = None
    final_status: Optional[str] = None
    first_remark: Optional[str] = None
    followup_note: Optional[str] = None
    model_interested: Optional[str] = None
    variant: Optional[str] = None
    lead_category: Optional[str] = None
    buying_plan: Optional[str] = None
    finance_option: Optional[str] = None
    profession: Optional[str] = None
    test_drive_type: Optional[str] = None
    trade_in: Optional[str] = None
    trade_in_make: Optional[str] = None
    trade_in_model: Optional[str] = None
    trade_in_year: Optional[str] = None
    trade_in_km: Optional[str] = None
    trade_in_ownership: Optional[str] = None
    follow_up_date: Optional[str] = None
    call_status: Optional[str] = None
    cre_name: Optional[str] = None
    ps_name: Optional[str] = None
    branch: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class BatchTask:
    """Batch task for processing multiple leads"""
    task_id: str
    idempotency_key: Optional[str]
    payload: List[LeadUpdatePayload]
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now(timezone.utc)

class QueueManager:
    """Manages the lead processing queue"""
    
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.redis_conn = redis_conn
        self.queue = q
    
    def create_task_id(self) -> str:
        """Generate unique task ID"""
        return f"task_{uuid.uuid4().hex[:16]}"
    
    def create_idempotency_key(self, payload: List[LeadUpdatePayload]) -> str:
        """Create idempotency key from payload hash"""
        payload_str = json.dumps([p.__dict__ for p in payload], sort_keys=True)
        return hashlib.sha256(payload_str.encode()).hexdigest()[:32]
    
    def create_batch_task(self, payload: List[LeadUpdatePayload], idempotency_key: Optional[str] = None) -> BatchTask:
        """Create a new batch task"""
        task_id = self.create_task_id()
        
        if idempotency_key is None:
            idempotency_key = self.create_idempotency_key(payload)
        
        # Check for existing task with same idempotency key
        existing_task = self.get_task_by_idempotency(idempotency_key)
        if existing_task:
            return existing_task
        
        batch_task = BatchTask(
            task_id=task_id,
            idempotency_key=idempotency_key,
            payload=payload
        )
        
        # Store in database
        self.store_task(batch_task)
        
        return batch_task
    
    def store_task(self, task: BatchTask):
        """Store task in database"""
        task_data = {
            "task_id": task.task_id,
            "idempotency_key": task.idempotency_key,
            "payload": [p.__dict__ for p in task.payload],
            "status": task.status.value,
            "created_at": task.created_at.isoformat(),
            "retry_count": task.retry_count,
            "max_retries": task.max_retries
        }
        
        self.supabase.table('batch_tasks').insert(task_data).execute()
    
    def get_task_by_idempotency(self, idempotency_key: str) -> Optional[BatchTask]:
        """Get existing task by idempotency key"""
        response = self.supabase.table('batch_tasks').select('*').eq('idempotency_key', idempotency_key).execute()
        
        if not response.data:
            return None
        
        task_data = response.data[0]
        return self._task_from_db(task_data)
    
    def get_task_by_id(self, task_id: str) -> Optional[BatchTask]:
        """Get task by ID"""
        response = self.supabase.table('batch_tasks').select('*').eq('task_id', task_id).execute()
        
        if not response.data:
            return None
        
        task_data = response.data[0]
        return self._task_from_db(task_data)
    
    def _task_from_db(self, task_data: Dict) -> BatchTask:
        """Convert database row to BatchTask object"""
        payload = [LeadUpdatePayload(**p) for p in task_data['payload']]
        
        return BatchTask(
            task_id=task_data['task_id'],
            idempotency_key=task_data.get('idempotency_key'),
            payload=payload,
            status=TaskStatus(task_data['status']),
            created_at=datetime.fromisoformat(task_data['created_at'].replace('Z', '+00:00')),
            started_at=datetime.fromisoformat(task_data['started_at'].replace('Z', '+00:00')) if task_data.get('started_at') else None,
            completed_at=datetime.fromisoformat(task_data['completed_at'].replace('Z', '+00:00')) if task_data.get('completed_at') else None,
            error_message=task_data.get('error_message'),
            retry_count=task_data.get('retry_count', 0),
            max_retries=task_data.get('max_retries', 3)
        )
    
    def update_task_status(self, task_id: str, status: TaskStatus, error_message: Optional[str] = None):
        """Update task status in database"""
        update_data = {
            "status": status.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        if status == TaskStatus.PROCESSING:
            update_data["started_at"] = datetime.now(timezone.utc).isoformat()
        elif status in [TaskStatus.COMPLETED, TaskStatus.FAILED]:
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        if error_message:
            update_data["error_message"] = error_message
        
        self.supabase.table('batch_tasks').update(update_data).eq('task_id', task_id).execute()
    
    def enqueue_task(self, task: BatchTask):
        """Enqueue task for processing"""
        self.queue.enqueue('workers.process_lead_batch', task.task_id)
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        return {
            "pending_tasks": len(self.queue),
            "failed_tasks": self.queue.failed_job_registry.count,
            "completed_tasks": self.queue.finished_job_registry.count
        }

class CursorPagination:
    """Handles cursor-based pagination for dashboard updates"""
    
    @staticmethod
    def encode_cursor(updated_at: datetime, uid: str) -> str:
        """Encode cursor as base64 JSON"""
        cursor_data = {
            "updated_at": updated_at.isoformat(),
            "uid": uid
        }
        return base64.b64encode(json.dumps(cursor_data).encode()).decode()
    
    @staticmethod
    def decode_cursor(cursor: str) -> Tuple[datetime, str]:
        """Decode cursor from base64 JSON"""
        try:
            cursor_data = json.loads(base64.b64decode(cursor.encode()).decode())
            updated_at = datetime.fromisoformat(cursor_data["updated_at"])
            uid = cursor_data["uid"]
            return updated_at, uid
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid cursor: {str(e)}")
    
    @staticmethod
    def create_cursor_from_row(row: Dict) -> str:
        """Create cursor from database row"""
        updated_at = datetime.fromisoformat(row['updated_at'].replace('Z', '+00:00'))
        return CursorPagination.encode_cursor(updated_at, row['uid'])

# Global queue manager instance
queue_manager = None

def get_queue_manager(supabase: Client) -> QueueManager:
    """Get or create queue manager instance"""
    global queue_manager
    if queue_manager is None:
        queue_manager = QueueManager(supabase)
    return queue_manager
