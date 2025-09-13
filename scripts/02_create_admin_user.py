"""
Create initial admin user and assign admin role
"""
import os
import django
from django.contrib.auth import get_user_model
from authentication.models import UserRole, UserRoleAssignment

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

User = get_user_model()

def create_admin_user():
    """Create initial admin user"""
    
    # Create admin user if it doesn't exist
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@epiccrm.com',
            'first_name': 'System',
            'last_name': 'Administrator',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True
        }
    )
    
    if created:
        admin_user.set_password('admin123')  # Change this in production!
        admin_user.save()
        print(f"Created admin user: {admin_user.username}")
    else:
        print(f"Admin user already exists: {admin_user.username}")
    
    # Assign Admin role
    try:
        admin_role = UserRole.objects.get(name='Admin')
        role_assignment, created = UserRoleAssignment.objects.get_or_create(
            user=admin_user,
            role=admin_role,
            defaults={'assigned_by': admin_user}
        )
        
        if created:
            print(f"Assigned Admin role to {admin_user.username}")
        else:
            print(f"Admin role already assigned to {admin_user.username}")
            
    except UserRole.DoesNotExist:
        print("Admin role not found. Please run the SQL script first.")
    
    return admin_user

def create_sample_users():
    """Create sample users with different roles"""
    
    sample_users = [
        {
            'username': 'manager1',
            'email': 'manager@epiccrm.com',
            'first_name': 'John',
            'last_name': 'Manager',
            'role': 'Manager'
        },
        {
            'username': 'sales1',
            'email': 'sales1@epiccrm.com',
            'first_name': 'Jane',
            'last_name': 'Sales',
            'role': 'Sales Rep'
        },
        {
            'username': 'sales2',
            'email': 'sales2@epiccrm.com',
            'first_name': 'Mike',
            'last_name': 'Representative',
            'role': 'Sales Rep'
        },
        {
            'username': 'viewer1',
            'email': 'viewer@epiccrm.com',
            'first_name': 'Sarah',
            'last_name': 'Viewer',
            'role': 'Viewer'
        }
    ]
    
    admin_user = User.objects.get(username='admin')
    
    for user_data in sample_users:
        role_name = user_data.pop('role')
        
        user, created = User.objects.get_or_create(
            username=user_data['username'],
            defaults={
                **user_data,
                'is_active': True
            }
        )
        
        if created:
            user.set_password('password123')  # Change this in production!
            user.save()
            print(f"Created user: {user.username}")
        
        # Assign role
        try:
            role = UserRole.objects.get(name=role_name)
            role_assignment, created = UserRoleAssignment.objects.get_or_create(
                user=user,
                role=role,
                defaults={'assigned_by': admin_user}
            )
            
            if created:
                print(f"Assigned {role_name} role to {user.username}")
                
        except UserRole.DoesNotExist:
            print(f"Role {role_name} not found for user {user.username}")

if __name__ == '__main__':
    print("Creating initial users and roles...")
    admin_user = create_admin_user()
    create_sample_users()
    print("User creation completed!")
