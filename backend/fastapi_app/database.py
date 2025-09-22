"""
EPIC CRM 2.0 - Database Connection Management
Handles both Supabase and direct PostgreSQL connections for performance optimization
"""

import os
import psycopg2
from psycopg2 import pool
# Import Supabase with error handling
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Supabase import failed in database.py: {e}")
    SUPABASE_AVAILABLE = False
    # Create dummy classes for testing
    class Client:
        def table(self, table_name):
            return DummyTable()
    
    class DummyTable:
        def select(self, *args):
            return self
        def eq(self, *args):
            return self
        def execute(self):
            return DummyResponse()
    
    class DummyResponse:
        def __init__(self, data=None):
            self.data = data or []
    
    def create_client(*args, **kwargs):
        return Client()
from decouple import config
import logging

logger = logging.getLogger(__name__)

# Database connection pool
connection_pool = None

def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    SUPABASE_URL = config('SUPABASE_URL', default=os.environ.get('SUPABASE_URL'))
    SUPABASE_SERVICE_ROLE_KEY = config('SUPABASE_SERVICE_ROLE_KEY', default=os.environ.get('SUPABASE_SERVICE_ROLE_KEY'))
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.")
    
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def get_database_connection():
    """Get direct PostgreSQL connection from pool"""
    global connection_pool
    
    if connection_pool is None:
        # Get database connection details from Supabase URL
        supabase_url = config('SUPABASE_URL', default=os.environ.get('SUPABASE_URL'))
        if not supabase_url:
            raise ValueError("SUPABASE_URL not found")
        
        # Extract connection details from Supabase URL
        # Format: https://project.supabase.co
        # We need to construct the PostgreSQL connection string
        project_id = supabase_url.split('//')[1].split('.')[0]
        
        # Get database password from environment
        db_password = config('SUPABASE_DB_PASSWORD', default=os.environ.get('SUPABASE_DB_PASSWORD'))
        if not db_password:
            raise ValueError("SUPABASE_DB_PASSWORD not found")
        
        # Construct connection string
        conn_string = f"postgresql://postgres.{project_id}:{db_password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
        
        try:
            connection_pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=conn_string
            )
            logger.info("Database connection pool created successfully")
        except Exception as e:
            logger.error(f"Error creating connection pool: {str(e)}")
            raise
    
    return connection_pool.getconn()

def return_database_connection(conn):
    """Return connection to pool"""
    global connection_pool
    if connection_pool:
        connection_pool.putconn(conn)

def close_all_connections():
    """Close all connections in pool"""
    global connection_pool
    if connection_pool:
        connection_pool.closeall()
        connection_pool = None
