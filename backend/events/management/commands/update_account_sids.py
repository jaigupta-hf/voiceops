"""
Update existing records with account_sid from raw_payload
"""
from django.core.management.base import BaseCommand
from events.models import CallEvent, ErrorEvent


class Command(BaseCommand):
    help = 'Update existing records with account_sid from raw_payload'

    def handle(self, *args, **options):
        # Update CallEvent records
        call_events = CallEvent.objects.filter(account_sid__isnull=True)
        call_updated = 0
        
        for event in call_events:
            try:
                request_params = event.raw_payload.get('data', {}).get('request', {}).get('parameters', {})
                account_sid = request_params.get('AccountSid', '')
                if account_sid:
                    event.account_sid = account_sid
                    event.save(update_fields=['account_sid'])
                    call_updated += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error updating CallEvent {event.id}: {str(e)}'))
        
        # Update ErrorEvent records
        error_events = ErrorEvent.objects.filter(account_sid__isnull=True)
        error_updated = 0
        
        for event in error_events:
            try:
                account_sid = event.raw_payload.get('data', {}).get('account_sid', '')
                if account_sid:
                    event.account_sid = account_sid
                    event.save(update_fields=['account_sid'])
                    error_updated += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error updating ErrorEvent {event.id}: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'\nUpdate completed:'))
        self.stdout.write(f'  CallEvents updated: {call_updated}')
        self.stdout.write(f'  ErrorEvents updated: {error_updated}')
