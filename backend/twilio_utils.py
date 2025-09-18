import os
import asyncio
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse
from twilio.base.exceptions import TwilioException
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_twilio_credentials():
    """Get Twilio credentials, loading from environment"""
    load_dotenv()  # Ensure .env is loaded
    return {
        "account_sid": os.getenv("TWILIO_ACCOUNT_SID"),
        "auth_token": os.getenv("TWILIO_AUTH_TOKEN"),
        "phone_number": os.getenv("TWILIO_PHONE_NUMBER"),
        "webhook_base_url": os.getenv("WEBHOOK_BASE_URL", "https://yourdomain.com")
    }

def get_twilio_client() -> Client:
    """Get authenticated Twilio client"""
    creds = get_twilio_credentials()
    if not creds["account_sid"] or not creds["auth_token"]:
        raise ValueError("Twilio credentials must be set in environment variables")
    
    return Client(creds["account_sid"], creds["auth_token"])

async def initiate_twilio_call(phone_number: str, room_name: str, summary: str = None) -> str:
    """Initiate an outbound Twilio call and connect it to a LiveKit room"""
    try:
        # Get fresh credentials
        creds = get_twilio_credentials()
        
        # Validate phone number
        if not await validate_phone_number(phone_number):
            raise ValueError(f"Invalid phone number format: {phone_number}")

        client = get_twilio_client()

        # Webhook URL for Twilio to call when the call is answered
        webhook_url = f"{creds['webhook_base_url']}/api/twilio/voice?room_name={room_name}"
        if summary:
            import urllib.parse
            webhook_url += f"&summary={urllib.parse.quote(summary)}"

        # Make the outbound call
        call = client.calls.create(
            to=phone_number,
            from_=creds["phone_number"],
            url=webhook_url,
            method='POST',
            status_callback=f"{creds['webhook_base_url']}/api/twilio/status",
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
        # Add a brief pause
        response.pause(length=1)

    # Try to get LiveKit SIP configuration
    livekit_sip_endpoint = os.getenv("LIVEKIT_SIP_ENDPOINT")
    
    if livekit_sip_endpoint:
        # If LiveKit SIP is configured, connect to the room via SIP
        response.say("Connecting you to the support team via secure video call.", voice='alice')
        # Connect to LiveKit room via SIP
        dial = response.dial()
        dial.sip(f"sip:{room_name}@{livekit_sip_endpoint}")
    else:
        # Fallback: provide instructions and generate a web URL for manual connection
        response.say("Please visit the provided web link to join the video call with the support team.", voice='alice')
        
        # For basic integration without LiveKit SIP, we can:
        # 1. Generate a token for the phone user
        # 2. Provide instructions to join via web
        # 3. Keep the call active for manual connection
        
        web_url = f"https://your-app-domain.com/join?room={room_name}&identity=phone_agent"
        response.say(f"Your room name is {room_name}. Visit {web_url} to join the call.", voice='alice')
        
        # Offer to stay on the line
        gather = response.gather(
            action=f'/api/twilio/voice-gather?room={room_name}',
            method='POST',
            timeout=30,
            num_digits=1
        )
        gather.say("Press 1 to stay on the line, or hang up to join via web.", voice='alice')
        
        # If no input, provide final instructions
        response.say("Thank you. Please join the video call via the web link provided.", voice='alice')
    
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
            "from_number": call.from_formatted,
            "to_number": call.to_formatted
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
