@echo off
echo ========================================
echo  EPIC CRM 2.0 - Starting Services
echo ========================================

REM Set environment variables
set SUPABASE_URL=https://raticwohyvxcyoqzqnwj.supabase.co
set SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDAzOTMsImV4cCI6MjA3MzMxNjM5M30.Jt5Bzlnn96cnqLXY6il0tSHpEV76P1SV8RwAc0vea2g
set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDM5MywiZXhwIjoyMDczMzE2MzkzfQ.lAYCj6MIlQyr_WqfjM3hUTgu4bG4OBpSdx49QAEzsU4
set NEXT_PUBLIC_SUPABASE_URL=https://raticwohyvxcyoqzqnwj.supabase.co
set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGljd29oeXZ4Y3lvcXpxbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NDAzOTMsImV4cCI6MjA3MzMxNjM5M30.Jt5Bzlnn96cnqLXY6il0tSHpEV76P1SV8RwAc0vea2g

echo Starting FastAPI Backend...
start /B cmd /c "cd backend && uvicorn fastapi_app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo Starting Next.js Frontend...
start /B cmd /c "npm run dev"

timeout /t 5 /nobreak >nul

echo ========================================
echo  Services Started!
echo ========================================
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Login Credentials:
echo - admin / admin123 (Administrator)
echo - branchhead / branch123 (Branch Manager)
echo - cre / cre123 (Customer Executive)
echo - ps / ps123 (Pre Sales)
echo ========================================

REM Open browser
start http://localhost:3000

pause
