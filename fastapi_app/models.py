"""
SQLAlchemy models for CRM system
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Numeric, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(254))
    phone = Column(String(20))
    company = Column(String(255))
    job_title = Column(String(100))
    status_id = Column(Integer, ForeignKey("lead_statuses.id"))
    source_id = Column(Integer, ForeignKey("lead_sources.id"))
    value = Column(Numeric(12, 2))
    probability = Column(Integer)
    expected_close_date = Column(Date)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("auth_user.id"))
    assigned_to = Column(Integer, ForeignKey("auth_user.id"))
    
    # Relationships
    status = relationship("LeadStatus", back_populates="leads")
    source = relationship("LeadSource", back_populates="leads")
    activities = relationship("Activity", back_populates="lead")

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(254))
    phone = Column(String(20))
    mobile = Column(String(20))
    job_title = Column(String(100))
    company_id = Column(Integer, ForeignKey("companies.id"))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("auth_user.id"))
    assigned_to = Column(Integer, ForeignKey("auth_user.id"))
    
    # Relationships
    company = relationship("Company", back_populates="contacts")
    activities = relationship("Activity", back_populates="contact")

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    industry = Column(String(100))
    website = Column(String(255))
    phone = Column(String(20))
    email = Column(String(254))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100))
    postal_code = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("auth_user.id"))
    
    # Relationships
    contacts = relationship("Contact", back_populates="company")
    activities = relationship("Activity", back_populates="company")

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    activity_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")
    priority = Column(String(10), default="medium")
    due_date = Column(DateTime)
    completed_at = Column(DateTime)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("auth_user.id"))
    assigned_to = Column(Integer, ForeignKey("auth_user.id"))
    
    # Relationships
    lead = relationship("Lead", back_populates="activities")
    contact = relationship("Contact", back_populates="activities")
    company = relationship("Company", back_populates="activities")

class LeadStatus(Base):
    __tablename__ = "lead_statuses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#6B7280")
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    leads = relationship("Lead", back_populates="status")

class LeadSource(Base):
    __tablename__ = "lead_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    leads = relationship("Lead", back_populates="source")

class Opportunity(Base):
    __tablename__ = "opportunities"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    value = Column(Numeric(12, 2), nullable=False)
    probability = Column(Integer)
    stage = Column(String(50), nullable=False)
    expected_close_date = Column(Date)
    actual_close_date = Column(Date)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("auth_user.id"))
    assigned_to = Column(Integer, ForeignKey("auth_user.id"))

class Communication(Base):
    __tablename__ = "communications"
    
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(255))
    content = Column(Text)
    communication_type = Column(String(20), nullable=False)
    direction = Column(String(10), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    contact_id = Column(Integer, ForeignKey("contacts.id"))
    company_id = Column(Integer, ForeignKey("companies.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("auth_user.id"))
