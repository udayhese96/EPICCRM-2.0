from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Branch, Lead, LeadActivity, AuditLog

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'branch', 'is_active')
    list_filter = ('role', 'branch', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    fieldsets = UserAdmin.fieldsets + (
        ('CRM Info', {'fields': ('role', 'phone', 'branch')}),
    )

@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'phone', 'is_active')
    list_filter = ('city', 'state', 'is_active')
    search_fields = ('name', 'city', 'phone', 'email')

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'company', 'email', 'phone', 'status', 'priority', 'assigned_to', 'created_at')
    list_filter = ('status', 'priority', 'source', 'branch', 'assigned_to', 'created_at')
    search_fields = ('first_name', 'last_name', 'email', 'phone', 'company')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'company', 'designation')
        }),
        ('Lead Details', {
            'fields': ('status', 'priority', 'source', 'estimated_value', 'expected_close_date')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'branch')
        }),
        ('Address', {
            'fields': ('address', 'city', 'state', 'pincode')
        }),
        ('Additional', {
            'fields': ('notes',)
        }),
    )

@admin.register(LeadActivity)
class LeadActivityAdmin(admin.ModelAdmin):
    list_display = ('lead', 'activity_type', 'subject', 'assigned_to', 'is_completed', 'created_at')
    list_filter = ('activity_type', 'is_completed', 'assigned_to', 'created_at')
    search_fields = ('lead__first_name', 'lead__last_name', 'subject', 'description')
    date_hierarchy = 'created_at'

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'model_name', 'timestamp', 'ip_address')
    list_filter = ('action', 'model_name', 'timestamp')
    search_fields = ('user__username', 'model_name', 'ip_address')
    date_hierarchy = 'timestamp'
    readonly_fields = ('user', 'action', 'model_name', 'object_id', 'changes', 'ip_address', 'user_agent', 'timestamp')
