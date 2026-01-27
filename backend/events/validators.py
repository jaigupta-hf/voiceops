"""
Validation utilities for Twilio webhooks and event streams.
"""
import hashlib
from django.http import HttpResponse


def validate_twilio_event_stream(request):
    expected_hash = request.GET.get('bodySHA256', '')
    
    actual_hash = hashlib.sha256(request.body).hexdigest()
    
    if actual_hash != expected_hash:
        return (False, HttpResponse('Forbidden - Invalid signature', status=403))
    
    return (True, None)


def validate_twilio_webhook(request, auth_token):
    from twilio.request_validator import RequestValidator
    
    validator = RequestValidator(auth_token)
    signature = request.headers.get('X-Twilio-Signature', '')
    
    # Check X-Forwarded-Proto header first (set by proxies/load balancers/ngrok)
    forwarded_proto = request.META.get('HTTP_X_FORWARDED_PROTO', '')
    if forwarded_proto:
        scheme = forwarded_proto
    else:
        scheme = request.scheme
    
    url = f"{scheme}://{request.get_host()}{request.path}"
    
    # Add query string if present (critical for Event Streams)
    query_string = request.META.get('QUERY_STRING', '')
    if query_string:
        url = f"{url}?{query_string}"
    
    params = {}

    # Get POST parameters
    content_type = request.headers.get('Content-Type', '')
    if 'application/json' not in content_type:
        params = dict(request.POST.items())
        
    # Validate signature
    if not validator.validate(url, params, signature):
        print('Invalid Twilio signature!')
        return (False, HttpResponse('Forbidden - Invalid signature', status=403))
    
    return (True, None)
