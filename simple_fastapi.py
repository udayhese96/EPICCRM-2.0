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
app = FastAPI()

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
        
        # Query admin_users table
        response = supabase.table('admin_users').select('*').eq('username', request.username).execute()
        print(f"📊 Database response: {response}")
        
        if not response.data:
            raise HTTPException(status_code=401, detail="User not found")
            
        user = response.data[0]
        print(f"👤 Found user: {user}")
        
        # Check password
        if request.password != user['password_hash']:
            raise HTTPException(status_code=401, detail="Invalid password")
            
        # Create JWT token
        token_data = {
            "user_id": str(user["id"]),
            "username": user["username"],
            "role": "admin",
            "exp": datetime.utcnow() + timedelta(hours=24)
        }
        
        token = jwt.encode(token_data, "secret-key", algorithm="HS256")
        print(f"🔑 Created token: {token}")
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": str(user["id"]),
                "username": user["username"],
                "email": user["email"],
                "role": "admin"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Simple FastAPI Test Server"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
