import os
import requests
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

SLACK_BOT_TOKEN = os.getenv('SLACK_BOT_TOKEN')
CHANNEL_ID = os.getenv('CHANNEL_ID')

def twilio_error_notification(error_data):
    try:
        timestamp_str = error_data.get('timestamp', datetime.now().isoformat())
        dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00')) 
        IST = timezone(timedelta(hours=5, minutes=30))
        dt_ist = dt.astimezone(IST)
        formatted_time_ist = dt_ist.strftime('%Y-%m-%d %H:%M:%S IST')
        
        text = (
            f"VoiceOps Error Alert\n"
            f"Error Code: {error_data.get('error_code', 'N/A')}\n"
            f"Severity: {error_data.get('severity', 'N/A')}\n"
            f"Resource SID: {error_data.get('correlation_sid', 'N/A')}\n"
            f"Time: {formatted_time_ist}\n"
            f"Event Message: {error_data.get('message', 'N/A')}"
        )
        
        url = "https://slack.com/api/chat.postMessage"
        headers = {
            "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "channel": CHANNEL_ID,
            "text": text
        }
        
        response = requests.post(url, json=payload, headers=headers)
        response_data = response.json()
        
        if response_data.get('ok'):
            print(f"Slack notification sent successfully for error: {error_data.get('error_code')}")
            return True
        else:
            print(f"Failed to send Slack notification: {response_data.get('error', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"Exception while sending Slack notification: {e}")
        import traceback
        traceback.print_exc()
        return False

def database_call_notification(event_data):
    try:
        data = event_data.get('data', {})
        request_params = data.get('request', {}).get('parameters', {})

        text = (
            f"Failed to store Call Event in database\n"
            f"Call SID: {request_params.get('CallSid', 'N/A')}\n"
            f"Account SID: {request_params.get('AccountSid', 'N/A')}\n"
        )
        
        url = "https://slack.com/api/chat.postMessage"
        headers = {
            "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "channel": CHANNEL_ID,
            "text": text
        }
        
        response = requests.post(url, json=payload, headers=headers)
        response_data = response.json()
        
        if response_data.get('ok'):
            print(f"Slack notification sent successfully for database error")
            
    except Exception as e:
        print(f"Exception while sending Slack notification: {e}")
        import traceback
        traceback.print_exc()
        return False

def database_error_notification(event_data):
    try:
        data = event_data.get('data', {})

        text = (
            f"Failed to store Error event in database\n"
            f"Correlation SID: {data.get('correlation_sid', 'N/A')}\n"
            f"Error code: {data.get('error_code', 'N/A')}\n"
            f"Account SID: {data.get('account_sid', 'N/A')}\n"
        )
        
        url = "https://slack.com/api/chat.postMessage"
        headers = {
            "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "channel": CHANNEL_ID,
            "text": text
        }
        
        response = requests.post(url, json=payload, headers=headers)
        response_data = response.json()
        
        if response_data.get('ok'):
            print(f"Slack notification sent successfully for database error")
            
    except Exception as e:
        print(f"Exception while sending Slack notification: {e}")
        import traceback
        traceback.print_exc()
        return False

def webhook_error_notification(error_msg):
    try:
        text = (
            f"Webhook Error Alert\n"
            f"Account SID: {error_msg}\n"
        )
        
        url = "https://slack.com/api/chat.postMessage"
        headers = {
            "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "channel": CHANNEL_ID,
            "text": text
        }
        
        response = requests.post(url, json=payload, headers=headers)
        response_data = response.json()
        
        if response_data.get('ok'):
            print(f"Slack notification sent successfully for webhook error")
            
    except Exception as e:
        print(f"Exception while sending Slack notification: {e}")
        import traceback
        traceback.print_exc()
        return False
