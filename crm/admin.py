"""
Django admin configuration for CRM models
"""
from django.contrib import admin
from .models import Company, Lead, Contact, Activity, LeadStatus, LeadSource

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'industry', 'city', 'country', 'created_at']
    list_filter = ['industry', 'country', 'created_at']
    search_fields = ['name', 'industry', 'city']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(LeadStatus)
class LeadStatusAdmin(admin.ModelAdmin):
    list_display = ['name', 'color', 'order_index', 'is_active']
    list_editable = ['order_index', 'is_active']
    ordering = ['order_index']

@admin.register(LeadSource)
class LeadSourceAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active']
    list_editable = ['is_active']

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'company', 'status', 'assigned_to', 'created_at']
    list_filter = ['status', 'source', 'assigned_to', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'company']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['assigned_to', 'created_by']
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'email', 'phone')
        }),
        ('Company Information', {
            'fields': ('company', 'job_title')
        }),
        ('Lead Details', {
            'fields': ('status', 'source', 'value', 'probability', 'expected_close_date')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'created_by')
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'company', 'job_title', 'assigned_to', 'created_at']
    list_filter = ['company', 'assigned_to', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'company__name']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['company', 'assigned_to', 'created_by']

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['title', 'activity_type', 'status', 'priority', 'due_date', 'assigned_to']
    list_filter = ['activity_type', 'status', 'priority', 'assigned_to', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['lead', 'contact', 'company', 'assigned_to', 'created_by']
    
    fieldsets = (
        ('Activity Details', {
            'fields': ('title', 'description', 'activity_type', 'status', 'priority')
        }),
        ('Scheduling', {
            'fields': ('due_date', 'completed_at')
        }),
        ('Related Records', {
            'fields': ('lead', 'contact', 'company')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'created_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
