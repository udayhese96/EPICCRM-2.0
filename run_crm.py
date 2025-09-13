#!/usr/bin/env python3
"""
EPIC CRM 2.0 - Django/FastAPI Launcher
Run both Django and FastAPI servers
"""

import subprocess
import sys
import os
import time
from threading import Thread

def run_django():
    """Run Django development server"""
    print("🚀 Starting Django server on http://localhost:8001")
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.django_app.settings')
    os.system("python manage.py runserver 8001")

def run_fastapi():
    """Run FastAPI server"""
    print("🚀 Starting FastAPI server on http://localhost:8000")
    os.system("python fastapi_main.py")

def main():
    print("=" * 60)
    print("🎯 EPIC CRM 2.0 - Django/FastAPI System")
    print("=" * 60)
    print("📋 Features:")
    print("  ✅ Username/Password Authentication")
    print("  ✅ Role-Based Access Control")
    print("  ✅ Lead Management System")
    print("  ✅ Activity Tracking")
    print("  ✅ Dashboard Analytics")
    print("  ✅ User Management")
    print("  ✅ Audit Logging")
    print()
    print("🌐 Access Points:")
    print("  • FastAPI API: http://localhost:8000")
    print("  • API Docs: http://localhost:8000/docs")
    print("  • Django Admin: http://localhost:8001/admin")
    print("=" * 60)
    
    # Check if database migrations are needed
    print("🔧 Checking database setup...")
    try:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.django_app.settings')
        result = subprocess.run(["python", "manage.py", "showmigrations"], 
                              capture_output=True, text=True)
        if "[ ]" in result.stdout:
            print("⚠️  Database migrations needed. Run:")
            print("   python manage.py makemigrations")
            print("   python manage.py migrate")
            print("   python manage.py createsuperuser")
            print()
    except:
        pass
    
    # Start both servers
    try:
        django_thread = Thread(target=run_django, daemon=True)
        fastapi_thread = Thread(target=run_fastapi, daemon=True)
        
        django_thread.start()
        time.sleep(2)  # Give Django a head start
        fastapi_thread.start()
        
        print("✅ Both servers started successfully!")
        print("Press Ctrl+C to stop both servers")
        
        # Keep main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Shutting down servers...")
        sys.exit(0)

if __name__ == "__main__":
    main()
