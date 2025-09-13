from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.cache import never_cache
from django.http import JsonResponse
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .forms import LoginForm
from .models import User, UserRole, UserRoleAssignment

@csrf_protect
@never_cache
def login_view(request):
    """
    Handle user login with username and password
    """
    if request.user.is_authenticated:
        return redirect('/dashboard/')
    
    if request.method == 'POST':
        form = LoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            
            # Create or get auth token for API access
            token, created = Token.objects.get_or_create(user=user)
            
            # Store token in session for frontend use
            request.session['auth_token'] = token.key
            
            messages.success(request, f'Welcome back, {user.first_name or user.username}!')
            
            # Redirect to dashboard
            next_url = request.GET.get('next', '/dashboard/')
            return redirect(next_url)
        else:
            messages.error(request, 'Invalid username or password.')
    else:
        form = LoginForm()
    
    return render(request, 'authentication/login.html', {'form': form})

@login_required
def logout_view(request):
    """
    Handle user logout
    """
    # Delete auth token
    try:
        token = Token.objects.get(user=request.user)
        token.delete()
    except Token.DoesNotExist:
        pass
    
    logout(request)
    messages.info(request, 'You have been logged out successfully.')
    return redirect('/auth/login/')

@login_required
def dashboard_view(request):
    """
    Main dashboard view after login
    """
    user_roles = UserRoleAssignment.objects.filter(user=request.user).select_related('role')
    
    context = {
        'user': request.user,
        'user_roles': user_roles,
        'auth_token': request.session.get('auth_token', '')
    }
    
    return render(request, 'dashboard/index.html', context)

# API Views for authentication
@api_view(['POST'])
@permission_classes([])
def api_login(request):
    """
    API endpoint for login
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response({'error': 'Username and password required'}, status=400)
    
    from django.contrib.auth import authenticate
    user = authenticate(username=username, password=password)
    
    if user:
        token, created = Token.objects.get_or_create(user=user)
        user_roles = list(UserRoleAssignment.objects.filter(user=user).values_list('role__name', flat=True))
        
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'roles': user_roles
            }
        })
    else:
        return Response({'error': 'Invalid credentials'}, status=401)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_logout(request):
    """
    API endpoint for logout
    """
    try:
        token = Token.objects.get(user=request.user)
        token.delete()
        return Response({'message': 'Logged out successfully'})
    except Token.DoesNotExist:
        return Response({'message': 'Already logged out'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_user_profile(request):
    """
    Get current user profile
    """
    user = request.user
    user_roles = list(UserRoleAssignment.objects.filter(user=user).values_list('role__name', flat=True))
    
    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': user.phone,
            'department': user.department,
            'roles': user_roles,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser,
            'date_joined': user.date_joined,
            'last_login': user.last_login
        }
    })
