"""
Enhanced Twilio Integration for Phone Transfers
Combines basic Twilio calling with LiveKit room integration
"""
import os
import logging
import aiohttp
from typing import Optional, Dict, Any
from livekit import api
from livekit.api import AccessToken, VideoGrants
from livekit.api.room_service import RoomService
from twilio_utils import initiate_twilio_call, get_call_status

logger = logging.getLogger(__name__)

class EnhancedTwilioManager:
    def __init__(self):
        # Load environment variables
        from dotenv import load_dotenv
        load_dotenv()
        
        self.livekit_url = os.getenv("LIVEKIT_URL")
        self.livekit_api_key = os.getenv("LIVEKIT_API_KEY") 
        self.livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
        
        logger.info(f"LiveKit URL: {self.livekit_url}")
        logger.info(f"LiveKit API Key: {self.livekit_api_key}")
        logger.info(f"LiveKit Secret: {'***' if self.livekit_api_secret else 'None'}")
        
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            missing = []
            if not self.livekit_url: missing.append("LIVEKIT_URL")
            if not self.livekit_api_key: missing.append("LIVEKIT_API_KEY")
            if not self.livekit_api_secret: missing.append("LIVEKIT_API_SECRET")
            raise ValueError(f"Missing LiveKit credentials: {', '.join(missing)}")
            
        # Initialize LiveKit RoomService properly with correct parameter names
        try:
            logger.info(f"🔧 Initializing RoomService with URL: {self.livekit_url}")
            logger.info(f"🔧 API Key: {self.livekit_api_key}")
            logger.info(f"🔧 API Secret present: {bool(self.livekit_api_secret)}")
            
            # Use correct parameter names for RoomService
            # According to the Python SDK, it needs session, url, api_key, api_secret
            self.session = aiohttp.ClientSession()
            self.room_service = RoomService(
                session=self.session,
                url=self.livekit_url, 
                api_key=self.livekit_api_key, 
                api_secret=self.livekit_api_secret
            )
            logger.info("✅ LiveKit RoomService initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize RoomService: {e}")
            logger.error(f"🔧 Exception type: {type(e)}")
            # For now, set to None and use basic Twilio mode
            self.room_service = None
            self.session = None

    async def create_transfer_room_with_phone_agent(
        self, 
        phone_number: str,
        base_room_name: str,
        summary: str = None,
        agent_name: str = "Phone Agent"
    ) -> Dict[str, Any]:
        """
        Create a new LiveKit room and call the phone number to join it
        Falls back to basic Twilio if LiveKit room service isn't available
        """
        try:
            transfer_room_name = f"{base_room_name}_phone_transfer_{phone_number.replace('+', '').replace('-', '')[-4:]}"
            
            # Try to create room if RoomService is available
            if self.room_service:
                try:
                    # Create the room first
                    await self.room_service.create_room(
                        api.CreateRoomRequest(
                            name=transfer_room_name,
                            empty_timeout=300,  # 5 minutes
                            max_participants=10
                        )
                    )
                    logger.info(f"📞 Created LiveKit transfer room: {transfer_room_name}")
                except Exception as e:
                    logger.warning(f"⚠️  Failed to create LiveKit room, using basic transfer: {e}")
                    # Continue with basic transfer
            else:
                logger.info(f"📞 RoomService not available, using basic transfer room: {transfer_room_name}")
            
            # Generate access token for the phone agent (this will be used when they answer)
            phone_agent_identity = f"phone_agent_{phone_number.replace('+', '').replace('-', '')}"
            token = AccessToken(self.livekit_api_key, self.livekit_api_secret)
            token.with_identity(phone_agent_identity)
            token.with_grants(VideoGrants(
                room_join=True, 
                room=transfer_room_name,
                can_publish=True,
                can_subscribe=True
            ))
            access_token = token.to_jwt()
            
            # Initiate Twilio call with enhanced webhook that includes room joining
            call_sid = await initiate_twilio_call(
                phone_number=phone_number,
                room_name=transfer_room_name,
                summary=f"Call transfer from {base_room_name}. {summary or 'Customer needs assistance.'}"
            )
            
            return {
                "success": True,
                "method": "enhanced_twilio",
                "call_sid": call_sid,
                "transfer_room_name": transfer_room_name,
                "phone_agent_identity": phone_agent_identity,
                "access_token": access_token,
                "phone_number": phone_number,
                "summary": summary,
                "room_service_available": self.room_service is not None
            }
            
        except Exception as e:
            logger.error(f"Enhanced Twilio transfer failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "method": "enhanced_twilio"
            }

    async def get_room_participants(self, room_name: str) -> Dict[str, Any]:
        """Get current participants in a room"""
        try:
            participants = await self.room_service.list_participants(
                api.ListParticipantsRequest(room=room_name)
            )
            
            return {
                "success": True,
                "room_name": room_name,
                "participants": [
                    {
                        "identity": p.identity,
                        "name": p.name,
                        "is_publisher": p.permission.can_publish,
                        "joined_at": p.joined_at
                    }
                    for p in participants.participants
                ]
            }
            
        except Exception as e:
            logger.error(f"Failed to get room participants: {e}")
            return {
                "success": False,
                "error": str(e),
                "participants": []
            }

    async def move_participants_to_transfer_room(
        self,
        source_room: str,
        target_room: str,
        participant_identities: list
    ) -> Dict[str, Any]:
        """Move specific participants from source room to target room"""
        try:
            moved_participants = []
            
            for identity in participant_identities:
                # Generate new token for target room
                token = AccessToken(self.livekit_api_key, self.livekit_api_secret)
                token.with_identity(identity)
                token.with_grants(VideoGrants(
                    room_join=True,
                    room=target_room,
                    can_publish=True,
                    can_subscribe=True
                ))
                new_token = token.to_jwt()
                
                # Disconnect from source room
                await self.room_service.remove_participant(
                    api.RoomParticipantIdentity(room=source_room, identity=identity)
                )
                
                moved_participants.append({
                    "identity": identity,
                    "new_token": new_token,
                    "target_room": target_room
                })
                
            logger.info(f"📞 Moved {len(moved_participants)} participants from {source_room} to {target_room}")
            
            return {
                "success": True,
                "moved_participants": moved_participants,
                "source_room": source_room,
                "target_room": target_room
            }
            
        except Exception as e:
            logger.error(f"Failed to move participants: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            logger.info("🧹 Cleaned up aiohttp session")

# Global instance
enhanced_twilio_manager = EnhancedTwilioManager()

async def initiate_enhanced_phone_transfer(
    phone_number: str, 
    current_room_name: str,
    caller_identity: str,
    agent_a_identity: str,
    summary: str = None
) -> Dict[str, Any]:
    """
    Enhanced phone transfer workflow:
    1. Create new transfer room
    2. Call phone number to join the room  
    3. Move caller and Agent A to the new room
    4. Phone agent joins when they answer
    """
    try:
        # Create transfer room and initiate phone call
        phone_result = await enhanced_twilio_manager.create_transfer_room_with_phone_agent(
            phone_number=phone_number,
            base_room_name=current_room_name,
            summary=summary
        )
        
        if not phone_result["success"]:
            return phone_result
            
        transfer_room_name = phone_result["transfer_room_name"]
        
        # Move existing participants to transfer room
        move_result = await enhanced_twilio_manager.move_participants_to_transfer_room(
            source_room=current_room_name,
            target_room=transfer_room_name,
            participant_identities=[caller_identity, agent_a_identity]
        )
        
        return {
            "success": True,
            "method": "enhanced_phone_transfer",
            "transfer_room_name": transfer_room_name,
            "call_sid": phone_result["call_sid"],
            "phone_agent_identity": phone_result["phone_agent_identity"],
            "moved_participants": move_result.get("moved_participants", []),
            "phone_number": phone_number,
            "summary": summary,
            "status": "phone_calling",
            "instructions": f"Phone call initiated to {phone_number}. When answered, they will join {transfer_room_name}"
        }
        
    except Exception as e:
        logger.error(f"Enhanced phone transfer failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "method": "enhanced_phone_transfer"
        }
