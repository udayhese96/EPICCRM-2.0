"""
Django views for CRM system
"""
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Count
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Lead, Contact, Company, Activity, LeadStatus, LeadSource
from .serializers import (
    LeadSerializer, ContactSerializer, CompanySerializer, 
    ActivitySerializer, LeadStatusSerializer, LeadSourceSerializer
)
from .permissions import LeadPermission, ContactPermission, CompanyPermission, ActivityPermission
from .decorators import require_role, manager_or_admin_required

class LeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing leads
    """
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated, LeadPermission]
    
    def get_queryset(self):
        queryset = Lead.objects.all()
        
        # Role-based filtering
        if not self.request.user.is_superuser and not self.request.user.is_staff:
            # Regular users can only see their assigned leads
            queryset = queryset.filter(assigned_to=self.request.user)
        
        # Filter by status if provided
        status_id = self.request.query_params.get('status_id')
        if status_id:
            queryset = queryset.filter(status_id=status_id)
            
        # Filter by assigned user if provided
        assigned_to = self.request.query_params.get('assigned_to')
        if assigned_to:
            queryset = queryset.filter(assigned_to=assigned_to)
            
        return queryset.select_related('status', 'source', 'assigned_to', 'created_by')
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            assigned_to=serializer.validated_data.get('assigned_to', self.request.user)
        )

class ContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing contacts
    """
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated, ContactPermission]
    
    def get_queryset(self):
        queryset = Contact.objects.all()
        
        # Role-based filtering
        if not self.request.user.is_superuser and not self.request.user.is_staff:
            queryset = queryset.filter(assigned_to=self.request.user)
            
        return queryset.select_related('company', 'assigned_to', 'created_by')
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            assigned_to=serializer.validated_data.get('assigned_to', self.request.user)
        )

class CompanyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing companies
    """
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated, CompanyPermission]
    queryset = Company.objects.all()
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class ActivityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing activities
    """
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated, ActivityPermission]
    
    def get_queryset(self):
        queryset = Activity.objects.all()
        
        # Role-based filtering
        if not self.request.user.is_superuser and not self.request.user.is_staff:
            queryset = queryset.filter(assigned_to=self.request.user)
            
        # Filter by lead if provided
        lead_id = self.request.query_params.get('lead_id')
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
            
        # Filter by contact if provided
        contact_id = self.request.query_params.get('contact_id')
        if contact_id:
            queryset = queryset.filter(contact_id=contact_id)
            
        return queryset.select_related('lead', 'contact', 'company', 'assigned_to', 'created_by')
    
    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            assigned_to=serializer.validated_data.get('assigned_to', self.request.user)
        )

class LeadStatusViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for lead statuses (read-only)
    """
    serializer_class = LeadStatusSerializer
    permission_classes = [IsAuthenticated]
    queryset = LeadStatus.objects.filter(is_active=True).order_by('order_index')

class LeadSourceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for lead sources (read-only)
    """
    serializer_class = LeadSourceSerializer
    permission_classes = [IsAuthenticated]
    queryset = LeadSource.objects.filter(is_active=True)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    Get dashboard statistics
    """
    user = request.user
    
    # Base queries
    leads_query = Lead.objects.all()
    contacts_query = Contact.objects.all()
    activities_query = Activity.objects.all()
    
    # Apply role-based filtering
    if not user.is_superuser and not user.is_staff:
        leads_query = leads_query.filter(assigned_to=user)
        contacts_query = contacts_query.filter(assigned_to=user)
        activities_query = activities_query.filter(assigned_to=user)
    
    # Calculate stats
    total_leads = leads_query.count()
    total_contacts = contacts_query.count()
    total_activities = activities_query.count()
    
    # Leads by status
    leads_by_status = list(
        LeadStatus.objects.filter(
            leads__in=leads_query,
            is_active=True
        ).annotate(
            count=Count('leads')
        ).values('name', 'count')
    )
    
    # Recent activities
    recent_activities = activities_query.order_by('-created_at')[:5]
    recent_activities_data = ActivitySerializer(recent_activities, many=True).data
    
    return Response({
        'total_leads': total_leads,
        'total_contacts': total_contacts,
        'total_activities': total_activities,
        'leads_by_status': [{'status': item['name'], 'count': item['count']} for item in leads_by_status],
        'recent_activities': recent_activities_data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@manager_or_admin_required
def admin_dashboard_stats(request):
    """
    Get comprehensive dashboard statistics for managers and admins
    """
    # Get all data without user filtering
    total_leads = Lead.objects.count()
    total_contacts = Contact.objects.count()
    total_activities = Activity.objects.count()
    total_companies = Company.objects.count()
    
    # Performance metrics
    leads_by_status = list(
        LeadStatus.objects.filter(is_active=True)
        .annotate(count=Count('leads'))
        .values('name', 'count', 'color')
    )
    
    # User performance
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    user_performance = list(
        User.objects.filter(is_active=True)
        .annotate(
            leads_count=Count('assigned_leads'),
            activities_count=Count('assigned_activities')
        )
        .values('username', 'first_name', 'last_name', 'leads_count', 'activities_count')
    )
    
    return Response({
        'total_leads': total_leads,
        'total_contacts': total_contacts,
        'total_activities': total_activities,
        'total_companies': total_companies,
        'leads_by_status': leads_by_status,
        'user_performance': user_performance
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_role(['Admin'])
def user_roles_management(request):
    """
    Get user roles for admin management
    """
    from authentication.models import UserRoleAssignment, UserRole
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    users_with_roles = []
    for user in User.objects.filter(is_active=True):
        user_roles = list(
            UserRoleAssignment.objects.filter(user=user)
            .select_related('role')
            .values('role__name', 'assigned_at')
        )
        
        users_with_roles.append({
            'id': user.id,
            'username': user.username,
            'full_name': user.get_full_name(),
            'email': user.email,
            'roles': user_roles,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser
        })
    
    available_roles = list(UserRole.objects.values('id', 'name', 'description'))
    
    return Response({
        'users': users_with_roles,
        'available_roles': available_roles
    })
