"""
Pydantic schemas for API serialization
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

# Lead schemas
class LeadBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    status_id: Optional[int] = None
    source_id: Optional[int] = None
    value: Optional[Decimal] = None
    probability: Optional[int] = None
    expected_close_date: Optional[date] = None
    notes: Optional[str] = None

class LeadCreate(LeadBase):
    assigned_to: Optional[int] = None

class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    status_id: Optional[int] = None
    source_id: Optional[int] = None
    value: Optional[Decimal] = None
    probability: Optional[int] = None
    expected_close_date: Optional[date] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None

class Lead(LeadBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: int
    assigned_to: Optional[int] = None
    
    class Config:
        from_attributes = True

# Contact schemas
class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    company_id: Optional[int] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None

class ContactCreate(ContactBase):
    assigned_to: Optional[int] = None

class Contact(ContactBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: int
    assigned_to: Optional[int] = None
    
    class Config:
        from_attributes = True

# Company schemas
class CompanyBase(BaseModel):
    name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class Company(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: int
    
    class Config:
        from_attributes = True

# Activity schemas
class ActivityBase(BaseModel):
    title: str
    description: Optional[str] = None
    activity_type: str
    status: str = "pending"
    priority: str = "medium"
    due_date: Optional[datetime] = None
    lead_id: Optional[int] = None
    contact_id: Optional[int] = None
    company_id: Optional[int] = None

class ActivityCreate(ActivityBase):
    assigned_to: Optional[int] = None

class Activity(ActivityBase):
    id: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: int
    assigned_to: Optional[int] = None
    
    class Config:
        from_attributes = True

# Lead Status schemas
class LeadStatus(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: str = "#6B7280"
    order_index: int = 0
    is_active: bool = True
    
    class Config:
        from_attributes = True

# Lead Source schemas
class LeadSource(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool = True
    
    class Config:
        from_attributes = True
