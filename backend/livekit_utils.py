import os
import asyncio
import uuid
from typing import Dict, Optional, Callable
from livekit import api
from livekit.api import AccessToken, VideoGrants
from livekit.api.room_service import RoomService
from livekit.rtc import Room, RoomOptions, Track, TrackKind
from livekit.rtc.participant import RemoteParticipant
from livekit.rtc.track_publication import RemoteTrackPublication
import logging
from deepgram_utils import RealTimeTranscription
from db_utils import store_transcription_segment

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

async def send_data_message(room_name: str, data: str, participant_identity: str = None) -> bool:
    """Send a data message to a room or specific participant"""
    try:
        # Note: LiveKit Server API doesn't directly support sending data messages
        # This would require using the LiveKit SDK or implementing a custom solution
        # For now, we'll log the message and return success
        logger.info(f"Data message to room {room_name}: {data}")
        return True
    except Exception as e:
        logger.error(f"Failed to send data message to {room_name}: {str(e)}")
        return False


# Global transcription sessions
active_transcriptions: Dict[str, 'RoomTranscriptionManager'] = {}

class RoomTranscriptionManager:
    """Manages real-time transcription for a LiveKit room"""

    def __init__(self, room_name: str, on_transcript_callback: Optional[Callable] = None):
        self.room_name = room_name
        self.room = Room()
        self.transcription = RealTimeTranscription(self._on_transcript)
        self.on_transcript_callback = on_transcript_callback
        self.audio_buffer = bytearray()
        self.is_active = False

    async def start(self) -> bool:
        """Start transcription for the room"""
        try:
            # Create token for transcription bot
            token = create_room_token(self.room_name, f"transcription_bot_{uuid.uuid4().hex[:8]}")

            # Connect to room
            await self.room.connect(get_livekit_url(), token)

            # Start Deepgram transcription
            await self.transcription.start_transcription()

            # Set up track subscriptions
            self.room.on("track_subscribed", self._on_track_subscribed)

            self.is_active = True
            logger.info(f"Started transcription for room {self.room_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to start transcription for room {self.room_name}: {e}")
            return False

    async def stop(self) -> bool:
        """Stop transcription for the room"""
        try:
            self.is_active = False
            await self.transcription.stop_transcription()
            await self.room.disconnect()
            logger.info(f"Stopped transcription for room {self.room_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to stop transcription for room {self.room_name}: {e}")
            return False

    def _on_track_subscribed(self, track: Track, publication: RemoteTrackPublication, participant: RemoteParticipant):
        """Handle new track subscription"""
        if track.kind == TrackKind.KIND_AUDIO:
            logger.info(f"Subscribed to audio track from {participant.identity}")
            track.on("audio_frame", self._on_audio_frame)

    def _on_audio_frame(self, frame):
        """Handle incoming audio frame"""
        if not self.is_active:
            return

        try:
            # Convert audio frame to bytes (assuming linear16)
            # LiveKit audio frames are in linear16 format
            audio_data = frame.data
            self.audio_buffer.extend(audio_data)

            # Send chunks to Deepgram (e.g., every 100ms worth of audio)
            # 16000 Hz * 2 bytes * 0.1s = 3200 bytes
            if len(self.audio_buffer) >= 3200:
                chunk = bytes(self.audio_buffer[:3200])
                self.audio_buffer = self.audio_buffer[3200:]
                asyncio.create_task(self.transcription.send_audio(chunk))

        except Exception as e:
            logger.error(f"Error processing audio frame: {e}")

    def _on_transcript(self, transcript_data: Dict):
        """Handle transcript from Deepgram"""
        try:
            # Validate transcript data
            if not transcript_data.get("text"):
                logger.warning(f"Received empty transcript for room {self.room_name}")
                return

            # Determine speaker (simplified - could be improved with diarization)
            speaker = "unknown"
            if transcript_data.get("words"):
                # Use speaker from first word if available
                first_word = transcript_data["words"][0]
                if "speaker" in first_word and first_word["speaker"] is not None:
                    speaker = f"speaker_{first_word['speaker']}"

            segment = {
                "id": str(uuid.uuid4()),
                "room_name": self.room_name,
                "speaker": speaker,
                "text": transcript_data["text"],
                "timestamp": str(asyncio.get_event_loop().time()),
                "confidence": transcript_data.get("confidence"),
                "is_final": transcript_data.get("is_final", True),
                "words": transcript_data.get("words", [])
            }

            # Store in database with error handling
            success = store_transcription_segment(segment)
            if not success:
                logger.error(f"Failed to store transcription segment for room {self.room_name}")
                # Continue processing even if storage fails

            # Call callback if provided
            if self.on_transcript_callback:
                try:
                    self.on_transcript_callback(segment)
                except Exception as callback_error:
                    logger.error(f"Error in transcription callback: {callback_error}")

        except Exception as e:
            logger.error(f"Error handling transcript for room {self.room_name}: {e}")
            # Don't re-raise to prevent transcription from stopping


async def start_room_transcription(room_name: str, on_transcript_callback: Optional[Callable] = None) -> bool:
    """Start transcription for a room"""
    if room_name in active_transcriptions:
        logger.warning(f"Transcription already active for room {room_name}")
        return True

    manager = RoomTranscriptionManager(room_name, on_transcript_callback)
    if await manager.start():
        active_transcriptions[room_name] = manager
        return True
    return False

async def stop_room_transcription(room_name: str) -> bool:
    """Stop transcription for a room"""
    if room_name not in active_transcriptions:
        return True

    manager = active_transcriptions[room_name]
    if await manager.stop():
        del active_transcriptions[room_name]
        return True
    return False

def is_room_transcription_active(room_name: str) -> bool:
    """Check if transcription is active for a room"""
    return room_name in active_transcriptions
