import os
import asyncio
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from twilio.base.exceptions import TwilioException
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

async def initiate_twilio_call(phone_number: str, room_name: str, summary: str = None) -> str:
    """Initiate an outbound Twilio call and connect it to a LiveKit room"""
    try:
        # Validate phone number
        if not validate_phone_number(phone_number):
            raise ValueError(f"Invalid phone number format: {phone_number}")

        client = get_twilio_client()

        # Webhook URL for Twilio to call when the call is answered
        webhook_url = f"{WEBHOOK_BASE_URL}/api/twilio/voice?room_name={room_name}"
        if summary:
            import urllib.parse
            webhook_url += f"&summary={urllib.parse.quote(summary)}"

        # Make the outbound call
        call = client.calls.create(
            to=phone_number,
            from_=TWILIO_PHONE_NUMBER,
            url=webhook_url,
            method='POST',
            status_callback=f"{WEBHOOK_BASE_URL}/api/twilio/status",
            status_callback_method='POST'
        )

        logger.info(f"Initiated Twilio call {call.sid} to {phone_number} for room {room_name}")
        return call.sid

    except TwilioException as e:
        logger.error(f"Twilio API error: {str(e)}")
        raise ValueError(f"Twilio call failed: {str(e)}")
    except Exception as e:
        logger.error(f"Failed to initiate Twilio call: {str(e)}")
        raise

def generate_twiml_response(room_name: str, summary: str = None) -> str:
    """Generate TwiML response to connect call to LiveKit room, optionally with summary speech"""
    response = VoiceResponse()

    if summary:
        # Speak the summary before connecting
        response.say(summary, voice='alice')

    response.connect().room(room_name)

    return str(response)

async def get_call_status(call_sid: str) -> dict:
    """Get detailed status of a Twilio call"""
    try:
        client = get_twilio_client()
        call = client.calls(call_sid).fetch()
        return {
            "status": call.status,
            "direction": call.direction,
            "duration": call.duration,
            "start_time": call.start_time,
            "end_time": call.end_time,
            "from_number": call.from_,
            "to_number": call.to
        }
    except TwilioException as e:
        logger.error(f"Twilio API error getting call status for {call_sid}: {str(e)}")
        return {"status": "error", "error": str(e)}
    except Exception as e:
        logger.error(f"Failed to get call status for {call_sid}: {str(e)}")
        return {"status": "unknown", "error": str(e)}

async def initiate_warm_transfer_call(phone_number: str, room_name: str, summary: str) -> str:
    """Initiate a warm transfer call that speaks summary before connecting to LiveKit room"""
    return await initiate_twilio_call(phone_number, room_name, summary)

async def handle_call_status_callback(call_sid: str, status: str, room_name: str = None):
    """Handle Twilio call status callback updates"""
    logger.info(f"Call {call_sid} status update: {status} for room {room_name}")

    # Here you could broadcast the status update via WebSocket or store in database
    # For now, just log it
    if status in ['completed', 'failed', 'busy', 'no-answer']:
        logger.info(f"Call {call_sid} ended with status: {status}")

async def validate_phone_number(phone_number: str) -> bool:
    """Validate phone number format"""
    import re
    # Basic validation for E.164 format
    pattern = re.compile(r'^\+[1-9]\d{1,14}$')
    return bool(pattern.match(phone_number))
