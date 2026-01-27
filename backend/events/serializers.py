from rest_framework import serializers
from .models import CallEvent, ErrorEvent


class CallEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallEvent
        fields = [
            'id', 'event_id', 'call_sid', 'account_sid', 'event_type',
            'call_status', 'direction', 'from_number', 'to_number',
            'timestamp', 'created_at'
        ]


class ErrorEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErrorEvent
        fields = [
            'id', 'event_id', 'account_sid', 'correlation_sid',
            'error_code', 'severity', 'product', 'http_status',
            'webhook_url', 'error_message', 'request_sid', 'timestamp', 'created_at'
        ]
