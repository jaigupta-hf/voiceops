from django.contrib import admin
from .models import CallEvent, ErrorEvent


@admin.register(CallEvent)
class CallEventAdmin(admin.ModelAdmin):
    list_display = ('call_sid', 'account_sid', 'conference_sid', 'event_type', 'call_status', 'from_number', 'to_number', 'timestamp')
    list_filter = ('call_status', 'direction', 'event_type', 'account_sid')
    search_fields = ('call_sid', 'account_sid', 'conference_sid', 'from_number', 'to_number', 'event_id')
    readonly_fields = ('event_id', 'call_sid', 'conference_sid', 'event_type', 'call_status', 'direction', 
                       'from_number', 'to_number', 'timestamp', 'meta_data')
    ordering = ('-timestamp',)


@admin.register(ErrorEvent)
class ErrorEventAdmin(admin.ModelAdmin):
    list_display = ('error_code', 'severity', 'account_sid', 'correlation_sid', 'product', 'timestamp')
    list_filter = ('severity', 'error_code', 'product', 'account_sid')
    search_fields = ('event_id', 'account_sid', 'correlation_sid', 'error_code', 'request_sid')
    readonly_fields = ('event_id', 'correlation_sid', 'error_code', 'severity', 'product',
                       'error_message', 'request_sid', 'timestamp', 'meta_data')
    ordering = ('-timestamp',)

