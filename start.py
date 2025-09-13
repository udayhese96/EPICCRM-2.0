#!/usr/bin/env python3
"""
EPIC CRM 2.0 Startup Script
Checks dependencies and starts the system
"""

import sys
import subprocess
import os
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        print(f"   Current version: {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def check_dependencies():
    """Check if required packages are installed"""
    required_packages = [
        'django', 'djangorestframework', 'fastapi', 'uvicorn', 
        'psycopg2', 'supabase', 'pydantic'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package}")
    
    if missing_packages:
        print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
        print("   Run: pip install -r requirements.txt")
        return False
    
    return True

def check_environment_variables():
    """Check if required environment variables are set"""
    required_vars = [
        'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
        'POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DATABASE'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
            print(f"❌ {var}")
        else:
            print(f"✅ {var}")
    
    if missing_vars:
        print(f"\n⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("   Please set these in your environment or .env file")
        return False
    
    return True

def check_database_connection():
    """Check if database is accessible"""
    try:
        import psycopg2
        conn = psycopg2.connect(
            host=os.getenv('POSTGRES_HOST'),
            database=os.getenv('POSTGRES_DATABASE'),
            user=os.getenv('POSTGRES_USER'),
            password=os.getenv('POSTGRES_PASSWORD'),
            port='5432'
        )
        conn.close()
        print("✅ Database connection")
        return True
    except Exception as e:
        print(f"❌ Database connection: {e}")
        return False

def run_migrations():
    """Run Django migrations"""
    try:
        print("🔧 Running Django migrations...")
        subprocess.run(['python', 'manage.py', 'makemigrations'], check=True)
        subprocess.run(['python', 'manage.py', 'migrate'], check=True)
        print("✅ Migrations completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Migration failed: {e}")
        return False

def main():
    """Main startup function"""
    print("=" * 60)
    print("🎯 EPIC CRM 2.0 - System Startup Check")
    print("=" * 60)
    
    # Check system requirements
    print("\n📋 Checking System Requirements:")
    if not check_python_version():
        sys.exit(1)
    
    print("\n📦 Checking Dependencies:")
    if not check_dependencies():
        sys.exit(1)
    
    print("\n🔧 Checking Environment Variables:")
    if not check_environment_variables():
        sys.exit(1)
    
    print("\n🗄️  Checking Database Connection:")
    if not check_database_connection():
        sys.exit(1)
    
    print("\n🔄 Running Database Migrations:")
    if not run_migrations():
        print("⚠️  Migrations failed, but continuing...")
    
    print("\n" + "=" * 60)
    print("✅ All checks passed! Starting EPIC CRM 2.0...")
    print("=" * 60)
    
    # Start the main application
    try:
        from run_crm import main as run_main
        run_main()
    except KeyboardInterrupt:
        print("\n🛑 Shutdown requested by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Failed to start application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
