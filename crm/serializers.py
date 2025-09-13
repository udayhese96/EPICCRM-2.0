"""
DRF serializers for CRM models
"""
from rest_framework import serializers
from .models import Lead, Contact, Company, Activity, LeadStatus, LeadSource

class LeadStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadStatus
        fields = ['id', 'name', 'description', 'color', 'order_index']

class LeadSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadSource
        fields = ['id', 'name', 'description']

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'industry', 'website', 'phone', 'email',
            'address', 'city', 'state', 'country', 'postal_code',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class LeadSerializer(serializers.ModelSerializer):
    status_name = serializers.CharField(source='status.name', read_only=True)
    source_name = serializers.CharField(source='source.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Lead
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'company',
            'job_title', 'status', 'status_name', 'source', 'source_name',
            'value', 'probability', 'expected_close_date', 'notes',
            'created_at', 'updated_at', 'assigned_to', 'assigned_to_name',
            'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by_name']

class ContactSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source='company.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Contact
        fields = [
            'id', 'first_name', 'last_name', 'email', 'phone', 'mobile',
            'job_title', 'company', 'company_name', 'address', 'city',
            'state', 'country', 'postal_code', 'notes', 'created_at',
            'updated_at', 'assigned_to', 'assigned_to_name', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by_name']

class ActivitySerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.full_name', read_only=True)
    contact_name = serializers.CharField(source='contact.full_name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = Activity
        fields = [
            'id', 'title', 'description', 'activity_type', 'status', 'priority',
            'due_date', 'completed_at', 'lead', 'lead_name', 'contact',
            'contact_name', 'company', 'company_name', 'created_at', 'updated_at',
            'assigned_to', 'assigned_to_name', 'created_by_name'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by_name']
