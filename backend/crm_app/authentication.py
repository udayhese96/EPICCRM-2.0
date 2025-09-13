from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from supabase import create_client, Client
from django.conf import settings
from .models import User
import jwt

class SupabaseAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        
        try:
            # Verify JWT token with Supabase
            supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            
            # Decode the JWT token
            decoded_token = jwt.decode(
                token, 
                settings.SUPABASE_SERVICE_KEY, 
                algorithms=['HS256'],
                options={"verify_signature": False}
            )
            
            user_id = decoded_token.get('sub')
            if not user_id:
                raise AuthenticationFailed('Invalid token')
            
            # Get or create user
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                # Create user from Supabase data
                email = decoded_token.get('email')
                user = User.objects.create(
                    id=user_id,
                    username=email,
                    email=email,
                    is_active=True
                )
            
            return (user, token)
            
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except Exception as e:
            raise AuthenticationFailed(f'Authentication failed: {str(e)}')
