"""
Custom decorators for role-based access control
"""
from functools import wraps
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from authentication.models import UserRoleAssignment

def require_role(required_roles):
    """
    Decorator to require specific roles for view access
    
    Usage:
    @require_role(['Admin', 'Manager'])
    def my_view(request):
        ...
    """
    if isinstance(required_roles, str):
        required_roles = [required_roles]
    
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                raise PermissionDenied("Authentication required")
            
            # Superusers bypass role checks
            if request.user.is_superuser:
                return view_func(request, *args, **kwargs)
            
            # Get user roles
            user_roles = list(
                UserRoleAssignment.objects.filter(user=request.user)
                .values_list('role__name', flat=True)
            )
            
            # Check if user has any of the required roles
            if not any(role in user_roles for role in required_roles):
                if request.content_type == 'application/json':
                    return JsonResponse({
                        'error': f'Access denied. Required roles: {", ".join(required_roles)}'
                    }, status=403)
                else:
                    raise PermissionDenied(f'Access denied. Required roles: {", ".join(required_roles)}')
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def require_permission(permission_key):
    """
    Decorator to require specific permission for view access
    
    Usage:
    @require_permission('can_delete_leads')
    def delete_lead_view(request):
        ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                raise PermissionDenied("Authentication required")
            
            # Superusers bypass permission checks
            if request.user.is_superuser:
                return view_func(request, *args, **kwargs)
            
            # Check user permissions
            user_permissions = getattr(request, 'user_permissions', {})
            
            if not user_permissions.get(permission_key, False):
                if request.content_type == 'application/json':
                    return JsonResponse({
                        'error': f'Access denied. Required permission: {permission_key}'
                    }, status=403)
                else:
                    raise PermissionDenied(f'Access denied. Required permission: {permission_key}')
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def admin_required(view_func):
    """
    Decorator to require admin role
    """
    return require_role(['Admin'])(view_func)

def manager_or_admin_required(view_func):
    """
    Decorator to require manager or admin role
    """
    return require_role(['Admin', 'Manager'])(view_func)
