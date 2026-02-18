from django.db import models


class CallEvent(models.Model):
    """
    Stores all call events
    (initiated, ringing, answered, completed)
    """

    event_id = models.CharField(max_length=100, primary_key=True)
    account_sid = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    call_sid = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    conference_sid = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    event_type = models.CharField(max_length=100, db_index=True)
    call_status = models.CharField(max_length=32, null=True, blank=True, db_index=True)

    direction = models.CharField(max_length=16, null=True, blank=True, db_index=True)
    from_number = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    to_number = models.CharField(max_length=255, null=True, blank=True, db_index=True)

    timestamp = models.DateTimeField(db_index=True)

    meta_data = models.JSONField()

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.call_sid or 'N/A'} - {self.call_status or 'N/A'}"

class ErrorEvent(models.Model):
    """
    Stores all Twilio error events
    """

    event_id = models.CharField(max_length=100, unique=True)
    account_sid = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    correlation_sid = models.CharField(
        max_length=64, null=True, blank=True, db_index=True
    )

    error_code = models.CharField(max_length=16, null=True, blank=True)
    severity = models.CharField(max_length=16)
    product = models.CharField(max_length=64, null=True, blank=True)

    error_message = models.TextField(null=True, blank=True)

    request_sid = models.CharField(max_length=64, null=True, blank=True)

    timestamp = models.DateTimeField(db_index=True)

    meta_data = models.JSONField()

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.error_code} - {self.severity}"
