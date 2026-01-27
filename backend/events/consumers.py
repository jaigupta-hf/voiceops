"""
WebSocket consumers for real-time event streaming
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer


class EventStreamConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for streaming Twilio events to connected clients
    """
    
    async def connect(self):
        """Accept WebSocket connection and join the events group"""
        self.group_name = 'twilio_events'
        
        # Join the events group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        print(f"WebSocket connected: {self.channel_name}")
    
    async def disconnect(self, close_code):
        """Leave the events group when disconnecting"""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        print(f"WebSocket disconnected: {self.channel_name}")
    
    async def receive(self, text_data):
        """Handle messages from WebSocket (if needed)"""
        pass
    
    async def event_message(self, event):
        """
        Receive event from channel layer and send to WebSocket
        """
        await self.send(text_data=json.dumps({
            'type': event['event_type'],
            'data': event['data']
        }))
