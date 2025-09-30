"""
EPIC CRM 2.0 - Background Task Processing
Handles all database operations in background for ultra-fast UI
"""

import os
import redis
from rq import Queue
from rq.job import Job
from typing import Dict, Any, Optional, List
import logging
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class BackgroundProcessor:
    def __init__(self):
        """Initialize background processor with Redis Queue"""
        try:
            # Try Redis connection with proper configuration
            try:
                redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
                self.redis_conn = redis.from_url(
                    redis_url,
                    decode_responses=False,  # Don't decode responses to avoid encoding issues
                    encoding='utf-8',
                    encoding_errors='ignore',  # Ignore encoding errors
                    socket_connect_timeout=5,
                    socket_timeout=5
                )
                # Test connection
                self.redis_conn.ping()
                
                # Create queues for different types of operations
                self.lead_queue = Queue('lead_processing', connection=self.redis_conn)
                self.user_queue = Queue('user_processing', connection=self.redis_conn)
                self.notification_queue = Queue('notifications', connection=self.redis_conn)
                
                logger.info("Background processor initialized successfully with Redis")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Using fallback mode.")
                self.redis_conn = None
                self.lead_queue = None
                self.user_queue = None
                self.notification_queue = None
        except Exception as e:
            logger.error(f"Background processor initialization failed: {e}")
            self.redis_conn = None
            self.lead_queue = None
            self.user_queue = None
            self.notification_queue = None
    
    def enqueue_lead_operation(self, operation: str, data: Dict[str, Any], 
                              priority: str = 'normal') -> Optional[str]:
        """Enqueue lead operation for background processing"""
        if not self.lead_queue:
            logger.error("Lead queue not available")
            return None
        
        try:
            job_data = {
                'operation': operation,
                'data': data,
                'timestamp': datetime.now().isoformat(),
                'priority': priority
            }
            
            # Set job timeout based on operation
            timeout_map = {
                'create': 30,
                'update': 20,
                'delete': 15,
                'bulk_update': 60,
                'qualify': 25
            }
            
            timeout = timeout_map.get(operation, 30)
            
            job = self.lead_queue.enqueue(
                f'backend.fastapi_app.lead_worker.process_lead_operation',
                job_data,
                timeout=timeout,
                ttl=300
            )
            
            logger.info(f"Enqueued lead {operation} operation: {job.id}")
            return job.id
            
        except Exception as e:
            logger.error(f"Failed to enqueue lead operation: {e}")
            return None
    
    def enqueue_user_operation(self, operation: str, data: Dict[str, Any]) -> Optional[str]:
        """Enqueue user operation for background processing"""
        if not self.user_queue:
            logger.error("User queue not available")
            return None
        
        try:
            job_data = {
                'operation': operation,
                'data': data,
                'timestamp': datetime.now().isoformat()
            }
            
            job = self.user_queue.enqueue(
                f'backend.fastapi_app.user_worker.process_user_operation',
                job_data,
                timeout=20,
                retry=True
            )
            
            logger.info(f"Enqueued user {operation} operation: {job.id}")
            return job.id
            
        except Exception as e:
            logger.error(f"Failed to enqueue user operation: {e}")
            return None
    
    def get_job_status(self, job_id: str, queue_name: str = 'lead_processing') -> Dict[str, Any]:
        """Get status of background job"""
        try:
            if queue_name == 'lead_processing':
                queue = self.lead_queue
            elif queue_name == 'user_processing':
                queue = self.user_queue
            elif queue_name == 'notifications':
                queue = self.notification_queue
            else:
                return {'status': 'error', 'message': 'Invalid queue name'}
            
            if not queue:
                return {'status': 'error', 'message': 'Queue not available'}
            
            job = Job.fetch(job_id, connection=self.redis_conn)
            
            return {
                'id': job.id,
                'status': job.get_status(),
                'result': job.result if job.is_finished else None,
                'created_at': job.created_at.isoformat() if job.created_at else None,
                'started_at': job.started_at.isoformat() if job.started_at else None,
                'ended_at': job.ended_at.isoformat() if job.ended_at else None,
                'exc_info': job.exc_info if job.is_failed else None
            }
            
        except Exception as e:
            logger.error(f"Failed to get job status: {e}")
            return {'status': 'error', 'message': str(e)}
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get statistics for all queues"""
        try:
            stats = {
                'redis_connected': self.redis_conn is not None,
                'timestamp': datetime.now().isoformat(),
                'queues': {}
            }
            
            if self.lead_queue:
                stats['queues']['lead_queue'] = {
                    'pending': len(self.lead_queue),
                    'failed': len(self.lead_queue.failed_job_registry),
                    'finished': len(self.lead_queue.finished_job_registry),
                    'status': 'active'
                }
            else:
                stats['queues']['lead_queue'] = {
                    'pending': 0,
                    'failed': 0,
                    'finished': 0,
                    'status': 'inactive'
                }
            
            if self.user_queue:
                stats['queues']['user_queue'] = {
                    'pending': len(self.user_queue),
                    'failed': len(self.user_queue.failed_job_registry),
                    'finished': len(self.user_queue.finished_job_registry),
                    'status': 'active'
                }
            else:
                stats['queues']['user_queue'] = {
                    'pending': 0,
                    'failed': 0,
                    'finished': 0,
                    'status': 'inactive'
                }
            
            if self.notification_queue:
                stats['queues']['notification_queue'] = {
                    'pending': len(self.notification_queue),
                    'failed': len(self.notification_queue.failed_job_registry),
                    'finished': len(self.notification_queue.finished_job_registry),
                    'status': 'active'
                }
            else:
                stats['queues']['notification_queue'] = {
                    'pending': 0,
                    'failed': 0,
                    'finished': 0,
                    'status': 'inactive'
                }
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return {'error': str(e)}

# Global background processor instance
background_processor = BackgroundProcessor()

# Fast response functions for immediate UI feedback
def create_lead_async(lead_data: Dict[str, Any], user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Create lead asynchronously and return immediate response"""
    try:
        # Generate temporary ID for immediate UI feedback
        temp_id = f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        # Try to enqueue for background processing
        job_id = background_processor.enqueue_lead_operation(
            'create', 
            {'lead_data': lead_data, 'user_info': user_info}
        )
        
        if job_id:
            return {
                'success': True,
                'temp_id': temp_id,
                'job_id': job_id,
                'message': 'Lead creation started',
                'status': 'processing'
            }
        else:
            # Fallback: process immediately if Redis is not available
            logger.info("Redis not available, processing lead creation immediately")
            from .lead_worker import process_lead_operation
            result = process_lead_operation({
                'operation': 'create',
                'data': {'lead_data': lead_data, 'user_info': user_info}
            })
            
            return {
                'success': result.get('success', False),
                'temp_id': temp_id,
                'job_id': None,
                'message': result.get('message', 'Lead creation completed'),
                'status': 'completed',
                'result': result
            }
        
    except Exception as e:
        logger.error(f"Failed to create lead async: {e}")
        return {
            'success': False,
            'message': f'Failed to start lead creation: {str(e)}',
            'status': 'error'
        }

def update_lead_async(lead_id: str, update_data: Dict[str, Any], user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Update lead asynchronously and return immediate response"""
    try:
        # Try to enqueue for background processing
        job_id = background_processor.enqueue_lead_operation(
            'update', 
            {'lead_id': lead_id, 'update_data': update_data, 'user_info': user_info}
        )
        
        if job_id:
            return {
                'success': True,
                'lead_id': lead_id,
                'job_id': job_id,
                'message': 'Lead update started',
                'status': 'processing'
            }
        else:
            # Fallback: process immediately if Redis is not available
            logger.info("Redis not available, processing lead update immediately")
            from .lead_worker import process_lead_operation
            result = process_lead_operation({
                'operation': 'update',
                'data': {'lead_id': lead_id, 'update_data': update_data, 'user_info': user_info}
            })
            
            return {
                'success': result.get('success', False),
                'lead_id': lead_id,
                'job_id': None,
                'message': result.get('message', 'Lead update completed'),
                'status': 'completed',
                'result': result
            }
        
    except Exception as e:
        logger.error(f"Failed to update lead async: {e}")
        return {
            'success': False,
            'message': f'Failed to start lead update: {str(e)}',
            'status': 'error'
        }

def bulk_update_leads_async(lead_ids: List[str], update_data: Dict[str, Any], user_info: Dict[str, Any]) -> Dict[str, Any]:
    """Bulk update leads asynchronously"""
    try:
        job_id = background_processor.enqueue_lead_operation(
            'bulk_update', 
            {'lead_ids': lead_ids, 'update_data': update_data, 'user_info': user_info},
            priority='high'
        )
        
        return {
            'success': True,
            'job_id': job_id,
            'count': len(lead_ids),
            'message': f'Bulk update started for {len(lead_ids)} leads',
            'status': 'processing'
        }
        
    except Exception as e:
        logger.error(f"Failed to bulk update leads async: {e}")
        return {
            'success': False,
            'message': f'Failed to start bulk update: {str(e)}',
            'status': 'error'
        }

def qualify_lead_async(lead_id: str, user_info: Dict[str, Any], trade_in_info: Dict[str, Any] = None, form_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Qualify lead asynchronously"""
    try:
        # Try to enqueue for background processing
        job_id = background_processor.enqueue_lead_operation(
            'qualify', 
            {'lead_id': lead_id, 'user_info': user_info, 'trade_in_info': trade_in_info or {}, 'form_data': form_data or {}}
        )
        
        if job_id:
            return {
                'success': True,
                'lead_id': lead_id,
                'job_id': job_id,
                'message': 'Lead qualification started',
                'status': 'processing'
            }
        else:
            # Fallback: process immediately if Redis is not available
            logger.info("Redis not available, processing lead qualification immediately")
            from .lead_worker import process_lead_operation
            result = process_lead_operation({
                'operation': 'qualify',
                'data': {'lead_id': lead_id, 'user_info': user_info}
            })
            
            return {
                'success': result.get('success', False),
                'lead_id': lead_id,
                'job_id': None,
                'message': result.get('message', 'Lead qualification completed'),
                'status': 'completed',
                'result': result
            }
        
    except Exception as e:
        logger.error(f"Failed to qualify lead async: {e}")
        return {
            'success': False,
            'message': f'Failed to start lead qualification: {str(e)}',
            'status': 'error'
        }

# Create global instance
background_processor = BackgroundProcessor()
