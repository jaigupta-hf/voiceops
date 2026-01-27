from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'call-events', views.CallEventViewSet, basename='callevent')
router.register(r'error-events', views.ErrorEventViewSet, basename='errorevent')

urlpatterns = [
    path("twilio-events", views.twilio_events_webhook, name="twilio_events_webhook"),
    path('', include(router.urls)),
]