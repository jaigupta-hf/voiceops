import json
import re
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import parse_qs, unquote
from ..models import CallEvent, ErrorEvent
from ..integrations.slack import database_call_notification, database_error_notification

def status_callback_call(event_data):
    """Process and store a status-callback.call event"""
    try:
        data = event_data.get('data', {})
        request_params = data.get('request', {}).get('parameters', {})
        timestamp_str = request_params.get('Timestamp', event_data.get('time', ''))
        
        call_event = CallEvent.objects.create(
            event_id=data.get('eventSid', ''),
            account_sid=request_params.get('AccountSid', ''),
            call_sid=request_params.get('CallSid', ''),
            conference_sid='', 
            event_type=event_data.get('type', ''),
            call_status=request_params.get('CallStatus', ''),
            direction=request_params.get('Direction', ''),
            from_number=request_params.get('From', ''),
            to_number=request_params.get('To', ''),
            timestamp=parsedate_to_datetime(timestamp_str),
            meta_data=event_data
        )

        return call_event
        
    except Exception as e:
        print(f"Error processing status-callback.call event: {e}")
        database_call_notification(event_data)
        return None


def status_callback_conference_participant(event_data):
    """Process and store a status-callback.conference-participant event"""
    try:
        data = event_data.get('data', {})
        request_params = data.get('request', {}).get('parameters', {})
        timestamp_str = request_params.get('Timestamp', event_data.get('time', ''))
        
        call_event = CallEvent.objects.create(
            event_id=data.get('eventSid', ''),
            account_sid=request_params.get('AccountSid', ''),
            call_sid=request_params.get('CallSid', ''),
            conference_sid=request_params.get('ConferenceSid', ''),
            event_type=event_data.get('type', ''),
            call_status=request_params.get('StatusCallbackEvent', ''),
            direction='',  
            from_number='',
            to_number='', 
            timestamp=parsedate_to_datetime(timestamp_str),
            meta_data=event_data
        )

        return call_event
        
    except Exception as e:
        print(f"Error processing status-callback.conference-participant event: {e}")
        database_call_notification(event_data)
        return None


def status_callback_conference(event_data):
    """Process and store a status-callback.conference event"""
    try:
        data = event_data.get('data', {})
        request_params = data.get('request', {}).get('parameters', {})
        timestamp_str = request_params.get('Timestamp', event_data.get('time', ''))
        
        call_event = CallEvent.objects.create(
            event_id=data.get('eventSid', ''),
            account_sid=request_params.get('AccountSid', ''),
            call_sid='',
            conference_sid=request_params.get('ConferenceSid', ''),
            event_type=event_data.get('type', ''),
            call_status=request_params.get('StatusCallbackEvent', ''),
            direction='', 
            from_number='', 
            to_number='',
            timestamp=parsedate_to_datetime(timestamp_str),
            meta_data=event_data
        )

        return call_event
        
    except Exception as e:
        print(f"Error processing status-callback.conference event: {e}")
        database_call_notification(event_data)
        return None


def api_request_call(event_data):
    """Process and store an api-request.call event"""
    try:
        data = event_data.get('data', {})
        request_params = data.get('request', {}).get('parameters', {})
        timestamp_str = data.get('requestDateCreated', event_data.get('time', ''))
        
        call_event = CallEvent.objects.create(
            event_id=data.get('eventSid', ''),
            account_sid=request_params.get('AccountSid', ''),
            call_sid=data.get('sid', ''),
            conference_sid='', 
            event_type=event_data.get('type', ''),
            call_status='', 
            direction='',
            from_number=request_params.get('From', ''),
            to_number=request_params.get('To', ''),
            timestamp=parsedate_to_datetime(timestamp_str),
            meta_data=event_data
        )

        return call_event
        
    except Exception as e:
        print(f"Error processing api-request.call event: {e}")
        database_call_notification(event_data)
        return None


def api_request_conference_participant_created(event_data): 
    """Process and store an api-request.conference-participant.created event"""
    try:
        data = event_data.get('data', {})
        request_params = data.get('request', {}).get('parameters', {})
        timestamp_str = data.get('requestDateCreated', event_data.get('time', ''))
        
        # Extract account_sid from URL path (e.g., /Accounts/AC.../...)
        account_sid = ''
        request_url = data.get('request', {}).get('url', '')
        account_match = re.search(r'/Accounts/([A-Za-z0-9]+)', request_url)
        if account_match:
            account_sid = account_match.group(1)
        
        call_event = CallEvent.objects.create(
            event_id=data.get('eventSid', ''),
            account_sid=account_sid,
            call_sid='', 
            conference_sid=data.get('sid', ''),
            event_type=event_data.get('type', ''),
            call_status='', 
            direction='',
            from_number=request_params.get('From', ''),
            to_number=request_params.get('To', ''),
            timestamp=parsedate_to_datetime(timestamp_str),
            meta_data=event_data
        )

        return call_event
        
    except Exception as e:
        print(f"Error processing api-request.conference-participant.created event: {e}")
        database_call_notification(event_data)
        return None


def api_request_conference_participant_modified(event_data): # also covers api-request.conference-participant.deleted
    """Process and store an api-request.conference-participant.modified event"""
    try:
        data = event_data.get('data', {})
        timestamp_str = data.get('requestDateCreated', event_data.get('time', ''))
        
        # Extract account_sid and call_sid from URL path
        account_sid = ''
        call_sid = ''
        request_url = data.get('request', {}).get('url', '')
        account_match = re.search(r'/Accounts/([A-Za-z0-9]+)', request_url)
        if account_match:
            account_sid = account_match.group(1)
        
        participant_match = re.search(r'/Participants/([A-Za-z0-9]+)', request_url)
        if participant_match:
            call_sid = participant_match.group(1)
        
        call_event = CallEvent.objects.create(
            event_id=data.get('eventSid', ''),
            account_sid=account_sid,
            call_sid=call_sid,
            conference_sid=data.get('sid', ''),
            event_type=event_data.get('type', ''),
            call_status='', 
            direction='', 
            from_number='', 
            to_number='',
            timestamp=parsedate_to_datetime(timestamp_str),
            meta_data=event_data
        )

        return call_event
        
    except Exception as e:
        print(f"Error processing api-request.conference-participant.modified event: {e}")
        database_call_notification(event_data)
        return None


def twiml_call(event_data):
    """Process and store a twiml.call event"""
    try:
        data = event_data.get('data', {})
        request_params = data.get('request', {}).get('parameters', {})
        timestamp_str = data.get('requestDateCreated', event_data.get('time', ''))
        
        # Use CallStatus if present, otherwise fall back to response code
        call_status = request_params.get('CallStatus') or str(data.get('response', {}).get('responseCode', ''))
        
        call_event = CallEvent.objects.create(
            event_id=data.get('eventSid', ''),
            account_sid=request_params.get('AccountSid', ''),
            call_sid=request_params.get('CallSid', ''),
            conference_sid='',
            event_type=event_data.get('type', ''),
            call_status=call_status,
            direction=request_params.get('Direction', ''),
            from_number=request_params.get('From', ''),
            to_number=request_params.get('To', ''),
            timestamp=parsedate_to_datetime(timestamp_str),
            meta_data=event_data
        )

        return call_event
        
    except Exception as e:
        print(f"Error processing twiml.call event: {e}")
        database_call_notification(event_data)
        return None


def process_call_event(event_data):
    """
    Router function to process call events based on event type.
    Routes the event to the appropriate handler function.
    """
    event_type = event_data.get('type', '')
    
    # Route to appropriate handler based on event type
    if 'status-callback.call' in event_type:
        return status_callback_call(event_data)
    elif 'status-callback.conference.participant.updated' in event_type:
        return status_callback_conference_participant(event_data)
    elif 'status-callback.conference.updated' in event_type:
        return status_callback_conference(event_data)
    elif 'api-request.call' in event_type:
        return api_request_call(event_data)
    elif 'api-request.conference-participant.created' in event_type:
        return api_request_conference_participant_created(event_data)
    elif 'api-request.conference-participant.modified' in event_type or 'api-request.conference-participant.deleted' in event_type:
        return api_request_conference_participant_modified(event_data)
    elif 'twiml.call' in event_type:
        return twiml_call(event_data)
    else:
        print(f"No handler found for call event type: {event_type}")
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
        
        error_event = ErrorEvent.objects.create(
            event_id=event_id,
            account_sid=data.get('account_sid', ''),
            correlation_sid=data.get('correlation_sid', ''),
            error_code=data.get('error_code', ''),
            severity=data.get('level', 'UNKNOWN'),
            product=data.get('product_name', ''),
            error_message=error_message,
            request_sid=data.get('request_sid', ''),
            timestamp=datetime.fromisoformat(event_data.get('time', '').replace('Z', '+00:00')),
            meta_data=event_data
        )
        print(f"Created error event: {error_event.event_id}")
        return error_event
        
    except Exception as e:
        print(f"Error processing error event: {e}")
        database_error_notification(event_data)
        return None
