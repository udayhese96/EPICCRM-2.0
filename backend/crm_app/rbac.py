"""
Role-Based Access Control (RBAC) System for EPIC CRM 2.0
"""
from enum import Enum
from typing import List, Dict, Set
from functools import wraps
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework import status

class Role(Enum):
    ADMIN = "admin"
    BRANCH_HEAD = "branch_head"
    CRE = "cre"
    PS = "ps"
    RECEPTIONIST = "receptionist"

class Permission(Enum):
    # User Management
    CREATE_USER = "create_user"
    READ_USER = "read_user"
    UPDATE_USER = "update_user"
    DELETE_USER = "delete_user"
    
    # Lead Management
    CREATE_LEAD = "create_lead"
    READ_LEAD = "read_lead"
    UPDATE_LEAD = "update_lead"
    DELETE_LEAD = "delete_lead"
    ASSIGN_LEAD = "assign_lead"
    BULK_UPDATE_LEADS = "bulk_update_leads"
    
    # Branch Management
    CREATE_BRANCH = "create_branch"
    READ_BRANCH = "read_branch"
    UPDATE_BRANCH = "update_branch"
    DELETE_BRANCH = "delete_branch"
    
    # Activity Management
    CREATE_ACTIVITY = "create_activity"
    READ_ACTIVITY = "read_activity"
    UPDATE_ACTIVITY = "update_activity"
    DELETE_ACTIVITY = "delete_activity"
    
    # Reporting
    VIEW_REPORTS = "view_reports"
    VIEW_ANALYTICS = "view_analytics"
    EXPORT_DATA = "export_data"
    
    # System Administration
    MANAGE_SYSTEM = "manage_system"
    VIEW_AUDIT_LOGS = "view_audit_logs"

class RolePermissions:
    """Define permissions for each role"""
    
    ROLE_PERMISSIONS: Dict[Role, Set[Permission]] = {
        Role.ADMIN: {
            # Full system access
            Permission.CREATE_USER, Permission.READ_USER, Permission.UPDATE_USER, Permission.DELETE_USER,
            Permission.CREATE_LEAD, Permission.READ_LEAD, Permission.UPDATE_LEAD, Permission.DELETE_LEAD,
            Permission.ASSIGN_LEAD, Permission.BULK_UPDATE_LEADS,
            Permission.CREATE_BRANCH, Permission.READ_BRANCH, Permission.UPDATE_BRANCH, Permission.DELETE_BRANCH,
            Permission.CREATE_ACTIVITY, Permission.READ_ACTIVITY, Permission.UPDATE_ACTIVITY, Permission.DELETE_ACTIVITY,
            Permission.VIEW_REPORTS, Permission.VIEW_ANALYTICS, Permission.EXPORT_DATA,
            Permission.MANAGE_SYSTEM, Permission.VIEW_AUDIT_LOGS
        },
        
        Role.BRANCH_HEAD: {
            # Branch-level management
            Permission.CREATE_USER, Permission.READ_USER, Permission.UPDATE_USER,  # Within branch only
            Permission.CREATE_LEAD, Permission.READ_LEAD, Permission.UPDATE_LEAD, Permission.DELETE_LEAD,
            Permission.ASSIGN_LEAD, Permission.BULK_UPDATE_LEADS,
            Permission.READ_BRANCH,  # Own branch only
            Permission.CREATE_ACTIVITY, Permission.READ_ACTIVITY, Permission.UPDATE_ACTIVITY, Permission.DELETE_ACTIVITY,
            Permission.VIEW_REPORTS, Permission.VIEW_ANALYTICS, Permission.EXPORT_DATA
        },
        
        Role.CRE: {
            # Customer Relationship Executive
            Permission.CREATE_LEAD, Permission.READ_LEAD, Permission.UPDATE_LEAD,  # Own leads only
            Permission.CREATE_ACTIVITY, Permission.READ_ACTIVITY, Permission.UPDATE_ACTIVITY,
            Permission.VIEW_REPORTS  # Limited reports
        },
        
        Role.PS: {
            # Pre-Sales
            Permission.CREATE_LEAD, Permission.READ_LEAD, Permission.UPDATE_LEAD,  # Own leads only
            Permission.CREATE_ACTIVITY, Permission.READ_ACTIVITY, Permission.UPDATE_ACTIVITY,
            Permission.VIEW_REPORTS  # Limited reports
        },
        
        Role.RECEPTIONIST: {
            # Basic lead entry
            Permission.CREATE_LEAD, Permission.READ_LEAD,  # Own leads only
            Permission.CREATE_ACTIVITY, Permission.READ_ACTIVITY
        }
    }
    
    @classmethod
    def get_permissions(cls, role: Role) -> Set[Permission]:
        """Get permissions for a role"""
        return cls.ROLE_PERMISSIONS.get(role, set())
    
    @classmethod
    def has_permission(cls, role: Role, permission: Permission) -> bool:
        """Check if role has specific permission"""
        return permission in cls.get_permissions(role)

class ResourceAccess:
    """Define resource access rules based on role and ownership"""
    
    @staticmethod
    def can_access_user(current_user, target_user) -> bool:
        """Check if current user can access target user"""
        if current_user.role == Role.ADMIN.value:
            return True
        elif current_user.role == Role.BRANCH_HEAD.value:
            return target_user.branch_id == current_user.branch.id
        else:
            return current_user.id == target_user.id
    
    @staticmethod
    def can_access_lead(current_user, lead) -> bool:
        """Check if current user can access lead"""
        if current_user.role == Role.ADMIN.value:
            return True
        elif current_user.role == Role.BRANCH_HEAD.value:
            return lead.branch_id == current_user.branch.id
        else:
            return lead.assigned_to_id == current_user.id
    
    @staticmethod
    def can_access_branch(current_user, branch) -> bool:
        """Check if current user can access branch"""
        if current_user.role == Role.ADMIN.value:
            return True
        elif current_user.role == Role.BRANCH_HEAD.value:
            return branch.id == current_user.branch.id
        else:
            return False
    
    @staticmethod
    def get_accessible_users_queryset(current_user, base_queryset):
        """Filter users queryset based on access rights"""
        if current_user.role == Role.ADMIN.value:
            return base_queryset
        elif current_user.role == Role.BRANCH_HEAD.value:
            return base_queryset.filter(branch=current_user.branch)
        else:
            return base_queryset.filter(id=current_user.id)
    
    @staticmethod
    def get_accessible_leads_queryset(current_user, base_queryset):
        """Filter leads queryset based on access rights"""
        if current_user.role == Role.ADMIN.value:
            return base_queryset
        elif current_user.role == Role.BRANCH_HEAD.value:
            return base_queryset.filter(branch=current_user.branch)
        else:
            return base_queryset.filter(assigned_to=current_user)

def require_permission(permission: Permission):
    """Decorator to require specific permission"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            user_role = Role(request.user.role)
            if not RolePermissions.has_permission(user_role, permission):
                return JsonResponse({'error': 'Insufficient permissions'}, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def require_roles(allowed_roles: List[Role]):
    """Decorator to require specific roles"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not hasattr(request, 'user') or not request.user.is_authenticated:
                return JsonResponse({'error': 'Authentication required'}, status=401)
            
            user_role = Role(request.user.role)
            if user_role not in allowed_roles:
                return JsonResponse({'error': 'Insufficient permissions'}, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

class RBACMiddleware:
    """Middleware to add RBAC context to requests"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Add RBAC helper methods to request
        if hasattr(request, 'user') and request.user.is_authenticated:
            request.user_role = Role(request.user.role)
            request.user_permissions = RolePermissions.get_permissions(request.user_role)
            request.has_permission = lambda perm: RolePermissions.has_permission(request.user_role, perm)
            request.can_access_user = lambda target: ResourceAccess.can_access_user(request.user, target)
            request.can_access_lead = lambda lead: ResourceAccess.can_access_lead(request.user, lead)
            request.can_access_branch = lambda branch: ResourceAccess.can_access_branch(request.user, branch)
        
        response = self.get_response(request)
        return response

class AuditLog:
    """Audit logging for RBAC actions"""
    
    @staticmethod
    def log_access_attempt(user, resource_type, resource_id, action, success=True):
        """Log access attempts for auditing"""
        from .models import AuditLogEntry
        
        AuditLogEntry.objects.create(
            user=user,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            success=success,
            ip_address=getattr(user, 'current_ip', None),
            user_agent=getattr(user, 'current_user_agent', None)
        )
    
    @staticmethod
    def log_permission_denied(user, permission, resource_type=None, resource_id=None):
        """Log permission denied events"""
        AuditLog.log_access_attempt(
            user=user,
            resource_type=resource_type or 'permission',
            resource_id=resource_id or permission.value,
            action='access_denied',
            success=False
        )

# Utility functions for common permission checks
def check_user_management_permission(current_user, target_user, action):
    """Check user management permissions"""
    user_role = Role(current_user.role)
    
    if action == 'create':
        if not RolePermissions.has_permission(user_role, Permission.CREATE_USER):
            return False
    elif action == 'read':
        if not RolePermissions.has_permission(user_role, Permission.READ_USER):
            return False
    elif action == 'update':
        if not RolePermissions.has_permission(user_role, Permission.UPDATE_USER):
            return False
    elif action == 'delete':
        if not RolePermissions.has_permission(user_role, Permission.DELETE_USER):
            return False
    
    # Check resource access
    return ResourceAccess.can_access_user(current_user, target_user)

def check_lead_management_permission(current_user, lead, action):
    """Check lead management permissions"""
    user_role = Role(current_user.role)
    
    if action == 'create':
        if not RolePermissions.has_permission(user_role, Permission.CREATE_LEAD):
            return False
    elif action == 'read':
        if not RolePermissions.has_permission(user_role, Permission.READ_LEAD):
            return False
    elif action == 'update':
        if not RolePermissions.has_permission(user_role, Permission.UPDATE_LEAD):
            return False
    elif action == 'delete':
        if not RolePermissions.has_permission(user_role, Permission.DELETE_LEAD):
            return False
    elif action == 'assign':
        if not RolePermissions.has_permission(user_role, Permission.ASSIGN_LEAD):
            return False
    
    # Check resource access
    return ResourceAccess.can_access_lead(current_user, lead)

def get_user_context(user):
    """Get user context for frontend"""
    user_role = Role(user.role)
    permissions = RolePermissions.get_permissions(user_role)
    
    return {
        'user_id': str(user.id),
        'role': user.role,
        'permissions': [perm.value for perm in permissions],
        'branch_id': str(user.branch.id) if user.branch else None,
        'can_manage_users': RolePermissions.has_permission(user_role, Permission.CREATE_USER),
        'can_manage_leads': RolePermissions.has_permission(user_role, Permission.CREATE_LEAD),
        'can_view_reports': RolePermissions.has_permission(user_role, Permission.VIEW_REPORTS),
        'can_manage_branches': RolePermissions.has_permission(user_role, Permission.CREATE_BRANCH),
        'is_admin': user.role == Role.ADMIN.value,
        'is_branch_head': user.role == Role.BRANCH_HEAD.value
    }
