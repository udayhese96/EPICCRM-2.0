# Lead Qualification and Assignment System

## Overview
This system implements a complete lead qualification and assignment workflow for the EPIC CRM 2.0 application. When leads are qualified by CRE users, they are automatically moved to a qualified leads table where CRE Team Leaders can assign them to PS (Pre-Sales) users for follow-up.

## System Architecture

### Database Tables

#### 1. `qualified_leads` Table
Stores leads that have been qualified by CRE users:
```sql
CREATE TABLE public.qualified_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lead_uid character varying(32) NULL,
  customer_name text NULL,
  customer_mobile_number text NULL,
  source text NULL,
  sub_source text NULL,
  cre_name text NULL,
  lead_category text NULL,
  model_interested text NULL,
  first_remark text NULL,
  variant text NULL,
  buying_plan text NULL,
  finance_option text NULL,
  profession text NULL,
  test_drive_type text NULL,
  trade_in text NULL,
  branch text NULL,
  ps_name text NULL,
  icrop_id text NULL,
  created_at timestamp without time zone NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  updated_at timestamp without time zone NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata'::text),
  CONSTRAINT qualified_leads_pkey PRIMARY KEY (id),
  CONSTRAINT qualified_leads_lead_uid_key UNIQUE (lead_uid)
);
```

#### 2. `ps_followup_master` Table
Tracks follow-up activities for PS users:
```sql
CREATE TABLE public.ps_followup_master (
  id serial NOT NULL,
  lead_uid character varying(20) NOT NULL,
  ps_name character varying(100) NOT NULL,
  ps_id uuid NULL,
  ps_branch character varying(50) NOT NULL,
  customer_name character varying(100) NULL,
  customer_mobile_number character varying(15) NULL,
  alternate_mobile_number character varying(20) NULL,
  source character varying(50) NULL,
  cre_name character varying(100) NULL,
  cre_id uuid NULL,
  lead_category character varying(20) NULL,
  model_interested text NULL,
  follow_up_date date NULL,
  lead_status character varying(50) NULL,
  first_call_date date NULL,
  first_call_remark text NULL,
  second_call_date date NULL,
  second_call_remark text NULL,
  third_call_date date NULL,
  third_call_remark text NULL,
  fourth_call_date date NULL,
  fourth_call_remark text NULL,
  fifth_call_date date NULL,
  fifth_call_remark text NULL,
  sixth_call_date date NULL,
  sixth_call_remark text NULL,
  seventh_call_date date NULL,
  seventh_call_remark text NULL,
  final_status character varying(20) NULL DEFAULT 'Pending'::character varying,
  test_drive_done boolean NULL,
  tat double precision NULL,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  ps_assigned_at timestamp without time zone NULL,
  won_timestamp timestamp without time zone NULL,
  lost_timestamp timestamp without time zone NULL,
  variant text NULL,
  buying_plan text NULL,
  finance_option text NULL,
  CONSTRAINT ps_followup_master_pkey PRIMARY KEY (id),
  CONSTRAINT ps_followup_master_cre_id_fkey FOREIGN KEY (cre_id) REFERENCES cre_users (id),
  CONSTRAINT ps_followup_master_lead_uid_fkey FOREIGN KEY (lead_uid) REFERENCES lead_master (uid) ON DELETE CASCADE,
  CONSTRAINT ps_followup_master_ps_id_fkey FOREIGN KEY (ps_id) REFERENCES ps_users (id)
);
```

### User Roles

#### 1. CRE (Customer Relationship Executive)
- **Dashboard**: `/cre/dashboard`
- **Permissions**: Create, read, and update leads
- **Key Feature**: Qualify leads (moves them to qualified_leads table)

#### 2. CRE Team Leader
- **Dashboard**: `/cre-team-leader/dashboard`
- **Permissions**: Manage qualified leads, assign to PS users
- **Key Features**:
  - View all qualified leads
  - Filter by branch
  - Assign leads to PS users
  - Bulk assignment capabilities

#### 3. PS (Pre-Sales)
- **Dashboard**: `/ps/dashboard`
- **Permissions**: Manage assigned leads, track follow-ups
- **Key Features**:
  - View assigned leads
  - Track up to 7 follow-up calls
  - Update lead status (Won/Lost/Pending)
  - Beautiful progress tracking UI

## API Endpoints

### Qualified Leads Management
- `GET /api/qualified-leads` - Get all qualified leads
- `POST /api/qualified-leads/assign` - Assign qualified leads to PS users
- `POST /api/leads/{lead_uid}/qualify` - Qualify a lead

### PS Follow-up Management
- `GET /api/ps-followup` - Get PS follow-ups (role-based filtering)
- `PUT /api/ps-followup` - Update PS follow-up

### Supporting Endpoints
- `GET /api/branches` - Get all branches
- `GET /api/ps-users` - Get PS users for assignment

## Workflow

### 1. Lead Qualification Process
1. CRE user opens a lead in their dashboard
2. CRE fills out qualification details (model, variant, customer details, etc.)
3. CRE marks lead as "Qualified"
4. System automatically:
   - Updates lead_master with qualification status
   - Creates entry in qualified_leads table
   - Copies all relevant lead data

### 2. Lead Assignment Process
1. CRE Team Leader accesses their dashboard
2. Views all qualified leads in a table format
3. Selects leads to assign
4. Chooses branch and PS user
5. System automatically:
   - Updates qualified_leads with PS assignment
   - Creates entry in ps_followup_master
   - Sets up follow-up tracking

### 3. PS Follow-up Process
1. PS user accesses their dashboard
2. Views assigned leads with follow-up status
3. Updates follow-up calls (1st through 7th)
4. Tracks call remarks and dates
5. Updates final status (Won/Lost/Pending)
6. System tracks all activities and timestamps

## Key Features

### CRE Team Leader Dashboard
- **Statistics Cards**: Total, unassigned, and assigned leads
- **Lead Table**: Sortable table with all qualified leads
- **Bulk Assignment**: Select multiple leads and assign to PS
- **Branch Filtering**: Filter PS users by branch
- **Real-time Updates**: Refresh data to see latest changes

### PS Dashboard
- **Statistics Cards**: Total assigned, pending, won, and lost leads
- **Lead Table**: Shows assigned leads with follow-up status
- **Call Tracking**: Up to 7 follow-up calls with remarks
- **Status Management**: Update final status with timestamps
- **Progress Indicators**: Visual progress through follow-up stages

### Lead Qualification Modal
- **Comprehensive Form**: All qualification details in organized sections
- **Model Selection**: Toyota models with variant selection
- **Customer Details**: Profession, location, buying plan
- **Test Drive**: Test drive type selection
- **Trade-in**: Optional trade-in vehicle details
- **Follow-up Planning**: Set follow-up dates

## Technical Implementation

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Shadcn/ui** components
- **Role-based navigation** and access control

### Backend
- **FastAPI** with Python
- **Supabase** for database
- **JWT authentication**
- **Role-based permissions**
- **RESTful API design**

### Database
- **PostgreSQL** via Supabase
- **Foreign key constraints**
- **Cascade deletes**
- **Timestamp tracking**
- **Unique constraints**

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.8+
- Supabase account
- PostgreSQL database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EPICCRM-2.0
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend/fastapi_app
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   # Create .env.local file
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   FASTAPI_URL=http://localhost:8000
   ```

5. **Create database tables**
   Run the SQL scripts provided in the `scripts/` directory

6. **Start the servers**
   ```bash
   # Terminal 1 - Backend
   cd backend/fastapi_app
   python main.py

   # Terminal 2 - Frontend
   npm run dev
   ```

### Testing the System

1. **Login as CRE user**
   - Username: `cre`
   - Password: `cre123`

2. **Qualify a lead**
   - Open any lead
   - Fill qualification details
   - Mark as "Qualified"

3. **Login as CRE Team Leader**
   - Username: `cre_team_leader`
   - Password: `team123`

4. **Assign qualified leads**
   - View qualified leads
   - Select leads to assign
   - Choose branch and PS user

5. **Login as PS user**
   - Username: `ps`
   - Password: `ps123`

6. **Manage follow-ups**
   - View assigned leads
   - Update follow-up calls
   - Track progress

## Security Features

- **Role-based access control**
- **JWT authentication**
- **Input validation**
- **SQL injection prevention**
- **CORS configuration**
- **Environment variable protection**

## Performance Optimizations

- **Database indexing**
- **Efficient queries**
- **Lazy loading**
- **Caching strategies**
- **Optimized API responses**

## Future Enhancements

- **Email notifications** for assignments
- **SMS integration** for follow-ups
- **Advanced analytics** and reporting
- **Mobile app** support
- **API rate limiting**
- **Audit logging**

## Support

For technical support or questions about the lead qualification system, please contact the development team or refer to the API documentation.

---

**System Status**: ✅ Complete and Ready for Production
**Last Updated**: September 2024
**Version**: 2.0.0
