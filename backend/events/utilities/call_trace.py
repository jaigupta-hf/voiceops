"""
Utility functions for building structured call trace templates.
"""
from ..models import CallEvent, ErrorEvent


def build_call_trace(call_sid):
    """
    Build a structured call trace for a given call_sid.
    Fetches all events from the database and formats them according to event type.
    
    Returns a dictionary with:
    - header: Call SID, final status, direction, from, to
    - events: List of formatted events with timestamp and type-specific details
    """
    # Fetch once and iterate once to avoid repeated QuerySet evaluations.
    call_events = list(CallEvent.objects.filter(call_sid=call_sid).order_by('timestamp'))

    if not call_events:
        return None

    header_source_event = call_events[0]
    completed_event = None
    participant_label = None
    events = []
    found_header_source = False

    for event in call_events:
        event_type = event.event_type or ''

        if not found_header_source and (
            'twiml.call' in event_type or 'status-callback.call' in event_type
        ):
            header_source_event = event
            found_header_source = True

        if completed_event is None and 'status-callback.call.completed' in event_type:
            completed_event = event

        meta_data = event.meta_data or {}
        request_params = meta_data.get('data', {}).get('request', {}).get('parameters', {})
        if participant_label is None:
            participant_label = request_params.get('ParticipantLabel')

        formatted_event = format_call_event(event)
        if formatted_event:
            events.append(formatted_event)

    final_status_event = completed_event if completed_event else call_events[-1]

    # Build header
    header = {
        'call_sid': call_sid,
        'account_sid': header_source_event.account_sid if header_source_event.account_sid else 'N/A',
        'final_status': final_status_event.call_status if final_status_event.call_status else 'Unknown',
        'direction': header_source_event.direction if header_source_event.direction else 'N/A',
        'from_number': header_source_event.from_number if header_source_event.from_number else 'N/A',
        'to_number': header_source_event.to_number if header_source_event.to_number else 'N/A',
    }
    
    # Add participant label if available
    if participant_label:
        header['participant_label'] = participant_label

    # Fetch error events related to this call_sid
    error_events = ErrorEvent.objects.filter(correlation_sid=call_sid).order_by('timestamp')
    for error_event in error_events:
        formatted_error = format_error_event(error_event)
        if formatted_error:
            events.append(formatted_error)
    
    # Sort all events by timestamp
    events.sort(key=lambda x: x['timestamp'])
    
    return {
        'header': header,
        'events': events
    }


def format_call_event(event):
    """Format a single call event using a dispatcher-based event parser."""
    event_type = event.event_type or ''
    meta_data = event.meta_data or {}
    
    # Base event structure
    formatted = {
        'timestamp': event.timestamp.isoformat(),
        'event_type': event_type,
        'category': 'call',
        'details': {},
        'payload': meta_data
    }
    
    # Extract request parameters from meta_data if available
    request_params = meta_data.get('data', {}).get('request', {}).get('parameters', {})

    handler = _get_call_event_handler(event_type)
    if handler:
        formatted['details'] = handler(event, request_params, meta_data)
    
    return formatted


def _get_call_event_handler(event_type):
    """Resolve the first matching parser for a given event_type."""
    for event_fragment, handler in CALL_EVENT_HANDLER_MAP.items():
        if event_fragment in event_type:
            return handler
    return None


def _handle_status_callback_call(event, request_params, meta_data):
    del request_params, meta_data
    return {
        'call_status': event.call_status or 'N/A',
    }


def _handle_status_callback_conference_participant(event, request_params, meta_data):
    del meta_data
    details = {
        'conference_sid': event.conference_sid or 'N/A',
        'call_sid': event.call_sid or 'N/A',
        'status': event.call_status or 'N/A',
    }

    if request_params.get('FriendlyName'):
        details['friendly_name'] = request_params['FriendlyName']
    if request_params.get('ParticipantLabel'):
        details['participant_label'] = request_params['ParticipantLabel']
    if request_params.get('Hold') is not None:
        details['hold'] = request_params['Hold']
    if request_params.get('Muted') is not None:
        details['muted'] = request_params['Muted']
    if request_params.get('Coaching') is not None:
        details['coaching'] = request_params['Coaching']
    if request_params.get('ReasonParticipantLeft'):
        details['reason_participant_left'] = request_params['ReasonParticipantLeft']

    return details


def _handle_status_callback_conference(event, request_params, meta_data):
    del meta_data
    details = {
        'conference_sid': event.conference_sid or 'N/A',
        'status': event.call_status or 'N/A',
    }

    if request_params.get('FriendlyName'):
        details['friendly_name'] = request_params['FriendlyName']
    if request_params.get('ReasonConferenceEnded'):
        details['reason_conference_ended'] = request_params['ReasonConferenceEnded']
    if request_params.get('ParticipantLabelEndingConference'):
        details['participant_label_ending_conference'] = request_params['ParticipantLabelEndingConference']

    return details


def _handle_api_request_call(event, request_params, meta_data):
    del event, request_params, meta_data
    return {}


def _handle_api_request_conference_participant_created(event, request_params, meta_data):
    del meta_data
    details = {}
    if event.call_sid:
        details['call_sid'] = event.call_sid
    if request_params.get('Label'):
        details['participant_label'] = request_params['Label']
    if request_params.get('Coaching') is not None:
        details['coaching'] = request_params['Coaching']
    if request_params.get('Muted') is not None:
        details['muted'] = request_params['Muted']
    return details


def _handle_api_request_conference_participant_modified(event, request_params, meta_data):
    del meta_data
    details = {}
    if event.call_sid:
        details['call_sid'] = event.call_sid
    if request_params.get('Label'):
        details['participant_label'] = request_params['Label']
    if request_params.get('Coaching') is not None:
        details['coaching'] = request_params['Coaching']
    if request_params.get('Hold') is not None:
        details['hold'] = request_params['Hold']
    if request_params.get('Muted') is not None:
        details['muted'] = request_params['Muted']
    return details


def _handle_api_request_conference_participant_deleted(event, request_params, meta_data):
    del meta_data
    details = {
        'status': 'Removed participant programmatically',
    }
    if event.call_sid:
        details['call_sid'] = event.call_sid
    if request_params.get('Label'):
        details['participant_label'] = request_params['Label']
    return details


def _handle_twiml_call(event, request_params, meta_data):
    del request_params
    details = {
        'status': event.call_status or 'N/A',
    }
    request_method = meta_data.get('data', {}).get('request', {}).get('method', '')
    request_url = meta_data.get('data', {}).get('request', {}).get('url', '')

    if request_url:
        if request_method == 'GET':
            details['url'] = request_url
        else:
            url_parts = request_url.rstrip('/').split('/')
            if url_parts:
                details['url'] = url_parts[-1]

    return details


CALL_EVENT_HANDLER_MAP = {
    'status-callback.conference.participant': _handle_status_callback_conference_participant,
    'status-callback.conference': _handle_status_callback_conference,
    'status-callback.call': _handle_status_callback_call,
    'api-request.conference-participant.created': _handle_api_request_conference_participant_created,
    'api-request.conference-participant.modified': _handle_api_request_conference_participant_modified,
    'api-request.conference-participant.deleted': _handle_api_request_conference_participant_deleted,
    'api-request.call': _handle_api_request_call,
    'twiml.call': _handle_twiml_call,
}


def format_error_event(error_event):
    """Format a single error event."""
    return {
        'timestamp': error_event.timestamp.isoformat(),
        'event_type': 'error-logs.error.logged',
        'category': 'error',
        'details': {
            'severity': error_event.severity or 'N/A',
            'error_code': error_event.error_code or 'N/A',
            'error_message': error_event.error_message or 'N/A',
            'product': error_event.product or 'N/A'
        },
        'payload': error_event.meta_data or {}
    }


def build_conference_trace(conference_sid):
    """
    Build a structured conference trace for a given conference_sid.
    Fetches all events from the database and formats them according to event type.
    
    Returns a dictionary with:
    - header: Conference SID, friendly name (if available)
    - events: List of formatted events with timestamp and type-specific details
    """
    # Fetch all conference events for this conference_sid
    conference_events = CallEvent.objects.filter(conference_sid=conference_sid).order_by('timestamp')
    
    if not conference_events.exists():
        return None
    
    # Extract friendly name if available from any event
    friendly_name = None
    for event in conference_events:
        meta_data = event.meta_data or {}
        request_params = meta_data.get('data', {}).get('request', {}).get('parameters', {})
        friendly_name = request_params.get('FriendlyName')
        if friendly_name:
            break
    
    # Extract reason ended and ended by from last status-callback.conference.updated event
    reason_ended = None
    ended_by = None

    # Iterate in reverse to get the last occurrence
    for event in reversed(list(conference_events)):
        meta_data = event.meta_data or {}
        request_params = meta_data.get('data', {}).get('request', {}).get('parameters', {})
        reason_ended = request_params.get('ReasonConferenceEnded')
        ended_by = request_params.get('CallSidEndingConference')
        if reason_ended: 
            break
    
    # Extract unique call_sids and their participant labels
    participants = {}
    for event in conference_events:
        call_sid = event.call_sid
        if call_sid and call_sid not in participants:
            meta_data = event.meta_data or {}
            request_params = meta_data.get('data', {}).get('request', {}).get('parameters', {})
            participant_label = request_params.get('ParticipantLabel')
            participants[call_sid] = {
                'call_sid': call_sid,
                'label': participant_label if participant_label else None
            }
    
    # Build header
    header = {
        'conference_sid': conference_sid,
        'participant_count': len(participants),
        'participants': list(participants.values()),
    }
    
    if friendly_name:
        header['friendly_name'] = friendly_name
    if reason_ended:
        header['reason_ended'] = reason_ended
    if ended_by:
        header['ended_by'] = ended_by
    
    # Build events list
    events = []
    for event in conference_events:
        formatted_event = format_call_event(event)
        if formatted_event:
            events.append(formatted_event)
    
    # Sort all events by timestamp
    events.sort(key=lambda x: x['timestamp'])
    
    return {
        'header': header,
        'events': events
    }
