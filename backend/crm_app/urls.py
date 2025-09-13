from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', views.register_user, name='register'),
    path('auth/me/', views.current_user, name='current_user'),
    path('auth/change-password/', views.change_password, name='change_password'),
    
    # User management endpoints
    path('users/', views.UserListCreateView.as_view(), name='user_list_create'),
    path('users/<uuid:pk>/', views.UserDetailView.as_view(), name='user_detail'),
    
    # Branch endpoints
    path('branches/', views.BranchListView.as_view(), name='branch_list'),
    
    # Lead management endpoints
    path('leads/', views.LeadListCreateView.as_view(), name='lead_list_create'),
    path('leads/<uuid:pk>/', views.LeadDetailView.as_view(), name='lead_detail'),
    path('leads/<uuid:lead_id>/activities/', views.LeadActivityListCreateView.as_view(), name='lead_activities'),
    path('leads/statistics/', views.lead_statistics, name='lead_statistics'),
    path('leads/bulk-assign/', views.bulk_assign_leads, name='bulk_assign_leads'),
    path('leads/bulk-update-status/', views.bulk_update_status, name='bulk_update_status'),
]
