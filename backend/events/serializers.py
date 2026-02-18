from rest_framework import serializers
from .models import CallEvent, ErrorEvent


class CallEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallEvent
        fields = [
            'event_id', 'call_sid', 'account_sid', 'conference_sid', 'event_type',
            'call_status', 'direction', 'from_number', 'to_number',
            'timestamp'
        ]


class ErrorEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErrorEvent
        fields = [
            'event_id', 'account_sid', 'correlation_sid',
            'error_code', 'severity', 'product',
            'error_message', 'request_sid', 'timestamp'
        ]
