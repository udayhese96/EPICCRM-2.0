#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from supabase import create_client, Client
import jwt
from datetime import datetime, timedelta
import uvicorn

# Create FastAPI app
app = FastAPI(title="EPIC CRM 2.0 API", version="2.0.0")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set environment variables
os.environ['SUPABASE_URL'] = 'https://raticwohyvxcyoqzqnwj.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'

# Create Supabase client
supabase: Client = create_client(
    os.environ['SUPABASE_URL'],
    os.environ['SUPABASE_SERVICE_ROLE_KEY']
)

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    try:
        print(f"🔐 Login attempt: {request.username}")
        
        # Define user tables
        user_tables = {
            'admin_users': 'admin',
            'cre_users': 'cre',
            'ps_users': 'ps',
            'bh_users': 'branch_head'
        }
        
        user = None
        user_role = None
        
        # Search through each user table
        for table_name, role in user_tables.items():
            try:
                response = supabase.table(table_name).select('*').eq('username', request.username).execute()
                if response.data and len(response.data) > 0:
                    user = response.data[0]
                    user_role = role
                    print(f"✅ Found user in {table_name}: {user['username']}")
                    break
            except Exception as e:
                print(f"❌ Error checking {table_name}: {e}")
                continue
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        # Check password (plain text comparison)
        if request.password != user.get('password_hash', ''):
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        # Check if user is active
        if not user.get('is_active', True):
            raise HTTPException(status_code=401, detail="Account is not active")
        
        # Create JWT token
        token_data = {
            "user_id": str(user.get("id", "unknown")),
            "username": user["username"],
            "email": user["email"],
            "role": user_role,
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        
        token = jwt.encode(token_data, "your-jwt-secret-key", algorithm="HS256")
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(user.get("id", f"{user['username']}-id")),
                "username": user["username"],
                "email": user["email"],
                "first_name": user.get("first_name", user["username"].title()),
                "last_name": user.get("last_name", "User"),
                "role": user_role,
                "status": "active" if user.get("is_active", True) else "inactive"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "EPIC CRM 2.0 API", "status": "running"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
