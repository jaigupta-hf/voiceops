from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token
from google.auth.transport import requests
from django.contrib.auth.models import User
from django.conf import settings
from .serializers import UserSerializer, GoogleAuthSerializer
from events.integrations.slack import login_notification


def get_tokens_for_user(user):
    """Generate JWT tokens for user"""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth(request):
    """
    Authenticate user with Google OAuth token.
    Expects: { "token": "google_id_token" }
    Returns: { "access": "jwt_token", "refresh": "jwt_refresh_token", "user": {...} }
    """
    serializer = GoogleAuthSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    google_token = serializer.validated_data['token']
    
    try:
        # Verify the Google token
        idinfo = id_token.verify_oauth2_token(
            google_token, 
            requests.Request(), 
            settings.GOOGLE_OAUTH_CLIENT_ID
        )
        
        # Extract user info from Google token
        email = idinfo.get('email')
        first_name = idinfo.get('given_name', '')
        last_name = idinfo.get('family_name', '')
        google_id = idinfo.get('sub')
        
        if not email:
            return Response(
                {'error': 'Email not provided by Google'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get or create user
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': email,
                'first_name': first_name,
                'last_name': last_name,
            }
        )
        
        # Update user info if already exists
        if not created:
            user.first_name = first_name
            user.last_name = last_name
            user.save()
        
        # Send Slack notification for login/registration
        try:
            user_data = {
                'email': email,
                'first_name': first_name,
                'last_name': last_name
            }
            login_notification(user_data, is_new_user=created)
        except Exception as slack_exc:
            print(f"Slack notification failed: {slack_exc}")
        
        # Generate JWT tokens
        tokens = get_tokens_for_user(user)
        
        return Response({
            'access': tokens['access'],
            'refresh': tokens['refresh'],
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
        
    except ValueError as e:
        # Invalid token
        return Response(
            {'error': f'Invalid Google token: {str(e)}'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    except Exception as e:
        return Response(
            {'error': f'Authentication failed: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_info(request):
    """Get current authenticated user info"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user (client should delete tokens)"""
    return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)
