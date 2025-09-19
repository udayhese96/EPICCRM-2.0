from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from decouple import config
import jwt
from typing import Optional

# Supabase client
supabase: Client = create_client(
    config('SUPABASE_URL'),
    config('SUPABASE_SERVICE_ROLE_KEY')
)

security = HTTPBearer()

# JWT settings (must match main.py)
JWT_SECRET = config('JWT_SECRET', default='your-jwt-secret-key-here')
JWT_ALGORITHM = config('JWT_ALGORITHM', default='HS256')

class CurrentUser:
    def __init__(self, user_id: str, username: str, email: str, role: str, branch_id: Optional[str] = None):
        self.id = user_id
        self.username = username  # Added username field
        self.email = email
        self.role = role
        self.branch_id = branch_id

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> CurrentUser:
    """Get current authenticated user from JWT token"""
    try:
        token = credentials.credentials
        
        # 1) Try to decode our app-issued JWT (from /api/auth/login)
        try:
            decoded_token = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=[JWT_ALGORITHM]
            )
            user_id = decoded_token.get('user_id')
            username = decoded_token.get('username')
            email = decoded_token.get('email')
            role = decoded_token.get('role')
            if user_id and username and role:
                return CurrentUser(
                    user_id=user_id,
                    username=username,
                    email=email or "",
                    role=role,
                    branch_id=None
                )
        except jwt.InvalidTokenError:
            pass
        
        # 2) Fallback: decode JWT token with Supabase secret (if present)
        try:
            decoded_token = jwt.decode(
                token,
                config('SUPABASE_JWT_SECRET', default='fallback-secret'),
                algorithms=['HS256'],
                options={"verify_signature": False}
            )
            user_id = decoded_token.get('sub')
            username = decoded_token.get('username')
            email = decoded_token.get('email')
            if not user_id or not username:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )
            # Get user details from database
            user_response = supabase.table('users').select('*').eq('id', user_id).execute()
            if not user_response.data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )
            user_data = user_response.data[0]
            return CurrentUser(
                user_id=user_id,
                username=username,
                email=email or user_data.get('email', ''),
                role=user_data.get('role', 'receptionist'),
                branch_id=user_data.get('branch_id')
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


def require_role(allowed_roles: list):
    """Decorator to require specific roles"""
    def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker

# Role-based dependencies
admin_required = require_role(['admin'])
admin_or_branch_head = require_role(['admin', 'branch_head'])
can_manage_leads = require_role(['admin', 'branch_head', 'cre', 'ps', 'cre_team_leader'])
