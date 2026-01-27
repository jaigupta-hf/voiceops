"""
Management command to import event logs from JSON files into the database
"""
import json
import os
from datetime import datetime
from pathlib import Path
from urllib.parse import parse_qs, unquote
from django.core.management.base import BaseCommand
from django.conf import settings
from events.models import CallEvent, ErrorEvent


class Command(BaseCommand):
    help = 'Import Twilio event logs from JSON files into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--path',
            type=str,
            default=os.path.join(settings.BASE_DIR, 'event_logs'),
            help='Path to the event_logs directory'
        )

    def handle(self, *args, **options):
        logs_path = Path(options['path'])
        
        if not logs_path.exists():
            self.stdout.write(self.style.ERROR(f'Directory not found: {logs_path}'))
            return
        
        json_files = list(logs_path.glob('*.json'))
        self.stdout.write(f'Found {len(json_files)} JSON files')
        
        call_events_created = 0
        error_events_created = 0
        skipped = 0
        errors = 0
        
        for json_file in json_files:
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                
                # Handle both single events and arrays
                events = data if isinstance(data, list) else [data]
                
                for event in events:
                    event_type = event.get('type', '')
                    event_id = event.get('id', '')
                    
                    if not event_id:
                        self.stdout.write(self.style.WARNING(f'Skipping event without ID in {json_file.name}'))
                        skipped += 1
                        continue
                    
                    # Check if event type is call-related or error-related
                    if 'com.twilio.voice' in event_type or 'call' in event_type.lower():
                        # Process as CallEvent
                        if CallEvent.objects.filter(event_id=event_id).exists():
                            skipped += 1
                            continue
                        
                        event_data = event.get('data', {})
                        request_params = event_data.get('request', {}).get('parameters', {})
                        
                        call_event = CallEvent.objects.create(
                            event_id=event_id,
                            call_sid=request_params.get('CallSid', event_data.get('sid', '')),
                            account_sid=request_params.get('AccountSid', ''),
                            event_type=event_type,
                            call_status=request_params.get('CallStatus', ''),
                            direction=request_params.get('Direction', ''),
                            from_number=request_params.get('From', ''),
                            to_number=request_params.get('To', ''),
                            timestamp=datetime.fromisoformat(event.get('time', '').replace('Z', '+00:00')),
                            raw_payload=event
                        )
                        call_events_created += 1
                        
                    elif 'error' in event_type.lower():
                        # Process as ErrorEvent
                        if ErrorEvent.objects.filter(event_id=event_id).exists():
                            skipped += 1
                            continue
                        
                        event_data = event.get('data', {})
                        
                        error_event = ErrorEvent.objects.create(
                            event_id=event_id,
                            account_sid=event_data.get('account_sid', ''),
                            correlation_sid=event_data.get('correlation_sid', ''),
                            error_code=event_data.get('error_code', ''),
                            severity=event_data.get('level', 'UNKNOWN'),
                            product=event_data.get('product_name', ''),
                            http_status=self._extract_http_status(event_data),
                            webhook_url=self._extract_webhook_url(event_data),
                            error_message=self._extract_error_message(event_data),
                            request_sid=event_data.get('request_sid', ''),
                            timestamp=datetime.fromisoformat(event.get('time', '').replace('Z', '+00:00')),
                            raw_payload=event
                        )
                        error_events_created += 1
                    else:
                        self.stdout.write(self.style.WARNING(f'Unknown event type: {event_type}'))
                        skipped += 1
                        
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error processing {json_file.name}: {str(e)}'))
                errors += 1
        
        self.stdout.write(self.style.SUCCESS(f'\nImport completed:'))
        self.stdout.write(f'  Call Events created: {call_events_created}')
        self.stdout.write(f'  Error Events created: {error_events_created}')
        self.stdout.write(f'  Skipped (duplicates): {skipped}')
        self.stdout.write(f'  Errors: {errors}')
    
    def _extract_http_status(self, event_data):
        """Extract HTTP status code from error event payload"""
        try:
            payload = event_data.get('payload', '')
            if isinstance(payload, str):
                payload_json = json.loads(payload)
                return payload_json.get('status_code')
        except:
            pass
        return None
    
    def _extract_webhook_url(self, event_data):
        """Extract webhook URL from error event payload"""
        try:
            payload = event_data.get('payload', '')
            if isinstance(payload, str):
                payload_json = json.loads(payload)
                return payload_json.get('request_url')
        except:
            pass
        return None
    
    def _extract_error_message(self, event_data):
        """Extract error message from error event payload"""
        try:
            payload = event_data.get('payload', '')
            if isinstance(payload, str):
                payload_json = json.loads(payload)
                
                # Try to get message from different possible fields
                message = payload_json.get('message')
                
                # Check for message_text (URL-encoded query string format)
                if not message:
                    message_text = payload_json.get('message_text')
                    if message_text:
                        # Parse URL-encoded query string
                        try:
                            # Parse the query string
                            params = parse_qs(message_text)
                            # Get the 'Msg' parameter and decode it
                            if 'Msg' in params:
                                message = unquote(params['Msg'][0].replace('+', ' '))
                            else:
                                # If no Msg param, just decode the whole thing
                                message = unquote(message_text.replace('+', ' '))
                        except:
                            message = message_text
                
                # For Event Streams errors with error_code but no message
                if not message and payload_json.get('error_code'):
                    error_code = payload_json.get('error_code')
                    error_msg = payload_json.get('message', '')
                    message = f"Error {error_code}: {error_msg}" if error_msg else f"Error {error_code}"
                
                return message
        except:
            pass
        return None
