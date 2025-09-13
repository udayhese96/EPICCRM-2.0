#!/usr/bin/env python3
"""
Simple FastAPI backend startup
"""
import os
import sys
from pathlib import Path

# Set environment variables
os.environ['SUPABASE_URL'] = 'https://raticwohyvxcyoqzqnwj.supabase.co'
os.environ['SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDAzOTMsImV4cCI6MjA3MzMxNjM5M30.Jt5Bzlnn96cnqLXY6il0tSHpEV76P1SV8RwAc0vea2g'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'

print("🔧 Starting FastAPI Backend...")
print("🔗 Environment variables set")

# Change to backend directory
backend_dir = Path(__file__).parent / 'backend'
os.chdir(backend_dir)

print(f"📂 Working directory: {os.getcwd()}")

# Import and run the app
try:
    import uvicorn
    print("🚀 Starting FastAPI server on port 8000...")
    print("💻 Hardcoded users available:")
    print("   • admin / admin123")
    print("   • branchhead / branch123") 
    print("   • cre / cre123")
    print("   • ps / ps123")
    print("🌐 API Docs: http://localhost:8000/docs")
    print("=" * 50)
    
    uvicorn.run(
        "fastapi_app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
except KeyboardInterrupt:
    print("\n🛑 FastAPI server stopped")
except Exception as e:
    print(f"❌ Error starting FastAPI: {e}")
    sys.exit(1)
