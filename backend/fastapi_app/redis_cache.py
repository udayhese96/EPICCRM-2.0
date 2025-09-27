"""
EPIC CRM 2.0 - Redis Caching System
Ultra-fast caching layer for all database operations
"""

import redis
import json
import hashlib
from typing import Any, Optional, Dict, List
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class RedisCache:
    def __init__(self, host='localhost', port=6379, db=0, decode_responses=True):
        """Initialize Redis cache with connection pooling"""
        try:
            redis_url = os.environ.get('REDIS_URL', f'redis://{host}:{port}/{db}')
            self.redis_client = redis.from_url(
                redis_url,
                decode_responses=decode_responses,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                max_connections=20
            )
            # Test connection
            self.redis_client.ping()
            logger.info("Redis cache connected successfully")
        except Exception as e:
            logger.warning(f"Redis cache connection failed: {e}. Using fallback mode.")
            self.redis_client = None
    
    def _generate_key(self, prefix: str, params: Dict[str, Any]) -> str:
        """Generate cache key from parameters"""
        # Sort params for consistent keys
        sorted_params = sorted(params.items())
        param_string = json.dumps(sorted_params, sort_keys=True)
        hash_key = hashlib.md5(param_string.encode()).hexdigest()
        return f"epic_crm:{prefix}:{hash_key}"
    
    def get(self, prefix: str, params: Dict[str, Any]) -> Optional[Any]:
        """Get cached data"""
        if not self.redis_client:
            return None
        
        try:
            key = self._generate_key(prefix, params)
            cached_data = self.redis_client.get(key)
            if cached_data:
                return json.loads(cached_data)
            return None
        except Exception as e:
            logger.error(f"Redis get error: {e}")
            return None
    
    def set(self, prefix: str, params: Dict[str, Any], data: Any, ttl: int = 300) -> bool:
        """Cache data with TTL (default 5 minutes)"""
        if not self.redis_client:
            return False
        
        try:
            key = self._generate_key(prefix, params)
            serialized_data = json.dumps(data, default=str)
            return self.redis_client.setex(key, ttl, serialized_data)
        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False
    
    def delete(self, prefix: str, params: Dict[str, Any]) -> bool:
        """Delete cached data"""
        if not self.redis_client:
            return False
        
        try:
            key = self._generate_key(prefix, params)
            return self.redis_client.delete(key)
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.redis_client:
            return 0
        
        try:
            keys = self.redis_client.keys(f"epic_crm:{pattern}*")
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis delete pattern error: {e}")
            return 0
    
    def invalidate_lead_cache(self, lead_id: str = None):
        """Invalidate lead-related cache"""
        patterns_to_clear = [
            "leads:*",
            "lead_master:*",
            "qualified_leads:*",
            "ps_followup:*"
        ]
        
        if lead_id:
            patterns_to_clear.extend([
                f"leads:{lead_id}:*",
                f"lead_master:{lead_id}:*"
            ])
        
        total_deleted = 0
        for pattern in patterns_to_clear:
            total_deleted += self.delete_pattern(pattern)
        
        logger.info(f"Invalidated {total_deleted} lead cache entries")
        return total_deleted
    
    def invalidate_user_cache(self, user_id: str = None):
        """Invalidate user-related cache"""
        patterns_to_clear = [
            "users:*",
            "admin_users:*",
            "cre_users:*",
            "ps_users:*",
            "bh_users:*",
            "cre_tl_users:*"
        ]
        
        if user_id:
            patterns_to_clear.extend([
                f"users:{user_id}:*",
                f"admin_users:{user_id}:*"
            ])
        
        total_deleted = 0
        for pattern in patterns_to_clear:
            total_deleted += self.delete_pattern(pattern)
        
        logger.info(f"Invalidated {total_deleted} user cache entries")
        return total_deleted

# Global cache instance
cache = RedisCache()  # Will use REDIS_URL from environment

# Cache decorators for automatic caching
def cache_result(prefix: str, ttl: int = 300):
    """Decorator to automatically cache function results"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_params = {
                'func': func.__name__,
                'args': args,
                'kwargs': kwargs
            }
            
            # Try to get from cache first
            cached_result = cache.get(prefix, cache_params)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(prefix, cache_params, result, ttl)
            logger.debug(f"Cached result for {func.__name__}")
            
            return result
        return wrapper
    return decorator

# Specific cache functions for common operations
def cache_leads(params: Dict[str, Any], data: List[Dict], ttl: int = 180):
    """Cache leads data"""
    return cache.set("leads", params, data, ttl)

def get_cached_leads(params: Dict[str, Any]) -> Optional[List[Dict]]:
    """Get cached leads data"""
    return cache.get("leads", params)

def cache_users(table_name: str, params: Dict[str, Any], data: List[Dict], ttl: int = 600):
    """Cache user data"""
    return cache.set(f"users_{table_name}", params, data, ttl)

def get_cached_users(table_name: str, params: Dict[str, Any]) -> Optional[List[Dict]]:
    """Get cached user data"""
    return cache.get(f"users_{table_name}", params)

def cache_lead_stats(params: Dict[str, Any], data: Dict, ttl: int = 120):
    """Cache lead statistics"""
    return cache.set("lead_stats", params, data, ttl)

def get_cached_lead_stats(params: Dict[str, Any]) -> Optional[Dict]:
    """Get cached lead statistics"""
    return cache.get("lead_stats", params)

# Fast cache invalidation for real-time updates
def invalidate_on_lead_change(lead_id: str, operation: str = "update"):
    """Invalidate cache when lead changes"""
    cache.invalidate_lead_cache(lead_id)
    
    # Also invalidate related caches
    cache.delete_pattern("lead_stats:*")
    cache.delete_pattern("qualified_leads:*")
    
    logger.info(f"Cache invalidated for lead {lead_id} operation: {operation}")

def invalidate_on_user_change(user_id: str, operation: str = "update"):
    """Invalidate cache when user changes"""
    cache.invalidate_user_cache(user_id)
    logger.info(f"Cache invalidated for user {user_id} operation: {operation}")
