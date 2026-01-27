"""
WebSocket URL routing for events app
"""
from django.urls import path
from .consumers import EventStreamConsumer

websocket_urlpatterns = [
    path('ws/events/', EventStreamConsumer.as_asgi()),
]
