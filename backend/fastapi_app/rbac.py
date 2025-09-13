"""
FastAPI Role-Based Access Control (RBAC) System
"""
from fastapi import HTTPException, status, Depends
from functools import wraps
from typing import List, Set, Optional
from enum import Enum
from .auth import get_current_user, CurrentUser

class Role(str, Enum):
    ADMIN = "admin"
    BRANCH_HEAD = "branch_head"
    CRE = "cre"
    PS = "ps"
    RECEPTIONIST = "receptionist"

class Permission(str, Enum):
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
    
    ROLE_PERMISSIONS = {
        Role.ADMIN: {
            Permission.CREATE_USER, Permission.READ_USER, Permission.UPDATE_USER, Permission.DELETE_USER,
            Permission.CREATE_LEAD, Permission.READ_LEAD, Permission.UPDATE_LEAD, Permission.DELETE_LEAD,
            Permission.ASSIGN_LEAD, Permission.BULK_UPDATE_LEADS,
            Permission.CREATE_BRANCH, Permission.READ_BRANCH, Permission.UPDATE_BRANCH, Permission.DELETE_BRANCH,
            Permission.CREATE_ACTIVITY, Permission.READ_ACTIVITY, Permission.UPDATE_ACTIVITY, Permission.DELETE_ACTIVITY,
            Permission.VIEW_REPORTS, Permission.VIEW_ANALYTICS, Permission.EXPORT_DATA,
            Permission.MANAGE_SYSTEM, Permission.VIEW_AUDIT_LOGS
        },
        
        Role.BRANCH_HEAD: {
            Permission.CREATE_USER, Permission.READ_USER, Permission.UPDATE_USER,
            Permission.CREATE_LEAD, Permission.READ_LEAD, Permission.UPDATE_LEAD, Permission.DELETE_LEAD,
            Permission.ASSIGN_LEAD, Permission.BULK_UPDATE_LEADS,
            Permission.READ_BRANCH,
            Permission.CREATE_ACTIVITY, Permission.READ_ACTIVITY, Permission.UPDATE_ACTIVITY, Permission.DELETE_ACTIVITY,
            Permission.VIEW_REPORTS, Permission.VIEW_ANALYTICS, Permission.EXPORT_DATA
        },
        
        Role.CRE: {
            Permission.CREATE_LEAD, Permission.READ_LEAD, Permission.UPDATE_LEAD,
            Permission.CREATE_ACTIVITY, Permission.READ_ACTIVITY, Permission.UPDATE_ACTIVITY,
            Permission.VIEW_REPORTS
        },
        
        Role.PS: {
            Permission.CREATE_LEAD, Permission.READ_LEAD, Permission.UPDATE_LEAD,
            Permission.CREATE_ACTIVITY, Permission.READ_ACTIVITY, Permission.UPDATE_ACTIVITY,
            Permission.VIEW_REPORTS
        },
        
        Role.RECEPTIONIST: {
            Permission.CREATE_LEAD, Permission.READ_LEAD,
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
    """Resource access control logic"""
    
    @staticmethod
    def can_access_user(current_user: CurrentUser, target_user_data: dict) -> bool:
        """Check if current user can access target user"""
        if current_user.role == Role.ADMIN:
            return True
        elif current_user.role == Role.BRANCH_HEAD:
            return target_user_data.get('branch_id') == current_user.branch_id
        else:
            return current_user.id == target_user_data.get('id')
    
    @staticmethod
    def can_access_lead(current_user: CurrentUser, lead_data: dict) -> bool:
        """Check if current user can access lead"""
        if current_user.role == Role.ADMIN:
            return True
        elif current_user.role == Role.BRANCH_HEAD:
            return lead_data.get('branch_id') == current_user.branch_id
        else:
            return lead_data.get('assigned_to') == current_user.id
    
    @staticmethod
    def can_access_branch(current_user: CurrentUser, branch_data: dict) -> bool:
        """Check if current user can access branch"""
        if current_user.role == Role.ADMIN:
            return True
        elif current_user.role == Role.BRANCH_HEAD:
            return branch_data.get('id') == current_user.branch_id
        else:
            return False

def require_permission(permission: Permission):
    """Dependency to require specific permission"""
    def permission_checker(current_user: CurrentUser = Depends(get_current_user)):
        user_role = Role(current_user.role)
        if not RolePermissions.has_permission(user_role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission {permission.value} required"
            )
        return current_user
    return permission_checker

def require_roles(allowed_roles: List[Role]):
    """Dependency to require specific roles"""
    def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        user_role = Role(current_user.role)
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of roles {[r.value for r in allowed_roles]} required"
            )
        return current_user
    return role_checker

def check_resource_access(resource_type: str, resource_data: dict):
    """Dependency to check resource access"""
    def access_checker(current_user: CurrentUser = Depends(get_current_user)):
        if resource_type == "user":
            if not ResourceAccess.can_access_user(current_user, resource_data):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this user"
                )
        elif resource_type == "lead":
            if not ResourceAccess.can_access_lead(current_user, resource_data):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this lead"
                )
        elif resource_type == "branch":
            if not ResourceAccess.can_access_branch(current_user, resource_data):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this branch"
                )
        return current_user
    return access_checker

# Common permission dependencies
admin_required = require_roles([Role.ADMIN])
admin_or_branch_head = require_roles([Role.ADMIN, Role.BRANCH_HEAD])
can_manage_leads = require_roles([Role.ADMIN, Role.BRANCH_HEAD, Role.CRE, Role.PS])
can_create_users = require_permission(Permission.CREATE_USER)
can_view_reports = require_permission(Permission.VIEW_REPORTS)
can_manage_branches = require_permission(Permission.CREATE_BRANCH)

def get_user_context(current_user: CurrentUser) -> dict:
    """Get user context for frontend"""
    user_role = Role(current_user.role)
    permissions = RolePermissions.get_permissions(user_role)
    
    return {
        'user_id': current_user.id,
        'role': current_user.role,
        'permissions': [perm.value for perm in permissions],
        'branch_id': current_user.branch_id,
        'can_manage_users': RolePermissions.has_permission(user_role, Permission.CREATE_USER),
        'can_manage_leads': RolePermissions.has_permission(user_role, Permission.CREATE_LEAD),
        'can_view_reports': RolePermissions.has_permission(user_role, Permission.VIEW_REPORTS),
        'can_manage_branches': RolePermissions.has_permission(user_role, Permission.CREATE_BRANCH),
        'is_admin': current_user.role == Role.ADMIN,
        'is_branch_head': current_user.role == Role.BRANCH_HEAD
    }

class AuditLogger:
    """Audit logging for FastAPI"""
    
    @staticmethod
    async def log_access_attempt(
        current_user: CurrentUser,
        resource_type: str,
        resource_id: str,
        action: str,
        success: bool = True,
        details: dict = None
    ):
        """Log access attempts"""
        from supabase import create_client
        from decouple import config
        
        supabase = create_client(
            config('SUPABASE_URL'),
            config('SUPABASE_SERVICE_ROLE_KEY')
        )
        
        log_entry = {
            "user_id": current_user.id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
            "success": success,
            "details": details or {}
        }
        
        try:
            supabase.table('audit_log_entries').insert(log_entry).execute()
        except Exception as e:
            # Log to system logger if database logging fails
            print(f"Failed to log audit entry: {e}")
    
    @staticmethod
    async def log_permission_denied(
        current_user: CurrentUser,
        permission: Permission,
        resource_type: str = None,
        resource_id: str = None
    ):
        """Log permission denied events"""
        await AuditLogger.log_access_attempt(
            current_user=current_user,
            resource_type=resource_type or 'permission',
            resource_id=resource_id or permission.value,
            action='access_denied',
            success=False,
            details={'denied_permission': permission.value}
        )
