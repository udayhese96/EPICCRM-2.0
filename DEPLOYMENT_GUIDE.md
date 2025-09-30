EPIC CRM 2.0 - Complete Deployment Guide
Phase 1: Pre-Deployment Setup
1.1 Set Up Redis Service (Redis Cloud - Recommended)

Go to Redis Cloud
Create a free account
Create a new database
Copy the Redis URL (format: redis://username:password@host:port)

1.2 Prepare Environment Variables
Create a secure note with these values:
Backend Variables (for Render):
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_PASSWORD=your-database-password
REDIS_URL=redis://username:password@host:port
FASTAPI_URL=https://your-app-name.onrender.com
Frontend Variables (for Netlify):
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_FASTAPI_URL=https://your-app-name.onrender.com
NEXT_PUBLIC_APP_URL=https://your-app-name.netlify.app
Phase 2: Backend Deployment (Render)
2.1 Create Backend Configuration Files
Create render.yaml in your project root:
yamlservices:
  - type: web
    name: epic-crm-backend
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn fastapi_app.main:app --host 0.0.0.0 --port $PORT --workers 2
    healthCheckPath: /health
    envVars:
      - key: PYTHON_VERSION
        value: 3.11
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: SUPABASE_DB_PASSWORD
        sync: false
      - key: REDIS_URL
        sync: false
      - key: FASTAPI_URL
        sync: false

  - type: worker
    name: epic-crm-worker
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: python start_worker.py
    envVars:
      - key: PYTHON_VERSION
        value: 3.11
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: REDIS_URL
        sync: false
Update requirements.txt:
txtfastapi==0.104.1
uvicorn==0.24.0
gunicorn==23.0.0
supabase==2.19.0
redis==6.4.0
rq==2.6.0
psycopg2-binary==2.9.10
python-decouple==3.8
python-multipart==0.0.6
PyJWT==2.8.0
passlib==1.7.4
bcrypt==4.0.1
pydantic==2.5.0
python-dotenv==1.0.0
Create Procfile (backup for manual deployment):
web: gunicorn fastapi_app.main:app --host 0.0.0.0 --port $PORT --workers 2
worker: python start_worker.py
2.2 Update CORS Settings
Update backend/fastapi_app/main.py:
pythonfrom fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Update CORS origins to include your Netlify domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-app-name.netlify.app",  # Replace with your Netlify URL
        "https://main--your-app-name.netlify.app"  # Branch deploys
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
2.3 Deploy to Render

Connect Repository:

Go to Render Dashboard
Click "New" → "Web Service"
Connect your GitHub repository


Configure Web Service:

Name: epic-crm-backend
Environment: Python 3.11
Build Command: pip install -r requirements.txt
Start Command: gunicorn fastapi_app.main:app --host 0.0.0.0 --port $PORT --workers 2
Health Check Path: /health


Add Environment Variables:

Add all backend environment variables from your secure note
Make sure FASTAPI_URL matches your Render service URL


Create Worker Service:

Create another service for the RQ worker
Service Type: Background Worker
Start Command: python start_worker.py
Use same environment variables as web service



Phase 3: Frontend Deployment (Netlify)
3.1 Create Frontend Configuration Files
Create netlify.toml in your project root:
toml[build]
  publish = ".next"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[dev]
  command = "npm run dev"
  port = 3000
  publish = ".next"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
Create _redirects file in your public folder:
/*    /index.html   200
3.2 Update Frontend Configuration
Update your Next.js config if needed (next.config.js):
javascript/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
}

module.exports = nextConfig
3.3 Deploy to Netlify

Connect Repository:

Go to Netlify
Click "New site from Git"
Connect your GitHub repository


Configure Build Settings:

Build command: npm run build
Publish directory: .next
Node version: 18


Add Environment Variables:

Go to Site settings → Environment variables
Add all frontend environment variables
Update NEXT_PUBLIC_FASTAPI_URL with your Render backend URL



Phase 4: Testing & Verification
4.1 Backend Health Checks

Test Backend API:

bash   curl https://your-app-name.onrender.com/health

Test Database Connection:

Check Render logs for database connection success
Verify Supabase connection in dashboard


Test Redis Connection:

Check worker logs for Redis connection
Test background job processing



4.2 Frontend Checks

Test Frontend Load:

Visit your Netlify URL
Check browser console for errors


Test API Integration:

Test login functionality
Verify API calls to backend
Check network tab for successful requests



4.3 End-to-End Testing

Authentication Flow:

Test user registration
Test user login
Verify JWT tokens


CRM Functionality:

Test CRUD operations
Verify background jobs
Check data persistence



Phase 5: Production Optimization
5.1 Performance Monitoring

Backend Monitoring (Render):

Set up log retention
Monitor CPU and memory usage
Set up alerting


Frontend Monitoring (Netlify):

Enable analytics
Monitor build times
Set up form handling if needed



5.2 Security Checklist

 Environment variables are properly secured
 CORS is configured correctly
 Supabase RLS policies are enabled
 JWT tokens are validated
 HTTPS is enforced

5.3 Backup Strategy

Database: Supabase handles automatic backups
Code: Ensure GitHub repository is up to date
Environment Variables: Keep secure backup of all env vars

Troubleshooting Common Issues
Backend Issues
Build Failures:

Check Python version compatibility
Verify all dependencies in requirements.txt
Check for missing environment variables

Runtime Errors:

Check Render logs for detailed error messages
Verify database connection strings
Test Redis connectivity

CORS Errors:

Update allowed origins in FastAPI CORS middleware
Check for protocol mismatches (http vs https)

Frontend Issues
Build Failures:

Check Node version compatibility
Verify all environment variables are set
Check for TypeScript errors

API Connection Issues:

Verify NEXT_PUBLIC_FASTAPI_URL is correct
Check for mixed content errors (http/https)
Verify CORS settings on backend

Database Issues
Connection Failures:

Check Supabase service status
Verify connection string format
Check firewall/security settings

Maintenance Tasks
Weekly:

Monitor service health and performance
Check error logs
Verify background job processing

Monthly:

Update dependencies
Review security settings
Check resource usage and costs

Quarterly:

Full security audit
Performance optimization review
Backup and recovery testing

Support Resources

Render Support: Render Docs
Netlify Support: Netlify Docs
Supabase Support: Supabase Docs
Redis Cloud: Redis Documentation

Emergency Contacts & Rollback Plan
Rollback Procedure:

Revert to previous Git commit
Redeploy services from known good commit
Verify all services are operational
Update DNS if necessary

Keep this deployment guide updated as your application evolves!