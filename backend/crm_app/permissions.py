from rest_framework import permissions

class IsAdminOrBranchHead(permissions.BasePermission):
    """
    Custom permission to only allow admins and branch heads to manage users.
    """
    
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                request.user.role in ['admin', 'branch_head'])

class IsAdmin(permissions.BasePermission):
    """
    Custom permission to only allow admins.
    """
    
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                request.user.role == 'admin')

class CanManageLeads(permissions.BasePermission):
    """
    Custom permission for lead management based on role.
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # All authenticated users can view leads
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Only certain roles can create/modify leads
        return request.user.role in ['admin', 'branch_head', 'cre', 'ps']

class CanViewReports(permissions.BasePermission):
    """
    Custom permission for viewing reports.
    """
    
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                request.user.role in ['admin', 'branch_head'])
