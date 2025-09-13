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

# Supabase client
supabase: Client = create_client(
    config('SUPABASE_URL'),
    config('SUPABASE_SERVICE_ROLE_KEY')
)

security = HTTPBearer()

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
        for username_prefix, (table_name, role) in user_tables.items():
            try:
                response = supabase.table(table_name).select('*').eq('username', login_data.username).execute()
                if response.data:
                    user_data = response.data[0]
                    user_role = role
                    break
            except Exception as e:
                print(f"Error checking {table_name}: {e}")
                continue
        
        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Verify password (plain text comparison for now)
        stored_password = user_data.get('password_hash', '')
        if stored_password != login_data.password:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Check if user is active
        if user_data.get('status') != 'active':
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
        
        return LoginResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(
                id=user_data["id"],
                username=user_data["username"],
                email=user_data["email"],
                first_name=user_data.get("first_name", ""),
                last_name=user_data.get("last_name", ""),
                role=user_role,
                status=user_data.get("status", "active"),
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
            "created_at": "NOW()",
            "updated_at": "NOW()"
        }
        
        response = supabase.table('lead_master').insert(lead_record).execute()
        
        if response.data:
            return LeadResponse(**response.data[0])
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
async def update_lead(lead_id: str, lead_data: LeadUpdate, current_user=Depends(can_manage_leads)):
    """Update a lead"""
    try:
        # Get existing lead
        response = supabase.table('lead_master').select('*').eq('uid', lead_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        existing_lead = response.data[0]
        
        # Check permissions
        if current_user.role == 'cre' and existing_lead.get('cre_name') != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied")
        elif current_user.role == 'ps' and existing_lead.get('ps_name') != current_user.username:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Build update data
        update_data = {"updated_at": "NOW()"}
        
        if lead_data.name:
            update_data["customer_name"] = lead_data.name
        if lead_data.phone:
            update_data["customer_mobile_number"] = lead_data.phone
        if lead_data.status:
            update_data["lead_status"] = lead_data.status
        if lead_data.notes:
            update_data["first_remark"] = lead_data.notes
        if lead_data.assigned_to:
            update_data["cre_name"] = lead_data.assigned_to
            update_data["assigned"] = "Yes"
        
        # Update the lead
        response = supabase.table('lead_master').update(update_data).eq('uid', lead_id).execute()
        
        if response.data:
            return LeadResponse(**response.data[0])
        else:
            raise HTTPException(status_code=500, detail="Failed to update lead")
            
    except HTTPException:
        raise
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
