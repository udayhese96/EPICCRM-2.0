"""
Django management command to create sample CRM data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from crm.models import Company, Lead, Contact, Activity, LeadStatus, LeadSource
from datetime import datetime, timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Create sample CRM data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--leads',
            type=int,
            default=50,
            help='Number of sample leads to create'
        )
        parser.add_argument(
            '--contacts',
            type=int,
            default=30,
            help='Number of sample contacts to create'
        )
        parser.add_argument(
            '--companies',
            type=int,
            default=20,
            help='Number of sample companies to create'
        )

    def handle(self, *args, **options):
        self.stdout.write('Creating sample CRM data...')
        
        # Get or create admin user
        admin_user, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@company.com',
                'first_name': 'System',
                'last_name': 'Administrator',
                'is_staff': True,
                'is_superuser': True
            }
        )
        
        if created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(f'Created admin user: {admin_user.username}')

        # Create sample companies
        companies = []
        company_names = [
            'Tech Solutions Inc', 'Global Marketing Corp', 'Innovation Labs',
            'Digital Dynamics', 'Future Systems', 'Smart Analytics',
            'Cloud Computing Co', 'Data Insights Ltd', 'Mobile First Inc',
            'AI Technologies', 'Cyber Security Pro', 'Web Development Hub',
            'Software Solutions', 'IT Consulting Group', 'Digital Transform',
            'Business Intelligence', 'Enterprise Solutions', 'Tech Innovators',
            'System Integrators', 'Platform Builders'
        ]
        
        for i in range(min(options['companies'], len(company_names))):
            company = Company.objects.create(
                name=company_names[i],
                industry=random.choice(['Technology', 'Marketing', 'Finance', 'Healthcare', 'Education']),
                website=f'https://www.{company_names[i].lower().replace(" ", "")}.com',
                phone=f'+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}',
                email=f'info@{company_names[i].lower().replace(" ", "")}.com',
                city=random.choice(['New York', 'San Francisco', 'Chicago', 'Boston', 'Seattle']),
                state=random.choice(['NY', 'CA', 'IL', 'MA', 'WA']),
                country='USA',
                created_by=admin_user
            )
            companies.append(company)
        
        self.stdout.write(f'Created {len(companies)} companies')

        # Create sample leads
        first_names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily', 'James', 'Jessica']
        last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']
        
        lead_statuses = list(LeadStatus.objects.all())
        lead_sources = list(LeadSource.objects.all())
        
        for i in range(options['leads']):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            
            lead = Lead.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=f'{first_name.lower()}.{last_name.lower()}@email.com',
                phone=f'+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}',
                company=random.choice(companies).name if companies else f'Company {i}',
                job_title=random.choice(['Manager', 'Director', 'VP', 'CEO', 'CTO', 'Marketing Manager']),
                status=random.choice(lead_statuses) if lead_statuses else None,
                source=random.choice(lead_sources) if lead_sources else None,
                value=random.randint(1000, 50000),
                probability=random.randint(10, 90),
                expected_close_date=datetime.now().date() + timedelta(days=random.randint(1, 90)),
                notes=f'Sample lead created for testing purposes.',
                created_by=admin_user,
                assigned_to=admin_user
            )
        
        self.stdout.write(f'Created {options["leads"]} leads')

        # Create sample contacts
        for i in range(options['contacts']):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            
            contact = Contact.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=f'{first_name.lower()}.{last_name.lower()}@contact.com',
                phone=f'+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}',
                mobile=f'+1-555-{random.randint(100, 999)}-{random.randint(1000, 9999)}',
                job_title=random.choice(['Manager', 'Director', 'VP', 'CEO', 'CTO', 'Marketing Manager']),
                company=random.choice(companies) if companies else None,
                city=random.choice(['New York', 'San Francisco', 'Chicago', 'Boston', 'Seattle']),
                state=random.choice(['NY', 'CA', 'IL', 'MA', 'WA']),
                country='USA',
                notes=f'Sample contact created for testing purposes.',
                created_by=admin_user,
                assigned_to=admin_user
            )
        
        self.stdout.write(f'Created {options["contacts"]} contacts')

        # Create sample activities
        leads = list(Lead.objects.all()[:10])  # Get first 10 leads
        contacts = list(Contact.objects.all()[:10])  # Get first 10 contacts
        
        activity_titles = [
            'Follow up call', 'Send proposal', 'Schedule meeting', 'Product demo',
            'Contract review', 'Price negotiation', 'Technical discussion',
            'Requirements gathering', 'Project kickoff', 'Status update'
        ]
        
        for i in range(20):  # Create 20 sample activities
            activity = Activity.objects.create(
                title=random.choice(activity_titles),
                description=f'Sample activity {i+1} for testing purposes.',
                activity_type=random.choice(['call', 'email', 'meeting', 'task']),
                status=random.choice(['pending', 'completed']),
                priority=random.choice(['low', 'medium', 'high']),
                due_date=datetime.now() + timedelta(days=random.randint(1, 30)),
                lead=random.choice(leads) if leads and random.choice([True, False]) else None,
                contact=random.choice(contacts) if contacts and random.choice([True, False]) else None,
                company=random.choice(companies) if companies and random.choice([True, False]) else None,
                created_by=admin_user,
                assigned_to=admin_user
            )
        
        self.stdout.write('Created 20 sample activities')
        self.stdout.write(self.style.SUCCESS('Sample data creation completed!'))
