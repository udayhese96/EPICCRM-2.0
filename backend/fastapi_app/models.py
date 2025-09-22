from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    admin = "admin"
    branch_head = "branch_head"
    cre_team_leader = "cre_team_leader"
    cre_icrop = "cre_icrop"
    cre = "cre"
    ps = "ps"
    receptionist = "receptionist"

class LeadStatus(str, Enum):
    new = "new"
    contacted = "contacted"
    qualified = "qualified"
    proposal = "proposal"
    negotiation = "negotiation"
    closed_won = "closed_won"
    closed_lost = "closed_lost"

class LeadSource(str, Enum):
    website = "website"
    referral = "referral"
    social_media = "social_media"
    advertisement = "advertisement"
    cold_call = "cold_call"
    walk_in = "walk_in"

# User models
class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: Optional[str] = ""
    last_name: Optional[str] = ""
    role: UserRole
    phone: Optional[str] = None
    branch_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None  # Added username field
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    phone: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: str
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# Authentication models
class LoginRequest(BaseModel):
    username: str  # Changed from email to username for login
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# Branch models
class BranchBase(BaseModel):
    name: str
    code: str
    address: str
    city: str
    state: str
    pincode: str
    phone: str
    email: EmailStr

class BranchCreate(BranchBase):
    pass

class BranchResponse(BranchBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

class ActivityType(str, Enum):
    call = "call"
    email = "email"
    meeting = "meeting"
    note = "note"
    task = "task"

# Lead models
class LeadBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    company: Optional[str] = None
    source: LeadSource = LeadSource.website
    notes: Optional[str] = None
    expected_value: Optional[float] = None

class LeadCreate(LeadBase):
    assigned_to: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[LeadStatus] = None
    source: Optional[LeadSource] = None
    notes: Optional[str] = None
    expected_value: Optional[float] = None
    assigned_to: Optional[str] = None
    # Follow-up fields
    followup_note: Optional[str] = None
    first_remark: Optional[str] = None
    # Additional fields for comprehensive lead updates
    model_interested: Optional[str] = None
    variant: Optional[str] = None
    lead_category: Optional[str] = None
    buying_plan: Optional[str] = None
    finance_option: Optional[str] = None
    profession: Optional[str] = None
    test_drive_type: Optional[str] = None
    trade_in: Optional[str] = None
    trade_in_make: Optional[str] = None
    trade_in_model: Optional[str] = None
    trade_in_year: Optional[str] = None
    trade_in_km: Optional[str] = None
    trade_in_ownership: Optional[str] = None
    customer_location: Optional[str] = None
    follow_up_date: Optional[str] = None
    final_status: Optional[str] = None

class LeadResponse(LeadBase):
    id: str
    status: LeadStatus
    assigned_to: Optional[str] = None
    branch_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class LeadListResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    phone: str
    company: Optional[str] = None
    status: LeadStatus
    source: LeadSource
    expected_value: Optional[float] = None
    assigned_to: Optional[str] = None
    branch_id: Optional[str] = None
    activities_count: int = 0
    last_activity: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

# Activity models
class ActivityBase(BaseModel):
    activity_type: ActivityType
    subject: str
    description: str
    scheduled_at: Optional[datetime] = None

class ActivityCreate(ActivityBase):
    pass

class ActivityUpdate(BaseModel):
    activity_type: Optional[ActivityType] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class ActivityResponse(ActivityBase):
    id: str
    lead_id: str
    user_id: str
    completed_at: Optional[datetime] = None
    created_at: datetime

# Bulk operations
class BulkAssignRequest(BaseModel):
    lead_ids: List[str]
    assigned_to: str

class BulkStatusUpdateRequest(BaseModel):
    lead_ids: List[str]
    status: LeadStatus

# Statistics models
class LeadStatistics(BaseModel):
    total_leads: int
    new_leads: int
    qualified_leads: int
    closed_won: int
    closed_lost: int
    conversion_rate: float
    status_distribution: List[dict]
    source_distribution: List[dict]
    monthly_trends: List[dict]
