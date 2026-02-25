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
    # Fetch all call events for this call_sid
    call_events = CallEvent.objects.filter(call_sid=call_sid).order_by('timestamp')
    
    if not call_events.exists():
        return None
    
    # Get header information from the first and last event
    # Prioritize twiml.call or status-callback.call events for header values
    header_source_event = None
    for event in call_events:
        if 'twiml.call' in event.event_type or 'status-callback.call' in event.event_type:
            header_source_event = event
            break
    
    # Fall back to first event if no twiml.call or status-callback.call found
    if not header_source_event:
        header_source_event = call_events.first()
    
    last_event = call_events.last()
    
    # Build header
    header = {
        'call_sid': call_sid,
        'final_status': last_event.call_status if last_event.call_status else 'Unknown',
        'direction': header_source_event.direction if header_source_event.direction else 'N/A',
        'from_number': header_source_event.from_number if header_source_event.from_number else 'N/A',
        'to_number': header_source_event.to_number if header_source_event.to_number else 'N/A',
    }
    
    # Build events list
    events = []
    for event in call_events:
        formatted_event = format_call_event(event)
        if formatted_event:
            events.append(formatted_event)
    
    # Fetch error events related to this call_sid (check in meta_data)
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
    """Format a single call event based on its type."""
    event_type = event.event_type
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
    
    if 'status-callback.call' in event_type:
        formatted['details'] = {
            'call_status': event.call_status or 'N/A'
        }
    
    elif 'status-callback.conference.participant' in event_type:
        details = {
            'conference_sid': event.conference_sid or 'N/A',
            'status': event.call_status or 'N/A'
        }
        # Add optional fields if available
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
        
        formatted['details'] = details
    
    elif 'status-callback.conference' in event_type:
        details = {
            'conference_sid': event.conference_sid or 'N/A',
            'status': event.call_status or 'N/A'
        }
        # Add optional fields if available
        if request_params.get('FriendlyName'):
            details['friendly_name'] = request_params['FriendlyName']
        if request_params.get('ReasonConferenceEnded'):
            details['reason_conference_ended'] = request_params['ReasonConferenceEnded']
        if request_params.get('ParticipantLabelEndingConference'):
            details['participant_label_ending_conference'] = request_params['ParticipantLabelEndingConference']
        
        formatted['details'] = details
    
    elif 'api-request.call' in event_type:
        # For api-request.call, show minimal details
        formatted['details'] = {}
    
    elif 'api-request.conference-participant.created' in event_type:
        details = {}
        # Extract from request parameters
        if request_params.get('Label'):
            details['participant_label'] = request_params['Label']
        if request_params.get('Coaching') is not None:
            details['coaching'] = request_params['Coaching']
        if request_params.get('Muted') is not None:
            details['muted'] = request_params['Muted']
        
        formatted['details'] = details
    
    elif 'api-request.conference-participant.modified' in event_type:
        details = {}
        # Extract from request parameters
        if request_params.get('Coaching') is not None:
            details['coaching'] = request_params['Coaching']
        if request_params.get('Hold') is not None:
            details['hold'] = request_params['Hold']
        if request_params.get('Muted') is not None:
            details['muted'] = request_params['Muted']
        
        formatted['details'] = details
    
    elif 'api-request.conference-participant.deleted' in event_type:
        formatted['details'] = {
            'status': 'Removed participant programmatically'
        }
    
    elif 'twiml.call' in event_type:
        details = {
            'status': event.call_status or 'N/A'
        }
        # Extract URL last segment
        request_url = meta_data.get('data', {}).get('request', {}).get('url', '')
        if request_url:
            # Extract last word before trailing slash
            url_parts = request_url.rstrip('/').split('/')
            if url_parts:
                details['url'] = url_parts[-1]
        
        formatted['details'] = details
    
    return formatted


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
