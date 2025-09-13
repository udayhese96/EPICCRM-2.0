from rest_framework import serializers
from .models import User, Branch, Lead, LeadActivity

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'code', 'city', 'state']

class UserSerializer(serializers.ModelSerializer):
    branch = BranchSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                 'role', 'branch', 'phone', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 
                 'password', 'role', 'branch', 'phone']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'role', 'branch', 'phone', 'is_active']

class LeadActivitySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = LeadActivity
        fields = ['id', 'activity_type', 'subject', 'description', 
                 'scheduled_at', 'completed_at', 'user', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class LeadActivityCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadActivity
        fields = ['activity_type', 'subject', 'description', 'scheduled_at']

class LeadSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    branch = BranchSerializer(read_only=True)
    activities = LeadActivitySerializer(many=True, read_only=True)
    activities_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = ['id', 'name', 'email', 'phone', 'company', 'status', 
                 'source', 'assigned_to', 'branch', 'notes', 'expected_value',
                 'activities', 'activities_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_activities_count(self, obj):
        return obj.activities.count()

class LeadCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ['name', 'email', 'phone', 'company', 'source', 
                 'notes', 'expected_value', 'assigned_to']

class LeadUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = ['name', 'email', 'phone', 'company', 'status', 
                 'source', 'notes', 'expected_value', 'assigned_to']

class LeadListSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    branch = BranchSerializer(read_only=True)
    activities_count = serializers.SerializerMethodField()
    last_activity = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = ['id', 'name', 'email', 'phone', 'company', 'status', 
                 'source', 'assigned_to', 'branch', 'expected_value',
                 'activities_count', 'last_activity', 'created_at', 'updated_at']
    
    def get_activities_count(self, obj):
        return obj.activities.count()
    
    def get_last_activity(self, obj):
        last_activity = obj.activities.order_by('-created_at').first()
        if last_activity:
            return {
                'type': last_activity.activity_type,
                'subject': last_activity.subject,
                'date': last_activity.created_at
            }
        return None
