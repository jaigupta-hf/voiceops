import json
from datetime import datetime, timedelta
from urllib.parse import parse_qs, unquote
from ..models import CallEvent, ErrorEvent

def process_call_event(event_data):
    """Process and store a call event"""
    try:
        event_id = event_data.get('id', '')

        data = event_data.get('data', {})
        request_params = data.get('request', {}).get('parameters', {})
        
        call_event = CallEvent.objects.create(
            event_id=event_id,
            call_sid=request_params.get('CallSid', data.get('sid', '')),
            account_sid=request_params.get('AccountSid', ''),
            event_type=event_data.get('type', ''),
            call_status=request_params.get('CallStatus', ''),
            direction=request_params.get('Direction', ''),
            from_number=request_params.get('From', ''),
            to_number=request_params.get('To', ''),
            timestamp=datetime.fromisoformat(event_data.get('time', '').replace('Z', '+00:00')),
            raw_payload=event_data
        )

        return call_event
        
    except Exception as e:
        print(f"Error processing call event: {e}")
        return None


def process_error_event(event_data):
    """Process and store an error event"""
    try:
        event_id = event_data.get('id', '')
        data = event_data.get('data', {})
        
        error_message = None
        try:
            payload = data.get('payload', '')
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
                            params = parse_qs(message_text)
                            if 'Msg' in params:
                                message = unquote(params['Msg'][0].replace('+', ' '))
                            else:
                                message = unquote(message_text.replace('+', ' '))
                        except:
                            message = message_text
                
                # For Event Streams errors with error_code but no message
                if not message and payload_json.get('error_code'):
                    error_code = payload_json.get('error_code')
                    error_msg = payload_json.get('message', '')
                    message = f"Error {error_code}: {error_msg}" if error_msg else f"Error {error_code}"
                
                error_message = message
        except:
            pass
        
        # Extract HTTP status and webhook URL
        http_status = None
        webhook_url = None
        try:
            payload = data.get('payload', '')
            if isinstance(payload, str):
                payload_json = json.loads(payload)
                http_status = payload_json.get('status_code')
                webhook_url = payload_json.get('request_url')
        except:
            pass
        
        error_event = ErrorEvent.objects.create(
            event_id=event_id,
            account_sid=data.get('account_sid', ''),
            correlation_sid=data.get('correlation_sid', ''),
            error_code=data.get('error_code', ''),
            severity=data.get('level', 'UNKNOWN'),
            product=data.get('product_name', ''),
            http_status=http_status,
            webhook_url=webhook_url,
            error_message=error_message,
            request_sid=data.get('request_sid', ''),
            timestamp=datetime.fromisoformat(event_data.get('time', '').replace('Z', '+00:00')),
            raw_payload=event_data
        )
        print(f"Created error event: {error_event.event_id}")
        return error_event
        
    except Exception as e:
        print(f"Error processing error event: {e}")
        return None
