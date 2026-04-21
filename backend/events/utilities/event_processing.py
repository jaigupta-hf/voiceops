import json
import re
from datetime import datetime
from functools import wraps
from email.utils import parsedate_to_datetime
from urllib.parse import parse_qs, unquote
from ..models import CallEvent, ErrorEvent
from ..integrations.slack import database_call_notification, database_error_notification


def _handle_processing_errors(event_label, notifier):
    """Decorator to standardize processing error handling and notification."""
    def decorator(func):
        @wraps(func)
        def wrapper(event_data, *args, **kwargs):
            try:
                return func(event_data, *args, **kwargs)
            except Exception as e:
                print(f"Error processing {event_label} event: {e}")
                notifier(event_data)
                return None
        return wrapper
    return decorator


def _extract_call_event_context(event_data):
    """Extract shared call event structures from payload."""
    data = event_data.get('data', {})
    request = data.get('request', {})
    request_params = request.get('parameters', {})
    return data, request, request_params


def _create_call_event(event_data, *, timestamp_str, account_sid='', call_sid='', conference_sid='',
                       call_status='', direction='', from_number='', to_number=''):
    """Create a CallEvent with consistent field defaults and event metadata."""
    data, _, _ = _extract_call_event_context(event_data)
    return CallEvent.objects.create(
        event_id=data.get('eventSid', ''),
        account_sid=account_sid,
        call_sid=call_sid,
        conference_sid=conference_sid,
        event_type=event_data.get('type', ''),
        call_status=call_status,
        direction=direction,
        from_number=from_number,
        to_number=to_number,
        timestamp=parsedate_to_datetime(timestamp_str),
        meta_data=event_data
    )


@_handle_processing_errors('status-callback.call', database_call_notification)
def status_callback_call(event_data):
    """Process and store a status-callback.call event"""
    data, _, request_params = _extract_call_event_context(event_data)
    timestamp_str = request_params.get('Timestamp', event_data.get('time', ''))

    return _create_call_event(
        event_data,
        timestamp_str=timestamp_str,
        account_sid=request_params.get('AccountSid', ''),
        call_sid=request_params.get('CallSid', ''),
        call_status=request_params.get('CallStatus', ''),
        direction=request_params.get('Direction', ''),
        from_number=request_params.get('From', ''),
        to_number=request_params.get('To', '')
    )


@_handle_processing_errors('status-callback.conference-participant', database_call_notification)
def status_callback_conference_participant(event_data):
    """Process and store a status-callback.conference-participant event"""
    _, _, request_params = _extract_call_event_context(event_data)
    timestamp_str = request_params.get('Timestamp', event_data.get('time', ''))

    return _create_call_event(
        event_data,
        timestamp_str=timestamp_str,
        account_sid=request_params.get('AccountSid', ''),
        call_sid=request_params.get('CallSid', ''),
        conference_sid=request_params.get('ConferenceSid', ''),
        call_status=request_params.get('StatusCallbackEvent', '')
    )


@_handle_processing_errors('status-callback.conference', database_call_notification)
def status_callback_conference(event_data):
    """Process and store a status-callback.conference event"""
    _, _, request_params = _extract_call_event_context(event_data)
    timestamp_str = request_params.get('Timestamp', event_data.get('time', ''))

    return _create_call_event(
        event_data,
        timestamp_str=timestamp_str,
        account_sid=request_params.get('AccountSid', ''),
        conference_sid=request_params.get('ConferenceSid', ''),
        call_status=request_params.get('StatusCallbackEvent', '')
    )


@_handle_processing_errors('api-request.call', database_call_notification)
def api_request_call(event_data):
    """Process and store an api-request.call event"""
    data, _, request_params = _extract_call_event_context(event_data)
    timestamp_str = data.get('requestDateCreated', event_data.get('time', ''))

    return _create_call_event(
        event_data,
        timestamp_str=timestamp_str,
        account_sid=request_params.get('AccountSid', ''),
        call_sid=data.get('sid', ''),
        from_number=request_params.get('From', ''),
        to_number=request_params.get('To', '')
    )


@_handle_processing_errors('api-request.conference-participant.created', database_call_notification)
def api_request_conference_participant_created(event_data): 
    """Process and store an api-request.conference-participant.created event"""
    data, request, request_params = _extract_call_event_context(event_data)
    timestamp_str = data.get('requestDateCreated', event_data.get('time', ''))

    account_sid = ''
    request_url = request.get('url', '')
    account_match = re.search(r'/Accounts/([A-Za-z0-9]+)', request_url)
    if account_match:
        account_sid = account_match.group(1)

    return _create_call_event(
        event_data,
        timestamp_str=timestamp_str,
        account_sid=account_sid,
        conference_sid=data.get('sid', ''),
        from_number=request_params.get('From', ''),
        to_number=request_params.get('To', '')
    )


@_handle_processing_errors('api-request.conference-participant.modified', database_call_notification)
def api_request_conference_participant_modified(event_data): # also covers api-request.conference-participant.deleted
    """Process and store an api-request.conference-participant.modified event"""
    data, request, _ = _extract_call_event_context(event_data)
    timestamp_str = data.get('requestDateCreated', event_data.get('time', ''))

    account_sid = ''
    call_sid = ''
    request_url = request.get('url', '')
    account_match = re.search(r'/Accounts/([A-Za-z0-9]+)', request_url)
    if account_match:
        account_sid = account_match.group(1)

    participant_match = re.search(r'/Participants/([A-Za-z0-9]+)', request_url)
    if participant_match:
        call_sid = participant_match.group(1)

    return _create_call_event(
        event_data,
        timestamp_str=timestamp_str,
        account_sid=account_sid,
        call_sid=call_sid,
        conference_sid=data.get('sid', '')
    )


@_handle_processing_errors('twiml.call', database_call_notification)
def twiml_call(event_data):
    """Process and store a twiml.call event"""
    data, _, request_params = _extract_call_event_context(event_data)
    timestamp_str = data.get('requestDateCreated', event_data.get('time', ''))

    call_status = request_params.get('CallStatus') or str(data.get('response', {}).get('responseCode', ''))

    return _create_call_event(
        event_data,
        timestamp_str=timestamp_str,
        account_sid=request_params.get('AccountSid', ''),
        call_sid=request_params.get('CallSid', ''),
        call_status=call_status,
        direction=request_params.get('Direction', ''),
        from_number=request_params.get('From', ''),
        to_number=request_params.get('To', '')
    )


def process_call_event(event_data):
    """
    Router function to process call events based on event type.
    Routes the event to the appropriate handler function.
    """
    event_type = event_data.get('type', '')
    
    event_handlers = (
        ('status-callback.call', status_callback_call),
        ('status-callback.conference.participant.updated', status_callback_conference_participant),
        ('status-callback.conference.updated', status_callback_conference),
        ('api-request.call', api_request_call),
        ('api-request.conference-participant.created', api_request_conference_participant_created),
        ('api-request.conference-participant.modified', api_request_conference_participant_modified),
        ('api-request.conference-participant.deleted', api_request_conference_participant_modified),
        ('twiml.call', twiml_call),
    )

    for marker, handler in event_handlers:
        if marker in event_type:
            return handler(event_data)

    print(f"No handler found for call event type: {event_type}")
    return None


@_handle_processing_errors('error', database_error_notification)
def process_error_event(event_data):
    """Process and store an error event"""
    event_id = event_data.get('id', '')
    data = event_data.get('data', {})

    error_message = None
    try:
        payload = data.get('payload', '')
        if isinstance(payload, str):
            payload_json = json.loads(payload)

            message = payload_json.get('message')

            if not message:
                message_text = payload_json.get('message_text')
                if message_text:
                    try:
                        params = parse_qs(message_text)
                        if 'Msg' in params:
                            message = unquote(params['Msg'][0].replace('+', ' '))
                        else:
                            message = unquote(message_text.replace('+', ' '))
                    except Exception:
                        message = message_text

            if not message and payload_json.get('error_code'):
                error_code = payload_json.get('error_code')
                error_msg = payload_json.get('message', '')
                message = f"Error {error_code}: {error_msg}" if error_msg else f"Error {error_code}"

            error_message = message
    except Exception:
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
