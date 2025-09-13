#!/usr/bin/env python3
"""
Minimal FastAPI test to verify basic functionality
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Set environment variables
os.environ['SUPABASE_URL'] = 'https://raticwohyvxcyoqzqnwj.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'

app = FastAPI(title="EPIC CRM 2.0 Test API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str

# Hardcoded users for testing
HARDCODED_USERS = {
    "admin": {
        "username": "admin",
        "password": "admin123",
        "role": "admin",
        "email": "admin@epiccrm.com"
    },
    "cre": {
        "username": "cre",
        "password": "cre123",
        "role": "cre",
        "email": "cre@epiccrm.com"
    },
    "ps": {
        "username": "ps",
        "password": "ps123",
        "role": "ps",
        "email": "ps@epiccrm.com"
    },
    "branchhead": {
        "username": "branchhead",
        "password": "branch123",
        "role": "branch_head",
        "email": "branchhead@epiccrm.com"
    }
}

@app.get("/")
async def root():
    return {
        "message": "EPIC CRM 2.0 Test API", 
        "status": "running",
        "available_users": list(HARDCODED_USERS.keys())
    }

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Test login endpoint"""
    if login_data.username in HARDCODED_USERS:
        user_data = HARDCODED_USERS[login_data.username]
        if user_data["password"] == login_data.password:
            return LoginResponse(
                access_token="test-token-" + login_data.username,
                token_type="bearer",
                username=user_data["username"],
                role=user_data["role"]
            )
    
    return {"error": "Invalid credentials"}

@app.get("/api/test")
async def test():
    return {"message": "API is working!", "users": HARDCODED_USERS}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Test FastAPI on port 8000...")
    print("💻 Test users: admin/admin123, cre/cre123, ps/ps123, branchhead/branch123")
    uvicorn.run("test_api:app", host="0.0.0.0", port=8000, reload=False)
