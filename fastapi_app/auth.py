"""
Authentication utilities for FastAPI
"""
import os
import requests
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict

security = HTTPBearer()

def verify_token(token: str) -> Optional[Dict]:
    """
    Verify Django auth token and return user info
    """
    try:
        # Make request to Django API to verify token
        django_api_url = os.getenv('DJANGO_API_URL', 'http://localhost:8000')
        headers = {'Authorization': f'Token {token}'}
        
        response = requests.get(f'{django_api_url}/auth/api/profile/', headers=headers)
        
        if response.status_code == 200:
            return response.json()['user']
        else:
            return None
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    """
    Get current user from token
    """
    token = credentials.credentials
    user = verify_token(token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user
