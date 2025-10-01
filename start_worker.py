#!/usr/bin/env python3
"""
EPIC CRM 2.0 - Worker Startup Script
Starts the RQ worker for background lead processing
"""

import os
import sys
import logging
from rq import Worker
import redis

# Set environment variable to disable forking on Windows
os.environ['RQ_WORKER_CLASS'] = 'rq.worker.SimpleWorker'

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def start_worker():
    """Start the RQ worker"""
    try:
        # Redis connection with proper encoding handling
        redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379')
        redis_conn = redis.from_url(
            redis_url,
            decode_responses=False,  # Don't decode responses to avoid encoding issues
            encoding='utf-8',
            encoding_errors='ignore',  # Ignore encoding errors
            socket_connect_timeout=5,
            socket_timeout=5
        )
        
        # Test Redis connection
        redis_conn.ping()
        logger.info("Connected to Redis successfully")
        
        # Import workers module to register functions
        import backend.fastapi_app.workers
        
        # Create worker for all queues with Windows-compatible settings
        from rq.worker import SimpleWorker
        worker = SimpleWorker(['lead_processing', 'user_processing', 'notifications'], connection=redis_conn)
        logger.info("Starting RQ worker for all queues (lead_processing, user_processing, notifications)...")
        # Use simple mode for Windows compatibility (no forking)
        worker.work(with_scheduler=False)
            
    except redis.ConnectionError:
        logger.error("Failed to connect to Redis. Make sure Redis is running on localhost:6379")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error starting worker: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    start_worker()
