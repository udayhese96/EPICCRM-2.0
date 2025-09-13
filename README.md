# EPIC CRM 2.0 - Django/FastAPI System

A comprehensive Customer Relationship Management system built with Django and FastAPI, featuring username/password authentication and role-based access control.

## 🚀 Features

- ✅ **Username/Password Authentication** (No Gmail required)
- ✅ **Role-Based Access Control (RBAC)**
- ✅ **Lead Management System**
- ✅ **Activity Tracking**
- ✅ **Dashboard Analytics**
- ✅ **User Management**
- ✅ **Audit Logging**
- ✅ **RESTful API with FastAPI**
- ✅ **Django Admin Interface**
- ✅ **Supabase Integration**

## 🏗️ Architecture

### Backend Stack
- **Django 4.2** - Web framework and ORM
- **FastAPI** - High-performance API framework
- **PostgreSQL** - Database (Supabase)
- **Django REST Framework** - API serialization
- **JWT Authentication** - Secure API access

### User Roles
1. **Admin** - Full system access and user management
2. **Branch Head** - Branch-level management and reporting
3. **CRE** - Customer Relationship Executive
4. **PS** - Pre-Sales
5. **Receptionist** - Basic lead entry

## 📦 Quick Start

### 1. Install Dependencies
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 2. Environment Variables
The following environment variables are already configured in your v0 project:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTGRES_HOST`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### 3. Initialize Database
\`\`\`bash
# Run the database schema script
python scripts/001_create_database_schema.sql
\`\`\`

### 4. Start the System
\`\`\`bash
# Option 1: Use the startup script (recommended)
python start.py

# Option 2: Manual start
python run_crm.py
\`\`\`

## 🌐 Access Points

- **FastAPI API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Django Admin**: http://localhost:8001/admin

## 🔐 Authentication

### API Authentication
\`\`\`bash
# Login via FastAPI
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Use token in subsequent requests
curl -X GET "http://localhost:8000/api/leads" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/change-password` - Change password

### Lead Management
- `GET /api/leads` - List leads (role-based filtering)
- `POST /api/leads` - Create new lead
- `GET /api/leads/{id}` - Get lead details
- `PUT /api/leads/{id}` - Update lead
- `DELETE /api/leads/{id}` - Delete lead
- `GET /api/leads/{id}/activities` - Get lead activities
- `POST /api/leads/{id}/activities` - Create lead activity

### User Management (Admin/Branch Head only)
- `GET /api/users` - List users
- `POST /api/users` - Create new user
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user

### Statistics & Reports
- `GET /api/leads/statistics` - Dashboard statistics
- `POST /api/leads/bulk-assign` - Bulk assign leads
- `POST /api/leads/bulk-update-status` - Bulk update status

## 🗃️ Database Schema

### Core Models
- **User** - Extended user with CRM roles and branch assignment
- **Branch** - Multi-branch support
- **Lead** - Customer prospects with full lifecycle tracking
- **LeadActivity** - All interactions and activities
- **AuditLogEntry** - Complete audit trail
- **UserSession** - Session management for security

### Lead Status Flow
\`\`\`
New → Contacted → Qualified → Proposal → Negotiation → Closed Won/Lost
\`\`\`

## 🔒 Security & Permissions

### Role-Based Access Control
- **Admin**: Full system access, all branches
- **Branch Head**: Branch-level access, team management
- **CRE/PS**: Own leads and activities
- **Receptionist**: Basic lead creation

### Security Features
- ✅ JWT token authentication
- ✅ Role-based permissions
- ✅ Branch-level data isolation
- ✅ Comprehensive audit logging
- ✅ Session management
- ✅ CORS protection

## 🛠️ Development

### Project Structure
\`\`\`
├── backend/
│   ├── django_app/          # Django settings
│   ├── fastapi_app/         # FastAPI application
│   └── crm_app/            # Main CRM Django app
├── authentication/          # Auth models and views
├── scripts/                # Database scripts
├── start.py               # System startup script
├── run_crm.py            # Main application runner
└── requirements.txt      # Dependencies
\`\`\`

### Key Files
- `backend/fastapi_app/main.py` - FastAPI application with all endpoints
- `backend/fastapi_app/auth.py` - JWT authentication logic
- `backend/crm_app/models.py` - Django ORM models
- `backend/crm_app/rbac.py` - Role-based access control system

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Environment variables are pre-configured in v0
   - Check Supabase integration status in Project Settings

2. **Migration Errors**
   \`\`\`bash
   python manage.py makemigrations
   python manage.py migrate
   \`\`\`

3. **Missing Dependencies**
   \`\`\`bash
   pip install -r requirements.txt
   \`\`\`

4. **Permission Denied**
   - Check user role assignments
   - Verify RBAC permissions in `backend/crm_app/rbac.py`

### Debug Mode
The system includes comprehensive logging and error handling. Check console output for detailed error messages.

## 🚀 Deployment

### Production Checklist
- [ ] Set `DEBUG = False` in Django settings
- [ ] Configure proper `SECRET_KEY`
- [ ] Set up HTTPS
- [ ] Configure static file serving
- [ ] Set up database backups
- [ ] Configure logging

### Environment Variables
All required environment variables are already configured in your v0 project through the Supabase integration.

## 📈 Performance Features

- **Database**: PostgreSQL with proper indexing
- **API**: Efficient querysets with select_related/prefetch_related
- **Authentication**: JWT tokens with proper expiration
- **Caching**: Built-in Django caching ready for production

---

**Ready to use!** Run `python start.py` to begin using your EPIC CRM 2.0 system.
