"""
Custom middleware for CRM role-based access control
"""
from django.http import JsonResponse
from django.urls import resolve
from authentication.models import UserRoleAssignment

class RoleBasedAccessMiddleware:
    """
    Middleware to enforce role-based access control
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Define role-based URL access rules
        self.role_access_rules = {
            'Admin': ['*'],  # Admin can access everything
            'Manager': [
                'dashboard', 'leads', 'contacts', 'companies', 'activities',
                'reports', 'analytics'
            ],
            'Sales Rep': [
                'dashboard', 'leads', 'contacts', 'activities'
            ],
            'Viewer': [
                'dashboard'  # Read-only dashboard access
            ]
        }
    
    def __call__(self, request):
        # Process the request
        response = self.get_response(request)
        return response
    
    def process_view(self, request, view_func, view_args, view_kwargs):
        """
        Process view to check role-based access
        """
        # Skip for unauthenticated users (handled by auth middleware)
        if not request.user.is_authenticated:
            return None
        
        # Skip for superusers
        if request.user.is_superuser:
            return None
        
        # Get current URL name
        try:
            url_name = resolve(request.path_info).url_name
        except:
            return None
        
        # Skip for auth URLs
        if url_name in ['login', 'logout', 'api_login', 'api_logout']:
            return None
        
        # Get user roles
        user_roles = list(
            UserRoleAssignment.objects.filter(user=request.user)
            .values_list('role__name', flat=True)
        )
        
        # Check if user has any roles
        if not user_roles:
            return JsonResponse({
                'error': 'Access denied. No roles assigned.'
            }, status=403)
        
        # Check access permissions
        has_access = False
        for role in user_roles:
            if role in self.role_access_rules:
                allowed_urls = self.role_access_rules[role]
                if '*' in allowed_urls or any(allowed in request.path_info for allowed in allowed_urls):
                    has_access = True
                    break
        
        if not has_access:
            return JsonResponse({
                'error': 'Access denied. Insufficient permissions.'
            }, status=403)
        
        return None

class UserRoleContextMiddleware:
    """
    Middleware to add user role context to requests
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Add user roles to request context
        if request.user.is_authenticated:
            request.user_roles = list(
                UserRoleAssignment.objects.filter(user=request.user)
                .select_related('role')
                .values_list('role__name', flat=True)
            )
            
            # Add role permissions
            request.user_permissions = {}
            for role_assignment in UserRoleAssignment.objects.filter(user=request.user).select_related('role'):
                role_permissions = role_assignment.role.permissions or {}
                request.user_permissions.update(role_permissions)
        else:
            request.user_roles = []
            request.user_permissions = {}
        
        response = self.get_response(request)
        return response
