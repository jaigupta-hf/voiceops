"""
Views for handling webhook endpoints.
"""
import json
import os
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CallEvent, ErrorEvent
from .serializers import CallEventSerializer, ErrorEventSerializer
from .utilities.validators import validate_twilio_webhook
from .utilities.event_processing import process_call_event, process_error_event


class CallEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing call events
    """
    queryset = CallEvent.objects.all().order_by('-timestamp')
    serializer_class = CallEventSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['call_sid', 'from_number', 'to_number', 'account_sid']
    ordering_fields = ['timestamp', 'created_at']
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get statistics about call events for today"""
        
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        today_events = CallEvent.objects.filter(timestamp__gte=today_start, timestamp__lt=today_end)
        
        by_event_type = {
            'initiated': today_events.filter(call_status='initiated').count(),
            'ringing': today_events.filter(call_status='ringing').count(),
            'answered': today_events.filter(call_status='in-progress').count(),
            'completed': today_events.filter(call_status='completed').count()
        }
        
        return Response({
            'by_event_type': by_event_type
        })


class ErrorEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing error events
    """
    queryset = ErrorEvent.objects.all().order_by('-timestamp')
    serializer_class = ErrorEventSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['error_code', 'correlation_sid', 'account_sid']
    ordering_fields = ['timestamp', 'created_at']
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get statistics about error events"""
        by_severity = {}
        for severity in ErrorEvent.objects.values_list('severity', flat=True).distinct():
            by_severity[severity] = ErrorEvent.objects.filter(severity=severity).count()
        
        return Response({
            'by_severity': by_severity
        })


@csrf_exempt
@require_http_methods(["POST"])
def twilio_events_webhook(request):
    """
    Webhook endpoint for receiving event streams from Twilio.
    """
    try:
        '''
        # Validate Twilio webhook signature here (uncomment, when auth token is ready)

        auth_token = os.environ.get('TWILIO_AUTH_TOKEN', '')
        
        is_valid, error_response = validate_twilio_webhook(request, auth_token)
        if not is_valid:
            return error_response
        '''
        
        content_type = request.content_type
        if 'application/json' in content_type:
            data = json.loads(request.body)
        else:
            data = dict(request.POST)
        
        print("Received Twilio event:")
        print(json.dumps(data, indent=2))

        '''
        # for logging (will be removed later) [line 43 - 52]
        event_logs_dir = os.path.join(settings.BASE_DIR, 'event_logs')
        os.makedirs(event_logs_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f') ## creating folder
        filename = f'twilio_event_{timestamp}.json'
        filepath = os.path.join(event_logs_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        '''

        # Process event(s): Twilio Event Streams sends an array of events
        events_to_process = data if isinstance(data, list) else [data]
        
        for event in events_to_process:
            event_type = event.get('type', '')
            
            if 'com.twilio.voice' in event_type or 'call' in event_type.lower():
                process_call_event(event)
            elif 'error' in event_type.lower():
                process_error_event(event)
            else:
                print(f"Unknown event type: {event_type}")
        
        return HttpResponse(status=204)
        
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        return HttpResponse(status=400)
    except Exception as e:
        print(f"Error processing webhook: {e}")
        return HttpResponse(status=500)
