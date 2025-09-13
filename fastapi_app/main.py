"""
FastAPI application for CRM backend services
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from datetime import datetime, timedelta

from . import models, schemas, database
from .auth import verify_token, get_current_user
from .database import get_db

# Create FastAPI app
app = FastAPI(
    title="EPIC CRM API",
    description="FastAPI backend for CRM system",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

@app.on_event("startup")
async def startup_event():
    """Initialize database tables"""
    models.Base.metadata.create_all(bind=database.engine)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Lead endpoints
@app.get("/api/leads/", response_model=List[schemas.Lead])
async def get_leads(
    skip: int = 0,
    limit: int = 100,
    status_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all leads with optional filtering"""
    query = db.query(models.Lead)
    
    if status_id:
        query = query.filter(models.Lead.status_id == status_id)
    if assigned_to:
        query = query.filter(models.Lead.assigned_to == assigned_to)
    
    # Role-based filtering
    if not current_user.get('is_superuser') and not current_user.get('is_staff'):
        # Regular users can only see their assigned leads
        query = query.filter(models.Lead.assigned_to == current_user['id'])
    
    leads = query.offset(skip).limit(limit).all()
    return leads

@app.post("/api/leads/", response_model=schemas.Lead)
async def create_lead(
    lead: schemas.LeadCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new lead"""
    db_lead = models.Lead(
        **lead.dict(),
        created_by=current_user['id'],
        assigned_to=lead.assigned_to or current_user['id']
    )
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead

@app.get("/api/leads/{lead_id}", response_model=schemas.Lead)
async def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific lead by ID"""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check permissions
    if not current_user.get('is_superuser') and not current_user.get('is_staff'):
        if lead.assigned_to != current_user['id'] and lead.created_by != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return lead

@app.put("/api/leads/{lead_id}", response_model=schemas.Lead)
async def update_lead(
    lead_id: int,
    lead_update: schemas.LeadUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a lead"""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check permissions
    if not current_user.get('is_superuser') and not current_user.get('is_staff'):
        if lead.assigned_to != current_user['id'] and lead.created_by != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Update fields
    for field, value in lead_update.dict(exclude_unset=True).items():
        setattr(lead, field, value)
    
    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return lead

@app.delete("/api/leads/{lead_id}")
async def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete a lead"""
    lead = db.query(models.Lead).filter(models.Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    # Check permissions - only admins or lead creator can delete
    if not current_user.get('is_superuser'):
        if lead.created_by != current_user['id']:
            raise HTTPException(status_code=403, detail="Access denied")
    
    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted successfully"}

# Contact endpoints
@app.get("/api/contacts/", response_model=List[schemas.Contact])
async def get_contacts(
    skip: int = 0,
    limit: int = 100,
    company_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all contacts with optional filtering"""
    query = db.query(models.Contact)
    
    if company_id:
        query = query.filter(models.Contact.company_id == company_id)
    
    # Role-based filtering
    if not current_user.get('is_superuser') and not current_user.get('is_staff'):
        query = query.filter(models.Contact.assigned_to == current_user['id'])
    
    contacts = query.offset(skip).limit(limit).all()
    return contacts

@app.post("/api/contacts/", response_model=schemas.Contact)
async def create_contact(
    contact: schemas.ContactCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new contact"""
    db_contact = models.Contact(
        **contact.dict(),
        created_by=current_user['id'],
        assigned_to=contact.assigned_to or current_user['id']
    )
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

# Company endpoints
@app.get("/api/companies/", response_model=List[schemas.Company])
async def get_companies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all companies"""
    companies = db.query(models.Company).offset(skip).limit(limit).all()
    return companies

@app.post("/api/companies/", response_model=schemas.Company)
async def create_company(
    company: schemas.CompanyCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new company"""
    db_company = models.Company(
        **company.dict(),
        created_by=current_user['id']
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

# Activity endpoints
@app.get("/api/activities/", response_model=List[schemas.Activity])
async def get_activities(
    skip: int = 0,
    limit: int = 100,
    lead_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get activities with optional filtering"""
    query = db.query(models.Activity)
    
    if lead_id:
        query = query.filter(models.Activity.lead_id == lead_id)
    if contact_id:
        query = query.filter(models.Activity.contact_id == contact_id)
    
    # Role-based filtering
    if not current_user.get('is_superuser') and not current_user.get('is_staff'):
        query = query.filter(models.Activity.assigned_to == current_user['id'])
    
    activities = query.offset(skip).limit(limit).all()
    return activities

@app.post("/api/activities/", response_model=schemas.Activity)
async def create_activity(
    activity: schemas.ActivityCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new activity"""
    db_activity = models.Activity(
        **activity.dict(),
        created_by=current_user['id'],
        assigned_to=activity.assigned_to or current_user['id']
    )
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity

# Lead status endpoints
@app.get("/api/lead-statuses/", response_model=List[schemas.LeadStatus])
async def get_lead_statuses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lead statuses"""
    statuses = db.query(models.LeadStatus).filter(models.LeadStatus.is_active == True).order_by(models.LeadStatus.order_index).all()
    return statuses

# Lead source endpoints
@app.get("/api/lead-sources/", response_model=List[schemas.LeadSource])
async def get_lead_sources(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all lead sources"""
    sources = db.query(models.LeadSource).filter(models.LeadSource.is_active == True).all()
    return sources

# Dashboard analytics endpoints
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard statistics"""
    # Base queries
    leads_query = db.query(models.Lead)
    contacts_query = db.query(models.Contact)
    activities_query = db.query(models.Activity)
    
    # Apply role-based filtering
    if not current_user.get('is_superuser') and not current_user.get('is_staff'):
        leads_query = leads_query.filter(models.Lead.assigned_to == current_user['id'])
        contacts_query = contacts_query.filter(models.Contact.assigned_to == current_user['id'])
        activities_query = activities_query.filter(models.Activity.assigned_to == current_user['id'])
    
    # Calculate stats
    total_leads = leads_query.count()
    total_contacts = contacts_query.count()
    total_activities = activities_query.count()
    
    # Leads by status
    leads_by_status = db.query(
        models.LeadStatus.name,
        db.func.count(models.Lead.id).label('count')
    ).join(models.Lead).group_by(models.LeadStatus.name).all()
    
    # Recent activities
    recent_activities = activities_query.order_by(models.Activity.created_at.desc()).limit(5).all()
    
    return {
        "total_leads": total_leads,
        "total_contacts": total_contacts,
        "total_activities": total_activities,
        "leads_by_status": [{"status": status, "count": count} for status, count in leads_by_status],
        "recent_activities": recent_activities
    }
