import os
import asyncio
from twilio.rest import Client
from twilio.twiml import VoiceResponse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Twilio configuration
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
WEBHOOK_BASE_URL = os.getenv("WEBHOOK_BASE_URL", "https://yourdomain.com")

def get_twilio_client() -> Client:
    """Get authenticated Twilio client"""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        raise ValueError("Twilio credentials must be set in environment variables")
    
    return Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

async def initiate_twilio_call(phone_number: str, room_name: str) -> str:
    """Initiate an outbound Twilio call and connect it to a LiveKit room"""
    try:
        client = get_twilio_client()
        
        # Webhook URL for Twilio to call when the call is answered
        webhook_url = f"{WEBHOOK_BASE_URL}/api/twilio/voice?room_name={room_name}"
        
        # Make the outbound call
        call = client.calls.create(
            to=phone_number,
            from_=TWILIO_PHONE_NUMBER,
            url=webhook_url,
            method='POST'
        )
        
        logger.info(f"Initiated Twilio call {call.sid} to {phone_number} for room {room_name}")
        return call.sid
        
    except Exception as e:
        logger.error(f"Failed to initiate Twilio call: {str(e)}")
        raise

def generate_twiml_response(room_name: str) -> str:
    """Generate TwiML response to connect call to LiveKit room"""
    response = VoiceResponse()
    response.connect().room(room_name)
    
    return str(response)

async def get_call_status(call_sid: str) -> str:
    """Get the status of a Twilio call"""
    try:
        client = get_twilio_client()
        call = client.calls(call_sid).fetch()
        return call.status
    except Exception as e:
        logger.error(f"Failed to get call status for {call_sid}: {str(e)}")
        return "unknown"
