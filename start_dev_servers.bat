@echo off
echo Starting EPIC CRM 2.0 Development Servers...

echo.
echo Starting FastAPI Backend Server on port 8000...
start "FastAPI Backend" cmd /k "cd backend && python -m uvicorn fastapi_app.main:app --reload --host 0.0.0.0 --port 8000"

echo.
echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo Starting Next.js Frontend Server on port 3000...
start "Next.js Frontend" cmd /k "npm run dev"

echo.
echo Both servers are starting...
echo FastAPI Backend: http://localhost:8000
echo Next.js Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul
