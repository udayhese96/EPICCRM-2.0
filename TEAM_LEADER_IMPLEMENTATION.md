# Team Leader Implementation Guide

## Overview
This document outlines the implementation of the new "Team Leader" user role that provides analytical oversight of assigned Presales (PS) team members. Team Leaders have access to comprehensive analytics and insights for their assigned PS teams.

## Features Implemented

### 1. Database Changes
- ✅ Added `team_leader` role to UserRole enum in `backend/fastapi_app/models.py`
- ✅ Created `team_leader_assignments` table via migration `database_migrations/002_create_team_leader_assignments_table.sql`
- ✅ Added TeamLeaderAssignment models for API communication

### 2. Permission System Updates
- ✅ Updated `lib/permissions.ts` to include `team_leader` role
- ✅ Added team leader permissions for PS oversight and analytics
- ✅ Configured role hierarchy (team_leader: level 4)

### 3. Admin Panel Features
- ✅ Created `/admin/manage-team-leaders` page with drag-and-drop interface
- ✅ Visual team structure showing unassigned PS pool and team leader boxes
- ✅ Add/edit/remove team leader functionality
- ✅ Real-time PS assignment management

### 4. API Endpoints
- ✅ `GET/POST /api/team-leader-assignments` - Manage PS assignments
- ✅ `DELETE/PUT /api/team-leader-assignments/[id]` - Update assignments
- ✅ `GET /api/team-leader/performance` - Team performance analytics
- ✅ `GET /api/team-leader/individual-performance` - Individual PS metrics
- ✅ `GET/POST /api/users?role=team_leader` - User management

### 5. Team Leader Dashboard
- ✅ Created `/team-leader-dashboard` route with comprehensive analytics
- ✅ Performance metrics for assigned PS members (conversion rates, call volumes, revenue)
- ✅ Comparative analysis between PS team members
- ✅ Lead distribution charts and activity timelines
- ✅ Date range and individual PS selection filters

### 6. UI Components
- ✅ Draggable PS cards with assignment status
- ✅ Team leader containers as drop zones
- ✅ Analytics charts using existing chart library
- ✅ Performance comparison tables and KPI cards
- ✅ TeamLeaderAnalytics component for comprehensive insights

### 7. Navigation & Access Control
- ✅ Updated sidebar navigation for team_leader role
- ✅ Role guards and permission checks
- ✅ Admin access to manage team leaders

## Database Schema

### team_leader_assignments Table
```sql
CREATE TABLE team_leader_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ps_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ps_user_id)
);
```

## API Usage Examples

### Get Team Leader Assignments
```bash
GET /api/team-leader-assignments
```

### Assign PS to Team Leader
```bash
POST /api/team-leader-assignments
{
  "ps_user_id": "uuid",
  "team_leader_id": "uuid"
}
```

### Get Team Performance
```bash
GET /api/team-leader/performance?team_leader_id=uuid&date_range=30
```

### Get Individual PS Performance
```bash
GET /api/team-leader/individual-performance?team_leader_id=uuid&date_range=30
```

## User Flow

### Admin Flow
1. Navigate to `/admin/manage-team-leaders`
2. Create new team leaders using "Add Team Leader" button
3. Drag unassigned PS members to team leader containers
4. Remove assignments using trash icon
5. View visual team structure

### Team Leader Flow
1. Login with team_leader role
2. Access `/team-leader-dashboard`
3. View comprehensive analytics for assigned PS team
4. Filter by date range and individual PS members
5. Analyze performance metrics and trends
6. Monitor recent team activities

## Analytics Features

### Team Overview
- Total leads, conversion rates, call volumes
- Revenue tracking and response times
- Team performance trends

### Individual PS Analysis
- Per-member performance metrics
- Comparative analysis between team members
- Top performer identification
- Activity tracking and timelines

### Visual Analytics
- Lead source distribution charts
- Lead status overview
- Performance comparison tables
- Progress indicators and KPIs

## Security & Permissions

### Role Permissions
- `team_leader` role has level 4 in hierarchy
- Access to PS performance analytics
- Read-only access to assigned team data
- Cannot modify PS assignments (admin only)

### Access Control
- Role guards protect all team leader routes
- Permission checks for analytics access
- Branch-based data filtering (if applicable)

## File Structure

```
├── app/
│   ├── admin/manage-team-leaders/page.tsx
│   ├── team-leader-dashboard/page.tsx
│   └── api/
│       ├── team-leader-assignments/
│       ├── team-leader/performance/
│       └── users/route.ts
├── components/
│   ├── reports/team-leader-analytics.tsx
│   └── ui/progress.tsx
├── database_migrations/
│   └── 002_create_team_leader_assignments_table.sql
├── lib/
│   └── permissions.ts (updated)
└── backend/fastapi_app/
    └── models.py (updated)
```

## Testing

### Manual Testing Steps
1. Create team leader users via admin panel
2. Assign PS members to team leaders
3. Login as team leader and verify dashboard access
4. Check analytics data accuracy
5. Test drag-and-drop functionality
6. Verify permission restrictions

### API Testing
```bash
# Test assignment creation
curl -X POST http://localhost:8000/api/team-leader-assignments \
  -H "Content-Type: application/json" \
  -d '{"ps_user_id": "uuid", "team_leader_id": "uuid"}'

# Test performance data
curl http://localhost:8000/api/team-leader/performance?team_leader_id=uuid
```

## Future Enhancements

### Potential Improvements
1. Real-time notifications for team performance changes
2. Advanced filtering and search capabilities
3. Export functionality for reports
4. Mobile-responsive design improvements
5. Integration with external analytics tools
6. Automated performance alerts
7. Goal setting and tracking features

### Scalability Considerations
- Database indexing for large datasets
- Caching for performance metrics
- Pagination for large team lists
- Background job processing for analytics

## Troubleshooting

### Common Issues
1. **Drag-and-drop not working**: Check browser compatibility and JavaScript errors
2. **Analytics not loading**: Verify API endpoints and data availability
3. **Permission denied**: Ensure user has team_leader role
4. **Assignment errors**: Check for duplicate assignments and user existence

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify API responses in Network tab
3. Confirm database table exists and has data
4. Test with different user roles and permissions

## Conclusion

The Team Leader implementation provides a comprehensive solution for analytical oversight of PS teams. The system includes:

- Intuitive drag-and-drop assignment interface
- Rich analytics dashboard with multiple visualization options
- Robust permission system and access controls
- Scalable database design with proper relationships
- Comprehensive API for future integrations

The implementation follows best practices for security, performance, and user experience, making it ready for production use.
