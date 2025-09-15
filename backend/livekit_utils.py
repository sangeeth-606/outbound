import os
import asyncio
from livekit import api
from livekit.api import AccessToken, VideoGrants
from livekit.api.room_service import RoomService
from livekit.rtc import Room, RoomOptions
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_room_token(room_name: str, participant_identity: str) -> str:
    """Create a LiveKit access token for a participant to join a room"""
    # Load environment variables at function level
    livekit_api_key = os.getenv("LIVEKIT_API_KEY")
    livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    if not livekit_api_key or not livekit_api_secret:
        raise ValueError("LiveKit API key and secret must be set in environment variables")
    
    # Create access token with identity and grants
    token = AccessToken(livekit_api_key, livekit_api_secret) \
        .with_identity(participant_identity) \
        .with_grants(VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True
        ))
    
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
    return os.getenv("LIVEKIT_URL", "wss://your-livekit-server.com")

async def disconnect_participant(room_name: str, participant_identity: str) -> bool:
    """Disconnect a participant from a room"""
    try:
        livekit_url = get_livekit_url()
        api_key = os.getenv("LIVEKIT_API_KEY")
        api_secret = os.getenv("LIVEKIT_API_SECRET")

        client = RoomService(livekit_url, api_key, api_secret)
        await client.remove_participant(room_name, participant_identity)
        logger.info(f"Disconnected participant {participant_identity} from room {room_name}")
        return True
    except Exception as e:
        logger.error(f"Failed to disconnect participant {participant_identity} from {room_name}: {str(e)}")
        return False

async def get_room_participants(room_name: str) -> list:
    """Get list of participants in a room"""
    try:
        livekit_url = get_livekit_url()
        api_key = os.getenv("LIVEKIT_API_KEY")
        api_secret = os.getenv("LIVEKIT_API_SECRET")

        client = RoomService(livekit_url, api_key, api_secret)
        participants = await client.list_participants(room_name)
        return [p.identity for p in participants]
    except Exception as e:
        logger.error(f"Failed to get participants for room {room_name}: {str(e)}")
        return []

async def delete_room(room_name: str) -> bool:
    """Delete a room"""
    try:
        livekit_url = get_livekit_url()
        api_key = os.getenv("LIVEKIT_API_KEY")
        api_secret = os.getenv("LIVEKIT_API_SECRET")

        client = RoomService(livekit_url, api_key, api_secret)
        await client.delete_room(room_name)
        logger.info(f"Deleted room {room_name}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete room {room_name}: {str(e)}")
        return False
