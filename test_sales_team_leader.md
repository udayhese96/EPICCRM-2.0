# Sales Team Leader Feature Test Guide

## Overview
This document outlines how to test the new Sales Team Leader functionality that allows admins to assign PS users to Sales Team Leaders for performance monitoring.

## Features Implemented

### 1. New Role: Sales Team Leader
- Added `sales_team_leader` role to the system
- Updated role hierarchy and permissions
- Sales Team Leaders can monitor PS performance

### 2. Admin Interface
- New "Manage Sales Team Leader" option in admin sidebar
- Drag-and-drop interface for PS assignment
- Create, edit, and delete Sales Team Leaders
- View assignment statistics

### 3. Database Schema
- New `ps_assignments` table to track PS-to-Sales Team Leader assignments
- Proper foreign key relationships and constraints
- Row Level Security (RLS) policies

### 4. API Endpoints
- `GET /api/ps-assignments` - Get all assignments
- `POST /api/ps-assignments` - Create new assignment
- `PUT /api/ps-assignments/{id}` - Update assignment
- `DELETE /api/ps-assignments/{id}` - Delete assignment

## Testing Steps

### 1. Database Setup
1. Run the SQL migration script: `database_migrations/001_create_ps_assignments_table.sql`
2. Verify the `ps_assignments` table is created with proper constraints

### 2. Create Sales Team Leaders
1. Login as admin
2. Navigate to "Manage Sales Team Leader"
3. Click "Add Sales Team Leader"
4. Fill in the form with:
   - Username: `stl1`
   - Email: `stl1@example.com`
   - Full Name: `John Sales Leader`
   - Phone: `1234567890`
   - Branch: `Mount Road`
   - Password: `password123`
5. Click "Add Sales Team Leader"
6. Verify the user is created with role `sales_team_leader`

### 3. Test Drag-and-Drop Assignment
1. Ensure you have some PS users in the system
2. In the "Manage Sales Team Leader" page, you should see:
   - Left panel: Unassigned PS users
   - Right panel: Sales Team Leaders
3. Drag a PS user from the left panel to a Sales Team Leader box in the right panel
4. Verify the assignment is created
5. Check that the PS user moves from "Unassigned" to the assigned leader's box

### 4. Test Assignment Management
1. Click the "X" button next to an assigned PS user to unassign them
2. Verify the PS user moves back to the "Unassigned" list
3. Try to assign the same PS user to a different Sales Team Leader
4. Verify the assignment is updated correctly

### 5. Test Permissions
1. Login as a non-admin user (e.g., PS user)
2. Try to access `/admin/manage-sales-team-leader`
3. Verify access is denied

### 6. Test API Endpoints
1. Use a tool like Postman or curl to test the API endpoints
2. Test with different user roles to verify proper authorization

## Expected Behavior

### Admin Interface
- Clean, modern drag-and-drop interface
- Real-time updates when assignments change
- Proper error handling and user feedback
- Statistics cards showing counts

### Database
- Proper foreign key constraints prevent invalid assignments
- RLS policies ensure users only see appropriate data
- Unique constraint prevents duplicate assignments

### API
- Proper authentication and authorization
- Validation of user roles before assignment
- Error handling for edge cases

## Troubleshooting

### Common Issues
1. **Drag and drop not working**: Check browser console for JavaScript errors
2. **API errors**: Verify database table exists and user has proper permissions
3. **Assignment not saving**: Check network tab for API call errors
4. **Permission denied**: Verify user has admin or branch_head role

### Debug Steps
1. Check browser console for errors
2. Check network tab for failed API calls
3. Verify database table structure
4. Check user roles and permissions
5. Verify Supabase RLS policies

## Files Modified/Created

### Frontend
- `app/admin/manage-sales-team-leader/page.tsx` - Main admin interface
- `app/api/ps-assignments/route.ts` - API endpoints
- `app/api/ps-assignments/[id]/route.ts` - Individual assignment endpoints
- `components/layout/sidebar.tsx` - Added new menu item
- `lib/permissions.ts` - Updated role hierarchy and permissions

### Backend
- `backend/fastapi_app/models.py` - Added new role and assignment models
- `backend/fastapi_app/main.py` - Added API endpoints

### Database
- `database_migrations/001_create_ps_assignments_table.sql` - Database schema

## Success Criteria
- [ ] Sales Team Leader role is created and functional
- [ ] Admin can create, edit, and delete Sales Team Leaders
- [ ] Drag-and-drop assignment works smoothly
- [ ] PS users can be assigned and unassigned
- [ ] Proper permissions are enforced
- [ ] Database constraints work correctly
- [ ] API endpoints respond correctly
- [ ] UI is responsive and user-friendly
