from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from supabase import create_client
from django.conf import settings
from .models import User, Branch, Lead, LeadActivity, AuditLogEntry
from .serializers import (UserSerializer, UserCreateSerializer, UserUpdateSerializer, 
                         BranchSerializer, LeadSerializer, LeadCreateSerializer, LeadUpdateSerializer, 
                         LeadListSerializer, LeadActivitySerializer, LeadActivityCreateSerializer)
from .permissions import IsAdminOrBranchHead, CanManageLeads
from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.core.exceptions import PermissionDenied
from .rbac import (
    Role, Permission, RolePermissions, ResourceAccess, 
    require_permission, require_roles, check_user_management_permission,
    check_lead_management_permission, get_user_context, AuditLog
)

class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, IsAdminOrBranchHead]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        user = self.request.user
        return ResourceAccess.get_accessible_users_queryset(user, User.objects.all())
    
    def perform_create(self, serializer):
        if not check_user_management_permission(self.request.user, None, 'create'):
            raise PermissionDenied("Insufficient permissions to create user")
        
        user = serializer.save()
        AuditLog.log_access_attempt(
            user=self.request.user,
            resource_type='user',
            resource_id=str(user.id),
            action='create'
        )

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_queryset(self):
        user = self.request.user
        return ResourceAccess.get_accessible_users_queryset(user, User.objects.all())
    
    def perform_update(self, serializer):
        target_user = self.get_object()
        if not check_user_management_permission(self.request.user, target_user, 'update'):
            raise PermissionDenied("Insufficient permissions to update user")
        
        serializer.save()
        AuditLog.log_access_attempt(
            user=self.request.user,
            resource_type='user',
            resource_id=str(target_user.id),
            action='update'
        )
    
    def perform_destroy(self, instance):
        if not check_user_management_permission(self.request.user, instance, 'delete'):
            raise PermissionDenied("Insufficient permissions to delete user")
        
        AuditLog.log_access_attempt(
            user=self.request.user,
            resource_type='user',
            resource_id=str(instance.id),
            action='delete'
        )
        instance.delete()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current authenticated user details"""
    serializer = UserSerializer(request.user)
    user_data = serializer.data
    user_data['rbac_context'] = get_user_context(request.user)
    return Response(user_data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password"""
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')
    
    if not user.check_password(old_password):
        AuditLog.log_access_attempt(
            user=user,
            resource_type='user',
            resource_id=str(user.id),
            action='change_password',
            success=False
        )
        return Response({'error': 'Invalid old password'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    user.set_password(new_password)
    user.save()
    
    AuditLog.log_access_attempt(
        user=user,
        resource_type='user',
        resource_id=str(user.id),
        action='change_password'
    )
    
    return Response({'message': 'Password changed successfully'})

@api_view(['POST'])
def register_user(request):
    """Register new user with Supabase"""
    try:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        email = request.data.get('email')
        password = request.data.get('password')
        user_data = request.data
        
        # Create user in Supabase
        auth_response = supabase.auth.admin_create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        
        if auth_response.user:
            # Create user in Django
            user_data['id'] = auth_response.user.id
            serializer = UserCreateSerializer(data=user_data)
            if serializer.is_valid():
                user = serializer.save()
                AuditLog.log_access_attempt(
                    user=user,
                    resource_type='user',
                    resource_id=str(user.id),
                    action='register'
                )
                return Response(UserSerializer(user).data, 
                              status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, 
                              status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'error': 'Failed to create user'}, 
                       status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({'error': str(e)}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class BranchListView(generics.ListAPIView):
    queryset = Branch.objects.filter(is_active=True)
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]

class LeadListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, CanManageLeads]
    filter_backends = [DjangoFilterBackend, filters.SearchBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'source', 'assigned_to', 'branch']
    search_fields = ['name', 'email', 'phone', 'company']
    ordering_fields = ['created_at', 'updated_at', 'expected_value']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LeadCreateSerializer
        return LeadListSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Lead.objects.select_related('assigned_to', 'branch').prefetch_related('activities')
        return ResourceAccess.get_accessible_leads_queryset(user, queryset)
    
    def perform_create(self, serializer):
        if not check_lead_management_permission(self.request.user, None, 'create'):
            raise PermissionDenied("Insufficient permissions to create lead")
        
        user = self.request.user
        lead = serializer.save(
            branch=user.branch,
            assigned_to=serializer.validated_data.get('assigned_to', user)
        )
        
        # Create initial activity
        LeadActivity.objects.create(
            lead=lead,
            user=user,
            activity_type='note',
            subject='Lead Created',
            description=f'Lead created by {user.get_full_name() or user.username}'
        )
        
        AuditLog.log_access_attempt(
            user=user,
            resource_type='lead',
            resource_id=str(lead.id),
            action='create'
        )

class LeadDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, CanManageLeads]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return LeadUpdateSerializer
        return LeadSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Lead.objects.select_related('assigned_to', 'branch').prefetch_related('activities__user')
        return ResourceAccess.get_accessible_leads_queryset(user, queryset)
    
    def perform_update(self, serializer):
        old_instance = self.get_object()
        if not check_lead_management_permission(self.request.user, old_instance, 'update'):
            raise PermissionDenied("Insufficient permissions to update lead")
        
        new_instance = serializer.save()
        
        # Track status changes
        if old_instance.status != new_instance.status:
            LeadActivity.objects.create(
                lead=new_instance,
                user=self.request.user,
                activity_type='note',
                subject='Status Changed',
                description=f'Status changed from {old_instance.get_status_display()} to {new_instance.get_status_display()}'
            )
        
        AuditLog.log_access_attempt(
            user=self.request.user,
            resource_type='lead',
            resource_id=str(new_instance.id),
            action='update'
        )
    
    def perform_destroy(self, instance):
        if not check_lead_management_permission(self.request.user, instance, 'delete'):
            raise PermissionDenied("Insufficient permissions to delete lead")
        
        AuditLog.log_access_attempt(
            user=self.request.user,
            resource_type='lead',
            resource_id=str(instance.id),
            action='delete'
        )
        instance.delete()

class LeadActivityListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, CanManageLeads]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LeadActivityCreateSerializer
        return LeadActivitySerializer
    
    def get_queryset(self):
        lead_id = self.kwargs['lead_id']
        return LeadActivity.objects.filter(lead_id=lead_id).select_related('user').order_by('-created_at')
    
    def perform_create(self, serializer):
        lead_id = self.kwargs['lead_id']
        lead = Lead.objects.get(id=lead_id)
        
        if not check_lead_management_permission(self.request.user, lead, 'update'):
            raise PermissionDenied("You can only add activities to leads you can access")
        
        activity = serializer.save(lead_id=lead_id, user=self.request.user)
        
        AuditLog.log_access_attempt(
            user=self.request.user,
            resource_type='lead_activity',
            resource_id=str(activity.id),
            action='create'
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lead_statistics(request):
    """Get lead statistics for dashboard"""
    user = request.user
    
    # Base queryset based on user role
    if user.role == 'admin':
        queryset = Lead.objects.all()
    elif user.role == 'branch_head':
        queryset = Lead.objects.filter(branch=user.branch)
    else:
        queryset = Lead.objects.filter(assigned_to=user)
    
    # Calculate statistics
    total_leads = queryset.count()
    new_leads = queryset.filter(status='new').count()
    qualified_leads = queryset.filter(status='qualified').count()
    closed_won = queryset.filter(status='closed_won').count()
    closed_lost = queryset.filter(status='closed_lost').count()
    
    # Status distribution
    status_distribution = queryset.values('status').annotate(count=Count('id'))
    
    # Source distribution
    source_distribution = queryset.values('source').annotate(count=Count('id'))
    
    # Monthly trends (last 6 months)
    from datetime import datetime, timedelta
    from django.db.models import Count
    from django.db.models.functions import TruncMonth
    
    six_months_ago = datetime.now() - timedelta(days=180)
    monthly_trends = (queryset
                     .filter(created_at__gte=six_months_ago)
                     .annotate(month=TruncMonth('created_at'))
                     .values('month')
                     .annotate(count=Count('id'))
                     .order_by('month'))
    
    return Response({
        'total_leads': total_leads,
        'new_leads': new_leads,
        'qualified_leads': qualified_leads,
        'closed_won': closed_won,
        'closed_lost': closed_lost,
        'conversion_rate': round((closed_won / total_leads * 100) if total_leads > 0 else 0, 2),
        'status_distribution': list(status_distribution),
        'source_distribution': list(source_distribution),
        'monthly_trends': list(monthly_trends)
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated, CanManageLeads])
def bulk_assign_leads(request):
    """Bulk assign leads to a user"""
    lead_ids = request.data.get('lead_ids', [])
    assigned_to_id = request.data.get('assigned_to')
    
    if not lead_ids or not assigned_to_id:
        return Response({'error': 'lead_ids and assigned_to are required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    try:
        assigned_to = User.objects.get(id=assigned_to_id)
        user = request.user
        
        # Get leads based on user permissions
        if user.role == 'admin':
            leads = Lead.objects.filter(id__in=lead_ids)
        elif user.role == 'branch_head':
            leads = Lead.objects.filter(id__in=lead_ids, branch=user.branch)
        else:
            return Response({'error': 'Insufficient permissions'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        # Update leads
        updated_count = leads.update(assigned_to=assigned_to)
        
        # Create activities for each lead
        for lead in leads:
            LeadActivity.objects.create(
                lead=lead,
                user=user,
                activity_type='note',
                subject='Lead Reassigned',
                description=f'Lead assigned to {assigned_to.get_full_name() or assigned_to.username}'
            )
        
        return Response({
            'message': f'{updated_count} leads assigned successfully',
            'updated_count': updated_count
        })
        
    except User.DoesNotExist:
        return Response({'error': 'Assigned user not found'}, 
                       status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated, CanManageLeads])
def bulk_update_status(request):
    """Bulk update lead status"""
    lead_ids = request.data.get('lead_ids', [])
    new_status = request.data.get('status')
    
    if not lead_ids or not new_status:
        return Response({'error': 'lead_ids and status are required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = request.user
        
        # Get leads based on user permissions
        if user.role == 'admin':
            leads = Lead.objects.filter(id__in=lead_ids)
        elif user.role == 'branch_head':
            leads = Lead.objects.filter(id__in=lead_ids, branch=user.branch)
        else:
            leads = Lead.objects.filter(id__in=lead_ids, assigned_to=user)
        
        # Update leads
        updated_count = leads.update(status=new_status)
        
        # Create activities for each lead
        for lead in leads:
            LeadActivity.objects.create(
                lead=lead,
                user=user,
                activity_type='note',
                subject='Status Updated',
                description=f'Status changed to {new_status}'
            )
        
        return Response({
            'message': f'{updated_count} leads updated successfully',
            'updated_count': updated_count
        })
        
    except Exception as e:
        return Response({'error': str(e)}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_permissions(request):
    """Get current user's permissions and context"""
    return Response(get_user_context(request.user))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_logs(request):
    """Get audit logs (admin only)"""
    user_role = Role(request.user.role)
    if not RolePermissions.has_permission(user_role, Permission.VIEW_AUDIT_LOGS):
        return Response({'error': 'Insufficient permissions'}, status=403)
    
    logs = AuditLogEntry.objects.select_related('user').order_by('-created_at')[:100]
    
    log_data = []
    for log in logs:
        log_data.append({
            'id': str(log.id),
            'user': log.user.username if log.user else 'System',
            'resource_type': log.resource_type,
            'resource_id': log.resource_id,
            'action': log.action,
            'success': log.success,
            'created_at': log.created_at,
            'details': log.details
        })
    
    return Response({'logs': log_data})
