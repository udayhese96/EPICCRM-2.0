# EPIC CRM 2.0

Ultra-fast CRM system with Redis background processing and real-time updates.

## Quick Start

### 1. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
pip install -r requirements.txt
```

### 2. Setup Environment
Create `.env` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
REDIS_URL=redis://localhost:6379
FASTAPI_URL=http://localhost:8000
```

### 3. Start Services
```bash
# Terminal 1: Start Redis Worker
python start_worker.py

# Terminal 2: Start FastAPI Backend
cd backend
python -m uvicorn fastapi_app.main:app --host 0.0.0.0 --port 8000

# Terminal 3: Start Next.js Frontend
npm run dev
```

## Features
- ⚡ Ultra-fast UI with Redis background processing
- 🔄 Real-time lead count updates
- 🚀 Instant form submissions
- 📊 Trade-in data management
- 👥 Role-based access control
- 📈 Analytics and reporting

## Tech Stack
- **Frontend**: Next.js, React, TypeScript
- **Backend**: FastAPI, Python
- **Database**: Supabase (PostgreSQL)
- **Cache/Queue**: Redis
- **Background Processing**: RQ (Redis Queue)

## API Endpoints
- `GET /health` - Health check
- `GET /api/jobs/queue-stats` - Redis queue status
- `POST /api/leads/{uid}/qualify` - Qualify lead
- `PUT /api/leads/{uid}` - Update lead

## Project Structure
```
├── app/                 # Next.js frontend pages
├── backend/             # FastAPI backend
│   └── fastapi_app/    # Main backend application
├── components/          # React components
├── lib/                # Utilities and configurations
├── start_worker.py     # Redis worker startup script
└── requirements.txt    # Python dependencies
```

