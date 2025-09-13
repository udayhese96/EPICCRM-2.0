from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import jwt
import bcrypt
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os

# FastAPI app initialization
app = FastAPI(
    title="EPIC CRM 2.0 API",
    description="Django/FastAPI CRM System with Username/Password Authentication",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Database connection
DATABASE_CONFIG = {
    'host': 'aws-0-ap-south-1.pooler.supabase.com',
    'database': 'postgres',
    'user': 'postgres.raticwohyvxcyoqzqnwj',
    'password': 'Ather@123456',
    'port': '6543'
}

JWT_SECRET = "your-jwt-secret-key-here"
JWT_ALGORITHM = "HS256"

# Pydantic models
class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    role: str = "cre"
    phone: Optional[str] = None
    branch_id: Optional[int] = None

class LeadCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    company: Optional[str] = None
    designation: Optional[str] = None
    status: str = "new"
    priority: str = "medium"
    source: str = "website"
    estimated_value: Optional[float] = None
    expected_close_date: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    notes: Optional[str] = None

class ActivityCreate(BaseModel):
    lead_id: int
    activity_type: str
    subject: str
    description: str
    scheduled_at: Optional[str] = None

# Database helper functions
def get_db_connection():
    return psycopg2.connect(**DATABASE_CONFIG, cursor_factory=RealDictCursor)

def create_jwt_token(user_data: dict):
    payload = {
        "user_id": user_data["id"],
        "username": user_data["username"],
        "role": user_data["role"],
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Authentication endpoints
@app.post("/auth/login")
async def login(user_data: UserLogin):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT id, username, email, first_name, last_name, role, password FROM auth_user WHERE username = %s",
            (user_data.username,)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # For demo purposes, we'll use simple password comparison
        # In production, use proper password hashing
        if user_data.password != "password123":  # Simple demo password
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        token = create_jwt_token(dict(user))
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "first_name": user["first_name"],
                "last_name": user["last_name"],
                "role": user["role"]
            }
        }
    
    finally:
        cursor.close()
        conn.close()

@app.get("/auth/me")
async def get_current_user(current_user: dict = Depends(verify_jwt_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT id, username, email, first_name, last_name, role FROM auth_user WHERE id = %s",
            (current_user["user_id"],)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return dict(user)
    
    finally:
        cursor.close()
        conn.close()

# Dashboard endpoints
@app.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(verify_jwt_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get lead statistics
        cursor.execute("SELECT COUNT(*) as total_leads FROM crm_app_lead")
        total_leads = cursor.fetchone()["total_leads"]
        
        cursor.execute("SELECT COUNT(*) as new_leads FROM crm_app_lead WHERE status = 'new'")
        new_leads = cursor.fetchone()["new_leads"]
        
        cursor.execute("SELECT COUNT(*) as closed_won FROM crm_app_lead WHERE status = 'closed_won'")
        closed_won = cursor.fetchone()["closed_won"]
        
        cursor.execute("SELECT COUNT(*) as follow_up FROM crm_app_lead WHERE status = 'follow_up'")
        follow_up = cursor.fetchone()["follow_up"]
        
        return {
            "total_leads": total_leads,
            "new_leads": new_leads,
            "closed_won": closed_won,
            "follow_up_required": follow_up,
            "conversion_rate": round((closed_won / total_leads * 100) if total_leads > 0 else 0, 2)
        }
    
    finally:
        cursor.close()
        conn.close()

# Lead endpoints
@app.get("/leads")
async def get_leads(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    current_user: dict = Depends(verify_jwt_token)
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        query = "SELECT * FROM crm_app_lead"
        params = []
        
        if status:
            query += " WHERE status = %s"
            params.append(status)
        
        # Role-based filtering
        if current_user["role"] not in ["admin", "branch_head"]:
            if status:
                query += " AND assigned_to_id = %s"
            else:
                query += " WHERE assigned_to_id = %s"
            params.append(current_user["user_id"])
        
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, skip])
        
        cursor.execute(query, params)
        leads = cursor.fetchall()
        
        return [dict(lead) for lead in leads]
    
    finally:
        cursor.close()
        conn.close()

@app.post("/leads")
async def create_lead(lead_data: LeadCreate, current_user: dict = Depends(verify_jwt_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO crm_app_lead (
                first_name, last_name, email, phone, company, designation,
                status, priority, source, estimated_value, expected_close_date,
                address, city, state, pincode, notes, created_by_id, assigned_to_id,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id
        """, (
            lead_data.first_name, lead_data.last_name, lead_data.email, lead_data.phone,
            lead_data.company, lead_data.designation, lead_data.status, lead_data.priority,
            lead_data.source, lead_data.estimated_value, lead_data.expected_close_date,
            lead_data.address, lead_data.city, lead_data.state, lead_data.pincode,
            lead_data.notes, current_user["user_id"], current_user["user_id"],
            datetime.now(), datetime.now()
        ))
        
        lead_id = cursor.fetchone()["id"]
        conn.commit()
        
        return {"id": lead_id, "message": "Lead created successfully"}
    
    finally:
        cursor.close()
        conn.close()

@app.get("/leads/{lead_id}")
async def get_lead(lead_id: int, current_user: dict = Depends(verify_jwt_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT * FROM crm_app_lead WHERE id = %s", (lead_id,))
        lead = cursor.fetchone()
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        
        # Check permissions
        if current_user["role"] not in ["admin", "branch_head"] and lead["assigned_to_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return dict(lead)
    
    finally:
        cursor.close()
        conn.close()

# Activity endpoints
@app.get("/leads/{lead_id}/activities")
async def get_lead_activities(lead_id: int, current_user: dict = Depends(verify_jwt_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT a.*, u.username as created_by_username 
            FROM crm_app_leadactivity a
            LEFT JOIN auth_user u ON a.created_by_id = u.id
            WHERE a.lead_id = %s
            ORDER BY a.created_at DESC
        """, (lead_id,))
        
        activities = cursor.fetchall()
        return [dict(activity) for activity in activities]
    
    finally:
        cursor.close()
        conn.close()

@app.post("/activities")
async def create_activity(activity_data: ActivityCreate, current_user: dict = Depends(verify_jwt_token)):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT INTO crm_app_leadactivity (
                lead_id, activity_type, subject, description, scheduled_at,
                assigned_to_id, created_by_id, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            activity_data.lead_id, activity_data.activity_type, activity_data.subject,
            activity_data.description, activity_data.scheduled_at, current_user["user_id"],
            current_user["user_id"], datetime.now(), datetime.now()
        ))
        
        activity_id = cursor.fetchone()["id"]
        conn.commit()
        
        return {"id": activity_id, "message": "Activity created successfully"}
    
    finally:
        cursor.close()
        conn.close()

# User management endpoints (Admin only)
@app.get("/users")
async def get_users(current_user: dict = Depends(verify_jwt_token)):
    if current_user["role"] not in ["admin", "branch_head"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id, username, email, first_name, last_name, role FROM auth_user WHERE is_active = true")
        users = cursor.fetchall()
        return [dict(user) for user in users]
    
    finally:
        cursor.close()
        conn.close()

@app.post("/users")
async def create_user(user_data: UserCreate, current_user: dict = Depends(verify_jwt_token)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Hash password (simplified for demo)
        hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
        
        cursor.execute("""
            INSERT INTO auth_user (
                username, email, first_name, last_name, password, is_active, date_joined
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_data.username, user_data.email, user_data.first_name,
            user_data.last_name, hashed_password.decode('utf-8'), True, datetime.now()
        ))
        
        user_id = cursor.fetchone()["id"]
        conn.commit()
        
        return {"id": user_id, "message": "User created successfully"}
    
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
