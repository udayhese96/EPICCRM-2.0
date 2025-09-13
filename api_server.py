#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Create FastAPI app
app = FastAPI(title="EPIC CRM 2.0 API")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Test users (hardcoded for now to ensure it works)
TEST_USERS = {
    "admin": {"password": "admin123", "role": "admin", "email": "admin@epiccrm.com"},
    "cre": {"password": "cre123", "role": "cre", "email": "cre@epiccrm.com"},
    "ps": {"password": "ps123", "role": "ps", "email": "ps@epiccrm.com"},
    "branchhead": {"password": "branchhead123", "role": "branch_head", "email": "branchhead@epiccrm.com"}
}

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/login")
async def login(request: LoginRequest):
    try:
        print(f"🔐 Login attempt: {request.username} / {request.password}")
        
        # Check if user exists
        if request.username not in TEST_USERS:
            print(f"❌ User not found: {request.username}")
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        user = TEST_USERS[request.username]
        
        # Check password
        if request.password != user["password"]:
            print(f"❌ Invalid password for {request.username}")
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        print(f"✅ Login successful for {request.username}")
        
        # Create a simple token (just for testing)
        token = f"token-{request.username}-{user['role']}"
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": f"{request.username}-id",
                "username": request.username,
                "email": user["email"],
                "first_name": request.username.title(),
                "last_name": "User",
                "role": user["role"],
                "status": "active"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

@app.get("/")
async def root():
    return {"message": "EPIC CRM 2.0 API Server", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    print("🚀 Starting EPIC CRM 2.0 API Server...")
    print("📋 Available test users:")
    for username, user in TEST_USERS.items():
        print(f"   - {username} / {user['password']} ({user['role']})")
    print("🌐 Server will be available at http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
