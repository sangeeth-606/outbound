import os
import asyncio
from livekit import api
from livekit.api import AccessToken, VideoGrants
from livekit.rtc import Room, RoomOptions
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# LiveKit configuration
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "wss://your-livekit-server.com")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")

def create_room_token(room_name: str, participant_identity: str) -> str:
    """Create a LiveKit access token for a participant to join a room"""
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise ValueError("LiveKit API key and secret must be set in environment variables")
    
    # Create access token
    token = AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token.identity = participant_identity
    
    # Grant permissions
    grants = VideoGrants()
    grants.room_join = True
    grants.room = room_name
    grants.can_publish = True
    grants.can_subscribe = True
    grants.can_publish_data = True
    
    token.add_grant(grants)
    
    # Generate JWT token
    jwt_token = token.to_jwt()
    logger.info(f"Generated token for {participant_identity} in room {room_name}")
    
    return jwt_token

async def create_room(room_name: str) -> bool:
    """Create a LiveKit room if it doesn't exist"""
    try:
        # In a real implementation, you would use the LiveKit Server SDK
        # to create rooms programmatically. For this demo, we'll assume
        # rooms are created automatically when participants join.
        
        logger.info(f"Room {room_name} will be created when first participant joins")
        return True
    except Exception as e:
        logger.error(f"Failed to create room {room_name}: {str(e)}")
        raise

def get_livekit_url() -> str:
    """Get the LiveKit server URL"""
    return LIVEKIT_URL
