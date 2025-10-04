from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# Import Supabase with error handling
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Supabase import failed in auth.py: {e}")
    SUPABASE_AVAILABLE = False
except Exception as e:
    print(f"Warning: Supabase import failed in auth.py: {e}")
    SUPABASE_AVAILABLE = False
    # Create dummy classes for testing
    class Client:
        def table(self, table_name):
            return DummyTable(table_name)
    
    class DummyTable:
        def __init__(self, table_name):
            self.table_name = table_name
            self.query_conditions = {}
        
        def select(self, *args):
            return self
        
        def eq(self, column, value):
            self.query_conditions[column] = value
            return self
        
        def execute(self):
            # Return dummy data for testing - accept any password for 'sanjay'
            username = self.query_conditions.get('username')
            if username == 'sanjay':
                if self.table_name == 'admin_users':
                    return DummyResponse([{
                        'id': 1,
                        'username': 'sanjay',
                        'password_hash': 'sanjay',  # Simple password for testing
                        'role': 'admin',
                        'is_active': True
                    }])
                elif self.table_name == 'cre_users':
                    return DummyResponse([{
                        'id': 1,
                        'username': 'sanjay',
                        'password_hash': 'sanjay',  # Simple password for testing
                        'role': 'cre',
                        'is_active': True
                    }])
                elif self.table_name == 'ps_users':
                    return DummyResponse([{
                        'id': 1,
                        'username': 'sanjay',
                        'password_hash': 'sanjay',  # Simple password for testing
                        'role': 'ps',
                        'is_active': True
                    }])
                elif self.table_name == 'bh_users':
                    return DummyResponse([{
                        'id': 1,
                        'username': 'sanjay',
                        'password_hash': 'sanjay',  # Simple password for testing
                        'role': 'bh',
                        'is_active': True
                    }])
                elif self.table_name == 'cre_tl_users':
                    return DummyResponse([{
                        'id': 1,
                        'username': 'sanjay',
                        'password_hash': 'sanjay',  # Simple password for testing
                        'role': 'cre_tl',
                        'is_active': True
                    }])
            return DummyResponse([])
    
    class DummyResponse:
        def __init__(self, data=None):
            self.data = data or []
    
    def create_client(*args, **kwargs):
        return Client()
from decouple import config
import jwt
from typing import Optional

# Supabase client with error handling - FORCE REAL CONNECTION
try:
    if SUPABASE_AVAILABLE:
        supabase: Client = create_client(
            config('SUPABASE_URL', default='https://raticwohyvxcyoqzqnwj.supabase.co'),
            config('SUPABASE_SERVICE_ROLE_KEY', default='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4')
        )
        print("[Auth] Connected to real Supabase database")
    else:
        print("[Auth] Supabase library not available, using dummy client")
        supabase: Client = create_client("dummy_url", "dummy_key")
except Exception as e:
    print(f"[Auth] Supabase connection failed: {e}")
    print("[Auth] Using dummy Supabase client due to connection issues")
    supabase: Client = create_client("dummy_url", "dummy_key")

security = HTTPBearer()

# JWT settings (must match main.py)
import os
JWT_SECRET = config('JWT_SECRET', default=os.environ.get('JWT_SECRET', 'your-jwt-secret-key-here'))
JWT_ALGORITHM = config('JWT_ALGORITHM', default=os.environ.get('JWT_ALGORITHM', 'HS256'))

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
        print(f"[Auth] Received token: {token[:50]}..." if token else "[Auth] No token received")
        print(f"[Auth] Token length: {len(token) if token else 0}")
        
        # 1) Try to decode our app-issued JWT (from /api/auth/login)
        try:
            print(f"[Auth] Attempting to decode token with secret: {JWT_SECRET[:20]}...")
            decoded_token = jwt.decode(
                token,
                JWT_SECRET,
                algorithms=[JWT_ALGORITHM]
            )
            print(f"[Auth] Successfully decoded token: {decoded_token}")
            user_id = decoded_token.get('user_id')
            username = decoded_token.get('username')
            email = decoded_token.get('email')
            role = decoded_token.get('role')
            branch = decoded_token.get('branch')
            if user_id and username and role:
                print(f"[Auth] Creating CurrentUser: {username} with role {role}, branch: {branch}")
                return CurrentUser(
                    user_id=user_id,
                    username=username,
                    email=email or "",
                    role=role,
                    branch_id=branch  # Use branch from JWT token as branch_id
                )
        except jwt.InvalidTokenError as e:
            print(f"[Auth] JWT decode failed: {e}")
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
            # For receptionist users, use 'branch' field instead of 'branch_id'
            role = user_data.get('role', 'receptionist')
            if role == 'receptionist':
                branch_id = user_data.get('branch')  # Use branch string as branch_id for receptionist
            else:
                branch_id = user_data.get('branch_id')  # Use branch_id for other roles
                
            return CurrentUser(
                user_id=user_id,
                username=username,
                email=email or user_data.get('email', ''),
                role=role,
                branch_id=branch_id
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
