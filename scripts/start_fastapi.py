#!/usr/bin/env python3
"""
Start the FastAPI server for EPIC CRM 2.0
"""

import uvicorn
import sys
import os

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

if __name__ == "__main__":
    print("Starting EPIC CRM 2.0 FastAPI Server...")
    print("Hardcoded users available:")
    print("- admin / admin123 (Administrator)")
    print("- cre / cre123 (Customer Relationship Executive)")
    print("- ps / ps123 (Pre-Sales)")
    print("- branchhead / branch123 (Branch Manager)")
    print("\nServer will be available at: http://localhost:8001")
    
    uvicorn.run(
        "fastapi_app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
