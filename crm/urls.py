"""
URL configuration for CRM app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'leads', views.LeadViewSet)
router.register(r'contacts', views.ContactViewSet)
router.register(r'companies', views.CompanyViewSet)
router.register(r'activities', views.ActivityViewSet)
router.register(r'lead-statuses', views.LeadStatusViewSet)
router.register(r'lead-sources', views.LeadSourceViewSet)

app_name = 'crm'

urlpatterns = [
    # API endpoints
    path('', include(router.urls)),
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
]
