from django.db import models


class CallEvent(models.Model):
    """
    Stores all call events
    (initiated, ringing, answered, completed)
    """

    event_id = models.CharField(max_length=100, unique=True)
    call_sid = models.CharField(max_length=64, db_index=True)
    account_sid = models.CharField(max_length=64, null=True, blank=True, db_index=True)

    event_type = models.CharField(max_length=100)
    call_status = models.CharField(max_length=32)

    direction = models.CharField(max_length=16, null=True, blank=True)
    from_number = models.CharField(max_length=255, null=True, blank=True)
    to_number = models.CharField(max_length=255, null=True, blank=True)

    timestamp = models.DateTimeField(db_index=True)

    raw_payload = models.JSONField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.call_sid} - {self.call_status}"

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

    http_status = models.IntegerField(null=True, blank=True)
    webhook_url = models.URLField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)

    request_sid = models.CharField(max_length=64, null=True, blank=True)

    timestamp = models.DateTimeField(db_index=True)

    raw_payload = models.JSONField()

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.error_code} - {self.severity}"
