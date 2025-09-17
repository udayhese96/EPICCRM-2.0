from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from supabase import create_client, Client
import os
from decouple import config
from .auth import get_current_user, admin_required, admin_or_branch_head, can_manage_leads
from datetime import datetime
from zoneinfo import ZoneInfo
from .models import (UserCreate, UserUpdate, UserResponse, LoginRequest, LoginResponse, ChangePasswordRequest,
                    LeadCreate, LeadUpdate, LeadResponse, LeadListResponse, ActivityCreate, ActivityResponse,
                    BulkAssignRequest, BulkStatusUpdateRequest, LeadStatistics)

app = FastAPI(title="EPIC CRM 2.0 API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client (robust env loading)
SUPABASE_URL = config('SUPABASE_URL', default=os.environ.get('SUPABASE_URL'))
SUPABASE_SERVICE_ROLE_KEY = config('SUPABASE_SERVICE_ROLE_KEY', default=os.environ.get('SUPABASE_SERVICE_ROLE_KEY'))

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("[FastAPI] Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

security = HTTPBearer()

# Time utilities
def now_ist_iso() -> str:
    """Return current timestamp in Asia/Kolkata (IST) as ISO string with offset."""
    try:
        return datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
    except Exception:
        # Fallback to naive ISO if zoneinfo not available
        return datetime.now().isoformat()

# Pydantic models
class LeadCreate(BaseModel):
    name: str
    email: str
    phone: str
    company: Optional[str] = None
    source: str = "website"
    notes: Optional[str] = None
    expected_value: Optional[float] = None
    assigned_to: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    notes: Optional[str] = None
    expected_value: Optional[float] = None
    assigned_to: Optional[str] = None
    # New optional fields mapping to lead_master
    model_interested: Optional[str] = None
    lead_category: Optional[str] = None
    variant: Optional[str] = None
    buying_plan: Optional[str] = None
    finance_option: Optional[str] = None
    first_remark: Optional[str] = None
    profession: Optional[str] = None
    trade_in: Optional[str] = None
    trade_in_make: Optional[str] = None
    trade_in_model: Optional[str] = None
    trade_in_year: Optional[str] = None
    trade_in_km: Optional[str] = None
    trade_in_ownership: Optional[str] = None
    test_drive_type: Optional[str] = None
    follow_up_date: Optional[str] = None
    call_status: Optional[str] = None
    # New: location field to store into lead_master.customer_location
    customer_location: Optional[str] = None
    # New: follow-up note for qualified workflow (maps to second..fifth remarks)
    followup_note: Optional[str] = None
    # New: allow updating final_status (Won/Lost/Pending)
    final_status: Optional[str] = None

class ActivityCreate(BaseModel):
    activity_type: str
    subject: str
    description: str
    scheduled_at: Optional[str] = None

# Authentication dependency
# async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
#     try:
#         # Verify the token with Supabase
#         user = supabase.auth.get_user(credentials.credentials)
#         if not user:
#             raise HTTPException(
#                 status_code=status.HTTP_401_UNAUTHORIZED,
#                 detail="Invalid authentication credentials"
#             )
#         return user
#     except Exception:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Invalid authentication credentials"
#         )

# Hardcoded users for testing
HARDCODED_USERS = {
    "admin": {
        "id": "admin-001",
        "username": "admin",
        "email": "admin@epiccrm.com",
        "password": "admin123",
        "first_name": "System",
        "last_name": "Administrator",
        "role": "admin",
        "phone": "+1234567890",
        "branch_id": None,
        "is_active": True
    },
    "cre": {
        "id": "cre-001", 
        "username": "cre",
        "email": "cre@epiccrm.com",
        "password": "cre123",
        "first_name": "Customer",
        "last_name": "Executive",
        "role": "cre",
        "phone": "+1234567891",
        "branch_id": "branch-001",
        "is_active": True
    },
    "ps": {
        "id": "ps-001",
        "username": "ps", 
        "email": "ps@epiccrm.com",
        "password": "ps123",
        "first_name": "Pre",
        "last_name": "Sales",
        "role": "ps",
        "phone": "+1234567892",
        "branch_id": "branch-001", 
        "is_active": True
    },
    "branchhead": {
        "id": "bh-001",
        "username": "branchhead",
        "email": "branchhead@epiccrm.com", 
        "password": "branch123",
        "first_name": "Branch",
        "last_name": "Manager",
        "role": "branch_head",
        "phone": "+1234567893",
        "branch_id": "branch-001",
        "is_active": True
    }
}

# API Routes
@app.get("/")
async def root():
    return {"message": "EPIC CRM 2.0 FastAPI Backend"}

@app.get("/api/leads", response_model=List[LeadListResponse])
async def get_leads(
    status: Optional[str] = None,
    source: Optional[str] = None,
    assigned_to: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    """Get leads with filtering and pagination"""
    try:
        query = supabase.table('leads').select('''
            *,
            assigned_user:users!assigned_to(id, first_name, last_name, email),
            branch:branches!branch_id(id, name, code)
        ''')
        
        # Apply role-based filtering
        if current_user.role == 'branch_head':
            query = query.eq('branch_id', current_user.branch_id)
        elif current_user.role not in ['admin', 'branch_head']:
            query = query.eq('assigned_to', current_user.id)
        
        # Apply filters
        if status:
            query = query.eq('status', status)
        if source:
            query = query.eq('source', source)
        if assigned_to:
            query = query.eq('assigned_to', assigned_to)
        if search:
            query = query.or_(f'name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%,company.ilike.%{search}%')
        
        # Apply pagination and ordering
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)
        
        response = query.execute()
        
        # Get activity counts for each lead
        leads_with_counts = []
        for lead in response.data:
            # Get activity count
            activity_response = supabase.table('lead_activities').select('id', count='exact').eq('lead_id', lead['id']).execute()
            activity_count = activity_response.count or 0
            
            # Get last activity
            last_activity_response = supabase.table('lead_activities').select('activity_type, subject, created_at').eq('lead_id', lead['id']).order('created_at', desc=True).limit(1).execute()
            last_activity = last_activity_response.data[0] if last_activity_response.data else None
            
            lead_data = {
                **lead,
                'activities_count': activity_count,
                'last_activity': last_activity
            }
            leads_with_counts.append(LeadListResponse(**lead_data))
        
        return leads_with_counts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/leads", response_model=LeadResponse)
async def create_lead(lead: LeadCreate, current_user=Depends(can_manage_leads)):
    """Create a new lead"""
    try:
        lead_data = {
            **lead.dict(),
            "status": "new",
            "branch_id": current_user.branch_id,
            "assigned_to": lead.assigned_to or current_user.id
        }
        
        response = supabase.table('leads').insert(lead_data).execute()
        
        if response.data:
            # Create initial activity
            activity_data = {
                "lead_id": response.data[0]['id'],
                "user_id": current_user.id,
                "activity_type": "note",
                "subject": "Lead Created",
                "description": f"Lead created by {current_user.email}"
            }
            supabase.table('lead_activities').insert(activity_data).execute()
            
            return LeadResponse(**response.data[0])
        else:
            raise HTTPException(status_code=500, detail="Failed to create lead")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, current_user=Depends(get_current_user)):
    """Get lead by ID with activities"""
    try:
        response = supabase.table('leads').select('''
            *,
            assigned_user:users!assigned_to(id, first_name, last_name, email),
            branch:branches!branch_id(id, name, code),
            activities:lead_activities(
                id, activity_type, subject, description, 
                scheduled_at, completed_at, created_at,
                user:users(id, first_name, last_name, email)
            )
        ''').eq('id', lead_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_data = response.data[0]
        
        # Check permissions
        if (current_user.role == 'branch_head' and 
            lead_data.get('branch_id') != current_user.branch_id):
            raise HTTPException(status_code=403, detail="Access denied")
        elif (current_user.role not in ['admin', 'branch_head'] and 
              lead_data.get('assigned_to') != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        return LeadResponse(**lead_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str, 
    lead: LeadUpdate, 
    current_user=Depends(can_manage_leads)
):
    """Update lead information"""
    try:
        # Get existing lead
        existing_response = supabase.table('leads').select('*').eq('id', lead_id).execute()
        
        if not existing_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        existing_lead = existing_response.data[0]
        
        # Check permissions
        if (current_user.role == 'branch_head' and 
            existing_lead.get('branch_id') != current_user.branch_id):
            raise HTTPException(status_code=403, detail="Access denied")
        elif (current_user.role not in ['admin', 'branch_head'] and 
              existing_lead.get('assigned_to') != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update lead
        update_data = {k: v for k, v in lead.dict().items() if v is not None}
        response = supabase.table('leads').update(update_data).eq('id', lead_id).execute()
        
        # Track status changes
        if lead.status and existing_lead['status'] != lead.status:
            activity_data = {
                "lead_id": lead_id,
                "user_id": current_user.id,
                "activity_type": "note",
                "subject": "Status Changed",
                "description": f"Status changed from {existing_lead['status']} to {lead.status}"
            }
            supabase.table('lead_activities').insert(activity_data).execute()
        
        return LeadResponse(**response.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user=Depends(can_manage_leads)):
    """Delete a lead"""
    try:
        # Check if lead exists and permissions
        existing_response = supabase.table('leads').select('*').eq('id', lead_id).execute()
        
        if not existing_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        existing_lead = existing_response.data[0]
        
        # Only admins and branch heads can delete leads
        if current_user.role not in ['admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        if (current_user.role == 'branch_head' and 
            existing_lead.get('branch_id') != current_user.branch_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Delete lead (activities will be deleted by cascade)
        supabase.table('leads').delete().eq('id', lead_id).execute()
        
        return {"message": "Lead deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/{lead_id}/activities", response_model=List[ActivityResponse])
async def get_lead_activities(lead_id: str, current_user=Depends(get_current_user)):
    """Get activities for a specific lead"""
    try:
        # Check lead access
        lead_response = supabase.table('leads').select('*').eq('id', lead_id).execute()
        
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_data = lead_response.data[0]
        
        # Check permissions
        if (current_user.role == 'branch_head' and 
            lead_data.get('branch_id') != current_user.branch_id):
            raise HTTPException(status_code=403, detail="Access denied")
        elif (current_user.role not in ['admin', 'branch_head'] and 
              lead_data.get('assigned_to') != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get activities
        response = supabase.table('lead_activities').select('''
            *,
            user:users(id, first_name, last_name, email)
        ''').eq('lead_id', lead_id).order('created_at', desc=True).execute()
        
        return [ActivityResponse(**activity) for activity in response.data]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/leads/{lead_id}/activities", response_model=ActivityResponse)
async def create_lead_activity(
    lead_id: str, 
    activity: ActivityCreate, 
    current_user=Depends(can_manage_leads)
):
    """Create a new activity for a lead"""
    try:
        # Check lead access
        lead_response = supabase.table('leads').select('*').eq('id', lead_id).execute()
        
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_data = lead_response.data[0]
        
        # Check permissions
        if (current_user.role not in ['admin', 'branch_head'] and 
            lead_data.get('assigned_to') != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create activity
        activity_data = {
            **activity.dict(),
            "lead_id": lead_id,
            "user_id": current_user.id
        }
        
        response = supabase.table('lead_activities').insert(activity_data).execute()
        
        return ActivityResponse(**response.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/statistics", response_model=LeadStatistics)
async def get_lead_statistics(current_user=Depends(get_current_user)):
    """Get lead statistics for dashboard"""
    try:
        # Base query based on user role
        base_query = supabase.table('leads').select('*', count='exact')
        
        if current_user.role == 'branch_head':
            base_query = base_query.eq('branch_id', current_user.branch_id)
        elif current_user.role not in ['admin', 'branch_head']:
            base_query = base_query.eq('assigned_to', current_user.id)
        
        # Get total leads
        total_response = base_query.execute()
        total_leads = total_response.count or 0
        
        # Get status counts
        status_counts = {}
        for status in ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']:
            query = supabase.table('leads').select('*', count='exact').eq('status', status)
            
            if current_user.role == 'branch_head':
                query = query.eq('branch_id', current_user.branch_id)
            elif current_user.role not in ['admin', 'branch_head']:
                query = query.eq('assigned_to', current_user.id)
            
            response = query.execute()
            status_counts[status] = response.count or 0
        
        # Calculate conversion rate
        conversion_rate = round((status_counts['closed_won'] / total_leads * 100) if total_leads > 0 else 0, 2)
        
        # Get status distribution
        status_distribution = [
            {"status": status, "count": count} 
            for status, count in status_counts.items()
        ]
        
        # Get source distribution
        source_distribution = []
        for source in ['website', 'referral', 'social_media', 'advertisement', 'cold_call', 'walk_in']:
            query = supabase.table('leads').select('*', count='exact').eq('source', source)
            
            if current_user.role == 'branch_head':
                query = query.eq('branch_id', current_user.branch_id)
            elif current_user.role not in ['admin', 'branch_head']:
                query = query.eq('assigned_to', current_user.id)
            
            response = query.execute()
            count = response.count or 0
            if count > 0:
                source_distribution.append({"source": source, "count": count})
        
        # Monthly trends (simplified - would need more complex query for real implementation)
        monthly_trends = []  # This would require more complex date aggregation
        
        return LeadStatistics(
            total_leads=total_leads,
            new_leads=status_counts['new'],
            qualified_leads=status_counts['qualified'],
            closed_won=status_counts['closed_won'],
            closed_lost=status_counts['closed_lost'],
            conversion_rate=conversion_rate,
            status_distribution=status_distribution,
            source_distribution=source_distribution,
            monthly_trends=monthly_trends
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/leads/bulk-assign")
async def bulk_assign_leads(
    request: BulkAssignRequest, 
    current_user=Depends(can_manage_leads)
):
    """Bulk assign leads to a user"""
    try:
        # Check if assigned user exists
        user_response = supabase.table('users').select('*').eq('id', request.assigned_to).execute()
        
        if not user_response.data:
            raise HTTPException(status_code=404, detail="Assigned user not found")
        
        assigned_user = user_response.data[0]
        updated_count = 0
        
        # Update each lead
        for lead_id in request.lead_ids:
            # Check lead exists and permissions
            lead_response = supabase.table('leads').select('*').eq('id', lead_id).execute()
            
            if not lead_response.data:
                continue
            
            lead_data = lead_response.data[0]
            
            # Check permissions
            if (current_user.role == 'branch_head' and 
                lead_data.get('branch_id') != current_user.branch_id):
                continue
            elif current_user.role not in ['admin', 'branch_head']:
                continue
            
            # Update lead
            supabase.table('leads').update({"assigned_to": request.assigned_to}).eq('id', lead_id).execute()
            
            # Create activity
            activity_data = {
                "lead_id": lead_id,
                "user_id": current_user.id,
                "activity_type": "note",
                "subject": "Lead Reassigned",
                "description": f"Lead assigned to {assigned_user.get('first_name', '')} {assigned_user.get('last_name', '')}"
            }
            supabase.table('lead_activities').insert(activity_data).execute()
            
            updated_count += 1
        
        return {
            "message": f"{updated_count} leads assigned successfully",
            "updated_count": updated_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/leads/bulk-update-status")
async def bulk_update_status(
    request: BulkStatusUpdateRequest, 
    current_user=Depends(can_manage_leads)
):
    """Bulk update lead status"""
    try:
        updated_count = 0
        
        # Update each lead
        for lead_id in request.lead_ids:
            # Check lead exists and permissions
            lead_response = supabase.table('leads').select('*').eq('id', lead_id).execute()
            
            if not lead_response.data:
                continue
            
            lead_data = lead_response.data[0]
            
            # Check permissions
            if (current_user.role == 'branch_head' and 
                lead_data.get('branch_id') != current_user.branch_id):
                continue
            elif current_user.role not in ['admin', 'branch_head']:
                continue
            
            # Update lead
            supabase.table('leads').update({"status": request.status}).eq('id', lead_id).execute()
            
            # Create activity
            activity_data = {
                "lead_id": lead_id,
                "user_id": current_user.id,
                "activity_type": "note",
                "subject": "Status Updated",
                "description": f"Status changed to {request.status}"
            }
            supabase.table('lead_activities').insert(activity_data).execute()
            
            updated_count += 1
        
        return {
            "message": f"{updated_count} leads updated successfully",
            "updated_count": updated_count
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/register", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.admin_create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Failed to create user")
        
        # Create user record in database
        user_record = {
            "id": auth_response.user.id,
            "email": user_data.email,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "role": user_data.role,
            "phone": user_data.phone,
            "branch_id": user_data.branch_id,
            "is_active": True
        }
        
        response = supabase.table('users').insert(user_record).execute()
        
        if response.data:
            return UserResponse(**response.data[0])
        else:
            raise HTTPException(status_code=500, detail="Failed to create user record")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Login user with username and password from separate role tables"""
    try:
        import jwt
        import datetime
        
        # Define the user tables for each role (matching new schema)
        user_tables = {
            'admin': ('admin_users', 'admin'),
            'cre': ('cre_users', 'cre'), 
            'ps': ('ps_users', 'ps'),
            'branchhead': ('bh_users', 'branch_head')
        }
        
        user_data = None
        user_role = None
        
        # Search through each user table to find the username
        print(f"[login] Attempt for username={login_data.username}")
        for username_prefix, (table_name, role) in user_tables.items():
            try:
                response = supabase.table(table_name).select('*').eq('username', login_data.username).limit(1).execute()
                print(f"[login] Checked {table_name}: count={len(response.data) if response.data else 0}")
                if response.data:
                    user_data = response.data[0]
                    user_role = role
                    print(f"[login] Found in {table_name} with role={role}")
                    break
            except Exception as e:
                print(f"[login] Error checking {table_name}: {e}")
                continue
        
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Verify password (accept plain or SHA-256 hash)
        stored_password = (
            user_data.get('password_hash')
            or user_data.get('password')
            or ''
        )
        provided_password = str(login_data.password or '')
        is_valid = False
        try:
            import hashlib
            provided_sha256 = hashlib.sha256(provided_password.encode()).hexdigest()
        except Exception:
            provided_sha256 = ''

        # Valid if direct match OR sha256 match
        if str(stored_password) == provided_password or (provided_sha256 and str(stored_password) == provided_sha256):
            is_valid = True

        if not is_valid:
            print(f"[login] Password mismatch for user={login_data.username}")
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Accept missing status; also honor boolean is_active
        raw_status = user_data.get('status')
        if raw_status is None and 'is_active' in user_data:
            raw_status = 'active' if user_data.get('is_active') else 'inactive'
        user_status = (raw_status or 'active')
        if isinstance(user_status, bool):
            user_status = 'active' if user_status else 'inactive'
        user_status = str(user_status).lower()
        if user_status not in ['active', 'enabled', 'true', '1']:
            print(f"[login] Inactive user: status={user_status}")
            raise HTTPException(status_code=401, detail="Account is not active")
        
        # Create JWT token
        token_payload = {
            "sub": user_data["id"],
            "username": user_data["username"],
            "email": user_data["email"],
            "role": user_role,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        
        token = jwt.encode(token_payload, "hardcoded-secret", algorithm="HS256")
        
        print(f"[login] Success user={login_data.username} role={user_role}")
        return LoginResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(
                id=user_data.get("id", ""),
                username=user_data.get("username", ""),
                email=user_data.get("email", ""),
                first_name=user_data.get("first_name") or user_data.get("name", ""),
                last_name=user_data.get("last_name", ""),
                role=user_role,
                status=user_status,
                phone=user_data.get("phone", ""),
                branch_id=user_data.get("branch_id")
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=401, detail="Invalid username or password")

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user=Depends(get_current_user)):
    """Get current user information"""
    try:
        response = supabase.table('users').select('*').eq('id', current_user.id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(**response.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user=Depends(get_current_user)
):
    """Change user password"""
    try:
        # Verify old password by attempting to sign in
        auth_response = supabase.auth.sign_in_with_password({
            "email": current_user.email,
            "password": password_data.old_password
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Invalid old password")
        
        # Update password
        supabase.auth.admin_update_user_by_id(
            current_user.id,
            {"password": password_data.new_password}
        )
        
        return {"message": "Password changed successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users", response_model=List[UserResponse])
async def get_users(current_user=Depends(admin_or_branch_head)):
    """Get list of users based on role permissions"""
    try:
        query = supabase.table('users').select('*')
        
        # Branch heads can only see users in their branch
        if current_user.role == 'branch_head':
            query = query.eq('branch_id', current_user.branch_id)
        
        response = query.execute()
        return [UserResponse(**user) for user in response.data]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, current_user=Depends(admin_or_branch_head)):
    """Create a new user"""
    return await register_user(user_data)

@app.get("/api/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user=Depends(admin_or_branch_head)):
    """Get user by ID"""
    try:
        response = supabase.table('users').select('*').eq('id', user_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = response.data[0]
        
        # Branch heads can only see users in their branch
        if (current_user.role == 'branch_head' and 
            user_data.get('branch_id') != current_user.branch_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        return UserResponse(**user_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str, 
    user_data: UserUpdate, 
    current_user=Depends(admin_or_branch_head)
):
    """Update user information"""
    try:
        # Check if user exists and permissions
        existing_user = supabase.table('users').select('*').eq('id', user_id).execute()
        
        if not existing_user.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Branch heads can only update users in their branch
        if (current_user.role == 'branch_head' and 
            existing_user.data[0].get('branch_id') != current_user.branch_id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update user
        update_data = {k: v for k, v in user_data.dict().items() if v is not None}
        response = supabase.table('users').update(update_data).eq('id', user_id).execute()
        
        return UserResponse(**response.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# LEAD MANAGEMENT ENDPOINTS
# ========================================

@app.get("/api/leads", response_model=List[LeadResponse])
async def get_leads(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    current_user=Depends(can_manage_leads)
):
    """Get leads based on user role and filters"""
    try:
        query = supabase.table('lead_master').select('*')
        
        # Apply role-based filtering
        if current_user.role == 'cre':
            query = query.eq('cre_name', current_user.username)
        elif current_user.role == 'ps':
            query = query.eq('ps_name', current_user.username)
        elif current_user.role == 'branch_head':
            query = query.eq('branch_id', current_user.branch_id)
        
        # Apply additional filters
        if status:
            query = query.eq('final_status', status)
        if assigned_to:
            if current_user.role in ['admin', 'branch_head']:
                query = query.eq('cre_name', assigned_to)
        
        response = query.order('created_at', desc=True).execute()
        return [LeadResponse(**lead) for lead in response.data or []]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/leads", response_model=LeadResponse)
async def create_lead(lead_data: LeadCreate, current_user=Depends(can_manage_leads)):
    """Create a new lead"""
    try:
        import uuid
        
        # Generate unique UID
        lead_uid = f"LD{str(uuid.uuid4())[:8].upper()}"
        
        lead_record = {
            "uid": lead_uid,
            "customer_name": lead_data.name,
            "customer_mobile_number": lead_data.phone,
            "source": lead_data.source,
            "lead_category": "Fresh",
            "model_interested": lead_data.notes,
            "branch": current_user.branch_id if hasattr(current_user, 'branch_id') else 1,
            "assigned": "Yes" if lead_data.assigned_to else "No",
            "cre_name": lead_data.assigned_to,
            "lead_status": "New",
            "final_status": "Pending",
            "created_at": now_ist_iso(),
            "updated_at": now_ist_iso()
        }
        
        response = supabase.table('lead_master').insert(lead_record).execute()
        
        if response.data:
            return LeadResponse(**response.data[0])
        else:
            raise HTTPException(status_code=500, detail="Failed to create lead")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AdminLeadCreate(BaseModel):
    customer_name: str
    customer_mobile_number: str
    source: str
    sub_source: Optional[str] = None
    assigned_cre_id: Optional[str] = None
    assigned_cre_name: Optional[str] = None

class CRELeadCreate(BaseModel):
    uid: str
    customer_name: str
    customer_mobile_number: str
    customer_email: Optional[str] = None
    customer_location: Optional[str] = None
    source: str
    campaign: Optional[str] = None
    cre_name: str
    cre_id: str
    assigned: str = "Yes"
    lead_status: str = "Fresh"
    final_status: str = "Pending"
    lead_category: str = "Warm"
    remarks: Optional[str] = None
    created_at: str
    updated_at: str

@app.post("/api/admin/leads", response_model=dict)
async def create_admin_lead(lead_data: AdminLeadCreate, current_user=Depends(admin_required)):
    """Create a new lead with CRE assignment for admin"""
    try:
        import uuid
        
        # Generate unique UID
        lead_uid = f"LD{str(uuid.uuid4())[:8].upper()}"
        
        # Create lead data
        insert_data = {
            "uid": lead_uid,
            "customer_name": lead_data.customer_name,
            "customer_mobile_number": lead_data.customer_mobile_number,
            "source": lead_data.source,
            "sub_source": lead_data.sub_source,
            "date": now_ist_iso(),
            "lead_category": "Fresh",
            "lead_status": "New",
            "final_status": "Pending",
            "created_at": now_ist_iso(),
            "updated_at": now_ist_iso()
        }
        
        # If CRE is assigned, mark as assigned
        if lead_data.assigned_cre_id and lead_data.assigned_cre_name:
            insert_data["assigned"] = "Yes"
            insert_data["cre_id"] = lead_data.assigned_cre_id
            insert_data["cre_name"] = lead_data.assigned_cre_name
            insert_data["cre_assigned_at"] = now_ist_iso()
        else:
            insert_data["assigned"] = "No"
        
        response = supabase.table('lead_master').insert(insert_data).execute()
        if response.data:
            return {"message": "Lead created successfully", "lead": response.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create lead")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cre/leads", response_model=dict)
async def create_cre_lead(lead_data: CRELeadCreate, current_user=Depends(get_current_user)):
    """Create a new lead for CRE users"""
    try:
        # Verify the CRE user is creating the lead for themselves
        if current_user.role != 'cre' or current_user.id != lead_data.cre_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create lead record
        lead_record = {
            "uid": lead_data.uid,
            "customer_name": lead_data.customer_name,
            "customer_mobile_number": lead_data.customer_mobile_number,
            "customer_email": lead_data.customer_email,
            "customer_location": lead_data.customer_location,
            "source": lead_data.source,
            "campaign": lead_data.campaign,
            "sub_source": lead_data.campaign,  # Map campaign to sub_source
            "cre_name": lead_data.cre_name,
            "cre_id": lead_data.cre_id,
            "assigned": lead_data.assigned,
            "lead_status": lead_data.lead_status,
            "final_status": lead_data.final_status,
            "lead_category": lead_data.lead_category,
            "first_remark": lead_data.remarks,
            "date": now_ist_iso(),
            "created_at": now_ist_iso(),
            "updated_at": now_ist_iso(),
            "cre_assigned_at": now_ist_iso()
        }
        
        response = supabase.table('lead_master').insert(lead_record).execute()
        
        if response.data:
            return {"message": "Lead created successfully", "lead": response.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create lead")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, current_user=Depends(can_manage_leads)):
    """Get a specific lead by ID or UID"""
    try:
        # Try to find by UID first, then by ID
        response = supabase.table('lead_master').select('*').eq('uid', lead_id).execute()
        
        if not response.data:
            response = supabase.table('lead_master').select('*').eq('id', lead_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead = response.data[0]
        
        # Check permissions
        if current_user.role == 'cre' and lead.get('cre_name') != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role == 'ps' and lead.get('ps_name') != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return LeadResponse(**lead)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, lead_data: LeadUpdate, current_user=None):
    """Update a lead"""
    try:
        # Debug: log incoming payload (safe fields)
        try:
            print("[lead.update] payload:", lead_data.model_dump())
        except Exception:
            pass
        # Get existing lead
        response = supabase.table('lead_master').select('*').eq('uid', lead_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        existing_lead = response.data[0]
        
        # Permissions: temporarily allow public update if no auth context was provided
        if current_user is not None:
            try:
                role = getattr(current_user, 'role', None)
                username = getattr(current_user, 'username', None)
                if role == 'cre' and existing_lead.get('cre_name') != username:
                    raise HTTPException(status_code=403, detail="Access denied")
                elif role == 'ps' and existing_lead.get('ps_name') != username:
                    raise HTTPException(status_code=403, detail="Access denied")
            except Exception:
                pass
        
        # Build update data
        update_data = {"updated_at": now_ist_iso()}
        
        if lead_data.name:
            update_data["customer_name"] = lead_data.name
        if lead_data.phone:
            update_data["customer_mobile_number"] = lead_data.phone
        if lead_data.status:
            update_data["lead_status"] = lead_data.status
        # First call remark mapping
        if lead_data.first_remark is not None:
            update_data["first_remark"] = lead_data.first_remark
        elif lead_data.notes:
            update_data["first_remark"] = lead_data.notes
        # Auto-stamp first call date (now uses TIMESTAMP)
        if ("first_remark" in update_data) and not (existing_lead.get("first_call_date")):
            update_data["first_call_date"] = now_ist_iso()
        # Additional mapped fields
        if lead_data.variant is not None:
            update_data["variant"] = lead_data.variant
        if lead_data.model_interested is not None:
            update_data["model_interested"] = lead_data.model_interested
        if lead_data.lead_category is not None:
            update_data["lead_category"] = lead_data.lead_category
        if lead_data.buying_plan is not None:
            update_data["buying_plan"] = lead_data.buying_plan
        if lead_data.finance_option is not None:
            update_data["finance_option"] = lead_data.finance_option
        if lead_data.profession is not None:
            update_data["profession"] = lead_data.profession
        if lead_data.trade_in is not None:
            update_data["trade_in"] = lead_data.trade_in
        if lead_data.assigned_to:
            update_data["cre_name"] = lead_data.assigned_to
            update_data["assigned"] = "Yes"
        if lead_data.customer_location is not None:
            update_data["customer_location"] = lead_data.customer_location
        if lead_data.final_status is not None:
            update_data["final_status"] = lead_data.final_status
        
        # Persist test drive type verbatim
        if lead_data.test_drive_type is not None:
            update_data["test_drive_type"] = lead_data.test_drive_type
        
        # Handle follow-up date (skip empty strings)
        if lead_data.follow_up_date is not None:
            fud = (lead_data.follow_up_date or "").strip()
            if fud:
                # If client sent only a date (YYYY-MM-DD), add current IST time
                if len(fud) == 10 and fud.count('-') == 2 and 'T' not in fud:
                    current_time = now_ist_iso().split('T')[1]
                    update_data["follow_up_date"] = f"{fud}T{current_time}"
                else:
                    update_data["follow_up_date"] = fud

        # Save exact call outcome in lead_status when provided
        if lead_data.call_status is not None:
            update_data["lead_status"] = lead_data.call_status

        # Debug: show final update data
        try:
            print("[lead.update] update_data:", update_data)
        except Exception:
            pass

        # Update the lead and return updated row
        response = supabase.table('lead_master').update(update_data).eq('uid', lead_id).select('*').execute()

        # If Trade In = Yes, capture details in trade_in_master
        try:
            if (lead_data.trade_in or "").lower() == "yes":
                # Ensure table exists (best-effort)
                try:
                    supabase.table('trade_in_master').select('id').limit(1).execute()
                except Exception:
                    pass
                trade_in_record = {
                    "lead_uid": lead_id,
                    "customer_name": existing_lead.get("customer_name"),
                    "customer_mobile_number": existing_lead.get("customer_mobile_number"),
                    "trade_in_make": lead_data.trade_in_make,
                    "trade_in_model": lead_data.trade_in_model,
                    "trade_in_year": lead_data.trade_in_year,
                    "trade_in_km": lead_data.trade_in_km,
                    "trade_in_ownership": lead_data.trade_in_ownership,
                    "created_at": now_ist_iso(),
                    "updated_at": now_ist_iso()
                }
                supabase.table('trade_in_master').upsert(trade_in_record, on_conflict='lead_uid').execute()
        except Exception:
            # Non-fatal
            pass
        
        if response.data:
            return LeadResponse(**response.data[0])
        else:
            raise HTTPException(status_code=500, detail="Failed to update lead")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# CRE USERS MANAGEMENT ENDPOINTS
# ========================================

# Public endpoint: Update lead_master by UID (no auth)
@app.put("/api/public/lead-master/{uid}")
async def update_public_lead_master(uid: str, lead_data: LeadUpdate):
    try:
        # Fetch existing lead by UID
        existing = supabase.table('lead_master').select('*').eq('uid', uid).limit(1).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        existing_lead = existing.data[0]

        update_data = {"updated_at": now_ist_iso()}

        if lead_data.name:
            update_data["customer_name"] = lead_data.name
        if lead_data.phone:
            update_data["customer_mobile_number"] = lead_data.phone
        if lead_data.status:
            update_data["lead_status"] = lead_data.status

        if lead_data.first_remark is not None:
            update_data["first_remark"] = lead_data.first_remark
        elif lead_data.notes:
            update_data["first_remark"] = lead_data.notes
        # Auto-stamp first call date with full IST timestamp
        if ("first_remark" in update_data) and not (existing_lead.get("first_call_date")):
            update_data["first_call_date"] = now_ist_iso()

        if lead_data.variant is not None:
            update_data["variant"] = lead_data.variant
        # Map model interested and lead category (missing earlier)
        if lead_data.model_interested is not None:
            update_data["model_interested"] = lead_data.model_interested
        if lead_data.lead_category is not None:
            update_data["lead_category"] = lead_data.lead_category
        if lead_data.buying_plan is not None:
            update_data["buying_plan"] = lead_data.buying_plan
        if lead_data.finance_option is not None:
            update_data["finance_option"] = lead_data.finance_option
        if lead_data.profession is not None:
            update_data["profession"] = lead_data.profession
        if lead_data.trade_in is not None:
            update_data["trade_in"] = lead_data.trade_in
        if lead_data.test_drive_type is not None:
            update_data["test_drive_type"] = lead_data.test_drive_type
        if lead_data.customer_location is not None:
            update_data["customer_location"] = lead_data.customer_location
        if lead_data.final_status is not None:
            update_data["final_status"] = lead_data.final_status

        # Handle follow-up date (accepts YYYY-MM-DD and full ISO; skip empty)
        if lead_data.follow_up_date is not None:
            fud = (lead_data.follow_up_date or "").strip()
            if fud:
                if len(fud) == 10 and fud.count('-') == 2 and 'T' not in fud:
                    current_time = now_ist_iso().split('T')[1]
                    update_data["follow_up_date"] = f"{fud}T{current_time}"
                else:
                    update_data["follow_up_date"] = fud

        # If a follow-up note is provided (qualified flow), store it in the next available slot
        if (lead_data.followup_note or "").strip():
            note = (lead_data.followup_note or "").strip()
            # Save into the next available slot among second..sixth
            slots = [
                ("second_call_date", "second_remark"),
                ("third_call_date", "third_remark"),
                ("fourth_call_date", "fourth_remark"),
                ("fifth_call_date", "fifth_remark"),
                ("sixth_call_date", "sixth_remark"),
            ]
            for date_key, remark_key in slots:
                if not (existing_lead.get(remark_key) or "").strip():
                    update_data[date_key] = now_ist_iso()
                    update_data[remark_key] = note
                    break

        # Persist (use upsert to avoid edge cases where update returns no rows)
        print(f"[public.update] uid={uid} update_data={update_data}")
        payload = {"uid": uid, **update_data}
        upsert_resp = supabase.table('lead_master').upsert(payload, on_conflict='uid').execute()
        print(f"[public.update] upsert done, returned={(len(upsert_resp.data) if getattr(upsert_resp,'data',None) else 0)} rows")
        updated = supabase.table('lead_master').select('*').eq('uid', uid).limit(1).execute()

        # Upsert trade-in details when applicable
        try:
            if (lead_data.trade_in or "").lower() == "yes":
                try:
                    supabase.table('trade_in_master').select('id').limit(1).execute()
                except Exception:
                    pass
                trade_in_record = {
                    "lead_uid": uid,
                    "customer_name": existing_lead.get("customer_name"),
                    "customer_mobile_number": existing_lead.get("customer_mobile_number"),
                    "trade_in_make": lead_data.trade_in_make,
                    "trade_in_model": lead_data.trade_in_model,
                    "trade_in_year": lead_data.trade_in_year,
                    "trade_in_km": lead_data.trade_in_km,
                    "trade_in_ownership": lead_data.trade_in_ownership,
                    "created_at": now_ist_iso(),
                    "updated_at": now_ist_iso()
                }
                supabase.table('trade_in_master').upsert(trade_in_record, on_conflict='lead_uid').execute()
        except Exception:
            pass

        if updated.data:
            return updated.data[0]
        # Fallback: fetch row to confirm state
        try:
            fetched = supabase.table('lead_master').select('*').eq('uid', uid).limit(1).execute()
            print(f"[public.update] fetched-after count={(len(fetched.data) if getattr(fetched,'data',None) else 0)} data={fetched.data}")
        except Exception as fe:
            print(f"[public.update] fetch error: {fe}")
        raise HTTPException(status_code=500, detail="Failed to update lead")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[public.update] exception: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class CREUserCreate(BaseModel):
    name: str
    username: str
    email: str
    phone: str
    password: str

class CREUserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class CREUserResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    phone: str
    is_active: bool
    created_at: str

@app.get("/api/cre-users", response_model=List[CREUserResponse])
async def get_cre_users():
    """Get all CRE users"""
    try:
        response = supabase.table('cre_users').select('*').order('created_at', desc=True).execute()
        return [CREUserResponse(**user) for user in response.data or []]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cre-users", response_model=CREUserResponse)
async def create_cre_user(user_data: CREUserCreate):
    """Create a new CRE user"""
    try:
        # Store password as plain string per request (NOT recommended for production)
        password_hash = user_data.password
        
        insert_data = {
            "name": user_data.name,
            "username": user_data.username,
            "email": user_data.email,
            "phone": user_data.phone,
            "password_hash": password_hash,
            "is_active": True
        }
        
        response = supabase.table('cre_users').insert(insert_data).execute()
        if response.data:
            return CREUserResponse(**response.data[0])
        else:
            raise HTTPException(status_code=500, detail="Failed to create CRE user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/cre-users/{user_id}", response_model=CREUserResponse)
async def update_cre_user(user_id: str, user_data: CREUserUpdate):
    """Update a CRE user"""
    try:
        update_data = {"updated_at": "NOW()"}
        
        if user_data.name:
            update_data["name"] = user_data.name
        if user_data.username:
            update_data["username"] = user_data.username
        if user_data.email:
            update_data["email"] = user_data.email
        if user_data.phone:
            update_data["phone"] = user_data.phone
        if user_data.password:
            update_data["password_hash"] = user_data.password
        if user_data.is_active is not None:
            update_data["is_active"] = user_data.is_active
        
        response = supabase.table('cre_users').update(update_data).eq('id', user_id).execute()
        if response.data:
            return CREUserResponse(**response.data[0])
        else:
            raise HTTPException(status_code=404, detail="CRE user not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/cre-users/{user_id}")
async def delete_cre_user(user_id: str):
    """Delete a CRE user"""
    try:
        response = supabase.table('cre_users').delete().eq('id', user_id).execute()
        return {"message": "CRE user deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# PS USERS MANAGEMENT ENDPOINTS
# ========================================

class PSUserCreate(BaseModel):
    name: str
    username: str
    email: str
    phone: str
    branch: str
    password: str

class PSUserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    branch: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class PSUserResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    phone: str
    branch: str
    is_active: bool
    created_at: str

@app.get("/api/ps-users", response_model=List[PSUserResponse])
async def get_ps_users():
    """Get all PS users"""
    try:
        response = supabase.table('ps_users').select('*').order('created_at', desc=True).execute()
        return [PSUserResponse(**user) for user in response.data or []]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ps-users", response_model=PSUserResponse)
async def create_ps_user(user_data: PSUserCreate):
    """Create a new PS user"""
    try:
        # Hash the password (simplified for now)
        import hashlib
        password_hash = hashlib.sha256(user_data.password.encode()).hexdigest()
        
        # Get branch_id from branch name (safe)
        branch_id = None
        try:
            branch_response = supabase.table('branches').select('id').eq('name', user_data.branch).execute()
            branch_id = branch_response.data[0]['id'] if branch_response.data else None
        except Exception:
            branch_id = None
        
        insert_data = {
            "name": user_data.name,
            "username": user_data.username,
            "email": user_data.email,
            "phone": user_data.phone,
            "branch": user_data.branch,
            "branch_id": branch_id,
            "password_hash": password_hash,
            "is_active": True,
            "created_at": now_ist_iso(),
            "updated_at": now_ist_iso()
        }
        
        response = supabase.table('ps_users').insert(insert_data).execute()
        if response.data:
            return PSUserResponse(**response.data[0])
        else:
            raise HTTPException(status_code=500, detail="Failed to create PS user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/ps-users/{user_id}", response_model=PSUserResponse)
async def update_ps_user(user_id: str, user_data: PSUserUpdate):
    """Update a PS user"""
    try:
        update_data = {"updated_at": now_ist_iso()}
        
        if user_data.name:
            update_data["name"] = user_data.name
        if user_data.username:
            update_data["username"] = user_data.username
        if user_data.email:
            update_data["email"] = user_data.email
        if user_data.phone:
            update_data["phone"] = user_data.phone
        if user_data.branch:
            update_data["branch"] = user_data.branch
            try:
                branch_response = supabase.table('branches').select('id').eq('name', user_data.branch).execute()
                update_data["branch_id"] = branch_response.data[0]['id'] if branch_response.data else None
            except Exception:
                pass
        if user_data.password:
            import hashlib
            update_data["password_hash"] = hashlib.sha256(user_data.password.encode()).hexdigest()
        if user_data.is_active is not None:
            update_data["is_active"] = user_data.is_active
        
        response = supabase.table('ps_users').update(update_data).eq('id', user_id).execute()
        if response.data:
            return PSUserResponse(**response.data[0])
        else:
            raise HTTPException(status_code=404, detail="PS user not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/ps-users/{user_id}")
async def delete_ps_user(user_id: str):
    """Delete a PS user"""
    try:
        response = supabase.table('ps_users').delete().eq('id', user_id).execute()
        return {"message": "PS user deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# LEAD ASSIGNMENT ENDPOINTS
# ========================================

class LeadAssignmentRequest(BaseModel):
    lead_ids: List[str]
    cre_id: str
    cre_name: str

class UnassignedLeadsResponse(BaseModel):
    total_unassigned: int
    by_source: dict
    available_cres: List[dict]

@app.get("/api/leads/unassigned", response_model=UnassignedLeadsResponse)
async def get_unassigned_leads():
    """Get unassigned leads grouped by source.
    Business rule: unassigned = (assigned != 'Yes') OR (cre_name is null/empty).
    """
    try:
        # Load all leads once; filter in app to support complex OR conditions reliably
        all_query = supabase.table('lead_master').select('*').execute()
        rows = all_query.data or []
        def is_unassigned(lead: dict) -> bool:
            assigned = (lead.get('assigned') or '').strip()
            cre_name = (lead.get('cre_name') or '').strip()
            return assigned != 'Yes' or cre_name == ''

        unassigned_leads = [l for l in rows if is_unassigned(l)]

        # Group by source
        by_source: dict = {}
        for lead in unassigned_leads:
            source = lead.get('source') or 'Unknown'
            by_source.setdefault(source, []).append(lead)

        source_counts = {src: len(lst) for src, lst in by_source.items()}

        cre_query = supabase.table('cre_users').select('id, name, username').eq('is_active', True).execute()
        available_cres = cre_query.data or []

        return UnassignedLeadsResponse(
            total_unassigned=len(unassigned_leads),
            by_source=source_counts,
            available_cres=available_cres
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/unassigned/{source}")
async def get_unassigned_leads_by_source(source: str):
    """Get unassigned leads for a specific source (see rule above)."""
    try:
        response = supabase.table('lead_master').select('*').eq('source', source).execute()
        rows = response.data or []
        def is_unassigned(lead: dict) -> bool:
            assigned = (lead.get('assigned') or '').strip()
            cre_name = (lead.get('cre_name') or '').strip()
            return assigned != 'Yes' or cre_name == ''
        return [l for l in rows if is_unassigned(l)]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/leads/assign")
async def assign_leads(assignment: LeadAssignmentRequest):
    """Assign leads to a CRE"""
    try:
        # Update leads with CRE assignment
        for lead_id in assignment.lead_ids:
            update_data = {
                "cre_id": assignment.cre_id,
                "cre_name": assignment.cre_name,
                "assigned": "Yes",
                "cre_assigned_at": now_ist_iso(),
                "updated_at": now_ist_iso()
            }
            
            supabase.table('lead_master').update(update_data).eq('uid', lead_id).execute()
        
        return {"message": f"Successfully assigned {len(assignment.lead_ids)} leads to {assignment.cre_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Public mirror endpoints for environments where auth middleware still intercepts
@app.get("/api/public/unassigned", response_model=UnassignedLeadsResponse)
async def get_unassigned_public():
    try:
        # Use the same business rule as the private endpoint
        all_query = supabase.table('lead_master').select('*').execute()
        rows = all_query.data or []
        def is_unassigned(lead: dict) -> bool:
            assigned = (lead.get('assigned') or '').strip()
            cre_name = (lead.get('cre_name') or '').strip()
            return assigned != 'Yes' or cre_name == ''

        unassigned_leads = [l for l in rows if is_unassigned(l)]

        by_source = {}
        for lead in unassigned_leads:
            source = lead.get('source', 'Unknown')
            by_source.setdefault(source, []).append(lead)
        source_counts = {s: len(lst) for s, lst in by_source.items()}

        cre_query = supabase.table('cre_users').select('id, name, username, is_active').eq('is_active', True).execute()
        available_cres = cre_query.data or []

        return UnassignedLeadsResponse(
            total_unassigned=len(unassigned_leads),
            by_source=source_counts,
            available_cres=available_cres
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/public/unassigned/{source}")
async def get_unassigned_public_by_source(source: str):
    try:
        response = supabase.table('lead_master').select('*').eq('source', source).execute()
        rows = response.data or []
        def is_unassigned(lead: dict) -> bool:
            assigned = (lead.get('assigned') or '').strip()
            cre_name = (lead.get('cre_name') or '').strip()
            return assigned != 'Yes' or cre_name == ''
        return [l for l in rows if is_unassigned(l)]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Test endpoint to check if API is working
@app.get("/api/test")
async def test_endpoint():
    return {"message": "API is working", "timestamp": now_ist_iso()}

# Public endpoint to fetch leads assigned to a specific CRE username
@app.get("/api/public/cre-assigned/{username}")
async def get_public_cre_assigned(username: str, name: Optional[str] = None):
    try:
        print(f"Fetching leads for username: {username}, name: {name}")
        query = supabase.table('lead_master').select('*').eq('assigned', 'Yes')

        # Prefer full name if provided; otherwise use username
        clean_user = (username or '').strip()
        clean_name = (name or '').strip()

        if clean_name:
            query = query.eq('cre_name', clean_name)
        elif clean_user:
            query = query.eq('cre_name', clean_user)

        response = query.order('created_at', desc=True).execute()
        print(f"Found {len(response.data or [])} leads")
        return response.data or []
    except Exception as e:
        # Minimal logging to server stdout for debugging 500s
        print(f"Error in get_public_cre_assigned: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Alternative endpoint with query parameters
@app.get("/api/cre-assigned")
async def get_cre_assigned(username: Optional[str] = None, name: Optional[str] = None):
    try:
        print(f"Fetching leads for username: {username}, name: {name}")
        query = supabase.table('lead_master').select('*').eq('assigned', 'Yes')

        # Prefer full name if provided; otherwise use username
        clean_user = (username or '').strip()
        clean_name = (name or '').strip()

        if clean_name:
            query = query.eq('cre_name', clean_name)
        elif clean_user:
            query = query.eq('cre_name', clean_user)

        response = query.order('created_at', desc=True).execute()
        print(f"Found {len(response.data or [])} leads")
        return response.data or []
    except Exception as e:
        print(f"Error in get_cre_assigned: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# PS FOLLOW-UP SYSTEM ENDPOINTS
# ========================================

class PSFollowUpCreate(BaseModel):
    lead_uid: str
    ps_id: str
    ps_name: str
    follow_up_date: str
    notes: Optional[str] = None

class PSFollowUpUpdate(BaseModel):
    follow_up_date: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class PSFollowUpResponse(BaseModel):
    id: str
    lead_uid: str
    ps_id: str
    ps_name: str
    follow_up_date: str
    notes: Optional[str] = None
    status: str
    created_at: str

@app.post("/api/leads/{lead_uid}/assign-ps")
async def assign_lead_to_ps(lead_uid: str, ps_data: dict, current_user=Depends(admin_required)):
    """Assign a lead to PS for follow-up"""
    try:
        # Update lead with PS assignment
        update_data = {
            "ps_id": ps_data["ps_id"],
            "ps_name": ps_data["ps_name"],
            "ps_assigned_at": now_ist_iso(),
            "updated_at": now_ist_iso()
        }
        
        lead_response = supabase.table('lead_master').update(update_data).eq('uid', lead_uid).execute()
        
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Create initial follow-up record
        followup_data = {
            "lead_uid": lead_uid,
            "ps_id": ps_data["ps_id"],
            "ps_name": ps_data["ps_name"],
            "follow_up_date": ps_data.get("follow_up_date", now_ist_iso()),
            "notes": ps_data.get("notes", "Initial PS assignment"),
            "status": "pending",
            "created_at": now_ist_iso()
        }
        
        # Create ps_follow_up_master table if it doesn't exist
        try:
            supabase.table('ps_follow_up_master').select('id').limit(1).execute()
        except:
            # Table doesn't exist, create it
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS ps_follow_up_master (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                lead_uid VARCHAR(20) NOT NULL,
                ps_id UUID NOT NULL,
                ps_name VARCHAR(100) NOT NULL,
                follow_up_date TIMESTAMP NOT NULL,
                notes TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                FOREIGN KEY (lead_uid) REFERENCES lead_master(uid),
                FOREIGN KEY (ps_id) REFERENCES ps_users(id)
            );
            """
            # Note: In a real implementation, you'd run this SQL directly on the database
        
        followup_response = supabase.table('ps_follow_up_master').insert(followup_data).execute()
        
        return {"message": "Lead assigned to PS successfully", "followup": followup_response.data[0] if followup_response.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ps-followups", response_model=List[PSFollowUpResponse])
async def get_ps_followups(ps_id: Optional[str] = None, status: Optional[str] = None, current_user=Depends(get_current_user)):
    """Get PS follow-ups"""
    try:
        query = supabase.table('ps_follow_up_master').select('*')
        
        # Apply role-based filtering
        if current_user.role == 'ps':
            query = query.eq('ps_id', current_user.id)
        elif ps_id and current_user.role in ['admin', 'branch_head']:
            query = query.eq('ps_id', ps_id)
        
        if status:
            query = query.eq('status', status)
        
        response = query.order('follow_up_date', desc=False).execute()
        return [PSFollowUpResponse(**item) for item in response.data or []]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/ps-followups/{followup_id}")
async def update_ps_followup(followup_id: str, update_data: PSFollowUpUpdate, current_user=Depends(get_current_user)):
    """Update PS follow-up"""
    try:
        # Check permissions
        existing = supabase.table('ps_follow_up_master').select('*').eq('id', followup_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Follow-up not found")
        
        if current_user.role == 'ps' and existing.data[0]['ps_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        update_fields = {"updated_at": now_ist_iso()}
        if update_data.follow_up_date:
            update_fields["follow_up_date"] = update_data.follow_up_date
        if update_data.notes:
            update_fields["notes"] = update_data.notes
        if update_data.status:
            update_fields["status"] = update_data.status
        
        response = supabase.table('ps_follow_up_master').update(update_fields).eq('id', followup_id).execute()
        return {"message": "Follow-up updated successfully", "followup": response.data[0] if response.data else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/statistics", response_model=LeadStatistics)
async def get_lead_statistics(current_user=Depends(can_manage_leads)):
    """Get lead statistics based on user role"""
    try:
        base_query = supabase.table('lead_master').select('final_status')
        
        # Apply role-based filtering
        if current_user.role == 'cre':
            base_query = base_query.eq('cre_name', current_user.username)
        elif current_user.role == 'ps':
            base_query = base_query.eq('ps_name', current_user.username)
        elif current_user.role == 'branch_head':
            base_query = base_query.eq('branch_id', current_user.branch_id)
        
        response = base_query.execute()
        leads = response.data or []
        
        stats = {
            "total": len(leads),
            "new": len([l for l in leads if l.get('final_status') == 'Pending']),
            "in_progress": len([l for l in leads if l.get('final_status') in ['Hot', 'Warm', 'Follow-up']]),
            "won": len([l for l in leads if l.get('final_status') == 'Won']),
            "lost": len([l for l in leads if l.get('final_status') == 'Lost'])
        }
        
        return LeadStatistics(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# ACTIVITY ENDPOINTS
# ========================================

@app.post("/api/leads/{lead_id}/activities", response_model=ActivityResponse)
async def create_activity(
    lead_id: str, 
    activity_data: ActivityCreate, 
    current_user=Depends(can_manage_leads)
):
    """Create a new activity for a lead"""
    try:
        activity_record = {
            "lead_uid": lead_id,
            "activity_type": activity_data.activity_type,
            "subject": activity_data.subject,
            "description": activity_data.description,
            "created_by": current_user.username,
            "created_at": "NOW()"
        }
        
        if activity_data.scheduled_at:
            activity_record["scheduled_at"] = activity_data.scheduled_at
        
        response = supabase.table('lead_activities').insert(activity_record).execute()
        
        if response.data:
            return ActivityResponse(**response.data[0])
        else:
            raise HTTPException(status_code=500, detail="Failed to create activity")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/{lead_id}/activities", response_model=List[ActivityResponse])
async def get_lead_activities(lead_id: str, current_user=Depends(can_manage_leads)):
    """Get all activities for a lead"""
    try:
        response = supabase.table('lead_activities').select('*').eq('lead_uid', lead_id).order('created_at', desc=True).execute()
        return [ActivityResponse(**activity) for activity in response.data or []]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
