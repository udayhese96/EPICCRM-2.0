from fastapi import FastAPI, Depends, HTTPException, status, Request, Header, File, UploadFile, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from typing import List, Optional, Dict, Any
import uvicorn
import time
import logging
import asyncio
from datetime import datetime, timedelta

# Import WhatsApp service
try:
    from fastapi_app.whatsapp_service import whatsapp_service
    WHATSAPP_AVAILABLE = True
    print(f"[Startup] WhatsApp service imported successfully")
except ImportError as e:
    print(f"Warning: WhatsApp service import failed: {e}")
    WHATSAPP_AVAILABLE = False
    whatsapp_service = None
except Exception as e:
    print(f"Warning: WhatsApp service import failed with exception: {e}")
    import traceback
    traceback.print_exc()
    WHATSAPP_AVAILABLE = False
    whatsapp_service = None
# Import Supabase with error handling
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Supabase import failed: {e}")
    SUPABASE_AVAILABLE = False
except Exception as e:
    print(f"Warning: Supabase import failed: {e}")
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
            # Return dummy data for testing
            username = self.query_conditions.get('username')
            if username == 'sanjay':
                if self.table_name == 'admin_users':
                    return DummyResponse([{
                        'id': 1,
                        'username': 'sanjay',
                        'password_hash': 'sanjay',
                        'role': 'admin',
                        'is_active': True
                    }])
                elif self.table_name == 'cre_users':
                    return DummyResponse([{
                        'id': 1,
                        'username': 'sanjay',
                        'password_hash': 'sanjay',
                        'role': 'cre',
                        'is_active': True
                    }])
                elif self.table_name == 'ps_users':
                    return DummyResponse([{
                        'id': 1,
                        'username': 'sanjay',
                        'password_hash': 'sanjay',
                        'role': 'ps',
                        'is_active': True
                    }])
                elif self.table_name == 'bh_users':
                    return DummyResponse([{
                        'id': 1,
                        'username': 'sanjay',
                        'password_hash': 'sanjay',
                        'role': 'bh',
                        'is_active': True
                    }])
                elif self.table_name == 'cre_tl_users':
                    # Return different users based on username
                    if username == 'sanjay':
                        return DummyResponse([{
                            'id': '1',
                            'name': 'Sanjay Kumar',
                            'username': 'sanjay',
                            'email': 'sanjay@epiccrm.com',
                            'password_hash': 'sanjay',
                            'is_active': True
                        }])
                    elif username == 'creicrop':
                        return DummyResponse([{
                            'id': '2',
                            'name': 'CRE ICROP',
                            'username': 'creicrop',
                            'email': 'creicrop@epiccrm.com',
                            'password_hash': 'creicrop123',
                            'is_active': True
                        }])
                    else:
                        return DummyResponse([])
            return DummyResponse([])
    
    class DummyResponse:
        def __init__(self, data=None):
            self.data = data or []
    
    def create_client(*args, **kwargs):
        return Client()
import os
from decouple import config
from .auth import get_current_user, admin_required, admin_or_branch_head, can_manage_leads, CurrentUser
from datetime import datetime, timezone, timedelta
try:
    from zoneinfo import ZoneInfo
    ZONEINFO_AVAILABLE = True
except ImportError:
    # Fallback for Python < 3.9 or systems without zoneinfo
    try:
        from backports.zoneinfo import ZoneInfo
        ZONEINFO_AVAILABLE = True
    except ImportError:
        ZONEINFO_AVAILABLE = False
        print("Warning: zoneinfo not available, using UTC timezone")
from .models import (UserCreate, UserUpdate, UserResponse, LoginRequest, LoginResponse, ChangePasswordRequest,
                    LeadCreate, LeadUpdate, LeadResponse, LeadListResponse, ActivityCreate, ActivityResponse,
                    BulkAssignRequest, BulkStatusUpdateRequest, LeadStatistics, PSAssignmentCreate, 
                    PSAssignmentResponse, PSAssignmentUpdate)
from .redis_cache import (cache, cache_leads, get_cached_leads, cache_users, get_cached_users, 
                         cache_lead_stats, get_cached_lead_stats, invalidate_on_lead_change)
from .background_tasks import (create_lead_async, update_lead_async, bulk_update_leads_async, 
                              qualify_lead_async, background_processor)
import logging
logger = logging.getLogger(__name__)

app = FastAPI(title="EPIC CRM 2.0 API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://epic-crm-2-0.netlify.app",  # Replace with your Netlify URL
        "https://main--epic-crm-2-0.netlify.app"  # Branch deploys
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client (robust env loading)
SUPABASE_URL = config('SUPABASE_URL', default=os.environ.get('SUPABASE_URL', 'https://raticwohyvxcyoqzqnwj.supabase.co'))
SUPABASE_SERVICE_ROLE_KEY = config('SUPABASE_SERVICE_ROLE_KEY', default=os.environ.get('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'))

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("[FastAPI] Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.")

# Initialize Supabase client with error handling - FORCE REAL CONNECTION
if SUPABASE_AVAILABLE:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("[FastAPI] Connected to real Supabase database")
    # Test connection against an existing table (users)
    try:
        test_response = supabase.table('users').select('id').limit(1).execute()
        print(f"[FastAPI] Supabase connection test successful: {len(test_response.data)} records in users")
    except Exception as e:
        # Do not replace the client; just warn and continue
        print(f"[FastAPI] Supabase connection test warning (users): {e}")
else:
    print("[FastAPI] Supabase library not available, using dummy client")
    supabase: Client = create_client("dummy_url", "dummy_key")

security = HTTPBearer()

# Time utilities
def now_ist_iso() -> str:
    """Return current timestamp in Asia/Kolkata (IST) as ISO string WITH timezone."""
    try:
        if ZONEINFO_AVAILABLE:
            # Return IST timestamp WITH timezone info for TIMESTAMPTZ columns
            return datetime.now(ZoneInfo("Asia/Kolkata")).isoformat()
        else:
            # Fallback: return UTC with timezone if IST not available
            return datetime.now(timezone.utc).isoformat()
    except Exception:
        # Fallback: return UTC with timezone if IST not available
        return datetime.now(timezone.utc).isoformat()

# Final status sync helper
def sync_final_status(lead_uid: str, final_status: str) -> None:
    """Synchronize final_status across ps_followup_master, lead_master, and qualified_leads.

    Best-effort: log failures and continue.
    """
    timestamp = now_ist_iso()
    # ps_followup_master
    try:
        supabase.table('ps_followup_master').update({
            'final_status': final_status,
            'updated_at': timestamp
        }).eq('lead_uid', lead_uid).execute()
    except Exception as e:
        try:
            print(f"[sync_final_status] ps_followup_master update failed for {lead_uid}: {e}")
        except Exception:
            pass

    # lead_master
    try:
        supabase.table('lead_master').update({
            'final_status': final_status,
            'updated_at': timestamp
        }).eq('uid', lead_uid).execute()
    except Exception as e:
        try:
            print(f"[sync_final_status] lead_master update failed for {lead_uid}: {e}")
        except Exception:
            pass

    # qualified_leads - Update status instead of deleting the record
    if final_status in ['Lost', 'lost', 'Unqualified', 'unqualified']:
        try:
            supabase.table('qualified_leads').update({
                'final_status': final_status,
                'updated_at': timestamp
            }).eq('lead_uid', lead_uid).execute()
            print(f"[sync_final_status] Updated qualified_leads status for lead {lead_uid} to {final_status}")
        except Exception as e:
            try:
                print(f"[sync_final_status] qualified_leads update failed for {lead_uid}: {e}")
            except Exception:
                pass

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
    first_call_remark: Optional[str] = None
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
    # Pending reasons for pending leads (JSONB array) - multiple attempts
    pending_reasons: Optional[List[dict]] = None
    # Existing remarks from previous interactions (for unqualified/lost leads)
    existing_remarks: Optional[str] = None
    # New: follow-up note for qualified workflow (maps to second..fifth remarks)
    followup_note: Optional[str] = None
    # New: allow updating final_status (Won/Lost/Pending)
    final_status: Optional[str] = None
    # New: allow updating lead_status (Qualified/Not interested/RNR/etc.)
    lead_status: Optional[str] = None
    # Per-step follow-up lead status fields (F1..F5)
    second_call_lead_status: Optional[str] = None
    third_call_lead_status: Optional[str] = None
    fourth_call_lead_status: Optional[str] = None
    fifth_call_lead_status: Optional[str] = None
    sixth_call_lead_status: Optional[str] = None

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

@app.get("/health")
async def health_check():
    """Health check endpoint for testing"""
    return {
        "status": "healthy",
        "message": "EPIC CRM 2.0 is running",
        "optimized_endpoints": "available"
    }

@app.get("/api/test/tradein")
async def test_tradein_table():
    """Test endpoint to check trade-in master table"""
    try:
        result = supabase.table('trade_in_master').select('*').limit(5).execute()
        return {
            "status": "success",
            "count": len(result.data),
            "data": result.data
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

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
        query = supabase.table('lead_master').select('*')
        
        # Apply role-based filtering
        if current_user.role == 'branch_head':
            query = query.eq('branch_id', current_user.branch_id)
        elif current_user.role not in ['admin', 'branch_head']:
            query = query.eq('cre_id', current_user.id)
        
        # Apply filters
        if status:
            query = query.eq('status', status)
        if source:
            query = query.eq('source', source)
        if assigned_to:
            query = query.eq('cre_id', assigned_to)
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
            "cre_id": lead.assigned_to or current_user.id
        }
        
        response = supabase.table('lead_master').insert(lead_data).execute()
        
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

@app.get("/api/leads/lost-requests")
async def get_lost_requests(current_user=Depends(get_current_user)):
    """Get lost requests for CRE approval"""
    try:
        print(f"[DEBUG] Lost requests endpoint called by user: {current_user.username} (role: {current_user.role})")
        
        # Check if user is CRE
        if current_user.role not in ['cre', 'cre_icrop']:
            print(f"[DEBUG] Access denied - user role {current_user.role} not allowed")
            raise HTTPException(status_code=403, detail="Access denied - CRE role required")
        
        print(f"[DEBUG] Querying ps_followup_master for Lost Requested leads...")
        # Get leads with final_status = 'Lost Requested' from ps_followup_master
        # Filter by CRE name directly since ps_followup_master has cre_name field
        # Use case-insensitive comparison
        response = supabase.table('ps_followup_master').select('*').eq('final_status', 'Lost Requested').execute()
        
        print(f"[DEBUG] Found {len(response.data or [])} Lost Requested leads")
        
        # Debug: Show all leads with their final_status for debugging
        if response.data:
            print(f"[DEBUG] All leads in ps_followup_master with Lost Requested status:")
            for lead in response.data:
                print(f"   - {lead.get('lead_uid')}: final_status='{lead.get('final_status')}', cre_name='{lead.get('cre_name')}'")
        else:
            print(f"[DEBUG] No leads found with Lost Requested status")
        
        # Filter by CRE name (case-insensitive)
        # Try to match against both username and full_name since cre_name might be either
        filtered_data = []
        for item in response.data or []:
            cre_name = (item.get('cre_name') or '').strip().lower()
            user_name = (getattr(current_user, 'username', '') or '').strip().lower()
            full_name = (getattr(current_user, 'full_name', '') or '').strip().lower()
            
            # Match against either username or full_name
            if cre_name and (cre_name == user_name or cre_name == full_name):
                filtered_data.append(item)
        
        print(f"[DEBUG] Filtered to {len(filtered_data)} leads for CRE {getattr(current_user, 'username', 'unknown')}")
        
        # Format the response to match expected structure
        lost_requests = []
        for item in filtered_data:
            # Get the latest call remark as lost reason
            lost_reason = ''
            call_fields = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth']
            for field in call_fields:
                remark = item.get(f'{field}_call_remark')
                if remark:
                    lost_reason = remark
            
            formatted_item = {
                'lead_uid': item.get('lead_uid'),
                'customer_name': item.get('customer_name'),
                'customer_mobile_number': item.get('customer_mobile_number'),
                'source': item.get('source'),
                'lead_category': item.get('lead_category'),
                'model_interested': item.get('model_interested'),
                'branch': item.get('ps_branch'),  # Use ps_branch from ps_followup_master
                'ps_name': item.get('ps_name'),
                'ps_id': item.get('ps_id'),
                'icrop_id': item.get('icrop_id'),
                'lost_reason': lost_reason,
                'lost_requested_at': item.get('updated_at'),
                'created_at': item.get('created_at')
            }
            lost_requests.append(formatted_item)
        
        print(f"[DEBUG] Returning {len(lost_requests)} lost requests")
        return lost_requests
        
    except Exception as e:
        print(f"[DEBUG] Error in lost-requests endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, current_user=Depends(get_current_user)):
    """Get lead by ID with activities"""
    try:
        response = supabase.table('lead_master').select('*').eq('id', lead_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_data = response.data[0]
        
        # Check permissions
        if (current_user.role == 'branch_head' and 
            lead_data.get('branch_id') != current_user.branch_id):
            raise HTTPException(status_code=403, detail="Access denied")
        elif (current_user.role not in ['admin', 'branch_head'] and 
              lead_data.get('cre_id') != current_user.id):
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
        existing_response = supabase.table('lead_master').select('*').eq('id', lead_id).execute()
        
        if not existing_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        existing_lead = existing_response.data[0]
        
        # Check permissions
        if (current_user.role == 'branch_head' and 
            existing_lead.get('branch_id') != current_user.branch_id):
            raise HTTPException(status_code=403, detail="Access denied")
        elif (current_user.role not in ['admin', 'branch_head'] and 
              existing_lead.get('cre_id') != current_user.id):
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Update lead
        update_data = {k: v for k, v in lead.dict().items() if v is not None}
        response = supabase.table('lead_master').update(update_data).eq('id', lead_id).execute()
        
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
        existing_response = supabase.table('lead_master').select('*').eq('id', lead_id).execute()
        
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
        supabase.table('lead_master').delete().eq('id', lead_id).execute()
        
        return {"message": "Lead deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/{lead_id}/activities", response_model=List[ActivityResponse])
async def get_lead_activities(lead_id: str, current_user=Depends(get_current_user)):
    """Get activities for a specific lead"""
    try:
        # Check lead access
        lead_response = supabase.table('lead_master').select('*').eq('id', lead_id).execute()
        
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_data = lead_response.data[0]
        
        # Check permissions
        if (current_user.role == 'branch_head' and 
            lead_data.get('branch_id') != current_user.branch_id):
            raise HTTPException(status_code=403, detail="Access denied")
        elif (current_user.role not in ['admin', 'branch_head'] and 
              lead_data.get('cre_id') != current_user.id):
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
        lead_response = supabase.table('lead_master').select('*').eq('id', lead_id).execute()
        
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        lead_data = lead_response.data[0]
        
        # Check permissions
        if (current_user.role not in ['admin', 'branch_head'] and 
            lead_data.get('cre_id') != current_user.id):
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
        base_query = supabase.table('lead_master').select('*', count='exact')
        
        if current_user.role == 'branch_head':
            base_query = base_query.eq('branch_id', current_user.branch_id)
        elif current_user.role not in ['admin', 'branch_head']:
            base_query = base_query.eq('cre_id', current_user.id)
        
        # Get total leads
        total_response = base_query.execute()
        total_leads = total_response.count or 0
        
        # Get status counts
        status_counts = {}
        for status in ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']:
            query = supabase.table('lead_master').select('*', count='exact').eq('status', status)
            
            if current_user.role == 'branch_head':
                query = query.eq('branch_id', current_user.branch_id)
            elif current_user.role not in ['admin', 'branch_head']:
                query = query.eq('cre_id', current_user.id)
            
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
            query = supabase.table('lead_master').select('*', count='exact').eq('source', source)
            
            if current_user.role == 'branch_head':
                query = query.eq('branch_id', current_user.branch_id)
            elif current_user.role not in ['admin', 'branch_head']:
                query = query.eq('cre_id', current_user.id)
            
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
            lead_response = supabase.table('lead_master').select('*').eq('id', lead_id).execute()
            
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
            supabase.table('lead_master').update({"cre_id": request.assigned_to}).eq('id', lead_id).execute()
            
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
            lead_response = supabase.table('lead_master').select('*').eq('id', lead_id).execute()
            
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
            supabase.table('lead_master').update({"status": request.status}).eq('id', lead_id).execute()
            
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
        import uuid
        
        # Generate a UUID for the user
        user_id = str(uuid.uuid4())
        
        # Debug: Print received data
        print(f"[register_user] Received data: {user_data.model_dump()}")
        
        # Validate full_name is not empty
        if not user_data.full_name or user_data.full_name.strip() == "":
            raise HTTPException(status_code=400, detail="full_name is required and cannot be empty")
        
        # Create user record in database with all required fields
        # Password is stored as-is in password_hash column
        user_record = {
            "id": user_id,
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": user_data.password,  # Store password as-is in password_hash column
            "full_name": user_data.full_name.strip(),  # Ensure no leading/trailing spaces
            "role": user_data.role,
            "phone": user_data.phone if user_data.phone else None,
            "branch": user_data.branch if user_data.branch else None,
            "is_active": user_data.is_active if hasattr(user_data, 'is_active') else True
        }
        
        print(f"[register_user] Creating user with data: username={user_record.get('username')}, role={user_record.get('role')}, full_name='{user_record.get('full_name')}'")
        response = supabase.table('users').insert(user_record).execute()
        
        if response.data:
            print(f"[register_user] User created successfully: {response.data[0].get('id')}")
            return UserResponse(**response.data[0])
        else:
            raise HTTPException(status_code=500, detail="Failed to create user record")
            
    except Exception as e:
        print(f"[register_user] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Login user with username and password from separate role tables"""
    try:
        import jwt
        import datetime
        print(f"[login] Attempt for username={login_data.username}")
        
        user_tables = {
            'admin': ('admin_users', 'admin'),
            'cre': ('cre_users', 'cre'), 
            'ps': ('ps_users', 'ps'),
            'branchhead': ('bh_users', 'branch_head'),
            'cre_tl': ('cre_tl_users', 'cre_team_leader'),
            'cre_icrop': ('cre_tl_users', 'cre_icrop'),
            'receptionist': ('users', 'receptionist')
        }
        
        user = None
        user_role = None
        found_table_key = None
        
        # Check unified users table first
        try:
            print(f"[login] Checking unified users table")
            response = supabase.table('users').select('*').eq('username', login_data.username).eq('is_active', True).execute()
            if response.data and len(response.data) > 0:
                user = response.data[0]
                user_role = user.get('role')
                found_table_key = user_role
                print(f"[login] Found user in unified users table: {user.get('username')} with role {user_role}")
        except Exception as ex:
            print(f"[login] Error checking users table: {ex}")
        
        # If no user found in unified table, fallback to old tables for backward compatibility
        if not user:
            for key, (table_name, role) in user_tables.items():
                try:
                    print(f"[login] Checking table={table_name}")
                    response = supabase.table(table_name).select('*').eq('username', login_data.username).execute()
                    if response.data and len(response.data) > 0:
                        user = response.data[0]
                        
                        # Special handling for cre_tl_users table - determine role based on username
                        if table_name == 'cre_tl_users':
                            if user.get('username') == 'creicrop':
                                user_role = 'cre_icrop'
                            else:
                                user_role = 'cre_team_leader'
                        else:
                            user_role = role
                        
                        found_table_key = key
                        print(f"[login] Found user in {table_name}: {user.get('username')} with role {user_role}")
                        break
                except Exception as ex:
                    print(f"[login] Error checking {table_name}: {ex}")
                    continue
        
        if not user:
            print("[login] No user found")
            return JSONResponse(status_code=401, content={"detail": "Invalid username or password"})
        
        # Check password - unified users table stores password_hash, old tables store password
        stored_password = user.get("password_hash") or user.get("password", "")
        if login_data.password != stored_password:
            print("[login] Password mismatch")
            return JSONResponse(status_code=401, content={"detail": "Invalid username or password"})
        
        if user.get('is_active') is False:
            print("[login] Inactive account")
            return JSONResponse(status_code=401, content={"detail": "Account is not active"})
        
        payload = {
            "user_id": str(user.get("id", "unknown")),
            "username": user.get("username"),
            "email": user.get("email"),
            "role": user_role,
            "branch": user.get("branch"),
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }
        print(f"[Login] Creating JWT with secret: {JWT_SECRET[:20]}...")
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        print(f"[Login] Created JWT token: {token[:50]}...")
        
        resp_user = {
            "id": str(user.get("id", "unknown")),
            "username": user.get("username"),
            "email": user.get("email"),
            "full_name": user.get("full_name") or user.get("name") or user.get("username"),
            "phone": user.get("phone"),
            "role": user_role,
            "branch": user.get("branch"),
            "is_active": user.get("is_active", True),
            "created_at": user.get("created_at", ""),
            "updated_at": user.get("updated_at", "")
        }
        
        return LoginResponse(access_token=token, token_type="bearer", user=UserResponse(**resp_user))
            
    except Exception as e:
        print("[login] Unexpected error:", e)
        return JSONResponse(status_code=500, content={"detail": str(e)})

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
async def get_users(role: Optional[str] = None, current_user=Depends(get_current_user)):
    """Get list of users based on role permissions.
    Admin: full access
    Branch Head: restricted to own branch
    Team Leader: can fetch PS users assigned to them (role=ps & team_leader_id=self)
    """
    try:
        # Allow only specific roles
        allowed_roles = ['admin', 'branch_head', 'team_leader']
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Access denied")

        query = supabase.table('users').select('*')
        
        # Filter by role if specified
        if role:
            query = query.eq('role', role)
        
        # Branch heads can only see users in their branch
        if current_user.role == 'branch_head':
            # current_user.branch may be branch name in this schema
            query = query.eq('branch', getattr(current_user, 'branch', None))

        # Team leaders can only see PS assigned to them when asking for role=ps
        if current_user.role == 'team_leader':
            if role == 'ps':
                # Get PS users assigned to this team leader using team_leader_id in users table
                print(f"[Users API] Team leader {current_user.username} (ID: {current_user.id}) requesting PS users")
                try:
                    # Use team_leader_id method (primary method)
                    print(f"[Users API] Using team_leader_id method")
                    query = query.eq('team_leader_id', current_user.id)
                except Exception as e:
                    print(f"[Users API] team_leader_id method failed: {e}")
                    # Fallback: try ps_assignments table method
                    try:
                        print(f"[Users API] Falling back to ps_assignments method")
                        assignments_response = supabase.table('ps_assignments').select('ps_user_id').eq('sales_team_leader_id', current_user.id).execute()
                        assigned_ps_ids = [assignment['ps_user_id'] for assignment in assignments_response.data or []]
                        print(f"[Users API] Found {len(assigned_ps_ids)} assigned PS users: {assigned_ps_ids}")
                        
                        if assigned_ps_ids:
                            query = query.in_('id', assigned_ps_ids)
                        else:
                            print(f"[Users API] No PS users assigned to team leader {current_user.id}")
                            return []
                    except Exception as e2:
                        print(f"[Users API] ps_assignments fallback also failed: {e2}")
                        return []
            else:
                # Prevent broad access for other roles
                query = query.eq('id', current_user.id)
        
        response = query.execute()
        return [UserResponse(**user) for user in response.data]
        
    except Exception as e:
        print(f"[Users API] Error in get_users: {e}")
        print(f"[Users API] Error type: {type(e)}")
        import traceback
        traceback.print_exc()
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
    """Get leads based on user role and filters - ULTRA FAST with Redis caching"""
    try:
        # Create cache key
        cache_params = {
            'role': current_user.role,
            'username': current_user.username,
            'branch_id': getattr(current_user, 'branch_id', None),
            'status': status,
            'assigned_to': assigned_to
        }
        
        # Try to get from cache first
        cached_leads = get_cached_leads(cache_params)
        if cached_leads is not None:
            return [LeadResponse(**lead) for lead in cached_leads]
        
        # If not in cache, fetch from database
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
        leads = response.data or []
        
        # Cache the results
        cache_leads(cache_params, leads, ttl=180)  # 3 minutes cache
        
        return [LeadResponse(**lead) for lead in leads]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/leads")
async def create_lead(lead_data: LeadCreate, current_user=Depends(can_manage_leads)):
    """Create a new lead - ULTRA FAST with background processing"""
    try:
        import uuid
        
        # Generate unique UID
        lead_uid = f"LD{str(uuid.uuid4())[:8].upper()}"
        
        lead_record = {
            "uid": lead_uid,
            "customer_name": lead_data.name,
            "customer_mobile_number": lead_data.phone,
            "source": lead_data.source,
            "lead_category": "Warm",  # Default category
            "model_interested": lead_data.notes,
            "branch": current_user.branch_id if hasattr(current_user, 'branch_id') else 1,
            "assigned": "Yes" if lead_data.assigned_to else "No",
            "cre_name": lead_data.assigned_to,
            "lead_status": None,  # Fresh leads start with null/empty lead_status
            "final_status": "Pending"
        }
        
        user_info = {
            'username': current_user.username,
            'role': current_user.role,
            'user_id': current_user.id
        }
        
        # Process in background for ultra-fast response
        result = create_lead_async(lead_record, user_info)
        
        return result
            
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
    customer_location: Optional[str] = None
    source: str
    sub_source: Optional[str] = None
    follow_up_date: str
    cre_name: str
    cre_id: str
    assigned: str = "Yes"
    lead_status: Optional[str] = None  # Fresh leads start with null/empty lead_status
    final_status: str = "Pending"
    lead_category: Optional[str] = None
    remarks: Optional[str] = None
    # Vehicle interest details
    model_interested: Optional[str] = None
    variant: Optional[str] = None
    # Trade-in details (optional)
    trade_in_make: Optional[str] = None
    trade_in_model: Optional[str] = None
    trade_in_year: Optional[str] = None
    trade_in_km: Optional[str] = None
    trade_in_ownership: Optional[str] = None
    created_at: str
    updated_at: str

@app.post("/api/admin/leads", response_model=dict)
async def create_admin_lead(lead_data: AdminLeadCreate, current_user=Depends(admin_required)):
    """Create a new lead with CRE assignment for admin"""
    try:
        import uuid
        
        # 1) Check for duplicate by customer_mobile_number
        try:
            existing_q = (
                supabase
                    .table('lead_master')
                    .select('id, uid, is_dup')
                    .eq('customer_mobile_number', lead_data.customer_mobile_number)
                    .order('created_at', desc=True)
                    .limit(1)
            )
            existing_res = existing_q.execute()
            existing = existing_res.data[0] if existing_res.data else None
        except Exception as e:
            existing = None

        if existing:
            # Build duplicate entry and append to is_dup JSON
            current_is_dup = existing.get('is_dup')
            # Normalize to list form for consistency
            if isinstance(current_is_dup, list):
                attempt_base = len(current_is_dup)
                history = current_is_dup
            elif isinstance(current_is_dup, dict):
                attempt_base = 1
                history = [current_is_dup]
            else:
                attempt_base = 0
                history = []

            dup_entry = {
                "attempt": attempt_base + 1,
                "timestamp": now_ist_iso(),
                "source": getattr(lead_data, 'source', None) or "",
                "sub_source": getattr(lead_data, 'sub_source', None) or "",
            }

            new_history = history + [dup_entry]

            update_payload = {
                "is_dup": new_history,
                "updated_at": now_ist_iso(),
            }

            # If CRE is assigned in this attempt, we can optionally record that assignment timing as well
            if getattr(lead_data, 'assigned_cre_id', None) and getattr(lead_data, 'assigned_cre_name', None):
                update_payload["assigned"] = "Yes"
                update_payload["cre_id"] = lead_data.assigned_cre_id
                update_payload["cre_name"] = lead_data.assigned_cre_name
                update_payload["cre_assigned_at"] = now_ist_iso()

            updated = (
                supabase
                    .table('lead_master')
                    .update(update_payload)
                    .eq('id', existing['id'])
                    .execute()
            )

            updated_row = updated.data[0] if updated.data else existing
            return {
                "message": "Mobile number already exists. Lead updated.",
                "duplicate": True,
                "lead": updated_row,
            }

        # 2) If not duplicate, proceed with normal insert
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
            "lead_category": None,  # Admin-created leads start with null category
            "lead_status": None,  # Fresh leads start with null/empty lead_status
            "final_status": "Pending",
            "created_at": now_ist_iso(),
            "updated_at": now_ist_iso()
        }
        
        # If CRE is assigned, mark as assigned (Admin flow requires CRE selection)
        if lead_data.assigned_cre_id and lead_data.assigned_cre_name:
            insert_data["assigned"] = "Yes"
            insert_data["cre_id"] = lead_data.assigned_cre_id
            insert_data["cre_name"] = lead_data.assigned_cre_name
            insert_data["cre_assigned_at"] = now_ist_iso()
        else:
            insert_data["assigned"] = "No"
        
        response = supabase.table('lead_master').insert(insert_data).execute()
        if response.data:
            return {"message": "Lead created successfully", "duplicate": False, "lead": response.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create lead")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/leads/upload")
async def upload_leads_bulk(
    file: UploadFile = File(...),
    current_user=Depends(admin_required)
):
    """Bulk upload leads from CSV/Excel file"""
    try:
        import csv
        import io
        import uuid
        from datetime import datetime
        
        # Read file content
        content = await file.read()
        
        # Determine file type and parse
        if file.filename.endswith('.csv'):
            try:
                import pandas as pd
                
                # Try multiple encodings in order of likelihood for CSV files
                encodings_to_try = ['cp1252', 'latin-1', 'iso-8859-1', 'utf-8', 'utf-16']
                df = None
                successful_encoding = None
                
                for encoding in encodings_to_try:
                    try:
                        df = pd.read_csv(
                            io.BytesIO(content),
                            encoding=encoding,
                            skipinitialspace=True,
                            skip_blank_lines=True,
                            on_bad_lines='skip'
                        )
                        
                        # Check if we got actual data (more than just headers)
                        if len(df) > 0:
                            successful_encoding = encoding
                            break
                    except Exception:
                        continue
                
                if df is None or len(df) == 0:
                    raise HTTPException(
                        status_code=400, 
                        detail="Could not parse CSV file with any supported encoding. Please save your file as UTF-8."
                    )
                
                # Strip whitespace from column names (fixes the trailing space issue)
                df.columns = df.columns.str.strip()
                
                # Convert to dict records
                rows = df.to_dict('records')
                    
            except HTTPException:
                raise
            except Exception as e:
                print(f"[Bulk Upload] Pandas CSV parsing failed: {e}")
                raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")
        elif file.filename.endswith(('.xlsx', '.xls')):
            # Parse Excel
            try:
                import pandas as pd
                df = pd.read_excel(io.BytesIO(content))
                rows = df.to_dict('records')
            except ImportError:
                raise HTTPException(status_code=400, detail="Excel file support requires pandas. Please use CSV format.")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please use CSV or Excel.")
        
        if len(rows) == 0:
            return {
                "total": 0,
                "success": 0,
                "failed": 0,
                "duplicate_db_count": 0,
                "duplicate_file_count": 0,
                "duplicate_in_db": [],
                "duplicate_in_file": [],
                "errors": ["No data rows found in CSV file. Please check if the file has data below the header row."]
            }
        
        # Normalize column names (lowercase, strip spaces)
        normalized_rows = []
        for row in rows:
            normalized_row = {k.lower().strip().replace(' ', '_'): v for k, v in row.items()}
            normalized_rows.append(normalized_row)
        
        # Validate required fields
        required_fields = ['customer_name', 'customer_mobile_number']
        
        success_count = 0
        failed_count = 0
        errors = []
        duplicate_in_db = []
        duplicate_in_file = []
        existing_numbers = set()
        processed_numbers = set()
        
        # Get existing mobile numbers to check for duplicates
        try:
            existing_leads_response = supabase.table('lead_master').select('customer_mobile_number').execute()
            if existing_leads_response.data:
                existing_numbers = {lead['customer_mobile_number'] for lead in existing_leads_response.data if lead.get('customer_mobile_number')}
        except Exception as e:
            print(f"[Bulk Upload] Warning: Could not fetch existing leads: {e}")
            existing_numbers = set()
        
        # Process each row
        for idx, row in enumerate(normalized_rows, start=2):  # Start at 2 because row 1 is header
            try:
                # Check required fields
                missing_fields = [field for field in required_fields if not row.get(field)]
                if missing_fields:
                    errors.append(f"Row {idx}: Missing required fields: {', '.join(missing_fields)}")
                    failed_count += 1
                    continue
                
                # Validate mobile number
                mobile = str(row['customer_mobile_number']).strip()
                if len(mobile) != 10 or not mobile.isdigit():
                    errors.append(f"Row {idx}: Invalid mobile number '{mobile}' (must be 10 digits)")
                    failed_count += 1
                    continue
                
                # Check for duplicates in database
                if mobile in existing_numbers:
                    duplicate_in_db.append(f"Row {idx}: {row.get('customer_name', 'Unknown')} - {mobile}")
                    errors.append(f"Row {idx}: Duplicate mobile number '{mobile}' already exists in database")
                    failed_count += 1
                    continue
                
                # Check for duplicates within the same file
                if mobile in processed_numbers:
                    duplicate_in_file.append(f"Row {idx}: {row.get('customer_name', 'Unknown')} - {mobile}")
                    errors.append(f"Row {idx}: Duplicate mobile number '{mobile}' appears multiple times in file")
                    failed_count += 1
                    continue
                
                processed_numbers.add(mobile)
                
                # Generate UID
                lead_uid = f"CD{mobile[-6:]}"  # Use last 6 digits of mobile number
                
                # Check if UID already exists, if so, generate a unique one
                uid_check = supabase.table('lead_master').select('uid').eq('uid', lead_uid).execute()
                if uid_check.data:
                    # Generate a random UID if the mobile-based one exists
                    lead_uid = f"LD{str(uuid.uuid4())[:8].upper()}"
                
                # Prepare lead data
                insert_data = {
                    "uid": lead_uid,
                    "customer_name": str(row['customer_name']).strip(),
                    "customer_mobile_number": mobile,
                    "date": now_ist_iso(),
                    "created_at": now_ist_iso(),
                    "updated_at": now_ist_iso(),
                    "assigned": "No",
                    "lead_status": None,
                    "final_status": "Pending"
                }
                
                # Add optional fields
                optional_field_mapping = {
                    'customer_location': 'customer_location',
                    'alternate_mobile_number': 'alternate_mobile_number',
                    'source': 'source',
                    'sub_source': 'sub_source',
                    'campaign': 'campaign',
                    'model_interested': 'model_interested',
                    'variant': 'variant',
                    'buying_plan': 'buying_plan',
                    'finance_option': 'finance_option',
                    'profession': 'profession',
                    'trade_in': 'trade_in',
                    'lead_category': 'lead_category',
                    'test_drive_type': 'test_drive_type'
                }
                
                for csv_field, db_field in optional_field_mapping.items():
                    value = row.get(csv_field)
                    if value and str(value).strip() and str(value).strip().lower() not in ['nan', 'none', 'null', '']:
                        insert_data[db_field] = str(value).strip()
                
                # Insert into database
                response = supabase.table('lead_master').insert(insert_data).execute()
                
                if response.data:
                    success_count += 1
                    existing_numbers.add(mobile)  # Add to existing_numbers to prevent future duplicates
                else:
                    errors.append(f"Row {idx}: Database insertion failed")
                    failed_count += 1
                    
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
                failed_count += 1
        
        result = {
            "total": len(normalized_rows),
            "success": success_count,
            "failed": failed_count,
            "duplicate_db_count": len(duplicate_in_db),
            "duplicate_file_count": len(duplicate_in_file),
            "duplicate_in_db": duplicate_in_db[:10],  # Return first 10 DB duplicates
            "duplicate_in_file": duplicate_in_file[:10],  # Return first 10 file duplicates
            "errors": errors[:20]  # Return first 20 errors to avoid huge response
        }
        
        return result
        
    except Exception as e:
        print(f"[Bulk Upload] Fatal error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/leads/duplicate-is-dup")
async def get_leads_with_is_dup(
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    current_user=Depends(admin_required)
):
    """Get leads from lead_master where is_dup column has non-null values"""
    try:
        # Query leads where is_dup is not null using Supabase filter
        query = (
            supabase
                .table('lead_master')
                .select('*', count='exact')
                .not_.is_('is_dup', 'null')
                .order('created_at', desc=True)
                .range(offset, offset + limit - 1)
        )
        
        result = query.execute()
        
        # Get total count from the count parameter
        total_count = result.count if hasattr(result, 'count') and result.count is not None else len(result.data or [])
        
        leads = result.data or []
        
        return {
            "success": True,
            "leads": leads,
            "count": len(leads),
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(leads) < total_count
        }
    except Exception as e:
        print(f"[get_leads_with_is_dup] Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch leads with is_dup: {str(e)}")

@app.post("/api/cre/leads", response_model=dict)
async def create_cre_lead(lead_data: CRELeadCreate, current_user=Depends(get_current_user)):
    """Create a new lead for CRE users with background processing for qualified_leads and trade_in_master"""
    try:
        # Verify the CRE user is creating the lead for themselves
        if current_user.role != 'cre' or current_user.id != lead_data.cre_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Duplicate check by mobile number; if exists, append to is_dup and update row
        try:
            existing_q = (
                supabase
                    .table('lead_master')
                    .select('id, uid, is_dup')
                    .eq('customer_mobile_number', lead_data.customer_mobile_number)
                    .order('created_at', desc=True)
                    .limit(1)
            )
            existing_res = existing_q.execute()
            existing = existing_res.data[0] if existing_res.data else None
        except Exception:
            existing = None

        if existing:
            current_is_dup = existing.get('is_dup')
            if isinstance(current_is_dup, list):
                attempt_base = len(current_is_dup)
                history = current_is_dup
            elif isinstance(current_is_dup, dict):
                attempt_base = 1
                history = [current_is_dup]
            else:
                attempt_base = 0
                history = []

            dup_entry = {
                "attempt": attempt_base + 1,
                "timestamp": now_ist_iso(),
                "source": getattr(lead_data, 'source', None) or "",
                "sub_source": getattr(lead_data, 'sub_source', None) or "",
            }

            new_history = history + [dup_entry]

            update_payload = {
                "is_dup": new_history,
                "updated_at": now_ist_iso(),
                "assigned": "Yes",
                "cre_id": lead_data.cre_id,
                "cre_name": lead_data.cre_name,
                "cre_assigned_at": now_ist_iso(),
            }

            updated = (
                supabase
                    .table('lead_master')
                    .update(update_payload)
                    .eq('id', existing['id'])
                    .execute()
            )

            updated_row = updated.data[0] if updated.data else existing
            return {
                "message": "Mobile number already exists. Lead updated.",
                "duplicate": True,
                "lead": updated_row,
            }

        # Create lead record
        lead_record = {
            "uid": lead_data.uid,
            "customer_name": lead_data.customer_name,
            "customer_mobile_number": lead_data.customer_mobile_number,
            "customer_location": lead_data.customer_location,
            "source": lead_data.source,
            "sub_source": lead_data.sub_source,
            "cre_name": lead_data.cre_name,
            "cre_id": lead_data.cre_id,
            "assigned": lead_data.assigned,
            "lead_status": lead_data.lead_status,
            "final_status": lead_data.final_status,
            "lead_category": lead_data.lead_category,
            "first_remark": lead_data.remarks,
            "model_interested": lead_data.model_interested,
            "variant": lead_data.variant,
            "follow_up_date": lead_data.follow_up_date,  # Follow-up date as provided
            "first_call_date": now_ist_iso(),  # CRE adding lead counts as first call
            "date": now_ist_iso(),
            "created_at": now_ist_iso(),
            "updated_at": now_ist_iso(),
            "cre_assigned_at": now_ist_iso()
        }
        
        # Insert into lead_master
        response = supabase.table('lead_master').insert(lead_record).execute()
        
        if response.data:
            lead_uid = response.data[0]['uid']
            
            # Enqueue background task for qualified_leads and trade_in_master
            background_task_data = {
                "lead_uid": lead_uid,
                "customer_name": lead_data.customer_name,
                "customer_mobile_number": lead_data.customer_mobile_number,
                "follow_up_date": lead_data.follow_up_date,
                "cre_name": lead_data.cre_name,
                "cre_id": lead_data.cre_id,
                "source": lead_data.source,
                "sub_source": lead_data.sub_source,
                "remarks": lead_data.remarks,
                # Vehicle interest details
                "model_interested": lead_data.model_interested,
                "variant": lead_data.variant,
                # Trade-in details
                "trade_in_make": lead_data.trade_in_make,
                "trade_in_model": lead_data.trade_in_model,
                "trade_in_year": lead_data.trade_in_year,
                "trade_in_km": lead_data.trade_in_km,
                "trade_in_ownership": lead_data.trade_in_ownership
            }
            
            # Enqueue background task for qualified_leads and trade_in_master
            try:
                from .queue_system import enqueue_task
                from .workers import process_cre_lead
                
                # Enqueue the background task
                task_id = enqueue_task("backend.fastapi_app.workers.process_cre_lead", background_task_data)
                print(f"Enqueued CRE lead processing task: {task_id}")
                
            except Exception as e:
                print(f"Warning: Failed to enqueue background task: {e}")
                # Fallback: insert directly ONLY if lead is qualified
                try:
                    # Check if lead is actually qualified before inserting into qualified_leads
                    lead_check = supabase.table('lead_master').select('lead_status, final_status').eq('uid', lead_uid).execute()
                    
                    if lead_check.data:
                        lead = lead_check.data[0]
                        lead_status = lead.get('lead_status', '')
                        final_status = lead.get('final_status', '')
                        
                        # Only insert into qualified_leads if lead is actually qualified
                        if lead_status == 'Qualified':
                            print(f"Lead {lead_uid} is qualified - inserting into qualified_leads (fallback)")
                            
                            qualified_lead_data = {
                                "lead_uid": lead_uid,
                                "customer_name": lead_data.customer_name,
                                "customer_mobile_number": lead_data.customer_mobile_number,
                                "source": lead_data.source,
                                "sub_source": lead_data.sub_source,
                                "cre_name": lead_data.cre_name,
                                "first_remark": lead_data.remarks,
                                "model_interested": lead_data.model_interested,
                                "variant": lead_data.variant,
                                "created_at": now_ist_iso(),
                                "updated_at": now_ist_iso()
                            }
                            
                            # Insert qualified lead
                            qualified_response = supabase.table('qualified_leads').insert(qualified_lead_data).execute()
                            if not qualified_response.data:
                                print(f"Warning: Failed to insert qualified lead for {lead_uid}")
                        else:
                            print(f"Lead {lead_uid} is not qualified (status: {lead_status}, final: {final_status}) - skipping qualified_leads insertion (fallback)")
                    
                    # Insert into trade_in_master if trade-in details provided
                    if any([lead_data.trade_in_make, lead_data.trade_in_model, lead_data.trade_in_year, lead_data.trade_in_km, lead_data.trade_in_ownership]):
                        trade_in_data = {
                            "lead_uid": lead_uid,
                            "customer_name": lead_data.customer_name,
                            "customer_mobile_number": lead_data.customer_mobile_number,
                            "trade_in_make": lead_data.trade_in_make,
                            "trade_in_model": lead_data.trade_in_model,
                            "trade_in_year": lead_data.trade_in_year,
                            "trade_in_km": lead_data.trade_in_km,
                            "trade_in_ownership": lead_data.trade_in_ownership,
                            "created_at": now_ist_iso(),
                            "updated_at": now_ist_iso()
                        }
                        
                        trade_in_response = supabase.table('trade_in_master').upsert(trade_in_data).execute()
                        if not trade_in_response.data:
                            print(f"Warning: Failed to insert trade-in data for {lead_uid}")
                            
                except Exception as fallback_error:
                    print(f"Warning: Failed to process qualified leads and trade-in: {fallback_error}")
            
            return {"message": "Lead created successfully", "duplicate": False, "lead": response.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to create lead")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/leads/{lead_id}")
async def update_lead(lead_id: str, lead_data: LeadUpdate, current_user=None):
    """Update a lead - ULTRA FAST with background processing"""
    try:
        # Debug: log incoming payload (safe fields)
        try:
            print("[lead.update] payload:", lead_data.model_dump())
        except Exception:
            pass
        
        # Get existing lead for validation
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
        if lead_data.status is not None:
            update_data["lead_status"] = lead_data.status
        # First call remark mapping
        if lead_data.first_remark is not None:
            update_data["first_remark"] = lead_data.first_remark
        elif lead_data.notes:
            update_data["first_remark"] = lead_data.notes
        
        # Handle first_call_remark for pending/unqualified leads
        if lead_data.first_call_remark is not None:
            update_data["first_call_remark"] = lead_data.first_call_remark
        # Auto-stamp first call date (now uses TIMESTAMP)
        if (("first_remark" in update_data) or ("first_call_remark" in update_data)) and not (existing_lead.get("first_call_date")):
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
        # Do NOT write trade-in detail fields into lead_master (schema doesn't have them)
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

        # Per-step follow-up outcome fields
        if lead_data.second_call_lead_status is not None:
            update_data["second_call_lead_status"] = lead_data.second_call_lead_status
        if lead_data.third_call_lead_status is not None:
            update_data["third_call_lead_status"] = lead_data.third_call_lead_status
        if lead_data.fourth_call_lead_status is not None:
            update_data["fourth_call_lead_status"] = lead_data.fourth_call_lead_status
        if lead_data.fifth_call_lead_status is not None:
            update_data["fifth_call_lead_status"] = lead_data.fifth_call_lead_status
        if lead_data.sixth_call_lead_status is not None:
            update_data["sixth_call_lead_status"] = lead_data.sixth_call_lead_status

        # Handle pending_reasons for pending leads (multiple attempts)
        if lead_data.pending_reasons is not None:
            # Ensure each pending reason has IST timestamp and status
            current_time = now_ist_iso()
            processed_reasons = []
            for reason in lead_data.pending_reasons:
                if isinstance(reason, dict):
                    # Ensure timestamp is set to current IST time if not provided
                    if 'date' not in reason or not reason['date']:
                        reason['date'] = current_time
                    # Ensure status is included
                    if 'status' not in reason and 'reason' in reason:
                        reason['status'] = reason['reason']
                    processed_reasons.append(reason)
            update_data["pending_reasons"] = processed_reasons
        
        # Handle existing_remarks for unqualified/lost leads
        if lead_data.existing_remarks is not None:
            update_data["first_remark"] = lead_data.existing_remarks
        
        # Handle lead_status updates (Qualified/Not interested/RNR/etc.)
        if lead_data.lead_status is not None:
            update_data["lead_status"] = lead_data.lead_status
        
        # Handle final_status updates (Won/Lost/Pending)
        if lead_data.final_status is not None:
            update_data["final_status"] = lead_data.final_status

        # Debug: show final update data
        try:
            print("[lead.update] update_data:", update_data)
        except Exception:
            pass

        # Prepare user info for background processing
        user_info = {
            'username': getattr(current_user, 'username', 'system'),
            'role': getattr(current_user, 'role', 'system'),
            'user_id': getattr(current_user, 'id', 'system')
        } if current_user else {
            'username': 'system',
            'role': 'system',
            'user_id': 'system'
        }

        # Update lead_master directly for fast UI sync
        print(f"🔄 [Direct API] Updating lead_master directly for lead: {lead_id}")
        update_result = supabase.table('lead_master').update(update_data).eq('uid', lead_id).execute()
        
        if not update_result.data:
            raise HTTPException(status_code=500, detail="Failed to update lead_master")
        
        print(f"✅ [Direct API] Lead master updated successfully: {lead_id}")
        
        # Trigger background worker for qualified_leads and tradein_master
        print(f"🔄 [Background Worker] Triggering background processing for qualified_leads and tradein_master")
        result = update_lead_async(lead_id, update_data, user_info)
        
        # Handle trade-in data separately if needed
        if (lead_data.trade_in or "").lower() == "yes":
            # Add trade-in data to update_data for background processing
            result['trade_in_data'] = {
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
        
        return result
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# CRE USERS MANAGEMENT ENDPOINTS
# ========================================

# Public endpoint: Update lead_master by UID (no auth) - ULTRA FAST
@app.put("/api/public/lead-master/{uid}")
async def update_public_lead_master(uid: str, lead_data: LeadUpdate):
    """Update lead master - ULTRA FAST for CRE dashboard with background processing"""
    try:
        # 🔍 Enhanced Debug Logging
        print(f"🔄 [FastAPI] Received request for lead: {uid}")
        print(f"🔄 [FastAPI] Lead data received: {lead_data.model_dump()}")
        print(f"🔍 [FastAPI] followup_note analysis:")
        print(f"  - followup_note_value: {lead_data.followup_note}")
        print(f"  - followup_note_type: {type(lead_data.followup_note)}")
        print(f"  - followup_note_truthy: {bool(lead_data.followup_note)}")
        print(f"  - first_remark_value: {lead_data.first_remark}")
        print(f"  - first_remark_type: {type(lead_data.first_remark)}")
        print(f"  - first_remark_truthy: {bool(lead_data.first_remark)}")
        
        # Quick validation - check if lead exists and get first-call state
        existing = (
            supabase
                .table('lead_master')
                .select('uid, first_remark, first_call_date')
                .eq('uid', uid)
                .limit(1)
                .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        existing_first_remark = (existing.data[0].get('first_remark') or '').strip()
        existing_first_call_date = (existing.data[0].get('first_call_date') or '').strip()

        # Build update data
        update_data = {"updated_at": now_ist_iso()}

        if lead_data.name:
            update_data["customer_name"] = lead_data.name
        if lead_data.phone:
            update_data["customer_mobile_number"] = lead_data.phone
        if lead_data.status is not None:
            update_data["lead_status"] = lead_data.status
        
        # Handle lead_status field specifically (from frontend)
        if lead_data.lead_status is not None:
            update_data["lead_status"] = lead_data.lead_status

        if lead_data.first_remark is not None:
            update_data["first_remark"] = lead_data.first_remark
        elif lead_data.notes:
            update_data["first_remark"] = lead_data.notes
        # Auto-stamp first call date with full IST timestamp
        if ("first_remark" in update_data):
            update_data["first_call_date"] = now_ist_iso()

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
        if lead_data.test_drive_type is not None:
            update_data["test_drive_type"] = lead_data.test_drive_type
        if lead_data.customer_location is not None:
            update_data["customer_location"] = lead_data.customer_location
        if lead_data.final_status is not None:
            update_data["final_status"] = lead_data.final_status
            # Clear follow_up_date when lead is marked as Lost
            if lead_data.final_status.lower() == 'lost':
                update_data["follow_up_date"] = None

        # Handle follow-up date (accepts YYYY-MM-DD and full ISO; skip empty)
        if lead_data.follow_up_date is not None:
            fud = (lead_data.follow_up_date or "").strip()
            if fud:
                if len(fud) == 10 and fud.count('-') == 2 and 'T' not in fud:
                    current_time = now_ist_iso().split('T')[1]
                    update_data["follow_up_date"] = f"{fud}T{current_time}"
                else:
                    update_data["follow_up_date"] = fud

        # Handle pending_reasons for pending leads (multiple attempts)
        if lead_data.pending_reasons is not None:
            current_time = now_ist_iso()
            processed_reasons = []
            for reason in lead_data.pending_reasons:
                if isinstance(reason, dict):
                    if 'date' not in reason or not reason['date']:
                        reason['date'] = current_time
                    if 'status' not in reason and 'reason' in reason:
                        reason['status'] = reason['reason']
                    processed_reasons.append(reason)
            update_data["pending_reasons"] = processed_reasons

        # Per-step follow-up outcome fields
        if lead_data.second_call_lead_status is not None:
            update_data["second_call_lead_status"] = lead_data.second_call_lead_status
        if lead_data.third_call_lead_status is not None:
            update_data["third_call_lead_status"] = lead_data.third_call_lead_status
        if lead_data.fourth_call_lead_status is not None:
            update_data["fourth_call_lead_status"] = lead_data.fourth_call_lead_status
        if lead_data.fifth_call_lead_status is not None:
            update_data["fifth_call_lead_status"] = lead_data.fifth_call_lead_status
        if lead_data.sixth_call_lead_status is not None:
            update_data["sixth_call_lead_status"] = lead_data.sixth_call_lead_status

        # Business rule: Only Qualified (first-call) and Unqualified/Lost should populate first_remark.
        # Pre-qualification pending outcomes must NOT set first_remark.
        normalized_lead_status = (lead_data.lead_status or lead_data.status or "").strip().lower() if hasattr(lead_data, 'lead_status') else (lead_data.status or "").strip().lower()
        normalized_final_status = (lead_data.final_status or "").strip().lower() if hasattr(lead_data, 'final_status') else ""

        is_qualification_event = normalized_lead_status == 'qualified'
        is_unqualified_event = normalized_final_status == 'lost' or normalized_lead_status == 'lost'

        # Only set first_remark if it's a qualification or unqualification event AND first call not recorded yet
        if (is_qualification_event or is_unqualified_event) and not existing_first_remark and not existing_first_call_date:
            if lead_data.first_call_remark is not None and str(lead_data.first_call_remark).strip():
                update_data["first_remark"] = str(lead_data.first_call_remark).strip()
                update_data["first_call_date"] = now_ist_iso()
            elif lead_data.existing_remarks is not None and str(lead_data.existing_remarks).strip():
                update_data["first_remark"] = str(lead_data.existing_remarks).strip()
                update_data["first_call_date"] = now_ist_iso()

        # Handle follow-up notes - process directly for immediate results
        # NOTE: followup_note should NOT be added to update_data for direct lead_master update
        # as it doesn't exist as a column. Process it directly and map to appropriate remark field
        followup_note_for_worker = None
        if (lead_data.followup_note or "").strip():
            followup_note_for_worker = (lead_data.followup_note or "").strip()
            print(f"🔍 [FastAPI] Detected followup_note for direct processing: '{followup_note_for_worker}'")
            
            # Process followup_note directly and add to update_data
            note = followup_note_for_worker.strip()
            if note:
                # Get current lead data to determine which call we're on
                current_lead = supabase.table('lead_master').select('*').eq('uid', uid).execute()
                if current_lead.data:
                    lead_info = current_lead.data[0]
                    
                    # Call progression logic:
                    # Qualification = first_remark (qualifying call - PROTECTED, cannot be overwritten)
                    # F1 = second_remark (first follow-up)
                    # F2 = third_remark (second follow-up)
                    # F3 = fourth_remark (third follow-up)
                    # F4 = fifth_remark (fourth follow-up)
                    # F5 = sixth_remark (fifth follow-up)
                    
                    call_sequence = [
                        ('second_remark', 'second_call_date'),       # F1 - First follow-up
                        ('third_remark', 'third_call_date'),         # F2 - Second follow-up
                        ('fourth_remark', 'fourth_call_date'),       # F3 - Third follow-up
                        ('fifth_remark', 'fifth_call_date'),         # F4 - Fourth follow-up
                        ('sixth_remark', 'sixth_call_date')          # F5 - Fifth follow-up
                    ]
                    
                    # Find the next empty call slot (start from F1, skip qualification as it's the first call)
                    next_call_remark = None
                    next_call_date = None
                    for remark_field, date_field in call_sequence:
                        if not lead_info.get(remark_field):
                            next_call_remark = remark_field
                            next_call_date = date_field
                            break
                    
                    if next_call_remark:
                        # Set the remark and date for this call
                        update_data[next_call_remark] = note
                        update_data[next_call_date] = now_ist_iso()
                        # Map column names to call numbers for logging
                        call_mapping = {
                            'second_remark': 'F1',
                            'third_remark': 'F2', 
                            'fourth_remark': 'F3',
                            'fifth_remark': 'F4',
                            'sixth_remark': 'F5'
                        }
                        call_number = call_mapping.get(next_call_remark, next_call_remark)
                        print(f"🔍 [FastAPI] Set {next_call_remark} = '{note}' (Follow-up {call_number})")
                    else:
                        # All follow-up slots filled, append to last remark
                        update_data["sixth_remark"] = f"{lead_info.get('sixth_remark', '')} | {note}".strip()
                        update_data["sixth_call_date"] = now_ist_iso()
                        print(f"🔍 [FastAPI] All follow-up slots full, appended to sixth_remark")
        
        # Handle first_remark (for qualification)
        if lead_data.first_remark is not None:
            update_data["first_remark"] = lead_data.first_remark
            print(f"🔍 [FastAPI] Added first_remark to update_data: '{lead_data.first_remark}'")

        # Prepare user info for background processing
        user_info = {
            'username': 'public_user',
            'role': 'public',
            'user_id': 'public'
        }

        # ALWAYS update lead_master directly for immediate UI sync
        print(f"🔄 [FastAPI] Updating lead_master directly for immediate sync: {uid}")
        try:
            # Direct database update to lead_master for all changes
            response = supabase.table('lead_master').update(update_data).eq('uid', uid).execute()
            
            if response.data:
                print(f"✅ [FastAPI] Lead_master updated successfully: {uid}")
                result = {
                    'success': True,
                    'lead_id': uid,
                    'message': 'Lead updated successfully',
                    'status': 'completed'
                }
                
                # Trigger background processing for qualified_leads and tradein_master sync
                try:
                    print(f"🔄 [FastAPI] Triggering background sync for qualified_leads and tradein_master: {uid}")
                    # No need to pass followup_note since it's already processed directly above
                    worker_result = update_lead_async(uid, {}, user_info)
                    print(f"🔄 [FastAPI] Background worker result: {worker_result}")
                except Exception as bg_error:
                    print(f"⚠️ [FastAPI] Background sync failed (lead_master still updated): {bg_error}")
            else:
                print(f"❌ [FastAPI] Lead_master update failed: {uid}")
                result = {
                    'success': False,
                    'lead_id': uid,
                    'message': 'Failed to update lead',
                    'status': 'error'
                }
        except Exception as e:
            print(f"❌ [FastAPI] Lead_master update error: {e}")
            result = {
                'success': False,
                'lead_id': uid,
                'message': f'Database update failed: {str(e)}',
                'status': 'error'
            }
        
        # Add trade-in data if needed
        if (lead_data.trade_in or "").lower() == "yes":
            result['trade_in_data'] = {
                "lead_uid": uid,
                "trade_in_make": lead_data.trade_in_make,
                "trade_in_model": lead_data.trade_in_model,
                "trade_in_year": lead_data.trade_in_year,
                "trade_in_km": lead_data.trade_in_km,
                "trade_in_ownership": lead_data.trade_in_ownership,
                "created_at": now_ist_iso(),
                "updated_at": now_ist_iso()
            }

        return result
        
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
    """Get all CRE users from unified users table"""
    try:
        response = (
            supabase
                .table('users')
                .select('*')
                .eq('role', 'cre')
                .order('created_at', desc=True)
                .execute()
        )
        users = response.data or []
        # Map unified fields to legacy response model
        mapped = []
        for u in users:
            mapped.append({
                'id': u.get('id'),
                'name': u.get('full_name') or u.get('username'),
                'username': u.get('username'),
                'email': u.get('email'),
                'phone': u.get('phone') or '',
                'is_active': bool(u.get('is_active', True)),
                'created_at': u.get('created_at') or ''
            })
        return [CREUserResponse(**user) for user in mapped]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cre-users", response_model=CREUserResponse)
async def create_cre_user(user_data: CREUserCreate):
    """Create a new CRE user in unified users table"""
    try:
        # Store password as plain string per request (NOT recommended for production)
        password_hash = user_data.password
        
        insert_data = {
            "full_name": user_data.name,
            "username": user_data.username,
            "email": user_data.email,
            "phone": user_data.phone,
            "password_hash": password_hash,
            "is_active": True,
            "role": "cre"
        }
        
        response = supabase.table('users').insert(insert_data).execute()
        if response.data:
            u = response.data[0]
            mapped = {
                'id': u.get('id'),
                'name': u.get('full_name') or u.get('username'),
                'username': u.get('username'),
                'email': u.get('email'),
                'phone': u.get('phone') or '',
                'is_active': bool(u.get('is_active', True)),
                'created_at': u.get('created_at') or ''
            }
            return CREUserResponse(**mapped)
        else:
            raise HTTPException(status_code=500, detail="Failed to create CRE user")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/cre-users/{user_id}", response_model=CREUserResponse)
async def update_cre_user(user_id: str, user_data: CREUserUpdate):
    """Update a CRE user in unified users table"""
    try:
        update_data = {"updated_at": "NOW()"}
        
        if user_data.name:
            update_data["full_name"] = user_data.name
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
        
        response = (
            supabase
                .table('users')
                .update(update_data)
                .eq('id', user_id)
                .eq('role', 'cre')
                .execute()
        )
        if response.data:
            u = response.data[0]
            mapped = {
                'id': u.get('id'),
                'name': u.get('full_name') or u.get('username'),
                'username': u.get('username'),
                'email': u.get('email'),
                'phone': u.get('phone') or '',
                'is_active': bool(u.get('is_active', True)),
                'created_at': u.get('created_at') or ''
            }
            return CREUserResponse(**mapped)
        else:
            raise HTTPException(status_code=404, detail="CRE user not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/cre-users/{user_id}")
async def delete_cre_user(user_id: str):
    """Delete a CRE user from unified users table"""
    try:
        response = (
            supabase
                .table('users')
                .delete()
                .eq('id', user_id)
                .eq('role', 'cre')
                .execute()
        )
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

@app.get("/api/ps-users")
async def get_ps_users(branch: Optional[str] = None):
    """Get PS users from users table, optionally filtered by branch"""
    try:
        query = supabase.table('users').select('*').eq('role', 'ps').eq('is_active', True)
        if branch:
            query = query.eq('branch', branch)
        response = query.order('full_name').execute()
        users = response.data or []

        # Map to expected shape {id, name, username, branch, is_active}
        mapped = [
            {
                'id': u.get('id'),
                'name': u.get('full_name') or u.get('name') or u.get('username'),
                'username': u.get('username'),
                'branch': u.get('branch'),
                'is_active': u.get('is_active', True),
            }
            for u in users
        ]
        return mapped
    except Exception as e:
        # Fallback: try ps_users table if users lookup fails
        try:
            query = supabase.table('ps_users').select('*').eq('is_active', True)
            if branch:
                query = query.eq('branch', branch)
            response = query.order('name').execute()
            return response.data or []
        except Exception:
            return []

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
    by_source: Dict[str, int]
    available_cres: List[dict]

@app.get("/api/leads/unassigned", response_model=UnassignedLeadsResponse)
async def get_unassigned_leads():
    """Get unassigned leads grouped by source.
    Business rule: unassigned = (assigned != 'Yes') OR (cre_name is null/empty).
    """
    try:
        print("[unassigned] Fetching unassigned leads directly from database...")
        
        # Use database query to get only unassigned leads instead of fetching all
        # This is much more efficient than fetching all leads and filtering in memory
        query = (
            supabase
                .table('lead_master')
                .select('uid, source, assigned, cre_name')
                .or_('assigned.neq.Yes,cre_name.is.null,cre_name.eq.')
                .execute()
        )
        
        unassigned_leads = query.data or []
        print(f"[unassigned] Found {len(unassigned_leads)} unassigned leads directly from database")

        # Group by source
        by_source: dict = {}
        for lead in unassigned_leads:
            source = lead.get('source') or 'Unknown'
            by_source.setdefault(source, []).append(lead)

        source_counts = {src: len(lst) for src, lst in by_source.items()}
        print(f"[unassigned] Source counts: {source_counts}")

        # Fetch active CREs from unified users table
        print("[unassigned] Fetching CRE users...")
        cre_query = (
            supabase
                .table('users')
                .select('id, full_name, username, is_active, role')
                .eq('is_active', True)
                .eq('role', 'cre')
                .execute()
        )
        raw_cres = cre_query.data or []
        print(f"[unassigned] Found {len(raw_cres)} CRE users")
        
        # Normalize to expected shape with `name` field preserved for consumers
        available_cres = [
            {
                'id': u.get('id'),
                'name': u.get('full_name') or u.get('username'),
                'username': u.get('username')
            }
            for u in raw_cres
        ]

        result = UnassignedLeadsResponse(
            total_unassigned=len(unassigned_leads),
            by_source=source_counts,
            available_cres=available_cres
        )
        print(f"[unassigned] Returning response with {len(unassigned_leads)} total unassigned")
        return result
    except Exception as e:
        print(f"[unassigned] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/leads/unassigned/{source}")
async def get_unassigned_leads_by_source(source: str):
    """Get unassigned leads for a specific source (see rule above)."""
    try:
        # Parse combined source format (e.g., "Meta + Ads" -> source="Meta", subsource="Ads")
        if ' + ' in source:
            source_part, subsource_part = source.split(' + ', 1)
            source_part = source_part.strip()
            subsource_part = subsource_part.strip()
            
            # Query with both source and subsource
            query = (
                supabase
                    .table('lead_master')
                    .select('*')
                    .ilike('source', source_part)
                    .ilike('sub_source', subsource_part)
                    .or_('assigned.neq.Yes,cre_name.is.null,cre_name.eq.')
                    .execute()
            )
            print(f"[unassigned/{source}] Parsed as source='{source_part}', subsource='{subsource_part}'")
        else:
            # Original logic for simple source
            query = (
                supabase
                    .table('lead_master')
                    .select('*')
                    .ilike('source', source)  # Case-insensitive source matching
                    .or_('assigned.neq.Yes,cre_name.is.null,cre_name.eq.')
                    .execute()
            )
            print(f"[unassigned/{source}] Using simple source matching")
        
        filtered_leads = query.data or []
        print(f"[unassigned/{source}] Found {len(filtered_leads)} unassigned leads for source '{source}' directly from database")
        return filtered_leads
    except Exception as e:
        print(f"[unassigned/{source}] Error: {str(e)}")
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
        print("[public/unassigned] Fetching unassigned leads directly from database...")
        
        # Use database query to get only unassigned leads instead of fetching all
        # This is much more efficient than fetching all leads and filtering in memory
        query = (
            supabase
                .table('lead_master')
                .select('uid, source, assigned, cre_name')
                .or_('assigned.neq.Yes,cre_name.is.null,cre_name.eq.')
                .execute()
        )
        
        unassigned_leads = query.data or []
        print(f"[public/unassigned] Found {len(unassigned_leads)} unassigned leads directly from database")

        by_source = {}
        for lead in unassigned_leads:
            source = lead.get('source', 'Unknown')
            by_source.setdefault(source, []).append(lead)
        source_counts = {s: len(lst) for s, lst in by_source.items()}

        # Fetch active CREs from unified users table
        cre_query = (
            supabase
                .table('users')
                .select('id, full_name, username, is_active, role')
                .eq('is_active', True)
                .eq('role', 'cre')
                .execute()
        )
        raw_cres = cre_query.data or []
        # Normalize to expected shape with `name` field preserved for consumers
        available_cres = [
            {
                'id': u.get('id'),
                'name': u.get('full_name') or u.get('username'),
                'username': u.get('username')
            }
            for u in raw_cres
        ]

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
        # Parse combined source format (e.g., "Meta + Ads" -> source="Meta", subsource="Ads")
        if ' + ' in source:
            source_part, subsource_part = source.split(' + ', 1)
            source_part = source_part.strip()
            subsource_part = subsource_part.strip()
            
            # Query with both source and subsource
            query = (
                supabase
                    .table('lead_master')
                    .select('*')
                    .ilike('source', source_part)
                    .ilike('sub_source', subsource_part)
                    .or_('assigned.neq.Yes,cre_name.is.null,cre_name.eq.')
                    .execute()
            )
            print(f"[public/unassigned/{source}] Parsed as source='{source_part}', subsource='{subsource_part}'")
        else:
            # Original logic for simple source
            query = (
                supabase
                    .table('lead_master')
                    .select('*')
                    .ilike('source', source)  # Case-insensitive source matching
                    .or_('assigned.neq.Yes,cre_name.is.null,cre_name.eq.')
                    .execute()
            )
            print(f"[public/unassigned/{source}] Using simple source matching")
        
        filtered_leads = query.data or []
        print(f"[public/unassigned/{source}] Found {len(filtered_leads)} unassigned leads for source '{source}' directly from database")
        return filtered_leads
    except Exception as e:
        print(f"[public/unassigned/{source}] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Test endpoint to check if API is working
@app.get("/api/test")
async def test_endpoint():
    return {"message": "API is working", "timestamp": now_ist_iso()}

# Debug endpoint for team leader dashboard
@app.get("/api/debug/tl-dashboard")
async def debug_tl_dashboard(current_user=Depends(get_current_user)):
    """Debug endpoint to check team leader dashboard data"""
    try:
        # Get current user info
        user_info = {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role
        }
        
        # Get PS users assigned to this team leader
        ps_users_response = supabase.table('users').select('id, full_name, username, role, team_leader_id').eq('role', 'ps').eq('team_leader_id', current_user.id).execute()
        assigned_ps_users = ps_users_response.data or []
        
        # Get all PS users (for comparison)
        all_ps_response = supabase.table('users').select('id, full_name, username, role, team_leader_id').eq('role', 'ps').execute()
        all_ps_users = all_ps_response.data or []
        
        # Get leads in ps_followup_master
        leads_response = supabase.table('ps_followup_master').select('ps_name, lead_uid, ps_assigned_at').limit(10).execute()
        sample_leads = leads_response.data or []
        
        # Get unique PS names from leads
        unique_ps_names = list(set([lead.get('ps_name') for lead in sample_leads if lead.get('ps_name')]))
        
        # Check if any assigned PS users have leads
        assigned_ps_names = []
        for ps in assigned_ps_users:
            if ps.get('full_name'):
                assigned_ps_names.append(ps['full_name'])
            if ps.get('username'):
                assigned_ps_names.append(ps['username'])
        assigned_ps_names = list(set(assigned_ps_names))
        
        # Find leads for assigned PS users
        leads_for_assigned_ps = []
        if assigned_ps_names:
            leads_response = supabase.table('ps_followup_master').select('ps_name, lead_uid, ps_assigned_at').in_('ps_name', assigned_ps_names).limit(10).execute()
            leads_for_assigned_ps = leads_response.data or []
        
        return {
            "current_user": user_info,
            "assigned_ps_users": assigned_ps_users,
            "assigned_ps_names": assigned_ps_names,
            "all_ps_users": all_ps_users,
            "sample_leads": sample_leads,
            "unique_ps_names_in_leads": unique_ps_names,
            "leads_for_assigned_ps": leads_for_assigned_ps,
            "total_leads_count": len(sample_leads),
            "name_mismatch_detected": len(leads_for_assigned_ps) == 0 and len(assigned_ps_names) > 0
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/team-leader/ps-performance")
async def get_ps_performance(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    """Get Product Specialist performance analytics for Team Leaders"""
    try:
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Get PS users assigned to this team leader
        ps_users_response = supabase.table('users').select('id, full_name, username').eq('role', 'ps').eq('team_leader_id', current_user.id).execute()
        assigned_ps_users = ps_users_response.data or []
        assigned_ps_names = []
        for ps in assigned_ps_users:
            if ps.get('full_name'):
                assigned_ps_names.append(ps['full_name'])
            if ps.get('username'):
                assigned_ps_names.append(ps['username'])
        assigned_ps_names = list(set(assigned_ps_names))  # Remove duplicates
        
        print(f"[TL Analytics] PS Performance - Team leader {current_user.username} has {len(assigned_ps_users)} assigned PS users: {assigned_ps_names}")
        
        if not assigned_ps_names:
            print(f"[TL Analytics] PS Performance - No PS users assigned to team leader {current_user.username}")
            return []
        
        query = supabase.table('ps_followup_master').select('*')
        
        # Filter by assigned PS users
        query = query.in_('ps_name', assigned_ps_names)
        
        # Apply date filtering if provided
        if from_date:
            query = query.gte('ps_assigned_at', from_date)
        if to_date:
            query = query.lte('ps_assigned_at', to_date)
        
        response = query.execute()
        print(f"[TL Analytics] PS Performance - Found {len(response.data or [])} records in ps_followup_master for assigned PS users")
        
        # Process data to calculate PS performance
        ps_data = {}
        
        for row in response.data or []:
            ps_name = row.get('ps_name')
            if not ps_name:
                continue
                
            if ps_name not in ps_data:
                ps_data[ps_name] = {
                    'ps_name': ps_name,
                    'leads_assigned': 0,
                    'leads_contacted': 0,
                    'gap': 0
                }
            
            # Count leads assigned
            ps_data[ps_name]['leads_assigned'] += 1
            
            # Count leads contacted (has any call remark or status)
            has_contact = any([
                row.get('first_call_remark'),
                row.get('second_call_remark'),
                row.get('third_call_remark'),
                row.get('fourth_call_remark'),
                row.get('fifth_call_remark'),
                row.get('lead_status')
            ])
            
            if has_contact:
                ps_data[ps_name]['leads_contacted'] += 1
        
        # Calculate gaps
        for ps_name in ps_data:
            ps_data[ps_name]['gap'] = ps_data[ps_name]['leads_assigned'] - ps_data[ps_name]['leads_contacted']
        
        return list(ps_data.values())
        
    except Exception as e:
        print(f"[TL Analytics] Error fetching PS performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team-leader/source-analysis")
async def get_source_analysis(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    """Get source-wise leads analysis for Team Leaders"""
    try:
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Get PS users assigned to this team leader
        ps_users_response = supabase.table('users').select('id, full_name, username').eq('role', 'ps').eq('team_leader_id', current_user.id).execute()
        assigned_ps_users = ps_users_response.data or []
        assigned_ps_names = []
        for ps in assigned_ps_users:
            if ps.get('full_name'):
                assigned_ps_names.append(ps['full_name'])
            if ps.get('username'):
                assigned_ps_names.append(ps['username'])
        assigned_ps_names = list(set(assigned_ps_names))  # Remove duplicates
        
        print(f"[TL Analytics] Source Analysis - Team leader {current_user.username} has {len(assigned_ps_users)} assigned PS users: {assigned_ps_names}")
        
        if not assigned_ps_names:
            print(f"[TL Analytics] Source Analysis - No PS users assigned to team leader {current_user.username}")
            return []
        
        query = supabase.table('ps_followup_master').select('*')
        
        # Filter by assigned PS users
        query = query.in_('ps_name', assigned_ps_names)
        
        # Apply date filtering if provided
        if from_date:
            query = query.gte('ps_assigned_at', from_date)
        if to_date:
            query = query.lte('ps_assigned_at', to_date)
        
        response = query.execute()
        print(f"[TL Analytics] Source Analysis - Found {len(response.data or [])} records in ps_followup_master for assigned PS users")
        
        # Process data for source analysis
        ps_data = {}
        
        # Fetch actual sources from database instead of hardcoding
        sources_response = supabase.table('ps_followup_master').select('source').not_.is_('source', 'null').execute()
        unique_sources = list(set([row.get('source') for row in sources_response.data or [] if row.get('source')]))
        sources = sorted(unique_sources) if unique_sources else ['Other']
        
        for row in response.data or []:
            ps_name = row.get('ps_name')
            source = row.get('source', 'Other')
            final_status = row.get('final_status', 'Pending')
            
            if not ps_name:
                continue
                
            if ps_name not in ps_data:
                ps_data[ps_name] = {
                    'ps_name': ps_name,
                    'total_leads': 0,
                    'won_leads': 0,
                    'win_rate': 0.0,
                    'sources': {}
                }
                
                # Initialize all sources
                for s in sources:
                    ps_data[ps_name]['sources'][s] = {
                        'total': 0,
                        'won': 0,
                        'win_rate': 0.0
                    }
            
            # Update totals
            ps_data[ps_name]['total_leads'] += 1
            if final_status.lower() == 'won':
                ps_data[ps_name]['won_leads'] += 1
            
            # Update source-specific data
            if source in ps_data[ps_name]['sources']:
                ps_data[ps_name]['sources'][source]['total'] += 1
                if final_status.lower() == 'won':
                    ps_data[ps_name]['sources'][source]['won'] += 1
        
        # Calculate win rates
        for ps_name in ps_data:
            if ps_data[ps_name]['total_leads'] > 0:
                ps_data[ps_name]['win_rate'] = round((ps_data[ps_name]['won_leads'] / ps_data[ps_name]['total_leads']) * 100, 1)
            
            for source in ps_data[ps_name]['sources']:
                source_data = ps_data[ps_name]['sources'][source]
                if source_data['total'] > 0:
                    source_data['win_rate'] = round((source_data['won'] / source_data['total']) * 100, 1)
        
        return list(ps_data.values())
        
    except Exception as e:
        print(f"[TL Analytics] Error fetching source analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team-leader/followup-summary")
async def get_followup_summary(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    mode: str = "all",
    current_user=Depends(get_current_user)
):
    """Get Product Specialist follow-up summary for Team Leaders"""
    try:
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Get PS users assigned to this team leader
        ps_users_response = supabase.table('users').select('id, full_name, username').eq('role', 'ps').eq('team_leader_id', current_user.id).execute()
        assigned_ps_users = ps_users_response.data or []
        assigned_ps_names = []
        for ps in assigned_ps_users:
            if ps.get('full_name'):
                assigned_ps_names.append(ps['full_name'])
            if ps.get('username'):
                assigned_ps_names.append(ps['username'])
        assigned_ps_names = list(set(assigned_ps_names))  # Remove duplicates
        
        print(f"[TL Analytics] Follow-up Summary - Team leader {current_user.username} has {len(assigned_ps_users)} assigned PS users: {assigned_ps_names}")
        
        if not assigned_ps_names:
            print(f"[TL Analytics] Follow-up Summary - No PS users assigned to team leader {current_user.username}")
            return []
        
        query = supabase.table('ps_followup_master').select('*')
        
        # Filter by assigned PS users
        query = query.in_('ps_name', assigned_ps_names)
        
        # Apply date filtering if provided
        if from_date:
            query = query.gte('ps_assigned_at', from_date)
        if to_date:
            query = query.lte('ps_assigned_at', to_date)
        
        # Apply mode filtering
        if mode == "pending":
            query = query.eq('final_status', 'Pending')
        
        response = query.execute()
        print(f"[TL Analytics] Follow-up Summary - Found {len(response.data or [])} records in ps_followup_master for assigned PS users")
        
        # Process data for follow-up summary
        ps_data = {}
        
        for row in response.data or []:
            ps_name = row.get('ps_name')
            source = row.get('source', '')
            
            if not ps_name:
                continue
                
            # Classify lead type
            lead_type = 'WALK-IN' if source in ['Walk-in', 'Digital'] else 'CRE'
            
            if ps_name not in ps_data:
                ps_data[ps_name] = {
                    'ps_name': ps_name,
                    'followups': {}
                }
                
                # Initialize F1-F7 for both CRE and WALK-IN
                for i in range(1, 8):
                    ps_data[ps_name]['followups'][f'F{i}'] = {
                        'CRE': 0,
                        'WALK-IN': 0
                    }
            
            # Determine follow-up stage based on call count
            call_count = 0
            call_fields = [
                'first_call_remark', 'second_call_remark', 'third_call_remark',
                'fourth_call_remark', 'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark'
            ]
            
            for field in call_fields:
                if row.get(field):
                    call_count += 1
            
            # Map to follow-up stage (F1-F7)
            if call_count == 0:
                stage = 'F1'
            elif call_count <= 7:
                stage = f'F{call_count}'
            else:
                stage = 'F7'  # Cap at F7
            
            ps_data[ps_name]['followups'][stage][lead_type] += 1
        
        # Convert to list format
        result = []
        for ps_name in ps_data:
            ps_result = {'ps_name': ps_name}
            for stage in ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7']:
                ps_result[stage] = ps_data[ps_name]['followups'][stage]
            result.append(ps_result)
        
        return result
        
    except Exception as e:
        print(f"[TL Analytics] Error fetching follow-up summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team-leader/fresh-leads")
async def get_fresh_leads(
    team_leader_id: str,
    search: Optional[str] = None,
    ps_member: Optional[str] = None,
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    """Get fresh leads for Team Leaders - leads assigned to PS members under this team leader"""
    try:
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's leads.")
        
        
        # Build the query to get fresh leads
        # Fresh leads are those assigned to PS members under this team leader
        # with status 'Fresh' or 'New' (newly assigned, not yet worked)
        
        # First, get all PS members under this team leader
        ps_members_response = supabase.table('users').select('id, full_name, branch').eq('role', 'ps').eq('is_active', True).eq('team_leader_id', team_leader_id).execute()
        
        if not ps_members_response.data:
            return {"leads": [], "total": 0, "message": "No PS members found under this team leader"}
        
        ps_member_ids = [ps['id'] for ps in ps_members_response.data]
        ps_member_names = {ps['id']: ps['full_name'] for ps in ps_members_response.data}
        ps_member_branches = {ps['id']: ps['branch'] for ps in ps_members_response.data}
        
        
        # Query fresh leads from ps_followup_master table
        # Fresh leads: final_status = 'Pending' AND first_call_date IS NULL
        query = supabase.table('ps_followup_master').select('*').in_('ps_id', ps_member_ids).eq('final_status', 'Pending').is_('first_call_date', 'null').limit(1000)
        
        # Apply date range filter based on ps_assigned_at
        if start_date and end_date:
            # Use custom date range
            query = query.gte('ps_assigned_at', start_date).lte('ps_assigned_at', end_date)
        elif date_range and date_range != 'all':
            from datetime import datetime, timedelta
            try:
                if date_range == 'today':
                    # Today only
                    now = datetime.now()
                    start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_date = now.replace(hour=23, minute=59, second=59, microsecond=999999)
                else:
                    # Last X days
                    days = int(date_range)
                    end_date = datetime.now()
                    start_date = end_date - timedelta(days=days)
                
                # Convert to ISO format for Supabase
                start_iso = start_date.isoformat()
                end_iso = end_date.isoformat()
                
                query = query.gte('ps_assigned_at', start_iso).lte('ps_assigned_at', end_iso)
            except ValueError:
                pass
        
        # Execute query
        response = query.execute()
        all_leads = response.data or []
        
        # Apply search filter if provided
        if search:
            search_term = search.lower()
            all_leads = [lead for lead in all_leads if 
                        (lead.get('customer_name', '').lower().find(search_term) != -1) or
                        (lead.get('customer_mobile_number', '').find(search_term) != -1) or
                        (lead.get('lead_uid', '').lower().find(search_term) != -1)]
        
        # Apply PS member filter if provided
        if ps_member and ps_member != 'all':
            all_leads = [lead for lead in all_leads if str(lead.get('ps_id')) == str(ps_member)]
        
        # Deduplicate leads by lead_uid (most important) and customer_mobile_number
        try:
            seen_uids = set()
            seen_mobiles = set()
            deduplicated_leads = []
            
            for lead in all_leads:
                lead_uid = lead.get('lead_uid')
                mobile = lead.get('customer_mobile_number')
                
                # Primary deduplication by lead_uid
                if lead_uid and lead_uid in seen_uids:
                    continue
                    
                # Secondary deduplication by mobile number (if no lead_uid)
                if not lead_uid and mobile and mobile in seen_mobiles:
                    continue
                
                # Add to seen sets
                if lead_uid:
                    seen_uids.add(lead_uid)
                if mobile:
                    seen_mobiles.add(mobile)
                    
                deduplicated_leads.append(lead)
        except Exception as dedup_error:
            deduplicated_leads = all_leads  # Fallback to original list
        
        # Sort by ps_assigned_at desc and apply pagination
        deduplicated_leads.sort(key=lambda x: x.get('ps_assigned_at', x.get('created_at', '')), reverse=True)
        leads = deduplicated_leads[offset:offset + limit]
        
        # OPTIMIZATION: Fetch all qualified_leads data in one query (prevents N+1 query problem)
        lead_uids = [lead.get('lead_uid') for lead in leads if lead.get('lead_uid')]
        qualified_data_map = {}
        if lead_uids:
            qualified_response = supabase.table('qualified_leads').select('lead_uid, icrop_id, model_interested, variant').in_('lead_uid', lead_uids).execute()
            # Build lookup map
            for ql in qualified_response.data or []:
                qualified_data_map[ql['lead_uid']] = ql
        
        # Enrich leads with PS member names and other details
        enriched_leads = []
        for lead in leads:
            ps_id = lead.get('ps_id')
            ps_name = ps_member_names.get(ps_id, 'Unknown')
            ps_branch = ps_member_branches.get(ps_id, 'Unknown')
            
            # Get additional details from qualified_leads lookup map
            qualified_data = qualified_data_map.get(lead.get('lead_uid'), {})
            
            enriched_lead = {
                **lead,
                'ps_name': ps_name,
                'ps_branch': ps_branch,
                'icrop_id': qualified_data.get('icrop_id'),
                'make': '',  # qualified_leads doesn't have make column
                'model': qualified_data.get('model_interested', ''),  # Use model_interested instead of model
                'variant': qualified_data.get('variant')
            }
            
            enriched_leads.append(enriched_lead)
        
        # Get total count for pagination (use deduplicated leads)
        total_count = len(deduplicated_leads)
        
        return {
            "leads": enriched_leads,
            "total": total_count,
            "ps_members": ps_members_response.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team-leader/todays-followup")
async def get_todays_followup(
    team_leader_id: str,
    search: Optional[str] = None,
    ps_member: Optional[str] = None,
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    """Get today's follow-up leads for Team Leaders - leads with follow_up_date = today or overdue"""
    try:
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's leads.")
        
        # Get all PS members under this team leader
        ps_members_response = supabase.table('users').select('id, full_name, branch').eq('role', 'ps').eq('is_active', True).eq('team_leader_id', team_leader_id).execute()
        
        if not ps_members_response.data:
            return {"leads": [], "total": 0, "message": "No PS members found under this team leader"}
        
        ps_member_ids = [ps['id'] for ps in ps_members_response.data]
        ps_member_names = {ps['id']: ps['full_name'] for ps in ps_members_response.data}
        ps_member_branches = {ps['id']: ps['branch'] for ps in ps_members_response.data}
        
        # Query today's follow-up leads from ps_followup_master table
        # Today's follow-up: follow_up_date = today OR follow_up_date < today (overdue)
        from datetime import datetime, timedelta
        
        # Get today's date
        today = datetime.now().date()
        today_str = today.isoformat()
        
        # Start with base query
        query = supabase.table('ps_followup_master').select('*').in_('ps_id', ps_member_ids).lte('follow_up_date', today_str).limit(1000)

        # Apply date range filter based on ps_assigned_at
        if start_date and end_date:
            # Use custom date range
            query = query.gte('ps_assigned_at', start_date).lte('ps_assigned_at', end_date)
        elif date_range and date_range != 'all':
            try:
                if date_range == 'today':
                    # Today only
                    now = datetime.now()
                    start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
                    query = query.gte('ps_assigned_at', start_dt.isoformat()).lte('ps_assigned_at', end_dt.isoformat())
                else:
                    # Last X days
                    days = int(date_range)
                    if days > 0:
                        today = datetime.now().date()
                        start_dt = today - timedelta(days=days)
                        query = query.gte('ps_assigned_at', start_dt.isoformat())
            except ValueError:
                pass
        
        # Execute query
        response = query.execute()
        all_leads = response.data or []
        
        # Filter out leads with final_status = 'Won' or 'Lost'
        all_leads = [lead for lead in all_leads if lead.get('final_status', '').lower() not in ['won', 'lost']]
        
        # Filter out leads that are awaiting CRE approval
        all_leads = [lead for lead in all_leads if not (lead.get('lost_requested_by') and not lead.get('lost_approved_by'))]
        
        # Apply search filter if provided
        if search:
            search_term = search.lower()
            all_leads = [lead for lead in all_leads if 
                        (lead.get('customer_name', '').lower().find(search_term) != -1) or
                        (lead.get('customer_mobile_number', '').find(search_term) != -1) or
                        (lead.get('lead_uid', '').lower().find(search_term) != -1)]
        
        # Apply PS member filter if provided
        if ps_member and ps_member != 'all':
            all_leads = [lead for lead in all_leads if str(lead.get('ps_id')) == str(ps_member)]
        
        # Deduplicate leads by lead_uid (most important) and customer_mobile_number
        try:
            seen_uids = set()
            seen_mobiles = set()
            deduplicated_leads = []
            
            for lead in all_leads:
                lead_uid = lead.get('lead_uid')
                mobile = lead.get('customer_mobile_number')
                
                # Primary deduplication by lead_uid
                if lead_uid and lead_uid in seen_uids:
                    continue
                    
                # Secondary deduplication by mobile number (if no lead_uid)
                if not lead_uid and mobile and mobile in seen_mobiles:
                    continue
                
                # Add to seen sets
                if lead_uid:
                    seen_uids.add(lead_uid)
                if mobile:
                    seen_mobiles.add(mobile)
                    
                deduplicated_leads.append(lead)
        except Exception as dedup_error:
            deduplicated_leads = all_leads  # Fallback to original list
        
        # Sort by follow_up_date ascending with overdue first
        def sort_key(lead):
            follow_up_date = lead.get('follow_up_date', '')
            if follow_up_date:
                try:
                    follow_date = datetime.fromisoformat(follow_up_date.replace('Z', '+00:00')).date()
                    # Overdue leads (past dates) come first, then today's leads
                    if follow_date < today:
                        return (0, follow_date)  # Overdue first
                    elif follow_date == today:
                        return (1, follow_date)  # Today's leads second
                    else:
                        return (2, follow_date)  # Future leads last
                except:
                    return (3, '')  # Invalid dates last
            return (3, '')
        
        deduplicated_leads.sort(key=sort_key)
        leads = deduplicated_leads[offset:offset + limit]
        
        # OPTIMIZATION: Fetch all qualified_leads data in one query (prevents N+1 query problem)
        lead_uids = [lead.get('lead_uid') for lead in leads if lead.get('lead_uid')]
        qualified_data_map = {}
        if lead_uids:
            qualified_response = supabase.table('qualified_leads').select('lead_uid, icrop_id, model_interested, variant').in_('lead_uid', lead_uids).execute()
            # Build lookup map
            for ql in qualified_response.data or []:
                qualified_data_map[ql['lead_uid']] = ql
        
        # Enrich leads with PS member names and other details
        enriched_leads = []
        for lead in leads:
            ps_id = lead.get('ps_id')
            ps_name = ps_member_names.get(ps_id, 'Unknown')
            ps_branch = ps_member_branches.get(ps_id, 'Unknown')
            
            # Get additional details from qualified_leads lookup map (already fetched in bulk above)
            qualified_data = qualified_data_map.get(lead.get('lead_uid'), {})
            
            # Calculate next call number and overdue status
            follow_up_date = lead.get('follow_up_date')
            next_call_number = 1
            is_overdue = False
            overdue_days = 0
            
            if follow_up_date:
                try:
                    follow_date = datetime.fromisoformat(follow_up_date.replace('Z', '+00:00')).date()
                    if follow_date < today:
                        is_overdue = True
                        overdue_days = (today - follow_date).days
                except:
                    pass
            
            # Determine next call number based on existing call remarks
            call_fields = [
                'first_call_remark', 'second_call_remark', 'third_call_remark',
                'fourth_call_remark', 'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark'
            ]
            
            for i, field in enumerate(call_fields):
                if lead.get(field):
                    next_call_number = i + 2  # Next call number
            
            enriched_lead = {
                **lead,
                'ps_name': ps_name,
                'ps_branch': ps_branch,
                'icrop_id': qualified_data.get('icrop_id'),
                'make': '',
                'model': qualified_data.get('model_interested', ''),
                'variant': qualified_data.get('variant'),
                'next_call_number': next_call_number,
                'is_overdue': is_overdue,
                'overdue_days': overdue_days,
                'awaiting_cre_approval': bool(lead.get('lost_requested_by') and not lead.get('lost_approved_by'))
            }
            enriched_leads.append(enriched_lead)
        
        # Get total count for pagination (use deduplicated leads)
        total_count = len(deduplicated_leads)
        
        return {
            "leads": enriched_leads,
            "total": total_count,
            "ps_members": ps_members_response.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team-leader/open-leads")
async def get_open_leads(
    team_leader_id: str,
    search: Optional[str] = None,
    ps_member: Optional[str] = None,
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    """Get open leads for Team Leaders - leads with final_status = 'Pending'"""
    try:
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's leads.")
        
        # Get all PS members under this team leader
        ps_members_response = supabase.table('users').select('id, full_name, branch').eq('role', 'ps').eq('is_active', True).eq('team_leader_id', team_leader_id).execute()
        
        if not ps_members_response.data:
            return {"leads": [], "total": 0, "message": "No PS members found under this team leader"}
        
        ps_member_ids = [ps['id'] for ps in ps_members_response.data]
        ps_member_names = {ps['id']: ps['full_name'] for ps in ps_members_response.data}
        ps_member_branches = {ps['id']: ps['branch'] for ps in ps_members_response.data}
        
        # Query open leads from ps_followup_master table with final_status = 'Pending'
        query = supabase.table('ps_followup_master').select('*').in_('ps_id', ps_member_ids).eq('final_status', 'Pending').limit(1000)
        
        # Apply date range filter based on ps_assigned_at
        if start_date and end_date:
            # Use custom date range
            query = query.gte('ps_assigned_at', start_date).lte('ps_assigned_at', end_date)
        elif date_range and date_range != 'all':
            from datetime import datetime, timedelta
            try:
                if date_range == 'today':
                    # Today only
                    now = datetime.now()
                    start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
                    query = query.gte('ps_assigned_at', start_dt.isoformat()).lte('ps_assigned_at', end_dt.isoformat())
                else:
                    # Last X days
                    days = int(date_range)
                    if days > 0:
                        today = datetime.now().date()
                        start_dt = today - timedelta(days=days)
                        query = query.gte('ps_assigned_at', start_dt.isoformat())
            except ValueError:
                pass
        
        # Execute query
        response = query.execute()
        all_leads = response.data or []
        
        # Apply search filter if provided
        if search:
            search_term = search.lower()
            all_leads = [lead for lead in all_leads if 
                        (lead.get('customer_name', '').lower().find(search_term) != -1) or
                        (lead.get('customer_mobile_number', '').find(search_term) != -1) or
                        (lead.get('lead_uid', '').lower().find(search_term) != -1)]
        
        # Apply PS member filter if provided
        if ps_member and ps_member != 'all':
            all_leads = [lead for lead in all_leads if str(lead.get('ps_id')) == str(ps_member)]
        
        # Deduplicate leads by lead_uid (most important) and customer_mobile_number
        try:
            seen_uids = set()
            seen_mobiles = set()
            deduplicated_leads = []
            
            for lead in all_leads:
                lead_uid = lead.get('lead_uid')
                mobile = lead.get('customer_mobile_number')
                
                # Primary deduplication by lead_uid
                if lead_uid and lead_uid in seen_uids:
                    continue
                    
                # Secondary deduplication by mobile number (if no lead_uid)
                if not lead_uid and mobile and mobile in seen_mobiles:
                    continue
                
                # Add to seen sets
                if lead_uid:
                    seen_uids.add(lead_uid)
                if mobile:
                    seen_mobiles.add(mobile)
                    
                deduplicated_leads.append(lead)
        except Exception as dedup_error:
            deduplicated_leads = all_leads  # Fallback to original list
        
        # Sort by created_at descending (newest first)
        deduplicated_leads.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        leads = deduplicated_leads[offset:offset + limit]
        
        # OPTIMIZATION: Fetch all qualified_leads data in one query (prevents N+1 query problem)
        lead_uids = [lead.get('lead_uid') for lead in leads if lead.get('lead_uid')]
        qualified_data_map = {}
        if lead_uids:
            qualified_response = supabase.table('qualified_leads').select('lead_uid, icrop_id, model_interested, variant').in_('lead_uid', lead_uids).execute()
            # Build lookup map
            for ql in qualified_response.data or []:
                qualified_data_map[ql['lead_uid']] = ql
        
        # Enrich leads with PS member names and other details
        enriched_leads = []
        for lead in leads:
            ps_id = lead.get('ps_id')
            ps_name = ps_member_names.get(ps_id, 'Unknown')
            ps_branch = ps_member_branches.get(ps_id, 'Unknown')
            
            # Get additional details from qualified_leads lookup map (already fetched in bulk above)
            qualified_data = qualified_data_map.get(lead.get('lead_uid'), {})
            
            # Calculate next call number
            next_call_number = 1
            
            # Determine next call number based on existing call remarks
            call_fields = [
                'first_call_remark', 'second_call_remark', 'third_call_remark',
                'fourth_call_remark', 'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark'
            ]
            
            for i, field in enumerate(call_fields):
                if lead.get(field):
                    next_call_number = i + 2  # Next call number
            
            enriched_lead = {
                **lead,
                'ps_name': ps_name,
                'ps_branch': ps_branch,
                'icrop_id': qualified_data.get('icrop_id'),
                'make': '',
                'model': qualified_data.get('model_interested', ''),
                'variant': qualified_data.get('variant'),
                'next_call_number': next_call_number,
                'awaiting_cre_approval': bool(lead.get('lost_requested_by') and not lead.get('lost_approved_by'))
            }
            enriched_leads.append(enriched_lead)
        
        # Get total count for pagination (use deduplicated leads)
        total_count = len(deduplicated_leads)
        
        return {
            "leads": enriched_leads,
            "total": total_count,
            "ps_members": ps_members_response.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team-leader/waiting-approval")
async def get_waiting_approval_leads(
    team_leader_id: str,
    search: Optional[str] = None,
    ps_member: Optional[str] = None,
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    """Get waiting for approval leads for Team Leaders - leads with final_status = 'Waiting for Approval'"""
    try:
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's leads.")
        
        # Get all PS members under this team leader
        ps_members_response = supabase.table('users').select('id, full_name, branch').eq('role', 'ps').eq('is_active', True).eq('team_leader_id', team_leader_id).execute()
        
        if not ps_members_response.data:
            return {"leads": [], "total": 0, "message": "No PS members found under this team leader"}
        
        ps_member_ids = [ps['id'] for ps in ps_members_response.data]
        ps_member_names = {ps['id']: ps['full_name'] for ps in ps_members_response.data}
        ps_member_branches = {ps['id']: ps['branch'] for ps in ps_members_response.data}
        
        # Query waiting for approval leads from ps_followup_master table
        query = supabase.table('ps_followup_master').select('*').in_('ps_id', ps_member_ids).eq('final_status', 'Waiting for Approval').limit(1000)
        
        # Apply date range filter based on ps_assigned_at
        if start_date and end_date:
            # Use custom date range
            query = query.gte('ps_assigned_at', start_date).lte('ps_assigned_at', end_date)
        elif date_range and date_range != 'all':
            from datetime import datetime, timedelta
            try:
                if date_range == 'today':
                    # Today only
                    now = datetime.now()
                    start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
                    query = query.gte('ps_assigned_at', start_dt.isoformat()).lte('ps_assigned_at', end_dt.isoformat())
                else:
                    # Last X days
                    days = int(date_range)
                    if days > 0:
                        today = datetime.now().date()
                        start_dt = today - timedelta(days=days)
                        query = query.gte('ps_assigned_at', start_dt.isoformat())
            except ValueError:
                pass
        
        # Execute query
        response = query.execute()
        all_leads = response.data or []
        
        # Apply search filter if provided
        if search:
            search_term = search.lower()
            all_leads = [lead for lead in all_leads if 
                        (lead.get('customer_name', '').lower().find(search_term) != -1) or
                        (lead.get('customer_mobile_number', '').find(search_term) != -1) or
                        (lead.get('lead_uid', '').lower().find(search_term) != -1)]
        
        # Apply PS member filter if provided
        if ps_member and ps_member != 'all':
            all_leads = [lead for lead in all_leads if str(lead.get('ps_id')) == str(ps_member)]
        
        # Deduplicate leads by lead_uid (most important) and customer_mobile_number
        try:
            seen_uids = set()
            seen_mobiles = set()
            deduplicated_leads = []
            
            for lead in all_leads:
                lead_uid = lead.get('lead_uid')
                mobile = lead.get('customer_mobile_number')
                
                # Primary deduplication by lead_uid
                if lead_uid and lead_uid in seen_uids:
                    continue
                    
                # Secondary deduplication by mobile number (if no lead_uid)
                if not lead_uid and mobile and mobile in seen_mobiles:
                    continue
                
                # Add to seen sets
                if lead_uid:
                    seen_uids.add(lead_uid)
                if mobile:
                    seen_mobiles.add(mobile)
                    
                deduplicated_leads.append(lead)
        except Exception as dedup_error:
            deduplicated_leads = all_leads  # Fallback to original list
        
        # Sort by follow_up_date ascending with overdue first
        def sort_key(lead):
            follow_up_date = lead.get('follow_up_date', '')
            if follow_up_date:
                try:
                    follow_date = datetime.fromisoformat(follow_up_date.replace('Z', '+00:00')).date()
                    today = datetime.now().date()
                    # Overdue leads (past dates) come first, then future leads
                    if follow_date < today:
                        return (0, follow_date)  # Overdue first
                    else:
                        return (1, follow_date)  # Future leads second
                except:
                    return (2, '')  # Invalid dates last
            return (2, '')
        
        deduplicated_leads.sort(key=sort_key)
        leads = deduplicated_leads[offset:offset + limit]
        
        # OPTIMIZATION: Fetch all qualified_leads data in one query (prevents N+1 query problem)
        lead_uids = [lead.get('lead_uid') for lead in leads if lead.get('lead_uid')]
        qualified_data_map = {}
        if lead_uids:
            qualified_response = supabase.table('qualified_leads').select('lead_uid, icrop_id, model_interested, variant').in_('lead_uid', lead_uids).execute()
            # Build lookup map
            for ql in qualified_response.data or []:
                qualified_data_map[ql['lead_uid']] = ql
        
        # Enrich leads with PS member names and other details
        enriched_leads = []
        for lead in leads:
            ps_id = lead.get('ps_id')
            ps_name = ps_member_names.get(ps_id, 'Unknown')
            ps_branch = ps_member_branches.get(ps_id, 'Unknown')
            
            # Get additional details from qualified_leads lookup map (already fetched in bulk above)
            qualified_data = qualified_data_map.get(lead.get('lead_uid'), {})
            
            # Calculate next call number and overdue status
            follow_up_date = lead.get('follow_up_date')
            next_call_number = 1
            is_overdue = False
            overdue_days = 0
            
            if follow_up_date:
                try:
                    follow_date = datetime.fromisoformat(follow_up_date.replace('Z', '+00:00')).date()
                    today = datetime.now().date()
                    if follow_date < today:
                        is_overdue = True
                        overdue_days = (today - follow_date).days
                except:
                    pass
            
            # Determine next call number based on existing call remarks
            call_fields = [
                'first_call_remark', 'second_call_remark', 'third_call_remark',
                'fourth_call_remark', 'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark'
            ]
            
            for i, field in enumerate(call_fields):
                if lead.get(field):
                    next_call_number = i + 2  # Next call number
            
            enriched_lead = {
                **lead,
                'ps_name': ps_name,
                'ps_branch': ps_branch,
                'icrop_id': qualified_data.get('icrop_id'),
                'make': '',
                'model': qualified_data.get('model_interested', ''),
                'variant': qualified_data.get('variant'),
                'next_call_number': next_call_number,
                'is_overdue': is_overdue,
                'overdue_days': overdue_days,
                'awaiting_cre_approval': True  # All leads in this tab are awaiting CRE approval
            }
            enriched_leads.append(enriched_lead)
        
        # Get total count for pagination (use deduplicated leads)
        total_count = len(deduplicated_leads)
        
        return {
            "leads": enriched_leads,
            "total": total_count,
            "ps_members": ps_members_response.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team-leader/booked")
async def get_booked_leads(
    team_leader_id: str,
    search: Optional[str] = None,
    ps_member: Optional[str] = None,
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    """Get booked leads for Team Leaders - leads with final_status = 'Booked'"""
    try:
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's leads.")
        
        # Get all PS members under this team leader
        ps_members_response = supabase.table('users').select('id, full_name, branch').eq('role', 'ps').eq('is_active', True).eq('team_leader_id', team_leader_id).execute()
        
        if not ps_members_response.data:
            return {"leads": [], "total": 0, "message": "No PS members found under this team leader"}
        
        ps_member_ids = [ps['id'] for ps in ps_members_response.data]
        ps_member_names = {ps['id']: ps['full_name'] for ps in ps_members_response.data}
        ps_member_branches = {ps['id']: ps['branch'] for ps in ps_members_response.data}
        
        # Query booked leads from ps_followup_master table
        query = supabase.table('ps_followup_master').select('*').in_('ps_id', ps_member_ids).eq('final_status', 'Booked').limit(1000)
        
        # Apply date range filter based on ps_assigned_at
        if start_date and end_date:
            # Use custom date range
            query = query.gte('ps_assigned_at', start_date).lte('ps_assigned_at', end_date)
        elif date_range and date_range != 'all':
            from datetime import datetime, timedelta
            try:
                if date_range == 'today':
                    # Today only
                    now = datetime.now()
                    start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
                    query = query.gte('ps_assigned_at', start_dt.isoformat()).lte('ps_assigned_at', end_dt.isoformat())
                else:
                    # Last X days
                    days = int(date_range)
                    if days > 0:
                        today = datetime.now().date()
                        start_dt = today - timedelta(days=days)
                        query = query.gte('ps_assigned_at', start_dt.isoformat())
            except ValueError:
                pass
        
        # Execute query
        response = query.execute()
        all_leads = response.data or []
        
        # Apply search filter if provided
        if search:
            search_term = search.lower()
            all_leads = [lead for lead in all_leads if 
                        (lead.get('customer_name', '').lower().find(search_term) != -1) or
                        (lead.get('customer_mobile_number', '').find(search_term) != -1) or
                        (lead.get('lead_uid', '').lower().find(search_term) != -1)]
        
        # Apply PS member filter if provided
        if ps_member and ps_member != 'all':
            all_leads = [lead for lead in all_leads if str(lead.get('ps_id')) == str(ps_member)]
        
        # Deduplicate leads by lead_uid (most important) and customer_mobile_number
        try:
            seen_uids = set()
            seen_mobiles = set()
            deduplicated_leads = []
            
            for lead in all_leads:
                lead_uid = lead.get('lead_uid')
                mobile = lead.get('customer_mobile_number')
                
                # Primary deduplication by lead_uid
                if lead_uid and lead_uid in seen_uids:
                    continue
                    
                # Secondary deduplication by mobile number (if no lead_uid)
                if not lead_uid and mobile and mobile in seen_mobiles:
                    continue
                
                # Add to seen sets
                if lead_uid:
                    seen_uids.add(lead_uid)
                if mobile:
                    seen_mobiles.add(mobile)
                    
                deduplicated_leads.append(lead)
        except Exception as dedup_error:
            deduplicated_leads = all_leads  # Fallback to original list
        
        # Sort by ps_assigned_at descending (newest first), then by customer_name
        deduplicated_leads.sort(key=lambda x: (x.get('ps_assigned_at', ''), x.get('customer_name', '')), reverse=True)
        leads = deduplicated_leads[offset:offset + limit]
        
        # OPTIMIZATION: Fetch all qualified_leads data in one query (prevents N+1 query problem)
        lead_uids = [lead.get('lead_uid') for lead in leads if lead.get('lead_uid')]
        qualified_data_map = {}
        if lead_uids:
            qualified_response = supabase.table('qualified_leads').select('lead_uid, icrop_id, model_interested, variant').in_('lead_uid', lead_uids).execute()
            # Build lookup map
            for ql in qualified_response.data or []:
                qualified_data_map[ql['lead_uid']] = ql
        
        # Enrich leads with PS member names and other details
        enriched_leads = []
        for lead in leads:
            ps_id = lead.get('ps_id')
            ps_name = ps_member_names.get(ps_id, 'Unknown')
            ps_branch = ps_member_branches.get(ps_id, 'Unknown')
            
            # Get additional details from qualified_leads lookup map (already fetched in bulk above)
            qualified_data = qualified_data_map.get(lead.get('lead_uid'), {})
            
            # Calculate next call number and overdue status
            follow_up_date = lead.get('follow_up_date')
            next_call_number = 1
            is_overdue = False
            overdue_days = 0
            
            if follow_up_date:
                try:
                    follow_date = datetime.fromisoformat(follow_up_date.replace('Z', '+00:00')).date()
                    today = datetime.now().date()
                    if follow_date < today:
                        is_overdue = True
                        overdue_days = (today - follow_date).days
                except:
                    pass
            
            # Determine next call number based on existing call remarks
            call_fields = [
                'first_call_remark', 'second_call_remark', 'third_call_remark',
                'fourth_call_remark', 'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark'
            ]
            
            for i, field in enumerate(call_fields):
                if lead.get(field):
                    next_call_number = i + 2  # Next call number
            
            enriched_lead = {
                **lead,
                'ps_name': ps_name,
                'ps_branch': ps_branch,
                'icrop_id': qualified_data.get('icrop_id'),
                'make': '',
                'model': qualified_data.get('model_interested', ''),
                'variant': qualified_data.get('variant'),
                'next_call_number': next_call_number,
                'is_overdue': is_overdue,
                'overdue_days': overdue_days,
                'awaiting_cre_approval': bool(lead.get('lost_requested_by') and not lead.get('lost_approved_by'))
            }
            enriched_leads.append(enriched_lead)
        
        # Get total count for pagination (use deduplicated leads)
        total_count = len(deduplicated_leads)
        
        return {
            "leads": enriched_leads,
            "total": total_count,
            "ps_members": ps_members_response.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team-leader/retailed")
async def get_retailed_leads(
    team_leader_id: str,
    search: Optional[str] = None,
    ps_member: Optional[str] = None,
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    """Get retailed leads for Team Leaders - leads with final_status = 'Won'"""
    try:
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's leads.")
        
        # Get all PS members under this team leader
        ps_members_response = supabase.table('users').select('id, full_name, branch').eq('role', 'ps').eq('is_active', True).eq('team_leader_id', team_leader_id).execute()
        
        if not ps_members_response.data:
            return {"leads": [], "total": 0, "message": "No PS members found under this team leader"}
        
        ps_member_ids = [ps['id'] for ps in ps_members_response.data]
        ps_member_names = {ps['id']: ps['full_name'] for ps in ps_members_response.data}
        ps_member_branches = {ps['id']: ps['branch'] for ps in ps_members_response.data}
        
        # Query retailed leads from ps_followup_master table
        query = supabase.table('ps_followup_master').select('*').in_('ps_id', ps_member_ids).eq('final_status', 'Won').limit(1000)
        
        # Apply date range filter based on updated_at
        if start_date and end_date:
            # Use custom date range
            query = query.gte('updated_at', start_date).lte('updated_at', end_date)
        elif date_range and date_range != 'all':
            from datetime import datetime, timedelta
            try:
                if date_range == 'today':
                    # Today only
                    now = datetime.now()
                    start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
                    query = query.gte('updated_at', start_dt.isoformat()).lte('updated_at', end_dt.isoformat())
                else:
                    # Last X days
                    days = int(date_range)
                    if days > 0:
                        today = datetime.now().date()
                        start_dt = today - timedelta(days=days)
                        query = query.gte('updated_at', start_dt.isoformat())
            except ValueError:
                pass
        
        # Execute query
        response = query.execute()
        all_leads = response.data or []
        
        # Apply search filter if provided
        if search:
            search_term = search.lower()
            all_leads = [lead for lead in all_leads if 
                        (lead.get('customer_name', '').lower().find(search_term) != -1) or
                        (lead.get('customer_mobile_number', '').find(search_term) != -1) or
                        (lead.get('lead_uid', '').lower().find(search_term) != -1)]
        
        # Apply PS member filter if provided
        if ps_member and ps_member != 'all':
            all_leads = [lead for lead in all_leads if str(lead.get('ps_id')) == str(ps_member)]
        
        # Deduplicate leads by lead_uid (most important) and customer_mobile_number
        try:
            seen_uids = set()
            seen_mobiles = set()
            deduplicated_leads = []
            
            for lead in all_leads:
                lead_uid = lead.get('lead_uid')
                mobile = lead.get('customer_mobile_number')
                
                # Primary deduplication by lead_uid
                if lead_uid and lead_uid in seen_uids:
                    continue
                    
                # Secondary deduplication by mobile number (if no lead_uid)
                if not lead_uid and mobile and mobile in seen_mobiles:
                    continue
                
                # Add to seen sets
                if lead_uid:
                    seen_uids.add(lead_uid)
                if mobile:
                    seen_mobiles.add(mobile)
                    
                deduplicated_leads.append(lead)
        except Exception as dedup_error:
            deduplicated_leads = all_leads  # Fallback to original list
        
        # Sort by ps_assigned_at descending (newest first), then by customer_name
        deduplicated_leads.sort(key=lambda x: (x.get('ps_assigned_at', ''), x.get('customer_name', '')), reverse=True)
        leads = deduplicated_leads[offset:offset + limit]
        
        # OPTIMIZATION: Fetch all qualified_leads data in one query (prevents N+1 query problem)
        lead_uids = [lead.get('lead_uid') for lead in leads if lead.get('lead_uid')]
        qualified_data_map = {}
        if lead_uids:
            qualified_response = supabase.table('qualified_leads').select('lead_uid, icrop_id, model_interested, variant').in_('lead_uid', lead_uids).execute()
            # Build lookup map
            for ql in qualified_response.data or []:
                qualified_data_map[ql['lead_uid']] = ql
        
        # Enrich leads with PS member names and other details
        enriched_leads = []
        for lead in leads:
            ps_id = lead.get('ps_id')
            ps_name = ps_member_names.get(ps_id, 'Unknown')
            ps_branch = ps_member_branches.get(ps_id, 'Unknown')
            
            # Get additional details from qualified_leads lookup map (already fetched in bulk above)
            qualified_data = qualified_data_map.get(lead.get('lead_uid'), {})
            
            # Calculate next call number and overdue status
            follow_up_date = lead.get('follow_up_date')
            next_call_number = 1
            is_overdue = False
            overdue_days = 0
            
            if follow_up_date:
                try:
                    follow_date = datetime.fromisoformat(follow_up_date.replace('Z', '+00:00')).date()
                    today = datetime.now().date()
                    if follow_date < today:
                        is_overdue = True
                        overdue_days = (today - follow_date).days
                except:
                    pass
            
            # Determine next call number based on existing call remarks
            call_fields = [
                'first_call_remark', 'second_call_remark', 'third_call_remark',
                'fourth_call_remark', 'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark'
            ]
            
            for i, field in enumerate(call_fields):
                if lead.get(field):
                    next_call_number = i + 2  # Next call number
            
            enriched_lead = {
                **lead,
                'ps_name': ps_name,
                'ps_branch': ps_branch,
                'icrop_id': qualified_data.get('icrop_id'),
                'make': '',
                'model': qualified_data.get('model_interested', ''),
                'variant': qualified_data.get('variant'),
                'next_call_number': next_call_number,
                'is_overdue': is_overdue,
                'overdue_days': overdue_days,
                'awaiting_cre_approval': bool(lead.get('lost_requested_by') and not lead.get('lost_approved_by'))
            }
            enriched_leads.append(enriched_lead)
        
        # Get total count for pagination (use deduplicated leads)
        total_count = len(deduplicated_leads)
        
        return {
            "leads": enriched_leads,
            "total": total_count,
            "ps_members": ps_members_response.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team-leader/lost")
async def get_lost_leads(
    team_leader_id: str,
    search: Optional[str] = None,
    ps_member: Optional[str] = None,
    date_range: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    current_user=Depends(get_current_user)
):
    """Get lost leads for Team Leaders - leads with final_status = 'Lost'"""
    try:
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's leads.")
        
        # Get all PS members under this team leader
        ps_members_response = supabase.table('users').select('id, full_name, branch').eq('role', 'ps').eq('is_active', True).eq('team_leader_id', team_leader_id).execute()
        
        if not ps_members_response.data:
            return {"leads": [], "total": 0, "message": "No PS members found under this team leader"}
        
        ps_member_ids = [ps['id'] for ps in ps_members_response.data]
        ps_member_names = {ps['id']: ps['full_name'] for ps in ps_members_response.data}
        ps_member_branches = {ps['id']: ps['branch'] for ps in ps_members_response.data}
        
        # Query lost leads from ps_followup_master table
        query = supabase.table('ps_followup_master').select('*').in_('ps_id', ps_member_ids).eq('final_status', 'Lost').limit(1000)
        
        # Apply date range filter based on updated_at
        if start_date and end_date:
            # Use custom date range
            query = query.gte('updated_at', start_date).lte('updated_at', end_date)
        elif date_range and date_range != 'all':
            from datetime import datetime, timedelta
            try:
                if date_range == 'today':
                    # Today only
                    now = datetime.now()
                    start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
                    query = query.gte('updated_at', start_dt.isoformat()).lte('updated_at', end_dt.isoformat())
                else:
                    # Last X days
                    days = int(date_range)
                    if days > 0:
                        today = datetime.now().date()
                        start_dt = today - timedelta(days=days)
                        query = query.gte('updated_at', start_dt.isoformat())
            except ValueError:
                pass
        
        # Execute query
        response = query.execute()
        all_leads = response.data or []
        
        # Apply search filter if provided
        if search:
            search_term = search.lower()
            all_leads = [lead for lead in all_leads if 
                        (lead.get('customer_name', '').lower().find(search_term) != -1) or
                        (lead.get('customer_mobile_number', '').find(search_term) != -1) or
                        (lead.get('lead_uid', '').lower().find(search_term) != -1)]
        
        # Apply PS member filter if provided
        if ps_member and ps_member != 'all':
            all_leads = [lead for lead in all_leads if str(lead.get('ps_id')) == str(ps_member)]
        
        # Deduplicate leads by lead_uid (most important) and customer_mobile_number
        try:
            seen_uids = set()
            seen_mobiles = set()
            deduplicated_leads = []
            
            for lead in all_leads:
                lead_uid = lead.get('lead_uid')
                mobile = lead.get('customer_mobile_number')
                
                # Primary deduplication by lead_uid
                if lead_uid and lead_uid in seen_uids:
                    continue
                    
                # Secondary deduplication by mobile number (if no lead_uid)
                if not lead_uid and mobile and mobile in seen_mobiles:
                    continue
                
                # Add to seen sets
                if lead_uid:
                    seen_uids.add(lead_uid)
                if mobile:
                    seen_mobiles.add(mobile)
                    
                deduplicated_leads.append(lead)
        except Exception as dedup_error:
            deduplicated_leads = all_leads  # Fallback to original list
        
        # Sort by ps_assigned_at descending (newest first), then by customer_name
        deduplicated_leads.sort(key=lambda x: (x.get('ps_assigned_at', ''), x.get('customer_name', '')), reverse=True)
        leads = deduplicated_leads[offset:offset + limit]
        
        # OPTIMIZATION: Fetch all qualified_leads data in one query (prevents N+1 query problem)
        lead_uids = [lead.get('lead_uid') for lead in leads if lead.get('lead_uid')]
        qualified_data_map = {}
        if lead_uids:
            qualified_response = supabase.table('qualified_leads').select('lead_uid, icrop_id, model_interested, variant').in_('lead_uid', lead_uids).execute()
            # Build lookup map
            for ql in qualified_response.data or []:
                qualified_data_map[ql['lead_uid']] = ql
        
        # Enrich leads with PS member names and other details
        enriched_leads = []
        for lead in leads:
            ps_id = lead.get('ps_id')
            ps_name = ps_member_names.get(ps_id, 'Unknown')
            ps_branch = ps_member_branches.get(ps_id, 'Unknown')
            
            # Get additional details from qualified_leads lookup map (already fetched in bulk above)
            qualified_data = qualified_data_map.get(lead.get('lead_uid'), {})
            
            # Calculate next call number and overdue status
            follow_up_date = lead.get('follow_up_date')
            next_call_number = 1
            is_overdue = False
            overdue_days = 0
            
            if follow_up_date:
                try:
                    follow_date = datetime.fromisoformat(follow_up_date.replace('Z', '+00:00')).date()
                    today = datetime.now().date()
                    if follow_date < today:
                        is_overdue = True
                        overdue_days = (today - follow_date).days
                except:
                    pass
            
            # Determine next call number based on existing call remarks
            call_fields = [
                'first_call_remark', 'second_call_remark', 'third_call_remark',
                'fourth_call_remark', 'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark'
            ]
            
            for i, field in enumerate(call_fields):
                if lead.get(field):
                    next_call_number = i + 2  # Next call number
            
            enriched_lead = {
                **lead,
                'ps_name': ps_name,
                'ps_branch': ps_branch,
                'icrop_id': qualified_data.get('icrop_id'),
                'make': '',
                'model': qualified_data.get('model_interested', ''),
                'variant': qualified_data.get('variant'),
                'next_call_number': next_call_number,
                'is_overdue': is_overdue,
                'overdue_days': overdue_days,
                'awaiting_cre_approval': bool(lead.get('lost_requested_by') and not lead.get('lost_approved_by'))
            }
            enriched_leads.append(enriched_lead)
        
        # Get total count for pagination (use deduplicated leads)
        total_count = len(deduplicated_leads)
        
        return {
            "leads": enriched_leads,
            "total": total_count,
            "ps_members": ps_members_response.data
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/team-leader/{team_leader_id}/ps-members")
async def get_ps_members(
    team_leader_id: str,
    current_user=Depends(get_current_user)
):
    """Get PS members for a Team Leader"""
    try:
        print(f"[PS Members] Starting request for team leader: {team_leader_id}")
        
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's PS members.")
        
        # Get all PS members under this team leader
        print(f"[PS Members] Querying PS members for team leader: {team_leader_id}")
        ps_members_response = supabase.table('users').select('id, full_name, branch').eq('role', 'ps').eq('is_active', True).eq('team_leader_id', team_leader_id).execute()
        
        print(f"[PS Members] Found {len(ps_members_response.data or [])} PS members")
        return ps_members_response.data or []
        
    except Exception as e:
        print(f"Error in ps-members endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/team-leader/{team_leader_id}/analytics-kpi")
async def get_analytics_kpi(
    team_leader_id: str,
    request: Request,
    current_user=Depends(get_current_user)
):
    """Get analytics KPI data for Team Leaders - aggregate counts only"""
    try:
        print(f"[Analytics KPI] Starting request for team leader: {team_leader_id}")
        
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's analytics.")
        
        # Parse request body
        body = await request.json()
        ps_ids = body.get('ps_ids', [])
        start_date = body.get('start_date')
        end_date = body.get('end_date')
        
        print(f"[Analytics KPI] PS IDs: {ps_ids}, Start: {start_date}, End: {end_date}")
        
        if not ps_ids:
            return {
                "total_assigned": 0,
                "open_leads": 0,
                "won_leads": 0,
                "lost_leads": 0
            }
        
        # Query ps_followup_master table for analytics
        # Total Leads Assigned: COUNT(DISTINCT lead_uid) filtered by ps_assigned_at
        total_query = supabase.table('ps_followup_master').select('lead_uid').in_('ps_id', ps_ids)
        if start_date:
            total_query = total_query.gte('ps_assigned_at', start_date)
        if end_date:
            total_query = total_query.lte('ps_assigned_at', end_date)
        total_response = total_query.execute()
        
        # Get unique lead UIDs for total assigned
        unique_leads = set()
        if total_response.data:
            for lead in total_response.data:
                if lead.get('lead_uid'):
                    unique_leads.add(lead['lead_uid'])
        total_assigned = len(unique_leads)
        
        # Open Leads: COUNT(*) where final_status='Pending' with ps_assigned_at filter
        # DEDUPLICATION: Count DISTINCT lead_uid to match the open-leads tab logic
        open_query = supabase.table('ps_followup_master').select('lead_uid').in_('ps_id', ps_ids).eq('final_status', 'Pending')
        if start_date:
            open_query = open_query.gte('ps_assigned_at', start_date)
        if end_date:
            open_query = open_query.lte('ps_assigned_at', end_date)
        open_response = open_query.execute()
        # Deduplicate by lead_uid
        open_leads = len(set([lead.get('lead_uid') for lead in open_response.data or [] if lead.get('lead_uid')]))
        
        # Won Leads: COUNT(*) where final_status='Won' filtered by won_timestamp
        # DEDUPLICATION: Count DISTINCT lead_uid to match the booked/retailed tab logic
        won_query = supabase.table('ps_followup_master').select('lead_uid').in_('ps_id', ps_ids).eq('final_status', 'Won')
        if start_date:
            won_query = won_query.gte('won_timestamp', start_date)
        if end_date:
            won_query = won_query.lte('won_timestamp', end_date)
        won_response = won_query.execute()
        # Deduplicate by lead_uid
        won_leads = len(set([lead.get('lead_uid') for lead in won_response.data or [] if lead.get('lead_uid')]))
        
        # Lost Leads: COUNT(*) where final_status='Lost' filtered by lost_timestamp
        # DEDUPLICATION: Count DISTINCT lead_uid to match the lost tab logic
        lost_query = supabase.table('ps_followup_master').select('lead_uid').in_('ps_id', ps_ids).eq('final_status', 'Lost')
        if start_date:
            lost_query = lost_query.gte('lost_timestamp', start_date)
        if end_date:
            lost_query = lost_query.lte('lost_timestamp', end_date)
        lost_response = lost_query.execute()
        # Deduplicate by lead_uid
        lost_leads = len(set([lead.get('lead_uid') for lead in lost_response.data or [] if lead.get('lead_uid')]))
        
        return {
            "total_assigned": total_assigned,
            "open_leads": open_leads,
            "won_leads": won_leads,
            "lost_leads": lost_leads
        }
        
    except Exception as e:
        print(f"Error in analytics-kpi endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/team-leader/{team_leader_id}/source-performance")
async def get_source_performance(
    team_leader_id: str,
    request: Request,
    current_user=Depends(get_current_user)
):
    """Get source performance data for Team Leaders - grouped by source and sub-source"""
    try:
        print(f"[Source Performance] Starting request for team leader: {team_leader_id}")
        
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's source performance.")
        
        # Parse request body
        body = await request.json()
        ps_ids = body.get('ps_ids', [])
        start_date = body.get('start_date')
        end_date = body.get('end_date')
        ps_name = body.get('ps_name')  # For specific PS filtering
        
        print(f"[Source Performance] PS IDs: {ps_ids}, Start: {start_date}, End: {end_date}, PS Name: {ps_name}")
        
        if not ps_ids:
            return {"sources": []}
        
        # Get all leads for the PS team with source information
        # This matches your SQL query logic exactly
        base_query = supabase.table('ps_followup_master').select('*').in_('ps_id', ps_ids)
        
        # Apply PS name filter if provided (for specific PS filtering)
        if ps_name:
            base_query = base_query.eq('ps_name', ps_name)
        
        # Apply date range filter for ps_assigned_at
        if start_date:
            base_query = base_query.gte('ps_assigned_at', start_date)
        if end_date:
            base_query = base_query.lte('ps_assigned_at', end_date)
        
        response = base_query.execute()
        all_leads = response.data or []
        
        print(f"[Source Performance] Found {len(all_leads)} leads")
        
        # Debug: Log Google leads specifically
        google_leads = [lead for lead in all_leads if lead.get('source', '').lower() == 'google']
        print(f"[Source Performance] Google leads found: {len(google_leads)}")
        for lead in google_leads:
            print(f"[Source Performance] Google lead {lead.get('lead_uid')}: final_status='{lead.get('final_status')}', first_call_date={lead.get('first_call_date')}, ps_assigned_at={lead.get('ps_assigned_at')}")
        
        # Group leads by source using your exact logic
        source_groups = {}
        
        for lead in all_leads:
            source = lead.get('source', 'Unknown')
            final_status = lead.get('final_status', 'Pending')
            first_call_date = lead.get('first_call_date')
            lead_uid = lead.get('lead_uid')
            
            # Use source as key (normalize for grouping)
            source_key = source.strip().lower() if source else 'unknown'
            
            if source_key not in source_groups:
                source_groups[source_key] = {
                    'source': source.strip(),  # Keep original source name for display
                    'leads': set(),  # Use set to avoid duplicate lead_uid (DISTINCT)
                    'untouched': set(),
                    'waiting_for_approval': set(),
                    'won': set(),
                    'lost': set()
                }
            
            group = source_groups[source_key]
            group['leads'].add(lead_uid)  # COUNT(DISTINCT lead_uid)
            
            # Categorize leads according to your SQL logic
            if final_status == 'Pending' and not first_call_date:
                group['untouched'].add(lead_uid)  # Untouched: Pending + No First Call
                if source.lower() == 'google':
                    print(f"[Source Performance] Google lead {lead_uid} categorized as UNTOUCHED")
            elif final_status == 'Waiting for Approval':
                group['waiting_for_approval'].add(lead_uid)
            elif final_status == 'Won':
                group['won'].add(lead_uid)
            elif final_status in ['Lost', 'Lost Requested']:  # Handle both Lost statuses
                group['lost'].add(lead_uid)
                if source.lower() == 'google':
                    print(f"[Source Performance] Google lead {lead_uid} categorized as LOST (status: {final_status})")
        
        print(f"[Source Performance] Grouped into {len(source_groups)} source groups")
        
        # Build response matching your SQL output
        sources = []
        
        for source_key, group in source_groups.items():
            total_leads = len(group['leads'])  # COUNT(DISTINCT lead_uid)
            untouched = len(group['untouched'])  # COUNT(DISTINCT CASE WHEN final_status = 'Pending' AND first_call_date IS NULL THEN lead_uid END)
            waiting_for_approval = len(group['waiting_for_approval'])  # COUNT(DISTINCT CASE WHEN final_status = 'Waiting for Approval' THEN lead_uid END)
            won = len(group['won'])  # COUNT(DISTINCT CASE WHEN final_status = 'Won' THEN lead_uid END)
            lost = len(group['lost'])  # COUNT(DISTINCT CASE WHEN final_status = 'Lost' THEN lead_uid END)
            called = total_leads - untouched  # Called = Total - Untouched
            
            sources.append({
                'source': group['source'],
                'untouched': untouched,
                'total_assigned': total_leads,  # Match frontend interface
                'waiting_for_approval': waiting_for_approval,
                'won': won,
                'lost': lost,
                'called': called
            })
        
        # Sort sources alphabetically (ORDER BY source ASC)
        sources.sort(key=lambda x: x['source'])
        
        print(f"[Source Performance] Returning {len(sources)} source entries")
        print(f"[Source Performance] Source names: {[s['source'] for s in sources]}")
        
        return {
            "sources": sources
        }
        
    except Exception as e:
        print(f"Error in source-performance endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/team-leader/{team_leader_id}/pending-followup-summary")
async def get_pending_followup_summary(
    team_leader_id: str,
    request: Request,
    current_user=Depends(get_current_user)
):
    """Get pending leads follow-up summary for Team Leaders - grouped by PS name"""
    try:
        print(f"[Pending Followup Summary] Starting request for team leader: {team_leader_id}")
        
        # Check if user has team leader permissions
        if current_user.role not in ['team_leader', 'admin', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied. Team leader role required.")
        
        # Verify the team leader ID matches the current user
        if current_user.role == 'team_leader' and current_user.id != team_leader_id:
            raise HTTPException(status_code=403, detail="Access denied. Can only view your own team's data.")
        
        # Parse request body
        body = await request.json()
        start_date = body.get('start_date')
        end_date = body.get('end_date')
        
        print(f"[Pending Followup Summary] Start: {start_date}, End: {end_date}")
        
        # Get all PS users under this team leader
        ps_response = supabase.table('users').select('id, full_name').eq('team_leader_id', team_leader_id).eq('role', 'ps').eq('is_active', True).execute()
        ps_users = ps_response.data or []
        
        if not ps_users:
            return {"summary": []}
        
        ps_ids = [ps['id'] for ps in ps_users]
        ps_names = {ps['id']: ps['full_name'] for ps in ps_users}
        
        print(f"[Pending Followup Summary] Found {len(ps_users)} PS users")
        
        # Get all pending leads for these PS users
        base_query = supabase.table('ps_followup_master').select('*').in_('ps_id', ps_ids).eq('final_status', 'Pending')
        
        # Apply date range filter for ps_assigned_at
        if start_date:
            base_query = base_query.gte('ps_assigned_at', start_date)
        if end_date:
            base_query = base_query.lte('ps_assigned_at', end_date)
        
        response = base_query.execute()
        all_leads = response.data or []
        
        print(f"[Pending Followup Summary] Found {len(all_leads)} pending leads")
        
        # Group leads by PS and categorize by follow-up stage
        ps_summary = {}
        
        for ps_id, ps_name in ps_names.items():
            ps_summary[ps_id] = {
                'ps_name': ps_name,
                'untouched': set(),  # first_call_date IS NULL AND final_status='Pending'
                'f1': set(),  # first_call_date IS NOT NULL AND second_call_date IS NULL
                'f2': set(),  # second_call_date IS NOT NULL AND third_call_date IS NULL
                'f3': set(),  # third_call_date IS NOT NULL AND fourth_call_date IS NULL
                'f4': set(),
                'f5': set(),
                'f6': set(),
                'f7': set(),
                'f8': set(),
                'f9': set(),
                'f10': set()  # tenth_call_date IS NOT NULL
            }
        
        # Categorize each lead by follow-up stage
        for lead in all_leads:
            ps_id = lead.get('ps_id')
            if ps_id not in ps_summary:
                continue
            
            lead_uid = lead.get('lead_uid')
            first_call = lead.get('first_call_date')
            second_call = lead.get('second_call_date')
            third_call = lead.get('third_call_date')
            fourth_call = lead.get('fourth_call_date')
            fifth_call = lead.get('fifth_call_date')
            sixth_call = lead.get('sixth_call_date')
            seventh_call = lead.get('seventh_call_date')
            eighth_call = lead.get('eighth_call_date')
            ninth_call = lead.get('ninth_call_date')
            tenth_call = lead.get('tenth_call_date')
            
            # Categorize based on follow-up stage
            if not first_call:
                # Untouched: first_call_date IS NULL
                ps_summary[ps_id]['untouched'].add(lead_uid)
            elif first_call and not second_call:
                # F1: first_call_date IS NOT NULL AND second_call_date IS NULL
                ps_summary[ps_id]['f1'].add(lead_uid)
            elif second_call and not third_call:
                ps_summary[ps_id]['f2'].add(lead_uid)
            elif third_call and not fourth_call:
                ps_summary[ps_id]['f3'].add(lead_uid)
            elif fourth_call and not fifth_call:
                ps_summary[ps_id]['f4'].add(lead_uid)
            elif fifth_call and not sixth_call:
                ps_summary[ps_id]['f5'].add(lead_uid)
            elif sixth_call and not seventh_call:
                ps_summary[ps_id]['f6'].add(lead_uid)
            elif seventh_call and not eighth_call:
                ps_summary[ps_id]['f7'].add(lead_uid)
            elif eighth_call and not ninth_call:
                ps_summary[ps_id]['f8'].add(lead_uid)
            elif ninth_call and not tenth_call:
                ps_summary[ps_id]['f9'].add(lead_uid)
            elif tenth_call:
                ps_summary[ps_id]['f10'].add(lead_uid)
        
        # Build response
        summary = []
        for ps_id, data in ps_summary.items():
            summary.append({
                'ps_name': data['ps_name'],
                'untouched': len(data['untouched']),
                'f1': len(data['f1']),
                'f2': len(data['f2']),
                'f3': len(data['f3']),
                'f4': len(data['f4']),
                'f5': len(data['f5']),
                'f6': len(data['f6']),
                'f7': len(data['f7']),
                'f8': len(data['f8']),
                'f9': len(data['f9']),
                'f10': len(data['f10'])
            })
        
        # Sort by PS name
        summary.sort(key=lambda x: x['ps_name'])
        
        print(f"[Pending Followup Summary] Returning summary for {len(summary)} PS users")
        
        return {
            "summary": summary
        }
        
    except Exception as e:
        print(f"[Pending Followup Summary] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/debug/cre-call-history")
async def debug_cre_call_history():
    """Debug endpoint to check CRE call history data"""
    try:
        # Check lead_master for any leads with CRE call history
        response = supabase.table('lead_master').select(
            'uid', 'customer_name', 'customer_mobile_number', 'cre_name',
            'first_remark', 'second_remark', 'third_remark', 'fourth_remark', 'fifth_remark', 'sixth_remark',
            'first_call_date', 'second_call_date', 'third_call_date', 'fourth_call_date', 'fifth_call_date', 'sixth_call_date',
            'second_call_lead_status', 'third_call_lead_status', 'fourth_call_lead_status', 'fifth_call_lead_status', 'sixth_call_lead_status'
        ).not_.is_('first_remark', 'null').limit(5).execute()
        
        leads_with_cre_calls = []
        for lead in response.data or []:
            cre_calls = []
            call_fields = [
                ('first_remark', 'first_call_date', None),  # first_call_lead_status doesn't exist
                ('second_remark', 'second_call_date', 'second_call_lead_status'),
                ('third_remark', 'third_call_date', 'third_call_lead_status'),
                ('fourth_remark', 'fourth_call_date', 'fourth_call_lead_status'),
                ('fifth_remark', 'fifth_call_date', 'fifth_call_lead_status'),
                ('sixth_remark', 'sixth_call_date', 'sixth_call_lead_status')
            ]
            
            for remark_field, date_field, status_field in call_fields:
                remark = lead.get(remark_field)
                if remark and remark.strip():
                    cre_calls.append({
                        'remark': remark,
                        'date': lead.get(date_field),
                        'status': lead.get(status_field),
                        'field': remark_field
                    })
            
            if cre_calls:
                leads_with_cre_calls.append({
                    'uid': lead['uid'],
                    'customer_name': lead['customer_name'],
                    'customer_mobile_number': lead['customer_mobile_number'],
                    'cre_name': lead['cre_name'],
                    'cre_calls': cre_calls
                })
        
        return {
            "total_leads_checked": len(response.data or []),
            "leads_with_cre_calls": len(leads_with_cre_calls),
            "sample_leads": leads_with_cre_calls[:3]  # Show first 3 for debugging
        }
    except Exception as e:
        return {"error": str(e)}

# Public endpoint to fetch leads assigned to a specific CRE username
@app.get("/api/public/cre-assigned/{username}")
async def get_public_cre_assigned(username: str, name: Optional[str] = None):
    try:
        print(f"Fetching leads for username: {username}, name: {name}")

        # Prefer full name if provided; otherwise use username
        clean_user = (username or '').strip()
        clean_name = (name or '').strip()
        search_term = clean_name or clean_user
        
        if not search_term:
            return []
        
        # Optimized single query with proper filtering
        query = supabase.table('lead_master').select('*, trade_in_master(*)').eq('assigned', 'Yes').eq('cre_name', search_term)
        
        # Execute single optimized query
        response = query.order('created_at', desc=True).execute()
        found_leads = response.data or []
        
        # If no exact matches, try case-insensitive (fallback)
        if not found_leads:
            try:
                all_leads_response = supabase.table('lead_master').select('*, trade_in_master(*)').eq('assigned', 'Yes').execute()
                if all_leads_response.data:
                    found_leads = [
                            lead for lead in all_leads_response.data 
                        if lead.get('cre_name', '').lower() == search_term.lower()
                        ]
            except Exception as e:
                print(f"Error with case-insensitive match: {e}")
        
        # Flatten trade-in data efficiently
        for lead in found_leads:
            if lead.get('trade_in_master') and isinstance(lead['trade_in_master'], list) and len(lead['trade_in_master']) > 0:
                trade_in_data = lead['trade_in_master'][0]
                lead['trade_in_make'] = trade_in_data.get('trade_in_make')
                lead['trade_in_model'] = trade_in_data.get('trade_in_model')
                lead['trade_in_year'] = trade_in_data.get('trade_in_year')
                lead['trade_in_km'] = trade_in_data.get('trade_in_km')
                lead['trade_in_ownership'] = trade_in_data.get('trade_in_ownership')
                # Remove the nested object to keep response clean
                del lead['trade_in_master']
            elif 'trade_in_master' in lead:
                del lead['trade_in_master']
        
        print(f"Found {len(found_leads)} leads for CRE")
        return found_leads
    except Exception as e:
        # Minimal logging to server stdout for debugging 500s
        print(f"Error in get_public_cre_assigned: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Alternative endpoint with query parameters
@app.get("/api/cre-assigned")
async def get_cre_assigned(
    username: Optional[str] = None, 
    name: Optional[str] = None,
    tab: Optional[str] = None  # NEW: tab filter (all, fresh, followup, qualified, lost, wonlost)
):
    try:
        print(f"Fetching leads for username: {username}, name: {name}, tab: {tab}")
        query = supabase.table('lead_master').select('*, trade_in_master(*)').eq('assigned', 'Yes')

        # Prefer full name if provided; otherwise use username
        clean_user = (username or '').strip()
        clean_name = (name or '').strip()

        if clean_name:
            query = query.eq('cre_name', clean_name)
        elif clean_user:
            query = query.eq('cre_name', clean_user)

        # Apply tab-specific filtering at database level for performance
        if tab:
            tab_lower = tab.lower()
            if tab_lower == 'fresh':
                # Fresh leads: not qualified, not won/lost, no first_call_date
                query = query.is_('first_call_date', 'null').neq('lead_status', 'Qualified').not_.in_('final_status', ['booked', 'retailed', 'Lost', 'lost'])
            elif tab_lower == 'followup':
                # Follow-up leads: have follow_up_date set, not won/lost
                # Exclude by final_status = Lost OR truly unqualified lead_status (but allow RNR, Call me back, etc.)
                print(f"🔍 [DEBUG] Filtering follow-up leads - excluding lost/unqualified leads (but allowing RNR/Call me back)")
                query = query.not_.is_('follow_up_date', 'null').not_.in_('final_status', ['booked', 'retailed', 'lost', 'unqualified', 'Lost', 'Unqualified', 'LOST', 'UNQUALIFIED']).not_.in_('lead_status', ['Lost', 'Not interested', 'Out of Territory', 'Duplicate Lead', 'Invalid Number', 'Wrong Number', 'Just enquired', 'Service', 'Insurance', 'Internal', 'Used car', 'No Response', 'Mock Call', 'Plan Dropped', 'Plan Postponed', 'DSA Enq', 'BH Registration', 'Existing Enq', 'Did not enquire', 'Lost to co-dealer', 'Lost to competition', 'Low Budget', 'Not Eligible', 'Job Enquiry'])
                # Note: RNR, Call me back, etc. are NOT excluded - they need follow-up!
            elif tab_lower == 'qualified':
                # Qualified leads: lead_status = 'Qualified', final_status = 'Pending'
                query = query.eq('lead_status', 'Qualified').eq('final_status', 'Pending')
            elif tab_lower == 'lost':
                # Lost leads: final_status in ['lost', 'unqualified']
                query = query.in_('final_status', ['lost', 'unqualified', 'Lost', 'Lost'])
            elif tab_lower == 'wonlost':
                # Won/Lost leads: final_status in ['booked', 'retailed', 'lost', 'unqualified']
                query = query.in_('final_status', ['booked', 'retailed', 'lost', 'unqualified', 'Lost', 'Lost'])
            # 'all' or any other value: exclude lost leads by default
            else:
                # For 'all' tab, exclude lost leads by default
                query = query.not_.in_('final_status', ['Lost', 'lost', 'unqualified', 'Unqualified'])
        else:
            # No tab specified, exclude lost leads by default
            query = query.not_.in_('final_status', ['Lost', 'lost', 'unqualified', 'Unqualified'])

        response = query.order('created_at', desc=True).execute()
        print(f"Found {len(response.data or [])} leads after filtering")
        print(f"Sample lead UIDs: {[lead.get('uid') for lead in (response.data or [])[:3]]}")
        
        # Debug: Check if any lost leads are still being returned
        if response.data:
            lost_leads = [lead for lead in response.data if lead.get('final_status', '').lower() in ['lost', 'unqualified']]
            if lost_leads:
                print(f"⚠️ [DEBUG] Found {len(lost_leads)} lost leads still in results after filtering:")
                for lead in lost_leads:
                    print(f"   - {lead.get('uid')}: final_status='{lead.get('final_status')}', lead_status='{lead.get('lead_status')}'")
            else:
                print(f"✅ [DEBUG] No lost leads found in results - filtering working correctly")
        
        # DEBUG: Show problematic leads if any
        if response.data:
            problematic_leads = [lead for lead in response.data if lead.get('lead_status') in ['Lost', 'RNR', 'Out of Territory'] or lead.get('final_status') in ['Lost', 'lost']]
            if problematic_leads:
                print(f"⚠️ [DEBUG] Found {len(problematic_leads)} problematic leads in followup results:")
                for lead in problematic_leads[:3]:
                    print(f"   - {lead.get('uid')}: lead_status='{lead.get('lead_status')}', final_status='{lead.get('final_status')}', follow_up_date='{lead.get('follow_up_date')}'")
        
        # DEBUG: Comprehensive ICROP ID debugging
        print(f"🔍 [DEBUG] Processing {len(response.data or [])} leads for ICROP ID...")
        
        if response.data:
            for i, lead in enumerate(response.data):
                uid = lead.get('uid', 'UNKNOWN')
                customer_name = lead.get('customer_name', 'UNKNOWN')
                
                print(f"\n🔍 [DEBUG LEAD {i+1}] Processing lead:")
                print(f"   - UID: {uid}")
                print(f"   - Customer: {customer_name}")
                print(f"   - Raw icrop_id value: {repr(lead.get('icrop_id'))}")
                print(f"   - icrop_id type: {type(lead.get('icrop_id'))}")
                print(f"   - All lead keys: {list(lead.keys())}")
                
                # Check if this is the specific lead we're debugging
                if uid == 'LD000529':
                    print(f"🎯 [DEBUG] FOUND TARGET LEAD LD000529!")
                    print(f"   - Current icrop_id: {repr(lead.get('icrop_id'))}")
                    
                    # Force fetch from database
                    try:
                        print(f"🔍 [DEBUG] Fetching fresh data from database for LD000529...")
                        fresh_response = supabase.table('lead_master').select('*').eq('uid', 'LD000529').execute()
                        if fresh_response.data:
                            fresh_lead = fresh_response.data[0]
                            print(f"   - Fresh icrop_id from DB: {repr(fresh_lead.get('icrop_id'))}")
                            lead['icrop_id'] = fresh_lead.get('icrop_id')
                            print(f"   - Updated lead icrop_id: {repr(lead.get('icrop_id'))}")
                        else:
                            print(f"   - No fresh data found for LD000529")
                    except Exception as e:
                        print(f"   - Error fetching fresh data: {e}")
                
                # Standard ICROP ID processing
                current_icrop_id = lead.get('icrop_id')
                if current_icrop_id is None or current_icrop_id == '' or current_icrop_id == 'null':
                    lead['icrop_id'] = None
                    print(f"⚠️ [ICROP] No ICROP ID for {uid} - setting to None (will show as Pending)")
                else:
                    print(f"✅ [ICROP] ICROP ID found for {uid}: {repr(current_icrop_id)}")
                
                # Final check
                final_icrop_id = lead.get('icrop_id')
                print(f"🔚 [FINAL] Lead {uid} final icrop_id: {repr(final_icrop_id)}")
        
        print(f"\n🔍 [DEBUG] Final response data sample:")
        if response.data:
            sample_lead = response.data[0]
            print(f"   - Sample lead UID: {sample_lead.get('uid')}")
            print(f"   - Sample lead icrop_id: {repr(sample_lead.get('icrop_id'))}")
        
        print(f"🔍 [DEBUG] Returning {len(response.data or [])} leads with ICROP IDs processed")
        
        # Flatten trade-in data into lead objects
        leads_data = response.data or []
        for lead in leads_data:
            if lead.get('trade_in_master') and isinstance(lead['trade_in_master'], list) and len(lead['trade_in_master']) > 0:
                trade_in_data = lead['trade_in_master'][0]
                lead['trade_in_make'] = trade_in_data.get('trade_in_make')
                lead['trade_in_model'] = trade_in_data.get('trade_in_model')
                lead['trade_in_year'] = trade_in_data.get('trade_in_year')
                lead['trade_in_km'] = trade_in_data.get('trade_in_km')
                lead['trade_in_ownership'] = trade_in_data.get('trade_in_ownership')
                # Remove the nested object to keep response clean
                del lead['trade_in_master']
            elif 'trade_in_master' in lead:
                # Remove empty trade_in_master object
                del lead['trade_in_master']
        
        return leads_data
    except Exception as e:
        print(f"Error in get_cre_assigned: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# REMARKS SYNC SYSTEM ENDPOINTS
# ========================================

@app.get("/api/leads/{lead_uid}/remarks")
async def get_lead_remarks(lead_uid: str, current_user=Depends(get_current_user)):
    """Get all remarks for a lead from both CRE and PS with lead status"""
    try:
        remarks = []
        
        # Get CRE remarks from lead_master
        try:
            cre_response = supabase.table('lead_master').select(
                'uid', 'customer_name', 'first_remark', 'second_remark', 'third_remark', 
                'fourth_remark', 'fifth_remark', 'sixth_remark', 'first_call_date', 'second_call_date', 
                'third_call_date', 'fourth_call_date', 'fifth_call_date', 'sixth_call_date', 
                'lead_status', 'final_status', 'cre_name', 'pending_reasons',
                'second_call_lead_status', 'third_call_lead_status', 'fourth_call_lead_status', 'fifth_call_lead_status', 'sixth_call_lead_status',
                'model_interested', 'variant', 'buying_plan', 'finance_option', 'trade_in', 'test_drive_type'
            ).eq('uid', lead_uid).execute()
            
            if cre_response.data:
                lead_data = cre_response.data[0]
                cre_remarks = []
                overall_final_status = (lead_data.get('final_status') or '').strip()
                overall_lead_status = (lead_data.get('lead_status') or '').strip()
                existing_remarks_value = (lead_data.get('first_remark') or '').strip()
                
                # Collect CRE remarks with per-step statuses
                call_fields = [
                    ('first_remark', 'first_call_date'),
                    ('second_remark', 'second_call_date'),
                    ('third_remark', 'third_call_date'),
                    ('fourth_remark', 'fourth_call_date'),
                    ('fifth_remark', 'fifth_call_date'),
                    ('sixth_remark', 'sixth_call_date')
                ]
                status_fields = [
                    None,  # Call #1 is qualification
                    'second_call_lead_status',
                    'third_call_lead_status',
                    'fourth_call_lead_status',
                    'fifth_call_lead_status',
                    'sixth_call_lead_status'
                ]
                
                for idx, (remark_field, date_field) in enumerate(call_fields, start=1):
                    if lead_data.get(remark_field):
                        # Build status: Use actual lead_status for first call; for later calls show per-call status
                        if idx == 1:
                            # For first call, use the actual lead_status (contains unqualified reasons like "Out of Territory")
                            status_value = overall_lead_status if overall_lead_status else 'Qualified'
                        else:
                            step_status_key = status_fields[idx - 1]
                            step_status_val = lead_data.get(step_status_key) if step_status_key else None
                            status_value = step_status_val if step_status_val else 'Qualified'
                        cre_remarks.append({
                            'type': 'CRE',
                            'call_number': len(cre_remarks) + 1,
                            'remark': lead_data[remark_field],
                            'lead_status': status_value,
                            'date': lead_data.get(date_field),
                            'user': lead_data.get('cre_name', 'CRE')
                        })
                
                remarks.extend(cre_remarks)
        except Exception as e:
            print(f"Error fetching CRE remarks: {e}")
        
        # Get PS remarks from ps_followup_master
        try:
            ps_response = supabase.table('ps_followup_master').select(
                'lead_uid', 'ps_name', 
                'first_call_remark', 'second_call_remark', 'third_call_remark', 'fourth_call_remark', 
                'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark', 'eighth_call_remark',
                'ninth_call_remark', 'tenth_call_remark', 
                'first_call_date', 'second_call_date', 'third_call_date', 'fourth_call_date',
                'fifth_call_date', 'sixth_call_date', 'seventh_call_date', 'eighth_call_date', 
                'ninth_call_date', 'tenth_call_date',
                'second_call_lead_status', 'third_call_lead_status', 
                'fourth_call_lead_status', 'fifth_call_lead_status', 'sixth_call_lead_status',
                'seventh_call_lead_status', 'eighth_call_lead_status', 'ninth_call_lead_status', 
                'tenth_call_lead_status'
            ).eq('lead_uid', lead_uid).execute()
            
            if ps_response.data:
                ps_data = ps_response.data[0]
                ps_remarks = []
                
                # Collect PS remarks with lead status
                ps_call_fields = [
                    ('first_call_remark', 'first_call_date', None),  # first_call_lead_status doesn't exist
                    ('second_call_remark', 'second_call_date', 'second_call_lead_status'),
                    ('third_call_remark', 'third_call_date', 'third_call_lead_status'),
                    ('fourth_call_remark', 'fourth_call_date', 'fourth_call_lead_status'),
                    ('fifth_call_remark', 'fifth_call_date', 'fifth_call_lead_status'),
                    ('sixth_call_remark', 'sixth_call_date', 'sixth_call_lead_status'),
                    ('seventh_call_remark', 'seventh_call_date', 'seventh_call_lead_status'),
                    ('eighth_call_remark', 'eighth_call_date', 'eighth_call_lead_status'),
                    ('ninth_call_remark', 'ninth_call_date', 'ninth_call_lead_status'),
                    ('tenth_call_remark', 'tenth_call_date', 'tenth_call_lead_status')
                ]
                
                for remark_field, date_field, status_field in ps_call_fields:
                    if ps_data.get(remark_field):
                        ps_remarks.append({
                            'type': 'PS',
                            'call_number': len(ps_remarks) + 1,
                            'remark': ps_data[remark_field],
                            'lead_status': ps_data.get(status_field, ''),
                            'date': ps_data.get(date_field),
                            'user': ps_data.get('ps_name', 'PS')
                        })
                
                remarks.extend(ps_remarks)
        except Exception as e:
            print(f"Error fetching PS remarks: {e}")
        
        # Sort remarks by date
        remarks.sort(key=lambda x: x['date'] if x['date'] else '1900-01-01')
        
        # Get pending_reasons from lead data
        pending_reasons = []
        if cre_response.data:
            pending_reasons = cre_response.data[0].get('pending_reasons', [])
        
        # Extract qualification details
        qual_details = {}
        if cre_response.data:
            lead_data = cre_response.data[0]
            qual_details = {
                'model_interested': lead_data.get('model_interested', ''),
                'variant': lead_data.get('variant', ''),
                'buying_plan': lead_data.get('buying_plan', ''),
                'finance_option': lead_data.get('finance_option', ''),
                'trade_in': lead_data.get('trade_in', ''),
                'test_drive_type': lead_data.get('test_drive_type', '')
            }
        
        # Fetch trade-in details from trade_in_master table if trade_in is Yes
        if qual_details.get('trade_in') == 'Yes':
            try:
                print(f"🚗 [Trade-in] Fetching trade-in details for lead: {lead_uid}")
                tradein_response = supabase.table('trade_in_master').select(
                    'trade_in_make', 'trade_in_model', 'trade_in_year', 'trade_in_km', 'trade_in_ownership'
                ).eq('lead_uid', lead_uid).execute()
                
                print(f"🚗 [Trade-in] Query response: {tradein_response.data}")
                
                if tradein_response.data and len(tradein_response.data) > 0:
                    tradein_data = tradein_response.data[0]
                    qual_details['trade_in_make'] = tradein_data.get('trade_in_make', '')
                    qual_details['trade_in_model'] = tradein_data.get('trade_in_model', '')
                    qual_details['trade_in_year'] = tradein_data.get('trade_in_year', '')
                    qual_details['trade_in_km'] = tradein_data.get('trade_in_km', '')
                    qual_details['trade_in_ownership'] = tradein_data.get('trade_in_ownership', '')
                    print(f"✅ [Trade-in] Details found: {qual_details['trade_in_make']} {qual_details['trade_in_model']}")
                else:
                    # No trade-in details found, set empty values
                    print(f"⚠️ [Trade-in] No trade-in record found in trade_in_master for {lead_uid}")
                    qual_details['trade_in_make'] = ''
                    qual_details['trade_in_model'] = ''
                    qual_details['trade_in_year'] = ''
                    qual_details['trade_in_km'] = ''
                    qual_details['trade_in_ownership'] = ''
            except Exception as e:
                print(f"❌ [Trade-in] Error fetching trade-in details: {e}")
                qual_details['trade_in_make'] = ''
                qual_details['trade_in_model'] = ''
                qual_details['trade_in_year'] = ''
                qual_details['trade_in_km'] = ''
                qual_details['trade_in_ownership'] = ''
        else:
            # Trade-in is not Yes, set empty values
            qual_details['trade_in_make'] = ''
            qual_details['trade_in_model'] = ''
            qual_details['trade_in_year'] = ''
            qual_details['trade_in_km'] = ''
            qual_details['trade_in_ownership'] = ''
        
        payload = {
            'lead_uid': lead_uid,
            'remarks': remarks,
            'total_remarks': len(remarks),
            'pending_reasons': pending_reasons,
            'overall_final_status': overall_final_status if 'overall_final_status' in locals() else '',
            'overall_lead_status': overall_lead_status if 'overall_lead_status' in locals() else '',
            'existing_remarks': existing_remarks_value if 'existing_remarks_value' in locals() else '',
            **qual_details  # Add qualification details to payload
        }
        return JSONResponse(content=payload, headers={'Cache-Control': 'no-store, no-cache, must-revalidate'})
        
    except Exception as e:
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
            "follow_up_date": ps_data.get("follow_up_date", None),  # Only set when PS manually enters it
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
        
        # Send WhatsApp notification to PS user
        if WHATSAPP_AVAILABLE and whatsapp_service:
            try:
                # Get PS user details from users table
                ps_user_response = supabase.table('users').select('phone, full_name').eq('id', ps_data["ps_id"]).execute()
                if ps_user_response.data and ps_user_response.data[0].get('phone'):
                    ps_phone = ps_user_response.data[0]['phone']
                    ps_full_name = ps_user_response.data[0].get('full_name', ps_data["ps_name"])
                    
                    # Get lead data for notification
                    lead_data_response = supabase.table('lead_master').select('*').eq('uid', lead_uid).execute()
                    if lead_data_response.data:
                        lead_data = lead_data_response.data[0]
                        
                        # Send WhatsApp notification
                        notification_result = whatsapp_service.send_lead_assignment_notification(
                            ps_phone_number=ps_phone,
                            ps_name=ps_full_name,
                            lead_data=lead_data
                        )
                        
                        if notification_result['success']:
                            print(f"[WhatsApp] Successfully sent notification to {ps_full_name} ({ps_phone})")
                        else:
                            print(f"[WhatsApp] Failed to send notification to {ps_full_name}: {notification_result.get('error', 'Unknown error')}")
                    else:
                        print(f"[WhatsApp] Could not fetch lead data for notification")
                else:
                    print(f"[WhatsApp] PS user {ps_data['ps_name']} (ID: {ps_data['ps_id']}) has no phone number configured")
            except Exception as whatsapp_error:
                print(f"[WhatsApp] Error sending notification: {str(whatsapp_error)}")
                # Don't fail the assignment if WhatsApp fails
        
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
# BRANCHES ENDPOINTS
# ========================================

class BranchResponse(BaseModel):
    id: str
    name: str
    code: str
    address: str
    city: str
    state: str
    pincode: str
    phone: str
    email: str
    is_active: bool
    created_at: str
    updated_at: str

@app.get("/api/branches")
async def get_branches():
    """Get all branches - hardcoded three branches"""
    # Hardcoded branches as requested
    branches = [
        {"id": "1", "name": "Mount Road", "is_active": True},
        {"id": "2", "name": "Vyasarpadi", "is_active": True},
        {"id": "3", "name": "Cuddalore", "is_active": True}
    ]
    return branches

# ========================================
# QUALIFIED LEADS MANAGEMENT ENDPOINTS
# ========================================

class QualifiedLeadResponse(BaseModel):
    id: Optional[str] = None
    lead_uid: Optional[str] = None
    customer_name: Optional[str] = None
    customer_mobile_number: Optional[str] = None
    source: Optional[str] = None
    sub_source: Optional[str] = None
    cre_name: Optional[str] = None
    lead_category: Optional[str] = None
    model_interested: Optional[str] = None
    first_remark: Optional[str] = None
    variant: Optional[str] = None
    buying_plan: Optional[str] = None
    finance_option: Optional[str] = None
    profession: Optional[str] = None
    test_drive_type: Optional[str] = None
    trade_in: Optional[str] = None
    branch: Optional[str] = None
    ps_name: Optional[str] = None
    icrop_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class QualifiedLeadAssignment(BaseModel):
    lead_ids: List[str]
    ps_id: str
    ps_name: str
    ps_branch: str
    branch: Optional[str] = None  # Branch for the lead (selected by user)

@app.get("/api/qualified-leads")
async def get_qualified_leads(
    source: Optional[str] = None,
    limit: int = Query(100, ge=1, le=5000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    current_user=Depends(get_current_user)
):
    """Get qualified leads with role-based limits and intelligent pagination - ULTRA FAST"""
    try:
        # Role-based limit adjustments
        max_limit = 5000  # Default max limit
        if current_user.role in ['admin', 'branch_head']:
            max_limit = 10000  # Admins can fetch more
        elif current_user.role in ['cre', 'ps']:
            max_limit = 2000  # Individual users get reasonable limit
        
        # Enforce role-based limits
        effective_limit = min(limit, max_limit)
        
        # Create cache key
        cache_params = {
            'role': current_user.role,
            'username': current_user.username,
            'branch_id': getattr(current_user, 'branch_id', None),
            'source': source,
            'limit': effective_limit,
            'offset': offset
        }
        
        # Try to get from cache first
        cached_leads = get_cached_leads(cache_params)
        if cached_leads is not None:
            return {
                "leads": cached_leads,
                "pagination": {
                    "limit": effective_limit,
                    "offset": offset,
                    "has_more": len(cached_leads) == effective_limit
                }
            }
        
        # If not in cache, fetch from database with optimized query
        query = supabase.table('qualified_leads').select(
            'id,lead_uid,customer_name,customer_mobile_number,customer_location,source,sub_source,'
            'cre_name,lead_category,model_interested,first_remark,variant,buying_plan,'
            'finance_option,profession,test_drive_type,trade_in,branch,ps_name,'
            'final_status,booking_status,retailed_status,created_at,updated_at'
        )

        # Apply source filtering for walk-in leads
        if source:
            if source == 'walk-in':
                # Show only walk-in and digital leads (receptionist captured)
                query = query.in_('source', ['Walk-in', 'Digital', 'Google', 'Meta', 'WhatsApp', 'Car Dekho', 'Car Wale', 'OEM', 'Tele Out', 'Referral', 'Other'])
            else:
                # Show specific source
                query = query.eq('source', source)

        # Apply pagination and ordering
        response = query.order('created_at', desc=True).range(offset, offset + effective_limit - 1).execute()
        leads = response.data or []
        
        # Check if there are more records
        has_more = len(leads) == effective_limit
        
        # Cache the results
        cache_leads(cache_params, leads, ttl=180)  # 3 minutes cache
        
        return {
            "leads": leads,
            "pagination": {
                "limit": effective_limit,
                "offset": offset,
                "has_more": has_more
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cre-team-leader/qualified-leads")
async def get_cre_team_leader_qualified_leads(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    limit: int = Query(100, ge=1, le=2000, description="Number of records per page"),
    search: Optional[str] = Query(None, description="Search term for global search"),
    current_user=Depends(get_current_user)
):
    """Get qualified leads from qualified_leads table for CRE Team Leader dashboard with pagination - MIXED LEADS WITH UNASSIGNED FIRST"""
    try:
        offset = (page - 1) * limit
        
        # Create cache key
        cache_params = {
            'role': current_user.role,
            'username': current_user.username,
            'branch_id': getattr(current_user, 'branch_id', None),
            'endpoint': 'cre-team-leader',
            'page': page,
            'limit': limit,
            'search': search  # Include search in cache key to get fresh results
        }
        
        # Skip cache when search is active to get real-time results
        if not search or not search.strip():
            # Try to get from cache first only when not searching
            cached_leads = get_cached_leads(cache_params)
            if cached_leads is not None:
                return cached_leads
        
        # Get total count first
        count_response = (
            supabase
                .table('qualified_leads')
                .select('id', count='exact')
                .or_('final_status.is.null,final_status.in.(Pending,Follow-up,Waiting for Approval)')
                .execute()
        )
        total_count = count_response.count or 0
        
        # Get unassigned leads count
        unassigned_count_response = (
            supabase
                .table('qualified_leads')
                .select('id', count='exact')
                .or_('final_status.is.null,final_status.in.(Pending,Follow-up,Waiting for Approval)')
                .is_('ps_name', 'null')
                .execute()
        )
        unassigned_count = unassigned_count_response.count or 0
        
        # Calculate pagination logic
        total_pages = (total_count + limit - 1) // limit
        
        # Get all leads first, then sort and paginate in Python
        # This ensures proper sorting with unassigned first
        response = (
            supabase
                .table('qualified_leads')
                .select(
                    'id,lead_uid,customer_name,customer_mobile_number,customer_location,source,sub_source,'
                    'cre_name,lead_category,model_interested,first_remark,variant,buying_plan,'
                    'finance_option,profession,test_drive_type,trade_in,branch,ps_name,'
                    'final_status,booking_status,retailed_status,created_at,updated_at'
                )
                .or_('final_status.is.null,final_status.in.(Pending,Follow-up,Waiting for Approval)')
                .order('created_at', desc=True)
                .execute()
        )
        
        # Sort all leads: unassigned first (ps_name is null), then by created_at desc
        all_leads = response.data or []
        
        # Apply search filter if provided
        if search and search.strip():
            search_term = search.strip().lower()
            print(f"[Search] Filtering {len(all_leads)} leads with search term: '{search_term}'")
            all_leads = [lead for lead in all_leads if (
                search_term in (lead.get('customer_name', '') or '').lower() or
                search_term in (lead.get('customer_mobile_number', '') or '') or
                search_term in (lead.get('lead_uid', '') or '').lower() or
                search_term in (lead.get('ps_name', '') or '').lower() or
                search_term in (lead.get('icrop_id', '') or '').lower()
            )]
            print(f"[Search] Filtered down to {len(all_leads)} matching leads")
            
            # Recalculate counts for searched results
            total_count = len(all_leads)
            unassigned_count = len([lead for lead in all_leads if not lead.get('ps_name')])
            total_pages = (total_count + limit - 1) // limit
        
        all_leads.sort(key=lambda x: (
            x.get('ps_name') is not None,  # False (unassigned) comes before True (assigned)
            x.get('created_at', '')  # Then by created_at desc
        ), reverse=False)
        
        # Apply pagination after sorting
        leads = all_leads[offset:offset + limit]
        has_more = page < total_pages
        
        print(f"[GET Qualified Leads] Page {page}: Returning {len(leads)} leads (Total: {total_count}, Unassigned: {unassigned_count}, Search: {search if search else 'none'})")
        
        result = {
            "leads": leads,
            "pagination": {
                "page": page,
                "limit": limit,
                "total_count": total_count,
                "unassigned_count": unassigned_count,
                "assigned_count": total_count - unassigned_count,
                "total_pages": total_pages,
                "has_more": has_more
            }
        }
        
        # Cache the results
        cache_leads(cache_params, result, ttl=180)  # 3 minutes cache
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/qualified-leads/count")
async def get_qualified_leads_count(
    source: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    """Get total count of qualified leads for pagination info"""
    try:
        # Create cache key for count
        cache_params = {
            'role': current_user.role,
            'username': current_user.username,
            'branch_id': getattr(current_user, 'branch_id', None),
            'source': source,
            'type': 'count'
        }
        
        # Try to get from cache first
        cached_count = get_cached_leads(cache_params)
        if cached_count is not None:
            return {"count": cached_count}
        
        # Build query for count
        query = supabase.table('qualified_leads').select('id', count='exact')
        
        # Apply source filtering
        if source:
            if source == 'walk-in':
                query = query.in_('source', ['Walk-in', 'Digital', 'Google', 'Meta', 'WhatsApp', 'Car Dekho', 'Car Wale', 'OEM', 'Tele Out', 'Referral', 'Other'])
            else:
                query = query.eq('source', source)
        
        response = query.execute()
        count = response.count or 0
        
        # Cache the count
        cache_leads(cache_params, count, ttl=300)  # 5 minutes cache for count
        
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/qualified-leads/cre/{cre_name}")
async def get_cre_qualified_leads(
    cre_name: str,
    limit: int = Query(1000, ge=1, le=5000, description="Number of records to return"),
    offset: int = Query(0, ge=0, description="Number of records to skip"),
    current_user=Depends(get_current_user)
):
    """Get all qualified leads for a specific CRE - allows larger limits for individual CREs"""
    try:
        # Only allow CREs to access their own data, or admins/branch heads
        if current_user.role == 'cre' and current_user.username != cre_name:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create cache key
        cache_params = {
            'role': current_user.role,
            'username': current_user.username,
            'branch_id': getattr(current_user, 'branch_id', None),
            'cre_name': cre_name,
            'limit': limit,
            'offset': offset
        }
        
        # Try to get from cache first
        cached_leads = get_cached_leads(cache_params)
        if cached_leads is not None:
            return {
                "leads": cached_leads,
                "pagination": {
                    "limit": limit,
                    "offset": offset,
                    "has_more": len(cached_leads) == limit
                }
            }
        
        # Fetch leads for specific CRE
        response = (
            supabase
                .table('qualified_leads')
                .select(
                    'id,lead_uid,customer_name,customer_mobile_number,customer_location,source,sub_source,'
                    'cre_name,lead_category,model_interested,first_remark,variant,buying_plan,'
                    'finance_option,profession,test_drive_type,trade_in,branch,ps_name,'
                    'final_status,booking_status,retailed_status,created_at,updated_at'
                )
                .eq('cre_name', cre_name)
                .order('created_at', desc=True)
                .range(offset, offset + limit - 1)
                .execute()
        )
        
        leads = response.data or []
        has_more = len(leads) == limit
        
        # Cache the results
        cache_leads(cache_params, leads, ttl=180)  # 3 minutes cache
        
        return {
            "leads": leads,
            "pagination": {
                "limit": limit,
                "offset": offset,
                "has_more": has_more
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/qualified-leads/cre/{cre_name}/all")
async def get_all_cre_qualified_leads(
    cre_name: str,
    current_user=Depends(get_current_user)
):
    """Get ALL qualified leads for a specific CRE - no pagination limits for complete data access"""
    try:
        # Only allow CREs to access their own data, or admins/branch heads
        if current_user.role == 'cre' and current_user.username != cre_name:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Create cache key
        cache_params = {
            'role': current_user.role,
            'username': current_user.username,
            'branch_id': getattr(current_user, 'branch_id', None),
            'cre_name': cre_name,
            'type': 'all'
        }
        
        # Try to get from cache first
        cached_leads = get_cached_leads(cache_params)
        if cached_leads is not None:
            return {"leads": cached_leads, "count": len(cached_leads)}
        
        # Fetch ALL leads for specific CRE (no pagination)
        response = (
            supabase
                .table('qualified_leads')
                .select(
                    'id,lead_uid,customer_name,customer_mobile_number,customer_location,source,sub_source,'
                    'cre_name,lead_category,model_interested,first_remark,variant,buying_plan,'
                    'finance_option,profession,test_drive_type,trade_in,branch,ps_name,'
                    'final_status,booking_status,retailed_status,created_at,updated_at'
                )
                .eq('cre_name', cre_name)
                .order('created_at', desc=True)
                .execute()
        )
        
        leads = response.data or []
        
        # Cache the results with longer TTL since this is complete data
        cache_leads(cache_params, leads, ttl=300)  # 5 minutes cache
        
        return {"leads": leads, "count": len(leads)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/qualified-leads/assign-branch")
async def assign_branch_to_lead(assignment: dict, current_user=Depends(get_current_user)):
    """Assign branch to a qualified lead"""
    try:
        lead_id = assignment.get('lead_id')
        branch = assignment.get('branch')
        
        if not lead_id or not branch or branch.strip() == '':
            raise HTTPException(status_code=400, detail="lead_id and branch are required")
        
        # Convert lead_id to int if needed (handle both string and int IDs)
        try:
            lead_id_str = str(lead_id).strip()
            if lead_id_str == '':
                raise ValueError("Empty lead_id")
            lead_id_int = int(lead_id_str)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail=f"Invalid lead_id format: {lead_id}")
        
        # First check if the lead exists
        check_response = supabase.table('qualified_leads').select('id, lead_uid').eq('id', lead_id_int).execute()
        
        if not check_response.data:
            raise HTTPException(status_code=404, detail=f"Lead not found with id: {lead_id}")
        
        lead_uid = check_response.data[0].get('lead_uid')
        
        # Update qualified lead with branch
        update_data = {
            "branch": branch,
            "updated_at": now_ist_iso()
        }
        
        response = supabase.table('qualified_leads').update(update_data).eq('id', lead_id_int).execute()
        
        if response.data:
            # Invalidate cache
            if lead_uid:
                invalidate_on_lead_change(lead_uid, 'update')
            return {"message": "Branch assigned successfully", "lead_id": lead_id_int, "branch": branch}
        else:
            raise HTTPException(status_code=404, detail="Lead not found")
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/qualified-leads/deassign")
async def deassign_qualified_lead(deassignment: dict, current_user=Depends(get_current_user)):
    """Deassign a qualified lead from PS user"""
    try:
        # Check if user has permission (CRE Team Leader or Admin)
        if current_user.role not in ['admin', 'cre_team_leader']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        lead_id = deassignment.get('lead_id')
        if not lead_id:
            raise HTTPException(status_code=400, detail="Lead ID is required")
        
        # Update qualified_leads table to remove PS assignment
        # Only update ps_name since ps_id column doesn't exist in qualified_leads table
        response = supabase.table('qualified_leads').update({
            'ps_name': None
        }).eq('id', lead_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Update lead_master table to remove PS assignment
        lead_uid = response.data[0]['lead_uid']
        supabase.table('lead_master').update({
            'ps_name': None,
            'ps_id': None,
            'updated_at': now_ist_iso()
        }).eq('uid', lead_uid).execute()
        
        # Delete the row from ps_followup_master since it's no longer assigned to a PS
        try:
            supabase.table('ps_followup_master').delete().eq('lead_uid', lead_uid).execute()
            print(f"[Deassign] Deleted row from ps_followup_master for lead_uid: {lead_uid}")
        except Exception as e:
            print(f"[Deassign] Error deleting from ps_followup_master: {e}")
            # If deletion fails, try to update with a default value instead
            try:
                supabase.table('ps_followup_master').update({
                    'ps_name': 'Unassigned',
                    'ps_id': None
                }).eq('lead_uid', lead_uid).execute()
                print(f"[Deassign] Updated ps_followup_master with 'Unassigned' for lead_uid: {lead_uid}")
            except Exception as e2:
                print(f"[Deassign] Failed to update ps_followup_master: {e2}")
        
        return {"success": True, "message": "Lead deassigned successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class WhatsAppTestRequest(BaseModel):
    phone_number: str
    message: Optional[str] = None

@app.post("/api/whatsapp/test")
async def test_whatsapp_notification(
    request: WhatsAppTestRequest,
    current_user=Depends(get_current_user)
):
    """Test WhatsApp notification service"""
    try:
        # Allow admin and cre_team_leader roles to test
        if current_user.role not in ['admin', 'cre_team_leader']:
            raise HTTPException(status_code=403, detail="Insufficient permissions - Admin or CRE Team Leader role required")
        
        if not WHATSAPP_AVAILABLE or not whatsapp_service:
            raise HTTPException(status_code=503, detail="WhatsApp service not available")
        
        test_message = request.message or "Test message from EPIC CRM - WhatsApp integration is working!"
        
        result = whatsapp_service.send_message(request.phone_number, test_message)
        
        return {
            "success": result["success"],
            "message": result.get("message", "Test completed"),
            "error": result.get("error") if not result["success"] else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/qualified-leads/assign")
async def assign_qualified_leads(assignment: QualifiedLeadAssignment, current_user=Depends(get_current_user)):
    """Assign qualified leads to PS users"""
    try:
        # Check if user has permission (CRE Team Leader or Admin)
        if current_user.role not in ['admin', 'cre_team_leader']:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        
        assigned_count = 0
        
        for lead_id in assignment.lead_ids:
            try:
                # Update qualified lead with PS assignment
                update_data = {
                    "ps_name": assignment.ps_name,
                    "updated_at": now_ist_iso()
                }
                
                # If branch is provided, add it to the update
                if assignment.branch:
                    update_data["branch"] = assignment.branch
                
                print(f"[Assign] Updating qualified_leads for lead_id: {lead_id} with ps_name: {assignment.ps_name}")
                supabase.table('qualified_leads').update(update_data).eq('id', lead_id).execute()
                print(f"[Assign] Updated qualified_leads successfully for lead_id: {lead_id}")
                
                # Get the qualified lead data
                lead_response = supabase.table('qualified_leads').select('*').eq('id', lead_id).execute()
                if lead_response.data:
                    lead_data = lead_response.data[0]
                    lead_uid = lead_data.get('lead_uid')
                    
                    # Validate lead_uid before proceeding
                    if not lead_uid:
                        print(f"[Assign] ERROR: lead_uid is null for lead_id {lead_id}, skipping ps_followup_master insertion")
                        continue
                    
                    print(f"[Assign] Processing lead_id: {lead_id}, lead_uid: {lead_uid}")
                    
                    # SYNC BACK TO lead_master - This is the missing piece!
                    lead_master_update = {
                        "ps_name": assignment.ps_name,
                        "ps_id": assignment.ps_id,
                        "branch": assignment.branch if assignment.branch else assignment.ps_branch,
                        "updated_at": now_ist_iso()
                    }
                    supabase.table('lead_master').update(lead_master_update).eq('uid', lead_uid).execute()
                    
                    # Create entry in ps_followup_master with safe field access
                    followup_data = {
                        "lead_uid": lead_uid,
                        "ps_name": assignment.ps_name,
                        "ps_id": assignment.ps_id,
                        "ps_branch": assignment.ps_branch,
                        "customer_name": lead_data.get('customer_name'),
                        "customer_mobile_number": lead_data.get('customer_mobile_number'),
                        "source": lead_data.get('source'),
                        "sub_source": lead_data.get('sub_source'),
                        "cre_name": lead_data.get('cre_name'),
                        "lead_category": lead_data.get('lead_category'),
                        "model_interested": lead_data.get('model_interested'),
                        "variant": lead_data.get('variant'),
                        "buying_plan": lead_data.get('buying_plan'),
                        "finance_option": lead_data.get('finance_option'),
                        "follow_up_date": None,  # Only set when PS manually enters it
                        "lead_status": "Pending",
                        "final_status": "Pending",
                        "ps_assigned_at": now_ist_iso(),
                        "created_at": now_ist_iso(),
                        "updated_at": now_ist_iso()
                    }
                    
                    print(f"[Assign] Inserting into ps_followup_master for lead_uid: {lead_uid}")
                    supabase.table('ps_followup_master').insert(followup_data).execute()
                    print(f"[Assign] Successfully inserted into ps_followup_master for lead_uid: {lead_uid}")
                    
                    # Send WhatsApp notification to PS user
                    if WHATSAPP_AVAILABLE and whatsapp_service:
                        try:
                            # Get PS user details from users table
                            ps_user_response = supabase.table('users').select('phone, full_name').eq('id', assignment.ps_id).execute()
                            if ps_user_response.data and ps_user_response.data[0].get('phone'):
                                ps_phone = ps_user_response.data[0]['phone']
                                ps_full_name = ps_user_response.data[0].get('full_name', assignment.ps_name)
                                
                                # Prepare template parameters
                                customer_name = lead_data.get('customer_name', 'Unknown')
                                customer_phone = lead_data.get('customer_mobile_number', 'Unknown')
                                source = lead_data.get('source', 'Unknown')
                                sub_source = lead_data.get('sub_source', '')
                                cre_name = lead_data.get('cre_name', '')
                                qualification_remark = lead_data.get('first_remark', '')
                                
                                # Mask phone number (last 5 digits)
                                if customer_phone and len(customer_phone) >= 5:
                                    phone_display = customer_phone[-5:].rjust(10, 'x')
                                else:
                                    phone_display = customer_phone
                                
                                full_source = f"{source} - {sub_source}" if sub_source else source
                                
                                # Prepare parameters for template: [PS name, Customer name, Phone, Lead UID, Source, CRE name, Remark]
                                template_parameters = [
                                    ps_full_name,
                                    customer_name,
                                    phone_display,
                                    lead_uid,
                                    full_source,
                                    cre_name if cre_name else '-',
                                    qualification_remark if qualification_remark else '-'
                                ]
                                
                                # Send WhatsApp template message
                                notification_result = whatsapp_service.send_template_message(
                                    to_phone_number=ps_phone,
                                    template_name='epic_lead_assignment',
                                    language='en',
                                    parameters=template_parameters
                                )
                                
                                if notification_result['success']:
                                    print(f"[WhatsApp] Successfully sent notification to {ps_full_name} ({ps_phone})")
                                else:
                                    print(f"[WhatsApp] Failed to send notification to {ps_full_name}: {notification_result.get('error', 'Unknown error')}")
                            else:
                                print(f"[WhatsApp] PS user {assignment.ps_name} (ID: {assignment.ps_id}) has no phone number configured")
                        except Exception as whatsapp_error:
                            print(f"[WhatsApp] Error sending notification: {str(whatsapp_error)}")
                            # Don't fail the assignment if WhatsApp fails
                    else:
                        print(f"[WhatsApp] WhatsApp service not available - WHATSAPP_AVAILABLE: {WHATSAPP_AVAILABLE}, whatsapp_service: {whatsapp_service}")
                    
                    assigned_count += 1
                else:
                    print(f"[Assign] Warning: No data found for lead_id {lead_id} in qualified_leads")
            except Exception as lead_error:
                print(f"[Assign] Error processing lead_id {lead_id}: {str(lead_error)}")
                # Continue with other leads instead of failing entire batch
                continue
        
        if assigned_count == 0:
            raise HTTPException(status_code=500, detail="Failed to assign any leads. Check backend logs for details.")
        
        return {"message": f"Successfully assigned {assigned_count} leads to {assignment.ps_name}"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Assign] Fatal error in assign_qualified_leads: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# PS FOLLOW-UP MANAGEMENT ENDPOINTS
# ========================================

class PSFollowUpMasterResponse(BaseModel):
    id: int
    lead_uid: str
    ps_name: Optional[str] = None
    ps_id: Optional[str] = None
    ps_branch: Optional[str] = None
    customer_name: Optional[str] = None
    customer_mobile_number: Optional[str] = None
    alternate_mobile_number: Optional[str] = None
    source: Optional[str] = None
    cre_name: Optional[str] = None
    cre_id: Optional[str] = None
    lead_category: Optional[str] = None
    model_interested: Optional[str] = None
    follow_up_date: Optional[str] = None
    lead_status: Optional[str] = None
    first_call_date: Optional[str] = None
    first_call_remark: Optional[str] = None
    first_call_lead_status: Optional[str] = None
    second_call_date: Optional[str] = None
    second_call_remark: Optional[str] = None
    second_call_lead_status: Optional[str] = None
    third_call_date: Optional[str] = None
    third_call_remark: Optional[str] = None
    third_call_lead_status: Optional[str] = None
    fourth_call_date: Optional[str] = None
    fourth_call_remark: Optional[str] = None
    fourth_call_lead_status: Optional[str] = None
    fifth_call_date: Optional[str] = None
    fifth_call_remark: Optional[str] = None
    fifth_call_lead_status: Optional[str] = None
    sixth_call_date: Optional[str] = None
    sixth_call_remark: Optional[str] = None
    sixth_call_lead_status: Optional[str] = None
    seventh_call_date: Optional[str] = None
    seventh_call_remark: Optional[str] = None
    seventh_call_lead_status: Optional[str] = None
    eighth_call_date: Optional[str] = None
    eighth_call_remark: Optional[str] = None
    eighth_call_lead_status: Optional[str] = None
    ninth_call_date: Optional[str] = None
    ninth_call_remark: Optional[str] = None
    ninth_call_lead_status: Optional[str] = None
    tenth_call_date: Optional[str] = None
    tenth_call_remark: Optional[str] = None
    tenth_call_lead_status: Optional[str] = None
    final_status: Optional[str] = None
    test_drive_done: Optional[bool] = None
    tat: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    ps_assigned_at: Optional[str] = None
    won_timestamp: Optional[str] = None
    lost_timestamp: Optional[str] = None
    variant: Optional[str] = None
    buying_plan: Optional[str] = None
    icrop_id: Optional[str] = None
    finance_option: Optional[str] = None
    profession: Optional[str] = None
    test_drive_type: Optional[str] = None
    trade_in: Optional[str] = None
    booking_id: Optional[str] = None
    retailed_id: Optional[str] = None
    # Server-side classification flags
    is_fresh: Optional[bool] = None
    is_pending: Optional[bool] = None

class PSFollowUpUpdate(BaseModel):
    id: int
    lead_uid: Optional[str] = None
    ps_id: Optional[str] = None
    ps_name: Optional[str] = None
    ps_branch: Optional[str] = None
    customer_name: Optional[str] = None
    customer_mobile_number: Optional[str] = None
    alternate_mobile_number: Optional[str] = None
    source: Optional[str] = None
    cre_name: Optional[str] = None
    cre_id: Optional[str] = None
    lead_category: Optional[str] = None
    model_interested: Optional[str] = None
    follow_up_date: Optional[str] = None
    lead_status: Optional[str] = None
    first_call_date: Optional[str] = None
    first_call_remark: Optional[str] = None
    first_call_lead_status: Optional[str] = None
    second_call_date: Optional[str] = None
    second_call_remark: Optional[str] = None
    second_call_lead_status: Optional[str] = None
    third_call_date: Optional[str] = None
    third_call_remark: Optional[str] = None
    third_call_lead_status: Optional[str] = None
    fourth_call_date: Optional[str] = None
    fourth_call_remark: Optional[str] = None
    fourth_call_lead_status: Optional[str] = None
    fifth_call_date: Optional[str] = None
    fifth_call_remark: Optional[str] = None
    fifth_call_lead_status: Optional[str] = None
    sixth_call_date: Optional[str] = None
    sixth_call_remark: Optional[str] = None
    sixth_call_lead_status: Optional[str] = None
    seventh_call_date: Optional[str] = None
    seventh_call_remark: Optional[str] = None
    seventh_call_lead_status: Optional[str] = None
    eighth_call_date: Optional[str] = None
    eighth_call_remark: Optional[str] = None
    eighth_call_lead_status: Optional[str] = None
    ninth_call_date: Optional[str] = None
    ninth_call_remark: Optional[str] = None
    ninth_call_lead_status: Optional[str] = None
    tenth_call_date: Optional[str] = None
    tenth_call_remark: Optional[str] = None
    tenth_call_lead_status: Optional[str] = None
    final_status: Optional[str] = None
    test_drive_done: Optional[bool] = None
    tat: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    ps_assigned_at: Optional[str] = None
    won_timestamp: Optional[str] = None
    lost_timestamp: Optional[str] = None
    variant: Optional[str] = None
    buying_plan: Optional[str] = None
    icrop_id: Optional[str] = None
    booking_id: Optional[str] = None
    retailed_id: Optional[str] = None

class BookingRetailMaster(BaseModel):
    id: Optional[str] = None
    lead_uid: str
    customer_name: Optional[str] = None
    customer_mobile_number: Optional[str] = None
    source: Optional[str] = None
    sub_source: Optional[str] = None
    cre_name: Optional[str] = None
    lead_category: Optional[str] = None
    model_interested: Optional[str] = None
    first_remark: Optional[str] = None
    variant: Optional[str] = None
    buying_plan: Optional[str] = None
    finance_option: Optional[str] = None
    profession: Optional[str] = None
    test_drive_type: Optional[str] = None
    trade_in: Optional[str] = None
    branch: Optional[str] = None
    ps_name: Optional[str] = None
    icrop_id: Optional[str] = None
    customer_location: Optional[str] = None
    booking_id: Optional[str] = None
    retailed_id: Optional[str] = None
    booking_status: Optional[str] = None
    retailed_status: Optional[str] = None
    approved_by_sales_manager: Optional[str] = None
    approved_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class LeadQualifyRequest(BaseModel):
    trade_in_make: Optional[str] = None
    trade_in_model: Optional[str] = None
    trade_in_year: Optional[str] = None
    trade_in_km: Optional[str] = None
    trade_in_ownership: Optional[str] = None
    final_status: Optional[str] = None
    test_drive_done: Optional[bool] = None
    # Additional form fields for qualified_leads
    model_interested: Optional[str] = None
    variant: Optional[str] = None
    first_remark: Optional[str] = None
    profession: Optional[str] = None
    buying_plan: Optional[str] = None
    finance_option: Optional[str] = None
    test_drive_type: Optional[str] = None
    lead_category: Optional[str] = None
    trade_in: Optional[str] = None

@app.get("/api/ps-followup")
async def get_ps_followups(
    source: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    """Get PS follow-ups with ULTRA-optimized single-query JOIN approach"""
    try:
        print(f"[PS Followup] Starting ULTRA-optimized request for user: {current_user.username}, role: {current_user.role}")

        # Use Supabase foreign key expansion - SINGLE QUERY with JOIN
        # This replaces N+1 queries with just 1 query - MASSIVE performance boost!
        select_fields = """
            *,
            lead_master:lead_uid(
                cre_name,
                first_remark,
                second_remark,
                third_remark,
                fourth_remark,
                fifth_remark,
                sixth_remark,
                first_call_date,
                second_call_date,
                third_call_date,
                fourth_call_date,
                fifth_call_date,
                sixth_call_date,
                second_call_lead_status,
                third_call_lead_status,
                fourth_call_lead_status,
                fifth_call_lead_status,
                sixth_call_lead_status
            )
        """
        
        query = supabase.table('ps_followup_master').select(select_fields)

        # Apply role-based filtering
        if current_user.role == 'ps':
            query = query.eq('ps_id', current_user.id)
        elif current_user.role in ['admin', 'branch_head']:
            # Admin and branch heads can see all follow-ups
            pass

        # Apply source filtering if requested
        if source:
            if source == 'walk-in':
                # Show only walk-in and digital leads (receptionist captured)
                query = query.in_('source', ['Walk-in', 'Digital'])
            else:
                # Show specific source
                query = query.eq('source', source)
        # No else clause - show all sources by default for PS users
        
        # Execute SINGLE optimized query with JOIN
        print(f"[PS Followup] Executing ULTRA-optimized query with foreign key expansion...")
        response = query.order('follow_up_date', desc=False).limit(2000).execute()
        print(f"[PS Followup] Query completed, found {len(response.data or [])} records")

        # Process results and flatten lead_master data
        fresh_count = 0
        pending_count = 0
        
        for row in (response.data or []):
            # Flatten lead_master nested object
            lead_master_data = row.pop('lead_master', None)
            
            if lead_master_data:
                row['cre_name'] = lead_master_data.get('cre_name')
                row['cre_first_remark'] = lead_master_data.get('first_remark')
                row['cre_second_remark'] = lead_master_data.get('second_remark')
                row['cre_third_remark'] = lead_master_data.get('third_remark')
                row['cre_fourth_remark'] = lead_master_data.get('fourth_remark')
                row['cre_fifth_remark'] = lead_master_data.get('fifth_remark')
                row['cre_sixth_remark'] = lead_master_data.get('sixth_remark')
                row['cre_first_call_date'] = lead_master_data.get('first_call_date')
                row['cre_second_call_date'] = lead_master_data.get('second_call_date')
                row['cre_third_call_date'] = lead_master_data.get('third_call_date')
                row['cre_fourth_call_date'] = lead_master_data.get('fourth_call_date')
                row['cre_fifth_call_date'] = lead_master_data.get('fifth_call_date')
                row['cre_sixth_call_date'] = lead_master_data.get('sixth_call_date')
                row['cre_first_call_lead_status'] = None  # Doesn't exist in DB
                row['cre_second_call_lead_status'] = lead_master_data.get('second_call_lead_status')
                row['cre_third_call_lead_status'] = lead_master_data.get('third_call_lead_status')
                row['cre_fourth_call_lead_status'] = lead_master_data.get('fourth_call_lead_status')
                row['cre_fifth_call_lead_status'] = lead_master_data.get('fifth_call_lead_status')
                row['cre_sixth_call_lead_status'] = lead_master_data.get('sixth_call_lead_status')
            else:
                # No lead_master match - set all to None
                row.update({
                    'cre_name': None, 'cre_first_remark': None, 'cre_second_remark': None,
                    'cre_third_remark': None, 'cre_fourth_remark': None, 'cre_fifth_remark': None,
                    'cre_sixth_remark': None, 'cre_first_call_date': None, 'cre_second_call_date': None,
                    'cre_third_call_date': None, 'cre_fourth_call_date': None, 'cre_fifth_call_date': None,
                    'cre_sixth_call_date': None, 'cre_first_call_lead_status': None,
                    'cre_second_call_lead_status': None, 'cre_third_call_lead_status': None,
                    'cre_fourth_call_lead_status': None, 'cre_fifth_call_lead_status': None,
                    'cre_sixth_call_lead_status': None
                })
            
            # Lightweight classification - only check essential fields
            has_updates = any([
                (row.get('first_call_remark') or '').strip(),
                row.get('first_call_date'),
                (row.get('second_call_remark') or '').strip(),
                row.get('second_call_date'),
                (row.get('third_call_remark') or '').strip(),
                row.get('third_call_date'),
            ])
            
            final_status = (row.get('final_status') or '').lower().strip()
            is_closed = final_status in ['won', 'lost']
            
            row['is_fresh'] = not has_updates and not is_closed
            row['is_pending'] = has_updates and not is_closed
            
            if row['is_fresh']:
                fresh_count += 1
            if row['is_pending']:
                pending_count += 1
        
        print(f"[PS Followup] ULTRA-optimized processing completed. Fresh: {fresh_count}, Pending: {pending_count}")
        
        # Return optimized data (bypass Pydantic validation for performance)
        return response.data or []
        
    except Exception as e:
        print(f"[PS API] Error fetching follow-ups: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch PS follow-ups: {str(e)}")

@app.post("/api/ps/leads")
async def add_ps_lead(lead_data: dict, current_user=Depends(get_current_user)):
    """Add a new PS lead - works like receptionist lead creation"""
    try:
        current_time = now_ist_iso()
        
        # Generate lead UID if not provided
        uid = lead_data.get('uid') or f"PS{int(time.time()) % 1000000:06d}"

        # Duplicate check across lead_master and ps_followup_master by customer_mobile_number
        mobile = lead_data.get('customer_mobile_number')
        existing_lead_master = None
        existing_ps_followup = None
        try:
            lm_q = (
                supabase
                    .table('lead_master')
                    .select('id, uid, is_dup')
                    .eq('customer_mobile_number', mobile)
                    .order('created_at', desc=True)
                    .limit(1)
            )
            lm_res = lm_q.execute()
            existing_lead_master = lm_res.data[0] if lm_res.data else None
        except Exception:
            existing_lead_master = None

        try:
            ps_q = (
                supabase
                    .table('ps_followup_master')
                    .select('id, lead_uid, is_dup, customer_mobile_number')
                    .eq('customer_mobile_number', mobile)
                    .order('created_at', desc=True)
                    .limit(1)
            )
            ps_res = ps_q.execute()
            existing_ps_followup = ps_res.data[0] if ps_res.data else None
        except Exception:
            existing_ps_followup = None

        if existing_lead_master or existing_ps_followup:
            # Build duplicate entry
            dup_entry = {
                "attempt": 1,  # will be recalculated per-record
                "timestamp": current_time,
                "source": lead_data.get('source') or "",
                "sub_source": lead_data.get('sub_source') or "",
            }

            # Helper to append dup entry to a record's is_dup field
            def _append_dup(existing_record, table_name):
                current_is_dup = existing_record.get('is_dup')
                if isinstance(current_is_dup, list):
                    attempt_base = len(current_is_dup)
                    history = current_is_dup
                elif isinstance(current_is_dup, dict):
                    attempt_base = 1
                    history = [current_is_dup]
                else:
                    attempt_base = 0
                    history = []
                entry = { **dup_entry, "attempt": attempt_base + 1 }
                new_history = history + [entry]
                update_payload = {
                    "is_dup": new_history,
                    "updated_at": current_time,
                }
                supabase.table(table_name).update(update_payload).eq('id', existing_record['id']).execute()

            # Update both tables where a record exists
            if existing_lead_master:
                _append_dup(existing_lead_master, 'lead_master')
            if existing_ps_followup:
                _append_dup(existing_ps_followup, 'ps_followup_master')

            # Choose a lead_uid to return (prefer lead_master)
            lead_uid = (existing_lead_master or {}).get('uid') or (existing_ps_followup or {}).get('lead_uid') or uid
            return JSONResponse(content={
                "message": "Mobile number already exists. Lead updated.",
                "duplicate": True,
                "lead_uid": lead_uid,
                "synced": {
                    "lead_master": bool(existing_lead_master),
                    "ps_followup_master": bool(existing_ps_followup),
                }
            })
        
        # Find CREs assigned to this branch for walk-in follow-ups
        cre_assignments = []
        try:
            cre_response = supabase.table('users').select('id, full_name, walkin_assignments').eq('role', 'cre').eq('is_active', True).execute()
            
            for cre in cre_response.data or []:
                walkin_assignments = cre.get('walkin_assignments', [])
                if lead_data.get('ps_branch', 'GEM') in walkin_assignments:
                    cre_assignments.append({
                        'id': cre['id'],
                        'name': cre['full_name']
                    })
        except Exception as e:
            print(f"[PS Lead] Error finding CRE assignments: {e}")

        # Randomly assign one CRE for walk-in follow-up if multiple CREs are available
        assigned_cre = None
        if cre_assignments:
            import random
            assigned_cre = random.choice(cre_assignments)
            print(f"[PS Lead] Randomly assigned CRE: {assigned_cre['name']} for walk-in follow-up")

        # Step 1: Insert into lead_master first (like receptionist does)
        lead_master_data = {
            "uid": uid,
            "customer_name": lead_data['customer_name'],
            "customer_mobile_number": lead_data['customer_mobile_number'],
            "alternate_mobile_number": lead_data.get('alternate_mobile_number'),
            "customer_location": "",
            "profession": "",
            "source": lead_data['source'],
            "sub_source": "",
            "campaign": None,
            "model_interested": lead_data.get('model_interested'),
            "variant": lead_data.get('variant'),
            "buying_plan": None,
            "ps_name": lead_data['ps_name'],
            "ps_id": str(lead_data['ps_id']),
            "cre_name": assigned_cre['name'] if assigned_cre else None,
            "cre_id": assigned_cre['id'] if assigned_cre else None,
            "branch": lead_data.get('ps_branch', 'GEM'),
            "assigned": "Yes",
            "lead_status": "Pending",
            "final_status": "Pending",
            "lead_category": "Hot",
            "follow_up_date": lead_data.get('follow_up_date') if lead_data.get('follow_up_date') else None,
            "out_of_station_location": None,
            "date": current_time,
            "created_at": current_time,
            "updated_at": current_time,
            "test_drive_type": None,
            "trade_in": None,
            "sixth_call_date": None,
            "sixth_remark": None,
            "metadata": {
                "created_by": "ps",
                "assigned_cre": assigned_cre['name'] if assigned_cre else None
            }
        }

        # Insert into lead_master
        lead_response = supabase.table('lead_master').insert(lead_master_data).execute()
        if not lead_response.data:
            raise HTTPException(status_code=500, detail="Failed to create lead in lead_master")
        
        # Get the actual UID from the inserted lead
        actual_uid = lead_response.data[0]['uid']
        
        # Step 2: Insert into ps_followup_master
        ps_followup_data = {
            'lead_uid': actual_uid,
            'ps_name': lead_data['ps_name'],
            'ps_id': lead_data['ps_id'],
            'ps_branch': lead_data.get('ps_branch', 'GEM'),
            'customer_name': lead_data['customer_name'],
            'customer_mobile_number': lead_data['customer_mobile_number'],
            'alternate_mobile_number': lead_data.get('alternate_mobile_number'),
            'source': lead_data['source'],
            'sub_source': lead_data.get('sub_source', ''),
            'cre_name': assigned_cre['name'] if assigned_cre else None,
            'cre_id': assigned_cre['id'] if assigned_cre else None,
            'lead_category': 'Hot',
            'model_interested': lead_data.get('model_interested'),
            'variant': lead_data.get('variant'),
            'follow_up_date': lead_data.get('follow_up_date') if lead_data.get('follow_up_date') else None,
            'lead_status': lead_data.get('lead_status', 'Pending'),
            'final_status': lead_data.get('final_status', 'Pending'),
            'test_drive_done': False,
            'created_at': current_time,
            'updated_at': current_time,
            'ps_assigned_at': current_time
        }
        
        ps_response = supabase.table('ps_followup_master').insert(ps_followup_data).execute()
        if not ps_response.data:
            # Rollback lead_master insertion if followup fails
            supabase.table('lead_master').delete().eq('uid', actual_uid).execute()
            raise HTTPException(status_code=500, detail="Failed to create lead in ps_followup_master")
        
        # Step 3: Queue trade-in details for background processing if provided
        if any([lead_data.get('trade_in_make'), lead_data.get('trade_in_model'), 
                lead_data.get('trade_in_year'), lead_data.get('trade_in_km')]):
            # Queue trade-in data for background worker processing
            try:
                from .queue_system import QueueManager, LeadUpdatePayload
                queue_manager = QueueManager(supabase)
                
                trade_in_payload = LeadUpdatePayload(
                    uid=actual_uid,
                    trade_in_make=lead_data.get('trade_in_make'),
                    trade_in_model=lead_data.get('trade_in_model'),
                    trade_in_year=lead_data.get('trade_in_year'),
                    trade_in_km=lead_data.get('trade_in_km'),
                    trade_in_ownership=lead_data.get('trade_in_ownership'),
                    customer_name=lead_data['customer_name'],
                    customer_mobile_number=lead_data['customer_mobile_number']
                )
                
                # Create batch task for trade-in processing
                batch_task = queue_manager.create_batch_task([trade_in_payload])
                queue_manager.enqueue_task(batch_task)
                
                print(f"[PS Lead] Trade-in data queued for background processing: {actual_uid}")
                print(f"[PS Lead] Trade-in payload: {trade_in_payload.__dict__}")
            except Exception as e:
                print(f"[PS Lead] Warning: Failed to queue trade-in data for background processing: {e}")
        
        return JSONResponse(content={
            "message": "Lead added successfully", 
            "lead_uid": actual_uid,
            "assigned_cre": assigned_cre['name'] if assigned_cre else None,
            "synced": {
                "lead_master": True,
                "ps_followup_master": True,
                "trade_in_queued": any([lead_data.get('trade_in_make'), lead_data.get('trade_in_model'), 
                                       lead_data.get('trade_in_year'), lead_data.get('trade_in_km')])
            }
        })
        
    except Exception as e:
        print(f"[PS Lead] Error adding lead: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add lead: {str(e)}")

@app.put("/api/ps-followup")
async def update_ps_followup(update_data: PSFollowUpUpdate, current_user=Depends(get_current_user)):
    """Update PS follow-up - Use fresh Supabase client to avoid caching"""
    try:
        # Create fresh Supabase client to avoid cache issues
        fresh_supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        
        # Check if follow-up exists
        existing = fresh_supabase.table('ps_followup_master').select('*').eq('id', update_data.id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Follow-up not found")
        
        followup = existing.data[0]
        
        # Check permissions
        if current_user.role == 'ps' and followup['ps_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Build update fields
        update_fields = {"updated_at": now_ist_iso()}
        
        if update_data.follow_up_date:
            update_fields["follow_up_date"] = update_data.follow_up_date
        if update_data.lead_status:
            update_fields["lead_status"] = update_data.lead_status
        if update_data.final_status:
            update_fields["final_status"] = update_data.final_status
        if update_data.test_drive_done is not None:
            update_fields["test_drive_done"] = update_data.test_drive_done
        if update_data.booking_id:
            update_fields["booking_id"] = update_data.booking_id
        if update_data.retailed_id:
            update_fields["retailed_id"] = update_data.retailed_id
        
        # Handle call remarks and lead statuses
        call_fields = [
            'first_call_remark', 'second_call_remark', 'third_call_remark',
            'fourth_call_remark', 'fifth_call_remark', 'sixth_call_remark', 'seventh_call_remark',
            'eighth_call_remark', 'ninth_call_remark', 'tenth_call_remark'
        ]
        
        call_lead_status_fields = [
            'first_call_lead_status', 'second_call_lead_status', 'third_call_lead_status',
            'fourth_call_lead_status', 'fifth_call_lead_status', 'sixth_call_lead_status', 'seventh_call_lead_status',
            'eighth_call_lead_status', 'ninth_call_lead_status', 'tenth_call_lead_status'
        ]
        
        # Handle call remarks
        for field in call_fields:
            if getattr(update_data, field) is not None:
                update_fields[field] = getattr(update_data, field)
                # Set corresponding call date if remark is provided
                date_field = field.replace('_remark', '_date')
                if getattr(update_data, field) and not followup.get(date_field):
                    update_fields[date_field] = now_ist_iso()
        
        # Handle call lead statuses
        for field in call_lead_status_fields:
            if getattr(update_data, field) is not None:
                update_fields[field] = getattr(update_data, field)
        
        # Handle final status timestamps
        if update_data.final_status:
            pass
        
        response = fresh_supabase.table('ps_followup_master').update(update_fields).eq('id', update_data.id).execute()
        
        # Handle booking/retail requests in qualified_leads AND booking_and_retail_master table
        if update_data.booking_id or update_data.retailed_id:
            # Get full lead details from ps_followup_master to sync all fields
            lead_details = fresh_supabase.table('ps_followup_master').select('*').eq('lead_uid', followup['lead_uid']).execute()
            lead_data = lead_details.data[0] if lead_details.data else {}
            
            # Get additional details from qualified_leads (icrop_id, etc.)
            qualified_response = fresh_supabase.table('qualified_leads').select('*').eq('lead_uid', followup['lead_uid']).execute()
            qualified_data = qualified_response.data[0] if qualified_response.data else {}
            
            current_time = now_ist_iso()
            
            # Prepare full data for booking_and_retail_master
            booking_retail_data = {
                "lead_uid": followup['lead_uid'],
                "customer_name": lead_data.get('customer_name'),
                "customer_mobile_number": lead_data.get('customer_mobile_number'),
                "source": lead_data.get('source'),
                "cre_name": lead_data.get('cre_name'),
                "lead_category": lead_data.get('lead_category'),
                "model_interested": lead_data.get('model_interested'),
                "first_remark": qualified_data.get('first_remark') or lead_data.get('first_call_remark'),
                "variant": lead_data.get('variant'),
                "buying_plan": lead_data.get('buying_plan'),
                "finance_option": lead_data.get('finance_option'),
                "profession": lead_data.get('profession'),
                "test_drive_type": lead_data.get('test_drive_type'),
                "trade_in": lead_data.get('trade_in'),
                "branch": lead_data.get('ps_branch'),
                "ps_name": lead_data.get('ps_name'),
                "icrop_id": qualified_data.get('icrop_id'),
                "customer_location": qualified_data.get('customer_location'),
                "final_status": lead_data.get('final_status') or 'Pending',
                "approved_by_sales_manager": current_user.id,  # Required field
                "approved_at": current_time,
                "created_at": current_time,
                "updated_at": current_time
            }
            
            if update_data.booking_id:
                booking_retail_data["booking_id"] = update_data.booking_id
                booking_retail_data["booking_status"] = "Waiting for Approval"
                booking_retail_data["booking_requested_at"] = current_time
            
            if update_data.retailed_id:
                booking_retail_data["retailed_id"] = update_data.retailed_id
                booking_retail_data["retailed_status"] = "Waiting for Approval"
                booking_retail_data["retailed_requested_at"] = current_time
            
            # Insert into booking_and_retail_master table (upsert based on lead_uid)
            existing_booking = fresh_supabase.table('booking_and_retail_master').select('id').eq('lead_uid', followup['lead_uid']).execute()
            
            if existing_booking.data:
                # Update existing record
                fresh_supabase.table('booking_and_retail_master').update(booking_retail_data).eq('lead_uid', followup['lead_uid']).execute()
            else:
                # Insert new record
                fresh_supabase.table('booking_and_retail_master').insert(booking_retail_data).execute()
            
            # Also update qualified_leads table for backward compatibility
            qualified_lead_update = {
                "model_interested": lead_data.get('model_interested'),
                "variant": lead_data.get('variant'),
                "customer_name": lead_data.get('customer_name'),
                "customer_mobile_number": lead_data.get('customer_mobile_number'),
                "ps_name": lead_data.get('ps_name'),
                "branch": lead_data.get('ps_branch'),
                "final_status": lead_data.get('final_status') or 'Pending',
                "updated_at": current_time
            }
            
            if update_data.booking_id:
                qualified_lead_update["booking_id"] = update_data.booking_id
                qualified_lead_update["booking_status"] = "Waiting for Approval"
                qualified_lead_update["booking_requested_at"] = current_time
            
            if update_data.retailed_id:
                qualified_lead_update["retailed_id"] = update_data.retailed_id
                qualified_lead_update["retailed_status"] = "Waiting for Approval"
                qualified_lead_update["retailed_requested_at"] = current_time
            
            # Update qualified_leads table (use fresh client)
            fresh_supabase.table('qualified_leads').update(qualified_lead_update).eq('lead_uid', followup['lead_uid']).execute()
        
        if response.data:
            return {"message": "Follow-up updated successfully", "followup": response.data[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to update follow-up")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# LOST STATUS WORKFLOW
# ========================================

@app.post("/api/leads/{lead_uid}/lost-request")
async def request_lost_status(
    lead_uid: str,
    lost_reason: str,
    current_user=Depends(get_current_user)
):
    """PS requests lost status for a lead - sends to CRE for approval"""
    try:
        # Check if user is PS
        if current_user.role != 'ps':
            raise HTTPException(status_code=403, detail="Access denied - PS role required")
        
        # Get the qualified lead to find the CRE
        qualified_lead_response = supabase.table('qualified_leads').select('*').eq('lead_uid', lead_uid).execute()
        if not qualified_lead_response.data:
            raise HTTPException(status_code=404, detail="Qualified lead not found")
        
        qualified_lead = qualified_lead_response.data[0]
        cre_name = qualified_lead.get('cre_name')
        
        if not cre_name:
            raise HTTPException(status_code=400, detail="No CRE found for this lead")
        
        # Update qualified_leads with lost request (only update fields that exist)
        update_data = {
            "lost_reason": lost_reason,
            "updated_at": now_ist_iso()
        }
        
        # Note: qualified_leads table doesn't have lost_status columns, so we skip those
        supabase.table('qualified_leads').update(update_data).eq('lead_uid', lead_uid).execute()
        
        # Update ps_followup_master
        supabase.table('ps_followup_master').update({
            "final_status": "Lost",
            "lost_reason": lost_reason,
            "lost_requested_by": current_user.id,
            "lost_requested_at": now_ist_iso(),
            "updated_at": now_ist_iso()
        }).eq('lead_uid', lead_uid).execute()
        
        return {"message": f"Lost status requested for {lead_uid}. Awaiting CRE approval from {cre_name}."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/leads/{lead_uid}/lost-approve")
async def approve_lost_status(
    lead_uid: str,
    current_user=Depends(get_current_user)
):
    """CRE approves lost status for a lead"""
    try:
        print(f"[Lost Approval] Processing approval for lead {lead_uid} by user {current_user.username}")
        
        # Check if user is CRE
        if current_user.role not in ['cre', 'cre_icrop']:
            raise HTTPException(status_code=403, detail="Access denied - CRE role required")
        
        # Get the ps_followup_master record with Lost Requested status
        followup_response = supabase.table('ps_followup_master').select('*').eq('lead_uid', lead_uid).eq('final_status', 'Lost Requested').execute()
        
        if not followup_response.data:
            print(f"[Lost Approval] No lost request found for lead {lead_uid}")
            raise HTTPException(status_code=404, detail="Lost request not found")
        
        followup = followup_response.data[0]
        print(f"[Lost Approval] Found lost request for lead {lead_uid}, CRE: {followup.get('cre_name')}")
        
        # Check if CRE matches the lead's CRE (case-insensitive)
        cre_name = followup.get('cre_name', '').lower()
        user_name = current_user.username.lower()
        
        if not cre_name or cre_name != user_name:
            print(f"[Lost Approval] Access denied - CRE mismatch: {cre_name} vs {user_name}")
            raise HTTPException(status_code=403, detail="Access denied - You can only approve lost status for your own leads")
        
        # Update ps_followup_master to Lost status
        print(f"[Lost Approval] Updating ps_followup_master for lead {lead_uid}")
        followup_update = supabase.table('ps_followup_master').update({
            "final_status": "Lost",
            "updated_at": now_ist_iso()
        }).eq('lead_uid', lead_uid).execute()
        
        if followup_update.data:
            print(f"[Lost Approval] Successfully updated ps_followup_master for lead {lead_uid}")
        else:
            print(f"[Lost Approval] Warning: ps_followup_master update returned no data for lead {lead_uid}")

        # Update lead_master to Lost status
        print(f"[Lost Approval] Updating lead_master for lead {lead_uid}")
        lead_update = supabase.table('lead_master').update({
            "final_status": "Lost",
            "updated_at": now_ist_iso()
        }).eq('uid', lead_uid).execute()
        
        if lead_update.data:
            print(f"[Lost Approval] Successfully updated lead_master for lead {lead_uid}")
        else:
            print(f"[Lost Approval] Warning: lead_master update returned no data for lead {lead_uid}")

        # Update qualified_leads table to mark lead as lost (don't delete the record)
        print(f"[Lost Approval] Updating qualified_leads status for lead {lead_uid}")
        qualified_update = supabase.table('qualified_leads').update({
            "final_status": "Lost",
            "updated_at": now_ist_iso()
        }).eq('lead_uid', lead_uid).execute()

        if qualified_update.data:
            print(f"[Lost Approval] Successfully updated qualified_leads status for lead {lead_uid}")
        else:
            print(f"[Lost Approval] Warning: qualified_leads update returned no data for lead {lead_uid}")
        
        print(f"[Lost Approval] Successfully approved lost status for lead {lead_uid}")
        return {"message": f"Lost status approved for {lead_uid}."}
        
    except Exception as e:
        print(f"[Lost Approval] Error approving lost status for lead {lead_uid}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/leads/{lead_uid}/lost-reject")
async def reject_lost_status(
    lead_uid: str,
    rejection_reason: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    """CRE rejects lost status for a lead"""
    try:
        # Check if user is CRE
        if current_user.role not in ['cre', 'cre_icrop']:
            raise HTTPException(status_code=403, detail="Access denied - CRE role required")
        
        # Get the ps_followup_master record with Lost Requested status
        followup_response = supabase.table('ps_followup_master').select('*').eq('lead_uid', lead_uid).eq('final_status', 'Lost Requested').execute()
        
        if not followup_response.data:
            raise HTTPException(status_code=404, detail="Lost request not found")
        
        followup = followup_response.data[0]
        
        # Check if CRE matches the lead's CRE (case-insensitive)
        cre_name = followup.get('cre_name', '').lower()
        user_name = current_user.username.lower()
        
        if not cre_name or cre_name != user_name:
            raise HTTPException(status_code=403, detail="Access denied - You can only reject lost status for your own leads")
        
        # Note: qualified_leads table doesn't have final_status column, so we skip this update
        
        # Update ps_followup_master
        supabase.table('ps_followup_master').update({
            "final_status": "Pending",
            "updated_at": now_ist_iso()
        }).eq('lead_uid', lead_uid).execute()

        # Sync final_status across tables
        try:
            sync_final_status(lead_uid, "Pending")
        except Exception:
            pass
        
        return {"message": f"Lost status rejected for {lead_uid}."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ========================================
# SALES MANAGER APPROVAL WORKFLOW
# ========================================

@app.put("/api/qualified-leads/approve")
async def approve_qualified_lead(
    lead_uid: str, 
    approval_type: str,  # 'booking' or 'retailed'
    current_user=Depends(get_current_user)
):
    """Approve a booking or retail request"""
    try:
        # Check if user is sales manager or branch head
        if current_user.role not in ['sales_manager', 'branch_head']:
            raise HTTPException(status_code=403, detail="Access denied - Sales Manager or Branch Head role required")
        
        # Get the qualified lead
        qualified_lead_response = supabase.table('qualified_leads').select('*').eq('lead_uid', lead_uid).execute()
        if not qualified_lead_response.data:
            raise HTTPException(status_code=404, detail="Qualified lead not found")
        
        qualified_lead = qualified_lead_response.data[0]
        
        # Update qualified_leads table
        update_fields = {
            "updated_at": now_ist_iso()
        }
        
        if approval_type == 'booking':
            update_fields["booking_status"] = "Approved"
            update_fields["booking_approved_by"] = current_user.id
            update_fields["booking_approved_timestamp"] = now_ist_iso()
        elif approval_type == 'retailed':
            update_fields["retailed_status"] = "Approved"
            update_fields["retailed_approved_by"] = current_user.id
            update_fields["retailed_approved_timestamp"] = now_ist_iso()
        else:
            raise HTTPException(status_code=400, detail="Invalid approval type. Must be 'booking' or 'retailed'")
        
        # Update qualified_leads
        supabase.table('qualified_leads').update(update_fields).eq('lead_uid', lead_uid).execute()
        
        # Get updated qualified lead to check if both booking and retail are approved
        updated_lead_response = supabase.table('qualified_leads').select('*').eq('lead_uid', lead_uid).execute()
        updated_lead = updated_lead_response.data[0]
        
        # Handle booking and retail approvals separately
        if approval_type == 'booking':
            # Booking approved - copy to master table and set final_status to "Booked"
            master_record = {
                "lead_uid": updated_lead["lead_uid"],
                "customer_name": updated_lead.get("customer_name"),
                "customer_mobile_number": updated_lead.get("customer_mobile_number"),
                "source": updated_lead.get("source"),
                "sub_source": updated_lead.get("sub_source"),
                "cre_name": updated_lead.get("cre_name"),
                "lead_category": updated_lead.get("lead_category"),
                "model_interested": updated_lead.get("model_interested"),
                "first_remark": updated_lead.get("first_remark"),
                "variant": updated_lead.get("variant"),
                "buying_plan": updated_lead.get("buying_plan"),
                "finance_option": updated_lead.get("finance_option"),
                "profession": updated_lead.get("profession"),
                "test_drive_type": updated_lead.get("test_drive_type"),
                "trade_in": updated_lead.get("trade_in"),
                "branch": updated_lead.get("branch"),
                "ps_name": updated_lead.get("ps_name"),
                "icrop_id": updated_lead.get("icrop_id"),
                "customer_location": updated_lead.get("customer_location"),
                "booking_id": updated_lead.get("booking_id"),
                "booking_status": updated_lead.get("booking_status"),
                "booking_requested_at": updated_lead.get("booking_requested_at"),
                "booking_approved_by": updated_lead.get("booking_approved_by"),
                "booking_approved_timestamp": updated_lead.get("booking_approved_timestamp"),
                "approved_by_sales_manager": current_user.id,
                "approved_at": now_ist_iso(),
                "created_at": now_ist_iso(),
                "updated_at": now_ist_iso()
            }
            
            # Upsert into booking_and_retail_master to avoid duplicate key errors
            existing = supabase.table('booking_and_retail_master').select('id').eq('lead_uid', lead_uid).execute()
            if existing.data:
                supabase.table('booking_and_retail_master').update(master_record).eq('lead_uid', lead_uid).execute()
            else:
                supabase.table('booking_and_retail_master').insert(master_record).execute()
            
            # Set final_status to "Booked"
            supabase.table('ps_followup_master').update({
                "final_status": "Booked",
                "updated_at": now_ist_iso()
            }).eq('lead_uid', lead_uid).execute()
            
            # Set final_status to "Won" in lead_master for booking approval
            supabase.table('lead_master').update({
                "final_status": "Won",
                "updated_at": now_ist_iso()
            }).eq('uid', lead_uid).execute()
            
        elif approval_type == 'retailed':
            # Retail approved - update existing row in master table and set final_status to "Won"
            master_update = {
                "retailed_id": updated_lead.get("retailed_id"),
                "retailed_status": updated_lead.get("retailed_status"),
                "retailed_requested_at": updated_lead.get("retailed_requested_at"),
                "retailed_approved_by": updated_lead.get("retailed_approved_by"),
                "retailed_approved_timestamp": updated_lead.get("retailed_approved_timestamp"),
                "approved_by_sales_manager": current_user.id,
                "approved_at": now_ist_iso(),
                "updated_at": now_ist_iso()
            }
            
            # Ensure there is a row to update; if not, insert then update
            existing = supabase.table('booking_and_retail_master').select('id').eq('lead_uid', lead_uid).execute()
            if not existing.data:
                supabase.table('booking_and_retail_master').insert({
                    "lead_uid": lead_uid,
                    "created_at": now_ist_iso(),
                    "updated_at": now_ist_iso()
                }).execute()
            supabase.table('booking_and_retail_master').update(master_update).eq('lead_uid', lead_uid).execute()
            
            # Set final_status to "Won" in ps_followup_master
            supabase.table('ps_followup_master').update({
                "final_status": "Won",
                "won_timestamp": now_ist_iso(),
                "updated_at": now_ist_iso()
            }).eq('lead_uid', lead_uid).execute()
            
            # Set final_status to "Won" in lead_master
            supabase.table('lead_master').update({
                "final_status": "Won",
                "updated_at": now_ist_iso()
            }).eq('uid', lead_uid).execute()
        
        return {"message": f"{approval_type.title()} approved successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/qualified-leads/reject")
async def reject_qualified_lead(
    lead_uid: str, 
    approval_type: str,  # 'booking' or 'retailed'
    rejection_reason: Optional[str] = None,
    current_user=Depends(get_current_user)
):
    """Reject a booking or retail request"""
    try:
        # Check if user is sales manager
        if current_user.role != 'sales_manager':
            raise HTTPException(status_code=403, detail="Access denied - Sales Manager role required")
        
        # Get the qualified lead
        qualified_lead_response = supabase.table('qualified_leads').select('*').eq('lead_uid', lead_uid).execute()
        if not qualified_lead_response.data:
            raise HTTPException(status_code=404, detail="Qualified lead not found")
        
        # Update qualified_leads table
        update_fields = {
            "updated_at": now_ist_iso()
        }
        
        if approval_type == 'booking':
            update_fields["booking_status"] = "Rejected"
            update_fields["booking_approved_by"] = current_user.id
            update_fields["booking_approved_timestamp"] = now_ist_iso()
        elif approval_type == 'retailed':
            update_fields["retailed_status"] = "Rejected"
            update_fields["retailed_approved_by"] = current_user.id
            update_fields["retailed_approved_timestamp"] = now_ist_iso()
        else:
            raise HTTPException(status_code=400, detail="Invalid approval type. Must be 'booking' or 'retailed'")
        
        # Update qualified_leads
        supabase.table('qualified_leads').update(update_fields).eq('lead_uid', lead_uid).execute()
        
        # Update ps_followup_master final_status to "Pending"
        supabase.table('ps_followup_master').update({
            "final_status": "Pending",
            "updated_at": now_ist_iso()
        }).eq('lead_uid', lead_uid).execute()
        
        return {"message": f"{approval_type.title()} rejected successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/qualified-leads/pending-approvals")
async def get_pending_approvals(
    branch: Optional[str] = Query(None),  # Branch filter for Sales Manager
    current_user=Depends(get_current_user)
):
    """Get booking and retail approvals for Sales Manager across statuses.
    
    If branch is provided, only returns requests from PS/GEMs in that branch.
    Returns requests with request_status in ['pending','approved','rejected'] so the UI can
    render Pending/Approved/Rejected sections and move items between them automatically.
    """
    try:
        # Allow access for sales_manager role, but also allow if no user (for debugging)
        if current_user and current_user.role != 'sales_manager':
            print(f"[FastAPI] ⚠️ User role '{current_user.role}' is not sales_manager, but allowing access for debugging")
            # raise HTTPException(status_code=403, detail="Access denied - Sales Manager role required")

        # Fetch approval requests from ps_followup_master table (where the actual data is)
        query = supabase.table('ps_followup_master').select('*')
        
        # IMPORTANT: Filter by branch if provided (Sales Manager's branch)
        if branch:
            # Filter by the ps_branch column on ps_followup_master
            query = query.eq('ps_branch', branch)
            print(f"[FastAPI] 🏢 Filtering approval requests by branch: {branch}")
        
        response = query.execute()
        
        print(f"[FastAPI] 📊 Query returned {len(response.data or [])} ps_followup_master rows" + 
              (f" for branch '{branch}'" if branch else " (all branches)"))

        def map_status(raw: Optional[str]) -> Optional[str]:
            if not raw:
                return None
            if raw == "Waiting for Approval":
                return "pending"
            if raw == "Approved":
                return "approved"
            if raw == "Rejected":
                return "rejected"
            return None

        approval_requests = []
        for lead in response.data or []:
            # Only include requests that are still pending approval
            # Exclude already approved/won leads
            final_status = lead.get('final_status', '').lower()
            if final_status in ['booked', 'won', 'retailed']:
                print(f"[FastAPI] Skipping already approved lead {lead['lead_uid']} with final_status: {final_status}")
                continue
                
            # Check if this is a booking request (lead_status = "Booking Requested")
            if lead.get('lead_status') == 'Booking Requested':
                approval_requests.append({
                    'id': f"booking_{lead['lead_uid']}",
                    'lead_uid': lead['lead_uid'],
                    'request_type': 'booking',
                    'booking_id': lead.get('booking_id', ''),  # Allow empty booking_id
                    'retailed_id': None,
                    'ps_name': lead.get('ps_name', 'Unknown'),
                    'cre_name': lead.get('cre_name', 'Unknown'),
                    'customer_name': lead.get('customer_name', 'Unknown'),
                    'customer_mobile_number': lead.get('customer_mobile_number', 'Unknown'),
                    'model_interested': lead.get('model_interested', 'Unknown'),
                    'request_status': 'pending',  # All "Booking Requested" are pending
                    'requested_at': lead.get('first_call_date', lead.get('created_at', now_ist_iso())),
                    'created_at': lead.get('created_at', now_ist_iso())
                })

            # Check if this is a retail request (lead_status = "Retail Requested")
            if lead.get('lead_status') == 'Retail Requested':
                approval_requests.append({
                    'id': f"retailed_{lead['lead_uid']}",
                    'lead_uid': lead['lead_uid'],
                    'request_type': 'retailed',
                    'booking_id': None,
                    'retailed_id': lead.get('retailed_id', ''),  # Allow empty retailed_id
                    'ps_name': lead.get('ps_name', 'Unknown'),
                    'cre_name': lead.get('cre_name', 'Unknown'),
                    'customer_name': lead.get('customer_name', 'Unknown'),
                    'customer_mobile_number': lead.get('customer_mobile_number', 'Unknown'),
                    'model_interested': lead.get('model_interested', 'Unknown'),
                    'request_status': 'pending',  # All "Retail Requested" are pending
                    'requested_at': lead.get('first_call_date', lead.get('created_at', now_ist_iso())),
                    'created_at': lead.get('created_at', now_ist_iso())
                })

        # Log the results
        total_count = len(approval_requests)
        booking_count = len([r for r in approval_requests if r['request_type'] == 'booking'])
        retail_count = len([r for r in approval_requests if r['request_type'] == 'retailed'])
        
        if branch:
            print(f"[FastAPI] Returning {total_count} approval requests for branch '{branch}': {booking_count} booking, {retail_count} retail")
        else:
            print(f"[FastAPI] Returning {total_count} approval requests (all branches): {booking_count} booking, {retail_count} retail")

        return approval_requests

    except Exception as e:
        print(f"[FastAPI] Error in pending-approvals: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# LEAD QUALIFICATION TRIGGER
# ========================================

@app.post("/api/leads/{lead_uid}/qualify")
async def qualify_lead(lead_uid: str, trade_in_data: LeadQualifyRequest, current_user=Depends(get_current_user)):
    """Qualify a lead - ULTRA FAST with background processing for CRE dashboard"""
    try:
        # Quick validation - check if lead exists
        lead_response = supabase.table('lead_master').select('uid').eq('uid', lead_uid).execute()
        
        if not lead_response.data:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Quick check if already qualified
        existing_qualified = supabase.table('qualified_leads').select('id').eq('lead_uid', lead_uid).execute()
        if existing_qualified.data:
            raise HTTPException(status_code=400, detail="Lead already qualified")
        
        # Prepare user info for background processing
        user_info = {
            'username': current_user.username,
            'role': current_user.role,
            'user_id': current_user.id
        }
        
        # Prepare trade-in data for background processing
        trade_in_info = {
            'trade_in_make': trade_in_data.trade_in_make,
            'trade_in_model': trade_in_data.trade_in_model,
            'trade_in_year': trade_in_data.trade_in_year,
            'trade_in_km': trade_in_data.trade_in_km,
            'trade_in_ownership': trade_in_data.trade_in_ownership
        }
        logger.info(f"[Qualify API] Trade-in info received for {lead_uid}: {trade_in_info}")
        
        # Prepare form data for qualified_leads
        form_data = {
            'model_interested': trade_in_data.model_interested,
            'variant': trade_in_data.variant,
            'first_remark': trade_in_data.first_remark,
            'profession': trade_in_data.profession,
            'buying_plan': trade_in_data.buying_plan,
            'finance_option': trade_in_data.finance_option,
            'test_drive_type': trade_in_data.test_drive_type,
            'lead_category': trade_in_data.lead_category,
            'trade_in': trade_in_data.trade_in
        }
        logger.info(f"[Qualify API] Form data received for {lead_uid}: {form_data}")
        
        # Process qualification in background for ultra-fast response
        result = qualify_lead_async(lead_uid, user_info, trade_in_info, form_data)
        
        return result
            
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


# ========================================
# CRE ICROP ENDPOINTS
# ========================================

@app.get("/api/qualified-leads/ps-assigned")
async def get_ps_assigned_qualified_leads(current_user: dict = Depends(get_current_user)):
    """Get all qualified leads that are assigned to PS"""
    try:
        # Get qualified leads that have PS assigned
        response = supabase.table('qualified_leads').select('*').not_.is_('ps_name', 'null').execute()
        
        return response.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# TRADE-IN DETAILS ENDPOINT
# ========================================

@app.get("/api/trade-in/{lead_uid}")
async def get_trade_in_details(lead_uid: str, current_user=Depends(get_current_user)):
    """Fetch trade-in details for a lead and include key fields from lead_master.

    Response shape:
    {
      "lead_uid": str,
      "trade_in": "yes"|"no"|"",
      "profession": str|None,
      "test_drive_type": str|None,
      "lead_master": {...subset...},
      "trade_in_details": {...} | None
    }
    """
    try:
        # Fetch subset from lead_master
        lm_resp = supabase.table('lead_master').select(
            'uid, customer_name, customer_mobile_number, profession, test_drive_type, trade_in'
        ).eq('uid', lead_uid).limit(1).execute()
        lead_master_row = lm_resp.data[0] if lm_resp.data else {}

        # Fetch latest trade-in details if any
        ti_resp = supabase.table('trade_in_master').select('lead_uid, customer_name, customer_mobile_number, trade_in_make, trade_in_model, trade_in_year, trade_in_km, trade_in_ownership').eq('lead_uid', lead_uid) \
            .order('created_at', desc=True).limit(1).execute()
        trade_in_row = ti_resp.data[0] if ti_resp.data else None

        # Prefer customer fields from trade-in details, fallback to lead_master
        customer_name = (trade_in_row.get('customer_name') if trade_in_row else None) or (lead_master_row.get('customer_name') if lead_master_row else None)
        customer_mobile_number = (trade_in_row.get('customer_mobile_number') if trade_in_row else None) or (lead_master_row.get('customer_mobile_number') if lead_master_row else None)

        result = {
            'lead_uid': lead_uid,
            'trade_in': (lead_master_row.get('trade_in') if lead_master_row else '') or '',
            'profession': lead_master_row.get('profession') if lead_master_row else None,
            'test_drive_type': lead_master_row.get('test_drive_type') if lead_master_row else None,
            'customer_name': customer_name,
            'customer_mobile_number': customer_mobile_number,
            'lead_master': lead_master_row or {},
            'trade_in_details': trade_in_row
        }
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/qualified-leads/{lead_id}/icrop-id")
async def update_qualified_lead_icrop_id(
    lead_id: str,
    icrop_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update ICROP ID for a qualified lead"""
    try:
        icrop_id = icrop_data.get('icrop_id')
        
        if not icrop_id:
            raise HTTPException(status_code=400, detail="ICROP ID is required")
        
        # Update the qualified lead with ICROP ID
        response = supabase.table('qualified_leads').update({
            'icrop_id': icrop_id,
            'updated_at': now_ist_iso()
        }).eq('id', lead_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Qualified lead not found")
        
        # Also update the ICROP ID in ps_followup_master table if the lead is assigned to PS
        qualified_lead = response.data[0]
        lead_uid = qualified_lead.get('lead_uid')
        if lead_uid:
            supabase.table('ps_followup_master').update({
                'icrop_id': icrop_id,
                'updated_at': now_ist_iso()
            }).eq('lead_uid', lead_uid).execute()
            
            # Also update in lead_master table
            supabase.table('lead_master').update({
                'icrop_id': icrop_id,
                'updated_at': now_ist_iso()
            }).eq('uid', lead_uid).execute()
        
        return {
            'success': True,
            'message': f'ICROP ID {icrop_id} assigned successfully',
            'lead_id': lead_id,
            'icrop_id': icrop_id
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# PS ASSIGNMENT ENDPOINTS
# ========================================

@app.get("/api/ps-assignments", response_model=List[PSAssignmentResponse])
async def get_ps_assignments(current_user=Depends(admin_or_branch_head)):
    """Get all PS assignments"""
    try:
        response = supabase.table('ps_assignments').select("""
            id,
            ps_user_id,
            sales_team_leader_id,
            created_at,
            updated_at,
            ps_user:users!ps_assignments_ps_user_id_fkey(
                id,
                username,
                email,
                full_name,
                phone,
                branch,
                is_active
            ),
            sales_team_leader:users!ps_assignments_sales_team_leader_id_fkey(
                id,
                username,
                email,
                full_name,
                phone,
                branch,
                is_active
            )
        """).execute()
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ps-assignments", response_model=PSAssignmentResponse)
async def create_ps_assignment(assignment_data: PSAssignmentCreate, current_user=Depends(admin_or_branch_head)):
    """Create a new PS assignment"""
    try:
        # Verify PS user exists and has correct role
        ps_user_response = supabase.table('users').select('id, role').eq('id', assignment_data.ps_user_id).eq('role', 'ps').execute()
        if not ps_user_response.data:
            raise HTTPException(status_code=400, detail="PS user not found or invalid role")
        
        # Verify sales team leader exists and has correct role
        stl_response = supabase.table('users').select('id, role').eq('id', assignment_data.sales_team_leader_id).eq('role', 'sales_team_leader').execute()
        if not stl_response.data:
            raise HTTPException(status_code=400, detail="Sales team leader not found or invalid role")
        
        # Check if PS user is already assigned
        existing_response = supabase.table('ps_assignments').select('id').eq('ps_user_id', assignment_data.ps_user_id).execute()
        if existing_response.data:
            raise HTTPException(status_code=400, detail="PS user is already assigned to a sales team leader")
        
        # Create assignment
        response = supabase.table('ps_assignments').insert({
            'ps_user_id': assignment_data.ps_user_id,
            'sales_team_leader_id': assignment_data.sales_team_leader_id,
            'created_at': now_ist_iso(),
            'updated_at': now_ist_iso()
        }).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create assignment")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/ps-assignments/{assignment_id}", response_model=PSAssignmentResponse)
async def update_ps_assignment(assignment_id: str, assignment_data: PSAssignmentUpdate, current_user=Depends(admin_or_branch_head)):
    """Update a PS assignment"""
    try:
        # Verify assignment exists
        existing_response = supabase.table('ps_assignments').select('id').eq('id', assignment_id).execute()
        if not existing_response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Verify sales team leader exists and has correct role
        if assignment_data.sales_team_leader_id:
            stl_response = supabase.table('users').select('id, role').eq('id', assignment_data.sales_team_leader_id).eq('role', 'sales_team_leader').execute()
            if not stl_response.data:
                raise HTTPException(status_code=400, detail="Sales team leader not found or invalid role")
        
        # Update assignment
        update_data = {'updated_at': now_ist_iso()}
        if assignment_data.sales_team_leader_id:
            update_data['sales_team_leader_id'] = assignment_data.sales_team_leader_id
        
        response = supabase.table('ps_assignments').update(update_data).eq('id', assignment_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to update assignment")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/ps-assignments/{assignment_id}")
async def delete_ps_assignment(assignment_id: str, current_user=Depends(admin_or_branch_head)):
    """Delete a PS assignment"""
    try:
        # Verify assignment exists
        existing_response = supabase.table('ps_assignments').select('id').eq('id', assignment_id).execute()
        if not existing_response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Delete assignment
        response = supabase.table('ps_assignments').delete().eq('id', assignment_id).execute()
        
        return {"message": "Assignment deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# RECEPTIONIST WALK-IN LEAD ENDPOINTS
# ========================================

class ReceptionistLeadCreate(BaseModel):
    customer_name: str
    customer_mobile_number: str
    profession: Optional[str] = None
    source: str  # "Walk-in" or "Digital"
    sub_source: Optional[str] = None  # For digital sources like "Google", "Meta", etc.
    interested_model: str
    variant: str
    purchase_timeline: str
    ps_id: str
    ps_name: str
    branch: str
    allow_duplicate: bool = False

class DuplicateCheckResponse(BaseModel):
    isDuplicate: bool
    existingLead: Optional[dict] = None

class ReceptionistStatsResponse(BaseModel):
    today: int
    this_week: int
    this_month: int
    by_source: dict
    by_model: dict
    by_ps: dict

class RecentCaptureResponse(BaseModel):
    lead_uid: str
    customer_name: str
    customer_mobile_number: str
    source: str
    interested_model: str
    ps_name: str
    created_at: str
    created_at_epoch: int
    time_ago: str

# ========================================
# RECEPTIONIST ENDPOINTS
# ========================================

@app.get("/api/receptionist/check-duplicate", response_model=DuplicateCheckResponse)
async def check_duplicate_mobile(
    mobile: str,
    current_user=Depends(get_current_user)
):
    """Check if mobile number already exists in lead_master"""
    try:
        if current_user.role != 'receptionist':
            raise HTTPException(status_code=403, detail="Only receptionists can check duplicates")

        # Check in lead_master table
        response = supabase.table('lead_master').select('*').eq('customer_mobile_number', mobile).execute()

        if response.data and len(response.data) > 0:
            existing_lead = response.data[0]
            return DuplicateCheckResponse(
                isDuplicate=True,
                existingLead={
                    "lead_uid": existing_lead.get('uid'),
                    "customer_name": existing_lead.get('customer_name'),
                    "customer_mobile_number": existing_lead.get('customer_mobile_number'),
                    "created_at": existing_lead.get('created_at'),
                    "ps_name": existing_lead.get('ps_name'),
                    "source": existing_lead.get('source'),
                    "branch": existing_lead.get('branch')
                }
            )

        return DuplicateCheckResponse(isDuplicate=False)

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking duplicate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/receptionist/ps-users")
async def get_ps_users_by_branch(current_user=Depends(get_current_user)):
    """Get PS users from the same branch as receptionist"""
    try:
        if current_user.role != 'receptionist':
            raise HTTPException(status_code=403, detail="Only receptionists can access PS users")

        print(f"[DEBUG] Receptionist user: {current_user.username}, branch_id: {current_user.branch_id}")
        
        if not current_user.branch_id:
            raise HTTPException(status_code=400, detail="Receptionist user has no branch assigned")

        # Get PS users from same branch
        response = supabase.table('users').select('id, username, email, full_name').eq('role', 'ps').eq('branch', current_user.branch_id).eq('is_active', True).execute()

        return response.data or []

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting PS users: {e}")
        # Return empty array instead of 500 error
        return []

@app.post("/api/receptionist/leads")
async def create_receptionist_lead(
    lead_data: ReceptionistLeadCreate,
    current_user=Depends(get_current_user)
):
    """Create a walk-in or digital lead captured by receptionist"""
    try:
        print(f"[DEBUG] Receptionist lead creation request: {lead_data}")
        print(f"[DEBUG] Current user: {current_user.username}, role: {current_user.role}")
        print(f"[DEBUG] Lead data type: {type(lead_data)}")
        print(f"[DEBUG] Lead data dict: {lead_data.dict() if hasattr(lead_data, 'dict') else 'No dict method'}")
        
        if current_user.role != 'receptionist':
            raise HTTPException(status_code=403, detail="Only receptionists can create leads")

        # Duplicate check across lead_master and ps_followup_master by customer_mobile_number
        mobile = lead_data.customer_mobile_number
        current_time = now_ist_iso()

        existing_lead_master = None
        existing_ps_followup = None
        try:
            lm_q = (
                supabase
                    .table('lead_master')
                    .select('id, uid, is_dup')
                    .eq('customer_mobile_number', mobile)
                    .order('created_at', desc=True)
                    .limit(1)
            )
            lm_res = lm_q.execute()
            existing_lead_master = lm_res.data[0] if lm_res.data else None
        except Exception:
            existing_lead_master = None

        try:
            ps_q = (
                supabase
                    .table('ps_followup_master')
                    .select('id, lead_uid, is_dup, customer_mobile_number')
                    .eq('customer_mobile_number', mobile)
                    .order('created_at', desc=True)
                    .limit(1)
            )
            ps_res = ps_q.execute()
            existing_ps_followup = ps_res.data[0] if ps_res.data else None
        except Exception:
            existing_ps_followup = None

        if existing_lead_master or existing_ps_followup:
            dup_entry_base = {
                "timestamp": current_time,
                "source": lead_data.source or "",
                "sub_source": lead_data.sub_source or "",
            }

            def _append_dup(existing_record, table_name):
                current_is_dup = existing_record.get('is_dup')
                if isinstance(current_is_dup, list):
                    attempt_base = len(current_is_dup)
                    history = current_is_dup
                elif isinstance(current_is_dup, dict):
                    attempt_base = 1
                    history = [current_is_dup]
                else:
                    attempt_base = 0
                    history = []
                entry = { **dup_entry_base, "attempt": attempt_base + 1 }
                new_history = history + [entry]
                update_payload = {
                    "is_dup": new_history,
                    "updated_at": current_time,
                }
                supabase.table(table_name).update(update_payload).eq('id', existing_record['id']).execute()

            if existing_lead_master:
                _append_dup(existing_lead_master, 'lead_master')
            if existing_ps_followup:
                _append_dup(existing_ps_followup, 'ps_followup_master')

            lead_uid = (existing_lead_master or {}).get('uid') or (existing_ps_followup or {}).get('lead_uid')
            return {
                "success": True,
                "duplicate": True,
                "lead_uid": lead_uid,
                "message": "Mobile number already exists. Lead updated.",
                "synced": {
                    "lead_master": bool(existing_lead_master),
                    "ps_followup_master": bool(existing_ps_followup)
                }
            }

        # Generate lead UID
        uid = f"CD{int(time.time()) % 1000000:06d}"

        # Find CREs assigned to this branch for walk-in follow-ups
        cre_assignments = []
        try:
            cre_response = supabase.table('users').select('id, full_name, walkin_assignments').eq('role', 'cre').eq('is_active', True).execute()
            print(f"[DEBUG] CREs found: {len(cre_response.data or [])}")
            
            for cre in cre_response.data or []:
                walkin_assignments = cre.get('walkin_assignments', [])
                if lead_data.branch in walkin_assignments:
                    cre_assignments.append({
                        'id': cre['id'],
                        'name': cre['full_name']
                    })
                    print(f"[DEBUG] CRE {cre['full_name']} assigned to branch {lead_data.branch}")
        except Exception as e:
            print(f"[DEBUG] Error finding CRE assignments: {e}")
            # Continue without CRE assignments if there's an error

        # Randomly assign one CRE for walk-in follow-up if multiple CREs are available
        assigned_cre = None
        if cre_assignments:
            import random
            assigned_cre = random.choice(cre_assignments)
            print(f"[DEBUG] Randomly assigned CRE: {assigned_cre['name']} for walk-in follow-up")

        # Prepare lead data for lead_master
        lead_master_data = {
            "uid": uid,
            "customer_name": lead_data.customer_name,
            "customer_mobile_number": lead_data.customer_mobile_number,
            "alternate_mobile_number": None,
            "customer_location": "",  # Empty for walk-in leads
            "profession": lead_data.profession,
            "source": lead_data.source,
            "sub_source": lead_data.sub_source,
            "campaign": None,
            "model_interested": lead_data.interested_model,
            "variant": lead_data.variant,
            "buying_plan": lead_data.purchase_timeline,  # Map purchase_timeline to buying_plan
            "ps_name": lead_data.ps_name,
            "ps_id": str(lead_data.ps_id),
            "cre_name": assigned_cre['name'] if assigned_cre else None,
            "cre_id": assigned_cre['id'] if assigned_cre else None,
            "branch": lead_data.branch,
            "assigned": "Yes",  # Walk-in leads are assigned to PS
            "lead_status": "Pending",
            "final_status": "Pending",
            "lead_category": "Hot",
            "follow_up_date": None,
            "out_of_station_location": None,
            "date": now_ist_iso(),
            "created_at": now_ist_iso(),
            "updated_at": now_ist_iso(),
            "test_drive_type": None,
            "trade_in": None,
            "sixth_call_date": None,
            "sixth_remark": None,
            "metadata": {
                "created_by": "receptionist",
                "assigned_cre": assigned_cre['name'] if assigned_cre else None
            }
        }

        # Insert into lead_master
        print(f"[DEBUG] Lead master data: {lead_master_data}")
        lead_response = supabase.table('lead_master').insert(lead_master_data).execute()
        print(f"[DEBUG] Lead master response: {lead_response.data}")
        print(f"[DEBUG] Lead master response status: {lead_response}")
        if not lead_response.data:
            print(f"[DEBUG] Lead master insertion failed: {lead_response}")
            raise HTTPException(status_code=500, detail="Failed to create lead in lead_master")
        
        # Get the actual UID from the inserted lead (database trigger may have changed it)
        actual_uid = lead_response.data[0]['uid']
        print(f"[DEBUG] Generated UID: {uid}, Actual UID from database: {actual_uid}")
        
        # Verify the lead was actually created
        verify_lead = supabase.table('lead_master').select('uid').eq('uid', actual_uid).execute()
        print(f"[DEBUG] Lead verification: {verify_lead.data}")
        if not verify_lead.data:
            print(f"[DEBUG] Lead verification failed - lead not found in database")
            raise HTTPException(status_code=500, detail="Lead was not created in lead_master")

        # Prepare data for ps_followup_master
        followup_data = {
            "lead_uid": actual_uid,
            "ps_name": lead_data.ps_name,
            "ps_id": str(lead_data.ps_id),
            "ps_branch": lead_data.branch,
            "customer_name": lead_data.customer_name,
            "customer_mobile_number": lead_data.customer_mobile_number,
            "alternate_mobile_number": None,
            "source": lead_data.source,
            "sub_source": lead_data.sub_source,
            "cre_name": assigned_cre['name'] if assigned_cre else None,
            "cre_id": assigned_cre['id'] if assigned_cre else None,
            "lead_category": "Hot",  # Walk-in leads are typically hot
            "model_interested": lead_data.interested_model,
            "variant": lead_data.variant,
            "follow_up_date": None,
            "lead_status": "Pending",
            "final_status": "Pending",
            "test_drive_done": None,
            "created_at": now_ist_iso(),
            "updated_at": now_ist_iso(),
            "ps_assigned_at": now_ist_iso(),
            "won_timestamp": None,
            "lost_timestamp": None,
            "buying_plan": lead_data.purchase_timeline,
            "finance_option": None,
            "icrop_id": None,
            "booking_id": None,
            "retailed_id": None,
            # Initialize call fields
            "first_call_date": None,
            "first_call_remark": None,
            "first_call_lead_status": None,
            "second_call_date": None,
            "second_call_remark": None,
            "second_call_lead_status": None,
            "third_call_date": None,
            "third_call_remark": None,
            "third_call_lead_status": None,
            "fourth_call_date": None,
            "fourth_call_remark": None,
            "fourth_call_lead_status": None,
            "fifth_call_date": None,
            "fifth_call_remark": None,
            "fifth_call_lead_status": None,
            "sixth_call_date": None,
            "sixth_call_remark": None,
            "sixth_call_lead_status": None,
            "seventh_call_date": None,
            "seventh_call_remark": None,
            "seventh_call_lead_status": None,
            "eighth_call_date": None,
            "eighth_call_remark": None,
            "eighth_call_lead_status": None,
            "ninth_call_date": None,
            "ninth_call_remark": None,
            "ninth_call_lead_status": None,
            "tenth_call_date": None,
            "tenth_call_remark": None,
            "tenth_call_lead_status": None
        }

        # Insert into ps_followup_master
        print(f"[DEBUG] PS followup data: {followup_data}")
        followup_response = supabase.table('ps_followup_master').insert(followup_data).execute()
        print(f"[DEBUG] PS followup response: {followup_response.data}")
        if not followup_response.data:
            print(f"[DEBUG] PS followup insertion failed: {followup_response}")
            # Rollback lead_master insertion if followup fails
            supabase.table('lead_master').delete().eq('uid', actual_uid).execute()
            raise HTTPException(status_code=500, detail="Failed to create lead in ps_followup_master")

        return {
            "success": True,
            "lead_uid": actual_uid,
            "message": "Lead captured successfully",
            "synced": {
                "lead_master": True,
                "ps_followup_master": True,
                "cre_assigned": assigned_cre['name'] if assigned_cre else None
            },
            "assigned_cre": assigned_cre['name'] if assigned_cre else None
        }

    except HTTPException:
        raise
    except ValidationError as e:
        print(f"Validation error in receptionist lead creation: {e}")
        print(f"Validation error details: {e.errors()}")
        raise HTTPException(status_code=422, detail=f"Validation error: {e}")
    except Exception as e:
        print(f"Error creating receptionist lead: {e}")
        print(f"Error type: {type(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/receptionist/stats", response_model=ReceptionistStatsResponse)
async def get_receptionist_stats(current_user=Depends(get_current_user)):
    """Get statistics for receptionist dashboard"""
    try:
        if current_user.role != 'receptionist':
            raise HTTPException(status_code=403, detail="Only receptionists can access stats")

        print(f"[DEBUG] Receptionist stats user: {current_user.username}, branch_id: {current_user.branch_id}")
        
        if not current_user.branch_id:
            raise HTTPException(status_code=400, detail="Receptionist user has no branch assigned")

        # Get current IST date
        if ZONEINFO_AVAILABLE:
            ist_now = datetime.now(ZoneInfo("Asia/Kolkata"))
        else:
            ist_now = datetime.now(timezone.utc)
        today_start = ist_now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = (ist_now - timedelta(days=ist_now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        month_start = ist_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Get counts for different time periods - only walk-in and digital leads captured by receptionists
        # Note: current_user.branch_id is actually the branch name (string) from JWT token
        # Add additional filter to exclude test data or old data
        today_count = supabase.table('lead_master').select('id', count='exact').eq('branch', current_user.branch_id).in_('source', ['Walk-in', 'Digital']).gte('created_at', today_start.isoformat()).execute()
        week_count = supabase.table('lead_master').select('id', count='exact').eq('branch', current_user.branch_id).in_('source', ['Walk-in', 'Digital']).gte('created_at', week_start.isoformat()).execute()
        month_count = supabase.table('lead_master').select('id', count='exact').eq('branch', current_user.branch_id).in_('source', ['Walk-in', 'Digital']).gte('created_at', month_start.isoformat()).execute()
        
        # Use actual counts from database

        print(f"[DEBUG] Today count: {today_count.count}")
        print(f"[DEBUG] Week count: {week_count.count}")
        print(f"[DEBUG] Month count: {month_count.count}")

        # Get source breakdown - only walk-in and digital leads
        source_response = supabase.table('lead_master').select('source').eq('branch', current_user.branch_id).in_('source', ['Walk-in', 'Digital']).execute()
        by_source = {}
        for lead in source_response.data or []:
            source = lead.get('source', 'Unknown')
            by_source[source] = by_source.get(source, 0) + 1

        # Get model breakdown - only walk-in and digital leads
        model_response = supabase.table('lead_master').select('model_interested').eq('branch', current_user.branch_id).in_('source', ['Walk-in', 'Digital']).execute()
        by_model = {}
        for lead in model_response.data or []:
            model = lead.get('model_interested', 'Unknown')
            by_model[model] = by_model.get(model, 0) + 1

        # Get PS breakdown - only walk-in and digital leads
        ps_response = supabase.table('lead_master').select('ps_name').eq('branch', current_user.branch_id).in_('source', ['Walk-in', 'Digital']).execute()
        by_ps = {}
        for lead in ps_response.data or []:
            ps = lead.get('ps_name', 'Unknown')
            by_ps[ps] = by_ps.get(ps, 0) + 1

        return ReceptionistStatsResponse(
            today=today_count.count or 0,
            this_week=week_count.count or 0,
            this_month=month_count.count or 0,
            by_source=by_source,
            by_model=by_model,
            by_ps=by_ps
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting receptionist stats: {e}")
        # Return fallback data instead of 500 error
        return ReceptionistStatsResponse(
            today=0,
            this_week=0,
            this_month=0,
            by_source={},
            by_model={},
            by_ps={}
        )

@app.get("/api/receptionist/recent-captures")
async def get_recent_captures(
    limit: int = 10,
    current_user=Depends(get_current_user)
):
    """Get recent leads captured by receptionist"""
    try:
        if current_user.role != 'receptionist':
            raise HTTPException(status_code=403, detail="Only receptionists can access recent captures")

        print(f"[DEBUG] Receptionist recent-captures user: {current_user.username}, branch_id: {current_user.branch_id}")
        
        if not current_user.branch_id:
            raise HTTPException(status_code=400, detail="Receptionist user has no branch assigned")

        # Get recent leads from lead_master - only walk-in and digital leads
        print(f"[DEBUG] Querying leads for branch: {current_user.branch_id}")
        response = supabase.table('lead_master').select('*').eq('branch', current_user.branch_id).in_('source', ['Walk-in', 'Digital']).order('created_at', desc=True).limit(limit).execute()
        print(f"[DEBUG] Found {len(response.data or [])} recent captures")
        for i, lead in enumerate(response.data or []):
            print(f"[DEBUG] Lead {i}: {lead.get('customer_name', 'Unknown')} - {lead.get('source', 'Unknown')} - {lead.get('created_at', 'Unknown')}")

        recent_captures = []
        for lead in response.data or []:
            try:
                # Get created_at and calculate epoch timestamp
                created_at_str = lead.get('created_at', '')
                if not created_at_str:
                    print(f"[DEBUG] Lead {lead.get('customer_name', 'Unknown')} has no created_at")
                    continue
                    
                # Parse the timestamp and convert to IST epoch
                created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                # Convert to IST and then to epoch milliseconds
                if ZONEINFO_AVAILABLE:
                    ist_created_at = created_at.astimezone(ZoneInfo("Asia/Kolkata"))
                    ist_now = datetime.now(ZoneInfo("Asia/Kolkata"))
                else:
                    ist_created_at = created_at.astimezone(timezone.utc)
                    ist_now = datetime.now(timezone.utc)
                created_at_epoch = int(ist_created_at.timestamp() * 1000)
                
                # Calculate time ago using IST
                time_diff = ist_now - ist_created_at.replace(tzinfo=None)
            except Exception as e:
                print(f"[DEBUG] Error parsing date for lead {lead.get('customer_name', 'Unknown')}: {e}")
                continue

            if time_diff.days == 0:
                if time_diff.seconds < 60:
                    time_ago = "Just now"
                elif time_diff.seconds < 3600:
                    time_ago = f"{time_diff.seconds // 60} mins ago"
                else:
                    time_ago = f"{time_diff.seconds // 3600} hours ago"
            else:
                time_ago = f"{time_diff.days} days ago"

            try:
                recent_captures.append(RecentCaptureResponse(
                    lead_uid=lead.get('uid'),
                    customer_name=lead.get('customer_name'),
                    customer_mobile_number=lead.get('customer_mobile_number'),
                    source=lead.get('source'),
                    interested_model=lead.get('model_interested'),
                    ps_name=lead.get('ps_name'),
                    created_at=lead.get('created_at'),
                    created_at_epoch=created_at_epoch,
                    time_ago=time_ago
                ))
            except Exception as e:
                print(f"[DEBUG] Error creating RecentCaptureResponse for lead {lead.get('customer_name', 'Unknown')}: {e}")
                continue

        return recent_captures

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting recent captures: {e}")
        # Return empty array instead of 500 error
        return []

# ========================================
# CRE TEAM LEADER WALK-IN ASSIGNMENT ENDPOINTS
# ========================================

@app.put("/api/cre-team-leader/assign-cre-branch")
async def assign_cre_to_branch(
    assignment_data: dict,
    current_user=Depends(get_current_user)
):
    """Assign CRE to a branch for walk-in follow-ups"""
    try:
        if current_user.role != 'cre_team_leader':
            raise HTTPException(status_code=403, detail="Only CRE Team Leaders can assign CREs to branches")

        cre_id = assignment_data.get('cre_id')
        branch = assignment_data.get('branch')

        if not cre_id or not branch:
            raise HTTPException(status_code=400, detail="cre_id and branch are required")

        # Check if CRE exists and is active
        cre_response = supabase.table('users').select('*').eq('id', cre_id).eq('role', 'cre').eq('is_active', True).execute()
        if not cre_response.data:
            raise HTTPException(status_code=404, detail="CRE not found or inactive")

        cre = cre_response.data[0]

        # Get current walk-in assignments
        current_response = supabase.table('users').select('walkin_assignments').eq('id', cre_id).execute()
        if not current_response.data:
            raise HTTPException(status_code=404, detail="CRE not found")
        
        # Handle missing walkin_assignments field gracefully
        walkin_assignments = current_response.data[0].get('walkin_assignments')
        current_assignments = walkin_assignments if isinstance(walkin_assignments, list) else []
        
        # Check if already assigned to this branch
        if branch in current_assignments:
            raise HTTPException(status_code=409, detail="CRE is already assigned to this branch")
        
        # Add branch to assignments
        new_assignments = current_assignments + [branch]
        
        # Update CRE's walk-in assignments
        update_response = supabase.table('users').update({
            'walkin_assignments': new_assignments,
            'updated_at': now_ist_iso()
        }).eq('id', cre_id).execute()

        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to assign CRE to branch")

        return {
            "success": True,
            "message": f"CRE {cre['full_name']} assigned to {branch} branch for walk-in follow-ups",
            "cre_id": cre_id,
            "branch": branch
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error assigning CRE to branch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cre-team-leader/cre-branch-assignments")
async def get_cre_branch_assignments(current_user=Depends(get_current_user)):
    """Get all CRE branch assignments for walk-in follow-ups"""
    try:
        print(f"[DEBUG] CRE branch assignments - Current user: {current_user.username}, role: {current_user.role}")
        if current_user.role != 'cre_team_leader':
            print(f"[DEBUG] Access denied - user role: {current_user.role}")
            raise HTTPException(status_code=403, detail="Only CRE Team Leaders can view assignments")
        
        # Initialize empty assignments list as fallback
        assignments = []

        # Get all active CREs with their walk-in assignments
        # Handle missing walkin_assignments column gracefully
        try:
            # First try to get users with walkin_assignments
            response = supabase.table('users').select('id, username, full_name, walkin_assignments, updated_at').eq('role', 'cre').eq('is_active', True).execute()
        except Exception as select_error:
            error_str = str(select_error)
            print(f"[ERROR] Failed to select from users table: {error_str}")
            
            # Check if the error is about the column not existing
            if 'does not exist' in error_str or 'column' in error_str.lower():
                print(f"[INFO] walkin_assignments column may not exist, trying with all columns")
                try:
                    # Try selecting all fields to avoid column-specific errors
                    response = supabase.table('users').select('*').eq('role', 'cre').eq('is_active', True).execute()
                    print(f"[DEBUG] Available columns in users table: {list(response.data[0].keys()) if response.data else 'No data'}")
                    # Force walkin_assignments to be empty array for all users
                    for cre in response.data or []:
                        cre['walkin_assignments'] = cre.get('walkin_assignments', [])
                except Exception as debug_error:
                    print(f"[ERROR] Failed to debug users table: {debug_error}")
                    raise HTTPException(status_code=500, detail=f"Database query failed: {str(debug_error)}")
            else:
                # If all else fails, return empty assignments instead of crashing
                print(f"[ERROR] Could not query users table, returning empty assignments")
                return []

        print(f"[DEBUG] CRE response data: {response.data}")
        for cre in response.data or []:
            print(f"[DEBUG] Processing CRE: {cre}")
            
            # Handle missing walkin_assignments field gracefully
            walkin_assignments = cre.get('walkin_assignments')
            
            # If walkin_assignments is None or doesn't exist, treat it as empty list
            if walkin_assignments is None:
                walkin_assignments = []
            elif not isinstance(walkin_assignments, list):
                print(f"[WARNING] walkin_assignments is not a list for CRE {cre.get('full_name')}: {walkin_assignments}")
                walkin_assignments = []
            
            print(f"[DEBUG] Walk-in assignments for {cre.get('full_name', 'Unknown')}: {walkin_assignments}")
            if walkin_assignments and len(walkin_assignments) > 0:
                for branch in walkin_assignments:
                    assignment = {
                        "cre_id": cre['id'],
                        "cre_name": cre['full_name'],
                        "branch": branch,
                        "assigned_at": cre.get('updated_at') or cre.get('created_at')
                    }
                    print(f"[DEBUG] Adding assignment: {assignment}")
                    assignments.append(assignment)
            else:
                # Show unassigned CREs
                assignments.append({
                    "cre_id": cre['id'],
                    "cre_name": cre['full_name'],
                    "branch": 'Unassigned',
                    "assigned_at": cre.get('updated_at') or cre.get('created_at')
                })

        print(f"[DEBUG] Final assignments: {assignments}")
        return assignments

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[ERROR] Error getting CRE branch assignments: {e}")
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        # Return empty array instead of crashing the frontend
        print(f"[ERROR] Returning empty assignments to prevent frontend crash")
        return []

@app.delete("/api/cre-team-leader/remove-cre-branch-assignment")
async def remove_cre_branch_assignment(
    assignment_data: dict,
    current_user=Depends(get_current_user)
):
    """Remove CRE branch assignment for walk-in follow-ups"""
    try:
        if current_user.role != 'cre_team_leader':
            raise HTTPException(status_code=403, detail="Only CRE Team Leaders can remove assignments")

        cre_id = assignment_data.get('cre_id')
        branch = assignment_data.get('branch')

        if not cre_id:
            raise HTTPException(status_code=400, detail="cre_id is required")

        # Get current walk-in assignments
        current_response = supabase.table('users').select('walkin_assignments').eq('id', cre_id).execute()
        if not current_response.data:
            raise HTTPException(status_code=404, detail="CRE not found")
        
        # Handle missing walkin_assignments field gracefully
        walkin_assignments = current_response.data[0].get('walkin_assignments')
        current_assignments = walkin_assignments if isinstance(walkin_assignments, list) else []
        
        # Remove branch from assignments
        if branch in current_assignments:
            new_assignments = [b for b in current_assignments if b != branch]
        else:
            # If no specific branch provided, remove all assignments
            new_assignments = []
        
        # Update CRE's walk-in assignments
        update_response = supabase.table('users').update({
            'walkin_assignments': new_assignments,
            'updated_at': now_ist_iso()
        }).eq('id', cre_id).execute()

        if not update_response.data:
            raise HTTPException(status_code=500, detail="Failed to remove CRE branch assignment")

        return {
            "success": True,
            "message": "CRE branch assignment removed successfully",
            "cre_id": cre_id
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing CRE branch assignment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cre/walkin-followups")
async def get_cre_walkin_followups(current_user=Depends(get_current_user)):
    """Get walk-in follow-ups for CRE based on their assigned branch"""
    try:
        if current_user.role != 'cre':
            raise HTTPException(status_code=403, detail="Only CREs can access walk-in follow-ups")

        # Get CRE's assigned branch
        cre_branch = current_user.branch
        if not cre_branch:
            return []  # CRE not assigned to any branch

        # Get walk-in leads from CRE's assigned branch that are assigned to PS
        query = supabase.table('lead_master').select('*')

        # Filter by branch and source (walk-in/digital leads)
        query = query.eq('branch', cre_branch).in_('source', ['Walk-in', 'Digital', 'Google', 'Meta', 'WhatsApp', 'Car Dekho', 'Car Wale', 'OEM', 'Tele Out', 'Referral', 'Other'])

        # Only show leads that are assigned to PS (not unassigned)
        query = query.not_.is_('ps_name', 'null')

        response = query.order('created_at', desc=True).execute()

        return response.data or []

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting CRE walk-in followups: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# BACKGROUND JOB STATUS ENDPOINTS
# ========================================

@app.get("/api/jobs/{job_id}/status")
async def get_job_status(job_id: str, queue_name: str = 'lead_processing'):
    """Get status of background job for UI tracking"""
    try:
        status = background_processor.get_job_status(job_id, queue_name)
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs/queue-stats")
async def get_queue_stats():
    """Get background job queue statistics"""
    try:
        stats = background_processor.get_queue_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include optimized endpoints
# app.include_router(optimized_router)  # Commented out - optimized_router not defined

# ========================================
# WACTO WHATSAPP WEBHOOK ENDPOINTS
# ========================================

def normalize_phone_number(phone: str) -> str:
    """Normalize phone to 10-digit format"""
    if not phone:
        return ""
    digits = ''.join(filter(str.isdigit, str(phone)))
    if digits.startswith('91') and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith('0') and len(digits) == 11:
        digits = digits[1:]
    return digits[-10:] if len(digits) >= 10 else digits

@app.post("/webhook/wacto")
async def wacto_webhook(
    request: Request,
    x_webhook_signature: Optional[str] = Header(None)
):
    """
    Webhook endpoint to receive WhatsApp CTA leads from Wacto
    Source: Whatsapp | Sub-source: Wacto
    """
    try:
        # Get webhook secret from environment
        WACTO_WEBHOOK_SECRET = os.environ.get('WACTO_WEBHOOK_SECRET')
        
        # Verify webhook signature (optional but recommended)
        if WACTO_WEBHOOK_SECRET and x_webhook_signature:
            if x_webhook_signature != WACTO_WEBHOOK_SECRET:
                raise HTTPException(status_code=401, detail="Invalid webhook signature")
        
        # Parse webhook payload
        payload = await request.json()
        print(f"📩 [Wacto] Received webhook: {payload}")
        
        # Extract WhatsApp Business Account webhook structure
        if payload.get("object") != "whatsapp_business_account":
            return {"status": "ignored", "reason": "Not a WhatsApp webhook"}
        
        # Process entries
        entries = payload.get("entry", [])
        
        for entry in entries:
            changes = entry.get("changes", [])
            
            for change in changes:
                if change.get("field") != "messages":
                    continue
                
                value = change.get("value", {})
                messages = value.get("messages", [])
                contacts = value.get("contacts", [])
                metadata = value.get("metadata", {})
                
                # Process each message
                for message in messages:
                    # Extract contact info
                    contact_info = contacts[0] if contacts else {}
                    customer_name = contact_info.get("profile", {}).get("name", "Unknown")
                    whatsapp_id = contact_info.get("wa_id", "")
                    phone_number = message.get("from", "")
                    
                    # Normalize phone number
                    normalized_phone = normalize_phone_number(phone_number)
                    
                    if not normalized_phone:
                        print(f"⚠️ [Wacto] Invalid phone number: {phone_number}")
                        continue
                    
                    # Extract message details
                    message_type = message.get("type", "")
                    message_id = message.get("id", "")
                    timestamp = message.get("timestamp", "")
                    
                    # Convert timestamp to datetime
                    webhook_time = datetime.fromtimestamp(int(timestamp)) if timestamp else datetime.now()
                    
                    # Handle different message types
                    message_text = ""
                    button_payload = ""
                    referral_data = {}
                    campaign_name = "WhatsApp CTA"
                    
                    # CTA Button Response
                    if message_type == "button":
                        button_data = message.get("button", {})
                        button_payload = button_data.get("payload", "")
                        message_text = button_data.get("text", "")
                        campaign_name = f"WhatsApp CTA - {button_payload}"
                    
                    # Interactive Button Response
                    elif message_type == "interactive":
                        interactive = message.get("interactive", {})
                        interactive_type = interactive.get("type", "")
                        
                        if interactive_type == "button_reply":
                            button_reply = interactive.get("button_reply", {})
                            button_payload = button_reply.get("id", "")
                            message_text = button_reply.get("title", "")
                            campaign_name = f"WhatsApp Interactive - {button_payload}"
                        
                        elif interactive_type == "list_reply":
                            list_reply = interactive.get("list_reply", {})
                            button_payload = list_reply.get("id", "")
                            message_text = list_reply.get("title", "")
                            campaign_name = f"WhatsApp List - {button_payload}"
                    
                    # Text message with referral (Click to WhatsApp Ads)
                    elif message_type == "text":
                        text_data = message.get("text", {})
                        message_text = text_data.get("body", "")
                        
                        # Check for referral data (CTA from ads)
                        referral = message.get("referral", {})
                        if referral:
                            referral_data = {
                                "source_url": referral.get("source_url", ""),
                                "source_id": referral.get("source_id", ""),
                                "source_type": referral.get("source_type", ""),
                                "headline": referral.get("headline", ""),
                                "ctwa_clid": referral.get("ctwa_clid", "")
                            }
                            campaign_name = f"WhatsApp Ad - {referral.get('headline', 'CTA')}"
                    
                    # Store additional metadata
                    metadata_json = {
                        "whatsapp_id": whatsapp_id,
                        "message_id": message_id,
                        "message_type": message_type,
                        "message_text": message_text,
                        "button_payload": button_payload,
                        "referral_data": referral_data,
                        "webhook_timestamp": webhook_time.isoformat()
                    }
                    
                    # Check if lead already exists (by phone + source + sub_source)
                    existing = supabase.table("lead_master").select("*").eq(
                        "customer_mobile_number", normalized_phone
                    ).eq("source", "Whatsapp").eq("sub_source", "Wacto").execute()
                    
                    if existing.data:
                        print(f"⚠️ [Wacto] Lead already exists: {normalized_phone} | Source: Whatsapp | Sub-source: Wacto")
                        # Update metadata with new interaction
                        existing_lead = existing.data[0]
                        existing_metadata = existing_lead.get("metadata", {})
                        
                        # Add new message to metadata
                        if "interactions" not in existing_metadata:
                            existing_metadata["interactions"] = []
                        
                        existing_metadata["interactions"].append({
                            "timestamp": webhook_time.isoformat(),
                            "message_text": message_text,
                            "button_payload": button_payload,
                            "message_type": message_type
                        })
                        
                        update_data = {
                            "metadata": existing_metadata,
                            "updated_at": now_ist_iso()
                        }
                        
                        supabase.table("lead_master").update(update_data).eq(
                            "id", existing_lead['id']
                        ).execute()
                        
                        print(f"📝 [Wacto] Updated existing lead with new interaction: {existing_lead['uid']}")
                        continue
                    
                    # Prepare new lead data for lead_master
                    lead_data = {
                        "date": webhook_time.date().isoformat(),
                        "customer_name": customer_name,
                        "customer_mobile_number": normalized_phone,
                        "source": "Whatsapp",
                        "sub_source": "Wacto",
                        "campaign": campaign_name,
                        "assigned": "No",
                        "lead_status": "Pending",
                        "final_status": "Pending",
                        "metadata": metadata_json,
                        "created_at": now_ist_iso(),
                        "updated_at": now_ist_iso()
                    }
                    
                    # Insert into lead_master (UID auto-generated by trigger)
                    result = supabase.table("lead_master").insert(lead_data).execute()
                    
                    if result.data:
                        inserted_lead = result.data[0]
                        print(f"✅ [Wacto] New WhatsApp CTA lead: {inserted_lead['uid']} | {customer_name} | {normalized_phone}")
                        print(f"   Source: Whatsapp | Sub-source: Wacto | Campaign: {campaign_name}")
                    else:
                        print(f"❌ [Wacto] Failed to insert lead: {normalized_phone}")
        
        return {"status": "success", "message": "Webhook processed successfully"}
        
    except Exception as e:
        print(f"❌ [Wacto] Error processing webhook: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/webhook/wacto/test")
async def test_wacto_leads():
    """Test endpoint to view recent Wacto WhatsApp leads"""
    try:
        leads = supabase.table("lead_master").select(
            "uid, customer_name, customer_mobile_number, source, sub_source, campaign, lead_status, final_status, created_at"
        ).eq("source", "Whatsapp").eq("sub_source", "Wacto").order(
            "created_at", desc=True
        ).limit(10).execute()
        
        return {
            "total_leads": len(leads.data),
            "leads": leads.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/webhook/wacto/all-whatsapp")
async def test_all_whatsapp_leads():
    """Test endpoint to view ALL WhatsApp leads (any sub-source)"""
    try:
        leads = supabase.table("lead_master").select(
            "uid, customer_name, customer_mobile_number, source, sub_source, campaign, lead_status, final_status, created_at"
        ).eq("source", "Whatsapp").order(
            "created_at", desc=True
        ).limit(20).execute()
        
        return {
            "total_leads": len(leads.data),
            "leads": leads.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def require_sales_manager_or_admin():
    """Dependency to require sales_manager or admin role"""
    def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        if current_user.role not in ['sales_manager', 'admin']:
            raise HTTPException(
                status_code=403,
                detail="Access denied. Only sales managers and admins can access analytics."
            )
        return current_user
    return role_checker

@app.get("/analytics/sales-manager/ps-performance")
async def get_ps_performance_analytics(
    branch: str = Query(..., description="Branch name to filter data"),
    current_user: CurrentUser = Depends(require_sales_manager_or_admin())
):
    """
    Get PS performance analytics for a specific branch.
    This endpoint processes the data server-side for better performance and scalability.
    Requires sales_manager or admin role.
    """
    try:
        # Validate branch parameter
        if not branch or branch.strip() == "":
            raise HTTPException(status_code=400, detail="Branch parameter is required")
        
        # For sales managers, ensure they can only access their own branch data
        if current_user.role == 'sales_manager' and current_user.branch_id != branch:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. You can only view analytics for your assigned branch: {current_user.branch_id}"
            )
        
        # Get all PS followup data for the branch
        ps_data = supabase.table("ps_followup_master").select(
            "ps_name, first_call_date, final_status, created_at"
        ).eq("ps_branch", branch).execute()
        
        if not ps_data.data:
            return {
                "success": True,
                "branch": branch,
                "data": [],
                "message": f"No data found for branch: {branch}",
                "timestamp": datetime.now().isoformat(),
                "requested_by": current_user.username,
                "user_role": current_user.role
            }
        
        # Process the data server-side
        processed_data = process_ps_performance_data(ps_data.data)
        
        # Extract KPI cards data from TOTAL row
        kpi_cards = extract_kpi_cards_data(processed_data)
        
        # Extract PS rankings data
        ps_rankings = extract_ps_rankings_data(processed_data)
        
        return {
            "success": True,
            "branch": branch,
            "data": processed_data,
            "kpi_cards": kpi_cards,
            "ps_rankings": ps_rankings,
            "total_records": len(ps_data.data),
            "timestamp": datetime.now().isoformat(),
            "requested_by": current_user.username,
            "user_role": current_user.role
        }
                
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Error in PS performance analytics: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch PS performance data: {str(e)}"
        )

def process_ps_performance_data(raw_data):
    """Process PS performance data server-side for better performance"""
    ps_map = {}
    
    for row in raw_data:
        try:
            ps_name = row.get('ps_name', 'Unknown')
            first_call_date = row.get('first_call_date')
            final_status = row.get('final_status', 'Pending')
            
            if ps_name not in ps_map:
                ps_map[ps_name] = {
                    'ps_name': ps_name,
                    'lead_count': 0,
                    'unattended': 0,
                    'open_leads': 0,
                    'lost_leads': 0,
                    'approval_pending': 0,
                    'booked': 0,
                    'retailed': 0
                }
            
            ps_data = ps_map[ps_name]
            ps_data['lead_count'] += 1
            
            if not first_call_date:
                ps_data['unattended'] += 1
            elif final_status == 'Lost':
                ps_data['lost_leads'] += 1
            elif final_status == 'Waiting for Approval':
                ps_data['approval_pending'] += 1
            elif final_status == 'Booked':
                ps_data['booked'] += 1
            elif final_status == 'Won':
                ps_data['retailed'] += 1
            
            if (first_call_date and 
                final_status in ['Waiting for Approval', 'Pending']):
                ps_data['open_leads'] += 1
        except Exception as e:
            print(f"Error processing PS performance row: {str(e)}, row data: {row}")
            continue
    
    # Convert to list and add totals
    ps_list = list(ps_map.values())
    
    # Calculate totals
    totals = {
        'ps_name': 'TOTAL',
        'lead_count': sum(ps['lead_count'] for ps in ps_list),
        'unattended': sum(ps['unattended'] for ps in ps_list),
        'open_leads': sum(ps['open_leads'] for ps in ps_list),
        'lost_leads': sum(ps['lost_leads'] for ps in ps_list),
        'approval_pending': sum(ps['approval_pending'] for ps in ps_list),
        'booked': sum(ps['booked'] for ps in ps_list),
        'retailed': sum(ps['retailed'] for ps in ps_list)
    }
    
    return ps_list + [totals]

def extract_kpi_cards_data(processed_data):
    """Extract KPI cards data from the TOTAL row of PS performance data"""
    try:
        # Find the TOTAL row
        total_row = None
        for row in processed_data:
            if row.get('ps_name') == 'TOTAL':
                total_row = row
                break
        
        if not total_row:
            # Return empty KPI cards if no TOTAL row found
            return {
                "total_leads": {"value": 0, "label": "Total Leads"},
                "untouched": {"value": 0, "percentage": 0.0, "label": "Untouched"},
                "open_leads": {"value": 0, "percentage": 0.0, "label": "Open Leads"},
                "lost_leads": {"value": 0, "percentage": 0.0, "label": "Lost Leads"},
                "won_leads": {"value": 0, "percentage": 0.0, "label": "Won Leads"}
            }
        
        # Extract values from TOTAL row
        total_leads = total_row.get('lead_count', 0)
        unattended = total_row.get('unattended', 0)
        open_leads = total_row.get('open_leads', 0)
        lost_leads = total_row.get('lost_leads', 0)
        retailed = total_row.get('retailed', 0)
        
        # Calculate percentages (handle division by zero)
        def safe_percentage(numerator, denominator):
            if denominator == 0:
                return 0.0
            return round((numerator / denominator) * 100, 2)
        
        return {
            "total_leads": {
                "value": total_leads,
                "label": "Total Leads"
            },
            "untouched": {
                "value": unattended,
                "percentage": safe_percentage(unattended, total_leads),
                "label": "Untouched"
            },
            "open_leads": {
                "value": open_leads,
                "percentage": safe_percentage(open_leads, total_leads),
                "label": "Open Leads"
            },
            "lost_leads": {
                "value": lost_leads,
                "percentage": safe_percentage(lost_leads, total_leads),
                "label": "Lost Leads"
            },
            "won_leads": {
                "value": retailed,
                "percentage": safe_percentage(retailed, total_leads),
                "label": "Won Leads"
            }
        }
        
    except Exception as e:
        print(f"Error extracting KPI cards data: {str(e)}")
        # Return empty KPI cards on error
        return {
            "total_leads": {"value": 0, "label": "Total Leads"},
            "untouched": {"value": 0, "percentage": 0.0, "label": "Untouched"},
            "open_leads": {"value": 0, "percentage": 0.0, "label": "Open Leads"},
            "lost_leads": {"value": 0, "percentage": 0.0, "label": "Lost Leads"},
            "won_leads": {"value": 0, "percentage": 0.0, "label": "Won Leads"}
        }

def extract_ps_rankings_data(processed_data):
    """Extract PS rankings data based on Won leads (Retailed) and Booked leads as tiebreaker"""
    try:
        # Filter out the TOTAL row and get only PS data
        ps_data = [row for row in processed_data if row.get('ps_name') != 'TOTAL']
        
        if not ps_data:
            return []
        
        # Sort PS by Won leads (retailed) descending, then by Booked leads descending as tiebreaker
        sorted_ps = sorted(ps_data, key=lambda x: (-x.get('retailed', 0), -x.get('booked', 0)))
        
        # Create rankings with rank numbers
        rankings = []
        for i, ps in enumerate(sorted_ps, 1):
            rankings.append({
                "rank": i,
                "ps_name": ps.get('ps_name', ''),
                "won_leads": ps.get('retailed', 0),
                "booked_leads": ps.get('booked', 0)
            })
        
        return rankings
        
    except Exception as e:
        print(f"Error extracting PS rankings data: {str(e)}")
        return []

@app.get("/analytics/sales-manager/lead-conversion")
async def get_lead_conversion_analytics(
    branch: str = Query(..., description="Branch name to filter data"),
    current_user: CurrentUser = Depends(require_sales_manager_or_admin())
):
    """
    Get lead conversion analytics for a specific branch.
    Shows conversion rates and funnel metrics.
    Requires sales_manager or admin role.
    """
    try:
        # Validate branch parameter
        if not branch or branch.strip() == "":
            raise HTTPException(status_code=400, detail="Branch parameter is required")
        
        # For sales managers, ensure they can only access their own branch data
        if current_user.role == 'sales_manager' and current_user.branch_id != branch:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. You can only view analytics for your assigned branch: {current_user.branch_id}"
            )
        
        # Get lead conversion data
        conversion_data = supabase.table("ps_followup_master").select(
            "ps_name, final_status, created_at, first_call_date"
        ).eq("ps_branch", branch).execute()
        
        if not conversion_data.data:
            return {
                "success": True,
                "branch": branch,
                "data": [],
                "message": f"No conversion data found for branch: {branch}",
                "timestamp": datetime.now().isoformat(),
                "requested_by": current_user.username,
                "user_role": current_user.role
            }
        
        # Process conversion data
        processed_data = process_lead_conversion_data(conversion_data.data)
        
        return {
            "success": True,
            "branch": branch,
            "data": processed_data,
            "total_records": len(conversion_data.data),
            "timestamp": datetime.now().isoformat(),
            "requested_by": current_user.username,
            "user_role": current_user.role
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in lead conversion analytics: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch lead conversion data: {str(e)}"
        )

def process_lead_conversion_data(raw_data):
    """Process lead conversion data for analytics"""
    ps_conversions = {}
    
    for row in raw_data:
        ps_name = row['ps_name']
        if ps_name not in ps_conversions:
            ps_conversions[ps_name] = {
                'ps_name': ps_name,
                'total_leads': 0,
                'converted_leads': 0,
                'conversion_rate': 0.0,
                'avg_conversion_time': 0
            }
        
        ps_data = ps_conversions[ps_name]
        ps_data['total_leads'] += 1
        
        if row['final_status'] in ['Booked', 'Won']:
            ps_data['converted_leads'] += 1
            
            # Calculate conversion time if both dates exist
            if row['first_call_date'] and row['created_at']:
                try:
                    call_date = datetime.fromisoformat(row['first_call_date'].replace('Z', '+00:00'))
                    created_date = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))
                    conversion_time = (call_date - created_date).days
                    ps_data['avg_conversion_time'] += conversion_time
                except:
                    pass
    
    # Calculate conversion rates and average times
    for ps_data in ps_conversions.values():
        if ps_data['total_leads'] > 0:
            ps_data['conversion_rate'] = (ps_data['converted_leads'] / ps_data['total_leads']) * 100
        if ps_data['converted_leads'] > 0:
            ps_data['avg_conversion_time'] = ps_data['avg_conversion_time'] / ps_data['converted_leads']
    
    return list(ps_conversions.values())

@app.get("/analytics/sales-manager/branch-summary")
async def get_branch_summary_analytics(
    branch: str = Query(..., description="Branch name to filter data"),
    current_user: CurrentUser = Depends(require_sales_manager_or_admin())
):
    """
    Get comprehensive branch summary analytics.
    High-level metrics for the entire branch.
    Requires sales_manager or admin role.
    """
    try:
        # Validate branch parameter
        if not branch or branch.strip() == "":
            raise HTTPException(status_code=400, detail="Branch parameter is required")
        
        # For sales managers, ensure they can only access their own branch data
        if current_user.role == 'sales_manager' and current_user.branch_id != branch:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. You can only view analytics for your assigned branch: {current_user.branch_id}"
            )
        
        # Get comprehensive branch data
        branch_data = supabase.table("ps_followup_master").select(
            "ps_name, final_status, created_at, first_call_date, ps_branch"
        ).eq("ps_branch", branch).execute()
        
        if not branch_data.data:
            return {
                "success": True,
                "branch": branch,
                "data": {
                    "total_leads": 0,
                    "total_ps": 0,
                    "conversion_rate": 0.0,
                    "avg_response_time": 0.0,
                    "status_distribution": {}
                },
                "message": f"No data found for branch: {branch}",
                "timestamp": datetime.now().isoformat(),
                "requested_by": current_user.username,
                "user_role": current_user.role
            }
        
        # Process branch summary
        summary = process_branch_summary_data(branch_data.data)
        
        return {
            "success": True,
            "branch": branch,
            "data": summary,
            "total_records": len(branch_data.data),
            "timestamp": datetime.now().isoformat(),
            "requested_by": current_user.username,
            "user_role": current_user.role
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in branch summary analytics: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch branch summary: {str(e)}"
        )

def process_branch_summary_data(raw_data):
    """Process branch summary data for high-level analytics"""
    total_leads = len(raw_data)
    unique_ps = len(set(row['ps_name'] for row in raw_data))
    
    # Status distribution
    status_counts = {}
    for row in raw_data:
        status = row['final_status']
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Calculate conversion rate
    converted = status_counts.get('Booked', 0) + status_counts.get('Won', 0)
    conversion_rate = (converted / total_leads * 100) if total_leads > 0 else 0
    
    # Calculate average response time
    response_times = []
    for row in raw_data:
        if row['first_call_date'] and row['created_at']:
            try:
                call_date = datetime.fromisoformat(row['first_call_date'].replace('Z', '+00:00'))
                created_date = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))
                response_time = (call_date - created_date).days
                response_times.append(response_time)
            except:
                pass
    
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    
    return {
        "total_leads": total_leads,
        "total_ps": unique_ps,
        "conversion_rate": round(conversion_rate, 2),
        "avg_response_time": round(avg_response_time, 1),
        "status_distribution": status_counts
    }

@app.get("/analytics/sales-manager/source-analytics")
async def get_source_analytics(
    branch: str = Query(..., description="Branch name to filter data"),
    current_user: CurrentUser = Depends(require_sales_manager_or_admin())
):
    """
    Get hierarchical source analytics for a specific branch.
    Shows main sources and their sub-sources with counts, won leads, and conversion rates.
    Requires sales_manager or admin role.
    """
    try:
        # Validate branch parameter
        if not branch or branch.strip() == "":
            raise HTTPException(status_code=400, detail="Branch parameter is required")

        # For sales managers, ensure they can only access their own branch data
        if current_user.role == 'sales_manager' and current_user.branch_id != branch:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. You can only view analytics for your assigned branch: {current_user.branch_id}"
            )

        # Get all source data for the branch
        source_data = supabase.table("ps_followup_master").select(
            "source, sub_source, final_status"
        ).eq("ps_branch", branch).execute()

        if not source_data.data:
            return {
                "success": True,
                "branch": branch,
                "data": [],
                "message": f"No source data found for branch: {branch}",
                "timestamp": datetime.now().isoformat(),
                "requested_by": current_user.username,
                "user_role": current_user.role
            }

        # Process the data to create hierarchical structure
        processed_data = process_source_analytics_data(source_data.data)

        return {
            "success": True,
            "branch": branch,
            "data": processed_data,
            "total_records": len(source_data.data),
            "timestamp": datetime.now().isoformat(),
            "requested_by": current_user.username,
            "user_role": current_user.role
        }

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Error in source analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch source analytics data: {str(e)}"
        )

def process_source_analytics_data(raw_data):
    """Process source analytics data to create hierarchical structure"""
    # First, collect all unique sources and their sub-sources
    source_map = {}
    
    for row in raw_data:
        source = row.get('source', 'Unknown')
        sub_source = row.get('sub_source', 'Unknown')
        final_status = row.get('final_status', 'Unknown')
        
        # Initialize source if not exists
        if source not in source_map:
            source_map[source] = {
                'source': source,
                'count': 0,
                'won': 0,
                'sub_sources': {}
            }
        
        # Count total leads for this source
        source_map[source]['count'] += 1
        
        # Count won leads for this source
        if final_status == 'Won':
            source_map[source]['won'] += 1
        
        # Initialize sub-source if not exists
        if sub_source not in source_map[source]['sub_sources']:
            source_map[source]['sub_sources'][sub_source] = {
                'sub_source': sub_source,
                'count': 0,
                'won': 0
            }
        
        # Count total leads for this sub-source
        source_map[source]['sub_sources'][sub_source]['count'] += 1
        
        # Count won leads for this sub-source
        if final_status == 'Won':
            source_map[source]['sub_sources'][sub_source]['won'] += 1
    
    # Convert to hierarchical list format
    hierarchical_data = []
    
    for source_name, source_data in source_map.items():
        # Add main source row
        conversion_rate = (source_data['won'] / source_data['count'] * 100) if source_data['count'] > 0 else 0
        
        hierarchical_data.append({
            'source': source_name,
            'count': source_data['count'],
            'won': source_data['won'],
            'conversion_percentage': round(conversion_rate, 2),
            'is_main_source': True
        })
        
        # Add sub-source rows
        for sub_source_name, sub_source_data in source_data['sub_sources'].items():
            sub_conversion_rate = (sub_source_data['won'] / sub_source_data['count'] * 100) if sub_source_data['count'] > 0 else 0
            
            hierarchical_data.append({
                'source': sub_source_name,
                'count': sub_source_data['count'],
                'won': sub_source_data['won'],
                'conversion_percentage': round(sub_conversion_rate, 2),
                'is_main_source': False,
                'parent_source': source_name
            })
    
    return hierarchical_data

@app.get("/analytics/sales-manager/tl-performance")
async def get_tl_performance_analytics(
    branch: str = Query(..., description="Branch name to filter data"),
    current_user: CurrentUser = Depends(require_sales_manager_or_admin())
):
    """
    Get Team Leader performance analytics for a specific branch.
    Shows team leaders and their PS performance metrics.
    Requires sales_manager or admin role.
    """
    try:
        # Validate branch parameter
        if not branch or branch.strip() == "":
            raise HTTPException(status_code=400, detail="Branch parameter is required")

        # For sales managers, ensure they can only access their own branch data
        if current_user.role == 'sales_manager' and current_user.branch_id != branch:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. You can only view analytics for your assigned branch: {current_user.branch_id}"
            )

        # Get all PS followup data for the branch
        ps_data = supabase.table("ps_followup_master").select(
            "ps_name, first_call_date, final_status, created_at"
        ).eq("ps_branch", branch).execute()

        if not ps_data.data:
            return {
                "success": True,
                "branch": branch,
                "data": [],
                "message": f"No data found for branch: {branch}",
                "timestamp": datetime.now().isoformat(),
                "requested_by": current_user.username,
                "user_role": current_user.role
            }

        # Get all team leaders for this branch
        team_leaders_data = supabase.table("users").select(
            "id, username"
        ).eq("branch", branch).eq("role", "team_leader").execute()

        print(f"DEBUG: Found {len(team_leaders_data.data) if team_leaders_data.data else 0} team leaders for branch {branch}")
        if team_leaders_data.data:
            print(f"DEBUG: Team leaders: {[tl.get('username') for tl in team_leaders_data.data]}")

        # Get PS users with their team leader assignments
        users_data = supabase.table("users").select(
            "username, full_name, team_leader_id"
        ).eq("branch", branch).execute()

        # Create ID to Team Leader name mapping
        tl_id_to_name_map = {}
        if team_leaders_data.data:
            for tl in team_leaders_data.data:
                tl_id_to_name_map[tl.get('id')] = tl.get('username')

        # Create PS to Team Leader mapping using full_name
        ps_to_tl_map = {}
        if users_data.data:
            for user in users_data.data:
                ps_username = user.get('username')
                ps_full_name = user.get('full_name')
                team_leader_id = user.get('team_leader_id')
                if ps_full_name and team_leader_id:
                    team_leader_name = tl_id_to_name_map.get(team_leader_id, f"Unknown TL ({team_leader_id})")
                    # Map both username and full_name to team leader
                    ps_to_tl_map[ps_username] = team_leader_name
                    ps_to_tl_map[ps_full_name] = team_leader_name

        print(f"DEBUG: PS to TL mapping: {ps_to_tl_map}")
        print(f"DEBUG: Sample PS data: {ps_data.data[:3] if ps_data.data else 'No data'}")

        # Process the data server-side - pass all team leaders and PS data
        processed_data = process_tl_performance_data(ps_data.data, ps_to_tl_map, team_leaders_data.data)

        return {
            "success": True,
            "branch": branch,
            "data": processed_data,
            "total_records": len(ps_data.data),
            "timestamp": datetime.now().isoformat(),
            "requested_by": current_user.username,
            "user_role": current_user.role
        }

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Error in TL performance analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch TL performance data: {str(e)}"
        )

def process_tl_performance_data(raw_data, ps_to_tl_map, team_leaders_data):
    """Process TL performance data server-side for better performance"""
    tl_map = {}

    # Process PS data and assign to team leaders
    for row in raw_data:
        try:
            ps_name = row.get('ps_name', 'Unknown')
            team_leader = ps_to_tl_map.get(ps_name, 'Unassigned Team Leader')
            first_call_date = row.get('first_call_date')
            final_status = row.get('final_status', 'Pending')
            
            print(f"DEBUG: Processing PS '{ps_name}' -> Team Leader: '{team_leader}'")
            
            # If team leader not in our list, add them
            if team_leader not in tl_map:
                tl_map[team_leader] = {
                    'tl_name': team_leader,
                    'lead_count': 0,
                    'unattended': 0,
                    'open_leads': 0,
                    'lost_leads': 0,
                    'approval_pending': 0,
                    'booked': 0,
                    'retailed': 0
                }

            tl_data = tl_map[team_leader]
            tl_data['lead_count'] += 1

            if not first_call_date:
                tl_data['unattended'] += 1
            elif final_status == 'Lost':
                tl_data['lost_leads'] += 1
            elif final_status == 'Waiting for Approval':
                tl_data['approval_pending'] += 1
            elif final_status == 'Booked':
                tl_data['booked'] += 1
            elif final_status == 'Won':
                tl_data['retailed'] += 1

            if (first_call_date and
                final_status in ['Waiting for Approval', 'Pending']):
                tl_data['open_leads'] += 1
        except Exception as e:
            print(f"Error processing TL performance row: {str(e)}, row data: {row}")
            continue

    # Convert to list and add totals
    tl_list = list(tl_map.values())
    
    print(f"DEBUG: Final TL list has {len(tl_list)} entries: {[tl['tl_name'] for tl in tl_list]}")

    # Calculate totals
    totals = {
        'tl_name': 'TOTAL',
        'lead_count': sum(tl['lead_count'] for tl in tl_list),
        'unattended': sum(tl['unattended'] for tl in tl_list),
        'open_leads': sum(tl['open_leads'] for tl in tl_list),
        'lost_leads': sum(tl['lost_leads'] for tl in tl_list),
        'approval_pending': sum(tl['approval_pending'] for tl in tl_list),
        'booked': sum(tl['booked'] for tl in tl_list),
        'retailed': sum(tl['retailed'] for tl in tl_list)
    }

    return tl_list + [totals]

@app.get("/analytics/health")
async def analytics_health_check():
    """
    Health check endpoint for analytics service.
    """
    try:
        # Test database connection
        test_query = supabase.table("ps_followup_master").select("ps_name").limit(1).execute()
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat(),
            "service": "analytics-api"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
            "service": "analytics-api"
        }

JWT_SECRET = config('JWT_SECRET', default=os.environ.get('JWT_SECRET', 'your-jwt-secret-key-here'))
JWT_ALGORITHM = config('JWT_ALGORITHM', default=os.environ.get('JWT_ALGORITHM', 'HS256'))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
