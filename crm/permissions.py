"""
Custom permissions for CRM system with role-based access control
"""
from rest_framework import permissions
from authentication.models import UserRoleAssignment

class CRMBasePermission(permissions.BasePermission):
    """
    Base permission class for CRM with role-based access control
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Superusers have all permissions
        if request.user.is_superuser:
            return True
            
        return True  # Basic authenticated access
    
    def get_user_roles(self, user):
        """Get user roles as a list of role names"""
        return list(
            UserRoleAssignment.objects.filter(user=user)
            .values_list('role__name', flat=True)
        )
    
    def has_role(self, user, role_name):
        """Check if user has a specific role"""
        return role_name in self.get_user_roles(user)

class LeadPermission(CRMBasePermission):
    """
    Permission class for Lead operations
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        user_roles = self.get_user_roles(request.user)
        
        # Admin and Manager can do everything
        if any(role in ['Admin', 'Manager'] for role in user_roles):
            return True
        
        # Sales Rep can view and create leads
        if 'Sales Rep' in user_roles:
            return request.method in ['GET', 'POST', 'PUT', 'PATCH']
        
        # Viewer can only read
        if 'Viewer' in user_roles:
            return request.method in ['GET']
        
        # Staff users have basic access
        return request.user.is_staff
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        user_roles = self.get_user_roles(request.user)
        
        # Admin and Manager can access all leads
        if any(role in ['Admin', 'Manager'] for role in user_roles):
            return True
        
        # Sales Rep and Viewer can only access assigned leads or leads they created
        if any(role in ['Sales Rep', 'Viewer'] for role in user_roles):
            return (obj.assigned_to == request.user or 
                   obj.created_by == request.user)
        
        return False

class ContactPermission(CRMBasePermission):
    """
    Permission class for Contact operations
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        user_roles = self.get_user_roles(request.user)
        
        # Admin and Manager can do everything
        if any(role in ['Admin', 'Manager'] for role in user_roles):
            return True
        
        # Sales Rep can view and create contacts
        if 'Sales Rep' in user_roles:
            return request.method in ['GET', 'POST', 'PUT', 'PATCH']
        
        # Viewer can only read
        if 'Viewer' in user_roles:
            return request.method in ['GET']
        
        return request.user.is_staff
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        user_roles = self.get_user_roles(request.user)
        
        # Admin and Manager can access all contacts
        if any(role in ['Admin', 'Manager'] for role in user_roles):
            return True
        
        # Sales Rep and Viewer can only access assigned contacts
        if any(role in ['Sales Rep', 'Viewer'] for role in user_roles):
            return (obj.assigned_to == request.user or 
                   obj.created_by == request.user)
        
        return False

class CompanyPermission(CRMBasePermission):
    """
    Permission class for Company operations
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        user_roles = self.get_user_roles(request.user)
        
        # Admin and Manager can do everything
        if any(role in ['Admin', 'Manager'] for role in user_roles):
            return True
        
        # Sales Rep can view and create companies
        if 'Sales Rep' in user_roles:
            return request.method in ['GET', 'POST', 'PUT', 'PATCH']
        
        # Viewer can only read
        if 'Viewer' in user_roles:
            return request.method in ['GET']
        
        return request.user.is_staff

class ActivityPermission(CRMBasePermission):
    """
    Permission class for Activity operations
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        user_roles = self.get_user_roles(request.user)
        
        # Admin and Manager can do everything
        if any(role in ['Admin', 'Manager'] for role in user_roles):
            return True
        
        # Sales Rep can manage activities
        if 'Sales Rep' in user_roles:
            return request.method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
        
        # Viewer can only read
        if 'Viewer' in user_roles:
            return request.method in ['GET']
        
        return request.user.is_staff
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        
        user_roles = self.get_user_roles(request.user)
        
        # Admin and Manager can access all activities
        if any(role in ['Admin', 'Manager'] for role in user_roles):
            return True
        
        # Sales Rep and Viewer can only access assigned activities
        if any(role in ['Sales Rep', 'Viewer'] for role in user_roles):
            return (obj.assigned_to == request.user or 
                   obj.created_by == request.user)
        
        return False

class AdminOnlyPermission(CRMBasePermission):
    """
    Permission class for admin-only operations
    """
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        return (request.user.is_superuser or 
                self.has_role(request.user, 'Admin'))
