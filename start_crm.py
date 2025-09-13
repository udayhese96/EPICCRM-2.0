#!/usr/bin/env python3
"""
Simple CRM startup script without complex dependencies
"""
import os
import subprocess
import sys
import time
import signal
from pathlib import Path

def set_environment():
    """Set environment variables"""
    os.environ['SUPABASE_URL'] = 'https://raticwohyvxcyoqzqnwj.supabase.co'
    os.environ['SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDAzOTMsImV4cCI6MjA3MzMxNjM5M30.Jt5Bzlnn96cnqLXY6il0tSHpEV76P1SV8RwAc0vea2g'
    os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4'
    os.environ['POSTGRES_HOST'] = 'db.raticwohyvxcyoqzqnwj.supabase.co'
    os.environ['POSTGRES_USER'] = 'postgres'
    os.environ['POSTGRES_PASSWORD'] = 'temp-password'
    os.environ['POSTGRES_DATABASE'] = 'postgres'
    os.environ['SECRET_KEY'] = 'django-secret-key-for-development'
    os.environ['DEBUG'] = 'true'

def start_fastapi():
    """Start FastAPI server"""
    print("🚀 Starting FastAPI server on port 8000...")
    try:
        # Change to backend directory
        backend_path = Path(__file__).parent / 'backend'
        os.chdir(backend_path)
        
        # Start uvicorn
        process = subprocess.Popen([
            sys.executable, '-m', 'uvicorn', 
            'fastapi_app.main:app',
            '--host', '0.0.0.0',
            '--port', '8000',
            '--reload'
        ], env=os.environ.copy())
        
        return process
    except Exception as e:
        print(f"❌ Failed to start FastAPI: {e}")
        return None

def start_nextjs():
    """Start Next.js server"""
    print("🚀 Starting Next.js server on port 3000...")
    try:
        # Change to project root
        project_root = Path(__file__).parent
        os.chdir(project_root)
        
        # Start Next.js
        process = subprocess.Popen([
            'npm', 'run', 'dev'
        ], env=os.environ.copy())
        
        return process
    except Exception as e:
        print(f"❌ Failed to start Next.js: {e}")
        return None

def main():
    """Main function"""
    print("=" * 60)
    print("🎯 EPIC CRM 2.0 - Quick Start")
    print("=" * 60)
    
    # Set environment variables
    set_environment()
    
    processes = []
    
    try:
        # Start FastAPI
        fastapi_process = start_fastapi()
        if fastapi_process:
            processes.append(fastapi_process)
            time.sleep(2)  # Give it time to start
        
        # Change back to project root for Next.js
        os.chdir(Path(__file__).parent)
        
        # Start Next.js
        nextjs_process = start_nextjs()
        if nextjs_process:
            processes.append(nextjs_process)
        
        print("\n" + "=" * 60)
        print("✅ Services Started!")
        print("=" * 60)
        print("📊 Frontend (Next.js): http://localhost:3000")
        print("🔧 API (FastAPI): http://localhost:8000")
        print("📚 API Docs: http://localhost:8000/docs")
        print("\n💻 Hardcoded login credentials:")
        print("   • admin / admin123 (Administrator)")
        print("   • cre / cre123 (Customer Executive)")
        print("   • ps / ps123 (Pre Sales)")
        print("   • branchhead / branch123 (Branch Manager)")
        print("=" * 60)
        print("\nPress Ctrl+C to stop all services...")
        
        # Wait for processes
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        for process in processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        print("✅ All services stopped.")

if __name__ == "__main__":
    main()
