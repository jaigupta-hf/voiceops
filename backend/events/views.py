"""
Views for handling webhook endpoints.
"""
import json
import os
from datetime import timedelta
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.utils import timezone
from django.db import connection
from django.db.models import Count, Exists, OuterRef, Q, Subquery
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import CallEvent, ErrorEvent
from .serializers import CallEventSerializer, ErrorEventSerializer
from .utilities.validators import validate_twilio_webhook
from .utilities.event_processing import process_call_event, process_error_event
from .utilities.call_trace import build_call_trace, build_conference_trace
from .integrations.slack import twilio_error_notification, webhook_error_notification


class CallEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing call events
    """
    queryset = CallEvent.objects.filter(call_sid__isnull=False).exclude(call_sid='').order_by('-timestamp')
    serializer_class = CallEventSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['call_sid', 'from_number', 'to_number', 'account_sid']
    ordering_fields = ['timestamp', 'created_at']
    MAX_NO_PAGINATION_RESULTS = 1000
    
    def get_queryset(self):
        """
        Return only the most relevant event for each unique call_sid.
        Prioritizes status-callback.call.completed events if they exist,
        otherwise returns the latest event by timestamp.
        Exception: When searching for a specific call_sid, return all events.
        """
        queryset = super().get_queryset()
        
        # If searching (for timeline view), don't deduplicate - return all events
        search_param = self.request.query_params.get('search', None)
        no_pagination = self.request.query_params.get('no_pagination') == 'true'
        if search_param:
            # Return all events matching the search, don't deduplicate
            if no_pagination:
                return queryset[:self.MAX_NO_PAGINATION_RESULTS]
            return queryset

        if connection.vendor == 'postgresql':
            latest_per_call_ids = queryset.order_by('call_sid', '-timestamp').distinct('call_sid').values('event_id')
            queryset = queryset.filter(event_id__in=Subquery(latest_per_call_ids)).order_by('-timestamp')
        else:
            # Fallback for non-PostgreSQL backends.
            has_completed_event = CallEvent.objects.filter(
                call_sid=OuterRef('call_sid'),
                event_type__contains='status-callback.call.completed'
            )

            completed_event_id = CallEvent.objects.filter(
                call_sid=OuterRef('call_sid'),
                event_type__contains='status-callback.call.completed'
            ).order_by('timestamp').values('event_id')[:1]

            latest_event_id = CallEvent.objects.filter(
                call_sid=OuterRef('call_sid')
            ).order_by('-timestamp').values('event_id')[:1]

            queryset = queryset.filter(
                Q(event_id__in=Subquery(completed_event_id)) |
                (Q(event_id__in=Subquery(latest_event_id)) & ~Exists(has_completed_event))
            ).distinct().order_by('-timestamp')

        if no_pagination:
            return queryset[:self.MAX_NO_PAGINATION_RESULTS]
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get statistics about call events for today"""
        
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        today_events = CallEvent.objects.filter(timestamp__gte=today_start, timestamp__lt=today_end)
        
        status_counts = today_events.values('call_status').annotate(count=Count('event_id'))
        counts_dict = {item['call_status']: item['count'] for item in status_counts}

        by_event_type = {
            'initiated': counts_dict.get('initiated', 0),
            'ringing': counts_dict.get('ringing', 0),
            'answered': counts_dict.get('in-progress', 0),
            'completed': counts_dict.get('completed', 0)
        }
        
        return Response({
            'by_event_type': by_event_type
        })
    
    @action(detail=False, methods=['get'], url_path='call-trace/(?P<call_sid>[^/.]+)')
    def call_trace(self, request, call_sid=None):
        """Get structured call trace for a specific call_sid"""
        if not call_sid:
            return Response({'error': 'call_sid is required'}, status=400)
        
        trace_data = build_call_trace(call_sid)
        
        if trace_data is None:
            return Response({'error': 'No events found for this call_sid'}, status=404)
        
        return Response(trace_data)
    
    @action(detail=False, methods=['get'], url_path='conference-trace/(?P<conference_sid>[^/.]+)')
    def conference_trace(self, request, conference_sid=None):
        """Get structured conference trace for a specific conference_sid"""
        if not conference_sid:
            return Response({'error': 'conference_sid is required'}, status=400)
        
        trace_data = build_conference_trace(conference_sid)
        
        if trace_data is None:
            return Response({'error': 'No events found for this conference_sid'}, status=404)
        
        return Response(trace_data)
    
    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None  
        return super().paginate_queryset(queryset)


class ErrorEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing error events
    """
    queryset = ErrorEvent.objects.all().order_by('-timestamp')
    serializer_class = ErrorEventSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['error_code', 'correlation_sid', 'account_sid']
    ordering_fields = ['timestamp', 'created_at']
    MAX_NO_PAGINATION_RESULTS = 1000

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get('no_pagination') == 'true':
            return queryset[:self.MAX_NO_PAGINATION_RESULTS]
        return queryset
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get statistics about error events for today"""
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        
        today_errors = ErrorEvent.objects.filter(timestamp__gte=today_start, timestamp__lt=today_end)
        
        severities = today_errors.values('severity').annotate(count=Count('event_id'))
        by_severity = {item['severity']: item['count'] for item in severities}
        
        return Response({
            'by_severity': by_severity
        })

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None 
        return super().paginate_queryset(queryset)


@csrf_exempt
@require_http_methods(["POST"])
def twilio_events_webhook(request):
    """
    Webhook endpoint for receiving event streams from Twilio.
    """
    try:
        '''
        # Validate Twilio webhook signature here (uncomment, when auth token is ready)

        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        
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
        os.makedirs(event_logs_dir, exist_ok=True) ## creating folder
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f') 
        filename = f'{timestamp}.json'
        filepath = os.path.join(event_logs_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        '''

        # Process event(s): Twilio Event Streams sends an array of events
        events_to_process = data if isinstance(data, list) else [data]
        
        channel_layer = get_channel_layer()
        
        for event in events_to_process:
            event_type = event.get('type', '')
            created_event = None
            
            if 'com.twilio.voice' in event_type or 'call' in event_type.lower():
                created_event = process_call_event(event)
                if created_event:
                    # Broadcast to WebSocket clients
                    async_to_sync(channel_layer.group_send)(
                        'twilio_events',
                        {
                            'type': 'event_message',
                            'event_type': 'call_event',
                            'data': CallEventSerializer(created_event).data
                        }
                    )
            elif 'error' in event_type.lower():
                created_event = process_error_event(event)
                if created_event:
                    # Broadcast to WebSocket clients
                    async_to_sync(channel_layer.group_send)(
                        'twilio_events',
                        {
                            'type': 'event_message',
                            'event_type': 'error_event',
                            'data': ErrorEventSerializer(created_event).data
                        }
                    )

                    # Send Slack notification for error events
                    try:
                        twilio_error_notification({
                            'severity': created_event.severity,
                            'error_code': created_event.error_code,
                            'message': created_event.error_message,
                            'product': created_event.product,
                            'account_sid': created_event.account_sid,
                            'correlation_sid': created_event.correlation_sid,
                            'timestamp': created_event.timestamp.isoformat()
                        })
                    except Exception as slack_exc:
                        print(f"Slack notification failed: {slack_exc}")
            else:
                print(f"Unknown event type: {event_type}")
        
        return HttpResponse(status=204)
        
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        webhook_error_notification(e)
        return HttpResponse(status=400)
    except Exception as e:
        print(f"Error processing webhook: {e}")
        webhook_error_notification(e)
        return HttpResponse(status=500)
