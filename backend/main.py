from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional
import os
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from livekit_utils import create_room_token, create_room, disconnect_participant, get_room_participants, delete_room
from twilio_utils import initiate_twilio_call, initiate_warm_transfer_call, get_call_status, handle_call_status_callback, generate_twiml_response
from llm_utils import generate_call_summary
from db_utils import get_caller_context, get_agent_by_role
from deepgram_utils import transcribe_base64_audio
from ai_chat_utils import generate_ai_response, create_conversation_entry
from models import (
    CreateRoomRequest, CreateRoomResponse,
    TransferInitiateRequest, TransferInitiateResponse,
    TransferCompleteRequest, TransferCompleteResponse,
    CallerContextRequest, CallerContextResponse,
    ChatRequest, ChatResponse, TranscribeRequest, TranscribeResponse,
    ChatMessage
)
import asyncio
from fastapi import WebSocket
from typing import List
import json

# WebSocket connections for real-time notifications
websocket_connections: List[WebSocket] = []

async def speak_summary(room_name: str, summary: str):
    """Simulate speaking the call summary in the room (in real implementation, use TTS)"""
    # In a real implementation, you would use a TTS service to generate audio
    # and publish it to the LiveKit room. For this demo, we'll just log it.
    print(f"Speaking summary in room {room_name}: {summary}")
    # You could send a data message to the room participants
    # For now, we'll broadcast via WebSocket
    message = {
        "type": "summary_speech",
        "room_name": room_name,
        "summary": summary
    }
    await broadcast_websocket_message(message)

async def broadcast_websocket_message(message: dict):
    """Broadcast a message to all connected WebSocket clients"""
    for connection in websocket_connections:
        try:
            await connection.send_json(message)
        except Exception as e:
            print(f"Failed to send message to WebSocket: {e}")
            # Remove broken connections
            websocket_connections.remove(connection)

# Load environment variables
load_dotenv()

app = FastAPI(title="Warm Transfer API", version="1.0.0")

@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """WebSocket endpoint for real-time transfer notifications"""
    logger.info("🔌 New WebSocket connection established")
    await websocket.accept()
    websocket_connections.append(websocket)
    logger.info(f"📊 Total WebSocket connections: {len(websocket_connections)}")
    try:
        while True:
            # Keep the connection alive
            data = await websocket.receive_text()
            logger.debug(f"📨 WebSocket received: {data}")
            # Echo back for testing
            await websocket.send_text(f"Echo: {data}")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
    finally:
        if websocket in websocket_connections:
            websocket_connections.remove(websocket)
        logger.info(f"🔌 WebSocket connection closed. Total connections: {len(websocket_connections)}")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock conversation history for demo purposes
MOCK_CONVERSATION_HISTORY = """
Customer (John Doe) called about a login issue with their account. 
I (Agent Alice) verified that his account is active and not locked. 
I had him reset his password through the email verification process. 
He reported that the password reset worked successfully, but now he can't see his dashboard after logging in. 
He mentioned this is urgent as he needs to access his financial data for a meeting this afternoon.
The customer seems frustrated but cooperative. I've already checked his account permissions and they appear correct.
"""

@app.get("/")
async def root():
    return {"message": "Warm Transfer API is running"}

@app.get("/debug/env")
async def debug_env():
    return {
        "LIVEKIT_URL": os.getenv("LIVEKIT_URL"),
        "LIVEKIT_API_KEY": os.getenv("LIVEKIT_API_KEY"),
        "LIVEKIT_API_SECRET": os.getenv("LIVEKIT_API_SECRET"),
        "groq_key": os.getenv("groq_key"),
        "TWILIO_ACCOUNT_SID": os.getenv("TWILIO_ACCOUNT_SID")
    }

@app.post("/api/room/create", response_model=CreateRoomResponse)
async def create_room_endpoint(request: CreateRoomRequest):
    """Create a new LiveKit room and generate access token for participant with caller context"""
    try:
        # Create room if it doesn't exist
        await create_room(request.room_name)
        
        # Generate access token
        access_token = create_room_token(
            room_name=request.room_name,
            participant_identity=request.participant_identity
        )
        
        # Get caller context from mock database
        caller_context = get_caller_context(request.email, request.caller_type)
        
        return CreateRoomResponse(
            room_name=request.room_name,
            access_token=access_token,
            caller_context=caller_context
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create room: {str(e)}")

@app.post("/api/transfer/initiate", response_model=TransferInitiateResponse)
async def initiate_transfer(request: TransferInitiateRequest):
    """Agent A initiates warm transfer - creates new room, generates summary, calls Twilio"""
    try:
        logger.info(f"🔄 Initiating transfer for {request.email} ({request.caller_type}) to {request.transfer_target}")

        # Get caller context from mock database
        caller_context = get_caller_context(request.email, request.caller_type)
        logger.info(f"📋 Retrieved caller context: {caller_context is not None}")

        # Determine target agent based on transfer type
        if request.transfer_target == "compliance":
            target_agent = get_agent_by_role("Compliance Officer")
        elif request.transfer_target == "general_partner":
            target_agent = get_agent_by_role("General Partner")
        else:
            target_agent = get_agent_by_role("Compliance Officer")  # Default

        logger.info(f"👤 Target agent: {target_agent}")

        # Generate dynamic call summary using LLM with context
        logger.info("🤖 Generating call summary with LLM...")
        summary = generate_call_summary(
            MOCK_CONVERSATION_HISTORY,
            request.caller_type,
            caller_context
        )
        logger.info(f"📝 Generated summary: {summary[:100]}...")

        # Create new transfer room
        transfer_room_name = f"transfer_{request.original_room_name}_{request.agent_a_id}"
        logger.info(f"🏠 Creating transfer room: {transfer_room_name}")
        await create_room(transfer_room_name)

        # Generate tokens for all participants
        logger.info("🎫 Generating access tokens for all participants")
        agent_a_token = create_room_token(
            room_name=transfer_room_name,
            participant_identity=f"agent_a_{request.agent_a_id}"
        )

        agent_b_token = create_room_token(
            room_name=transfer_room_name,
            participant_identity="agent_b_transfer"
        )

        caller_token = create_room_token(
            room_name=transfer_room_name,
            participant_identity=f"caller_{request.email}"
        )

        # Disconnect Agent A from original room
        logger.info(f"👋 Disconnecting Agent A from original room: {request.original_room_name}")
        await disconnect_participant(request.original_room_name, f"agent_a_{request.agent_a_id}")

        # Speak the call summary in the transfer room
        await speak_summary(transfer_room_name, summary)

        # Broadcast transfer initiation notification
        notification = {
            "type": "transfer_initiated",
            "original_room": request.original_room_name,
            "transfer_room": transfer_room_name,
            "agent_a": request.agent_a_id,
            "target_agent": target_agent
        }
        await broadcast_websocket_message(notification)

        # Initiate Twilio call to target agent's phone number (optional)
        twilio_call_sid = None
        if request.transfer_target == "phone" and target_agent and target_agent.get("twilio_phone"):
            try:
                logger.info(f"📞 Initiating Twilio call to {target_agent['twilio_phone']}")
                twilio_call_sid = await initiate_warm_transfer_call(
                    target_agent["twilio_phone"],
                    transfer_room_name,
                    summary
                )
                logger.info(f"✅ Twilio call initiated: {twilio_call_sid}")
            except Exception as e:
                logger.error(f"❌ Twilio call failed (non-critical): {e}")
                # Continue with web transfer even if Twilio fails

        # Broadcast transfer initiation notification
        logger.info("📡 Broadcasting transfer initiation via WebSocket")
        notification = {
            "type": "transfer_initiated",
            "original_room": request.original_room_name,
            "transfer_room": transfer_room_name,
            "agent_a": request.agent_a_id,
            "target_agent": target_agent
        }
        await broadcast_websocket_message(notification)

        logger.info(f"🎉 Transfer initiated successfully: {transfer_room_name}")
        return TransferInitiateResponse(
            transfer_room_name=transfer_room_name,
            summary=summary,
            agent_a_token=agent_a_token,
            agent_b_token=agent_b_token,
            caller_token=caller_token,
            twilio_call_sid=twilio_call_sid,
            target_agent=target_agent
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate transfer: {str(e)}")

@app.post("/api/twilio/voice")
async def twilio_voice_webhook(room_name: str, summary: str = None):
    """Twilio webhook endpoint - returns TwiML to connect call to LiveKit room"""
    twiml_response = generate_twiml_response(room_name, summary)
    return {"twiml": twiml_response}

@app.post("/api/twilio/status")
async def twilio_status_callback(request: dict):
    """Handle Twilio call status callback updates"""
    call_sid = request.get("CallSid")
    call_status = request.get("CallStatus")
    room_name = request.get("room_name")  # If passed in status callback

    if call_sid and call_status:
        await handle_call_status_callback(call_sid, call_status, room_name)

        # Broadcast status update via WebSocket
        message = {
            "type": "twilio_call_status",
            "call_sid": call_sid,
            "status": call_status,
            "room_name": room_name
        }
        await broadcast_websocket_message(message)

    return {"status": "ok"}

@app.post("/api/caller/context", response_model=CallerContextResponse)
async def get_caller_context_endpoint(request: CallerContextRequest):
    """Get caller context from mock database"""
    try:
        context = get_caller_context(request.email, request.caller_type)
        return CallerContextResponse(
            context=context,
            found=context is not None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get caller context: {str(e)}")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Handle chat messages and generate AI responses"""
    try:
        # Get caller context
        caller_context = get_caller_context(request.email, request.caller_type)
        
        # Convert conversation history to the format expected by AI
        conversation_history = []
        if request.conversation_history:
            for msg in request.conversation_history:
                conversation_history.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        # Generate AI response
        ai_response = generate_ai_response(
            user_message=request.message,
            caller_type=request.caller_type,
            caller_context=caller_context,
            conversation_history=conversation_history
        )
        
        # Update conversation history
        updated_history = request.conversation_history or []
        updated_history.append(ChatMessage(role="user", content=request.message))
        updated_history.append(ChatMessage(role="assistant", content=ai_response))
        
        return ChatResponse(
            success=True,
            response=ai_response,
            conversation_history=updated_history
        )
        
    except Exception as e:
        return ChatResponse(
            success=False,
            response="I apologize, but I'm having trouble processing your request right now.",
            error=str(e)
        )

@app.post("/api/transcribe", response_model=TranscribeResponse)
async def transcribe_endpoint(request: TranscribeRequest):
    """Transcribe audio and generate AI response"""
    try:
        # Transcribe audio
        transcript = await transcribe_base64_audio(request.audio_data)
        
        if not transcript:
            return TranscribeResponse(
                success=False,
                transcript="",
                error="Could not transcribe audio"
            )
        
        # Get caller context
        caller_context = get_caller_context(request.email, request.caller_type)
        
        # Generate AI response
        ai_response = generate_ai_response(
            user_message=transcript,
            caller_type=request.caller_type,
            caller_context=caller_context
        )
        
        # Create conversation history
        conversation_history = [
            ChatMessage(role="user", content=transcript),
            ChatMessage(role="assistant", content=ai_response)
        ]
        
        return TranscribeResponse(
            success=True,
            transcript=transcript,
            ai_response=ai_response,
            conversation_history=conversation_history
        )
        
    except Exception as e:
        return TranscribeResponse(
            success=False,
            transcript="",
            error=str(e)
        )

@app.post("/api/transfer/complete", response_model=TransferCompleteResponse)
async def complete_transfer(request: TransferCompleteRequest):
    """Agent A completes transfer by disconnecting from transfer room and cleaning up"""
    try:
        # Find the transfer room name (assuming it's named with original_room + agent_a_id)
        transfer_room_name = f"transfer_{request.original_room_name}_{request.agent_a_id}"

        # Disconnect Agent A from transfer room
        await disconnect_participant(transfer_room_name, f"agent_a_{request.agent_a_id}")

        # Check if transfer room is empty and clean up
        participants = await get_room_participants(transfer_room_name)
        if len(participants) <= 1:  # Only caller or Agent B left
            # In a real scenario, you might want to keep the room for Agent B and caller
            # For now, we'll delete it after a delay or based on logic
            pass  # Keep room for now

        # Broadcast transfer completion notification
        notification = {
            "type": "transfer_completed",
            "original_room": request.original_room_name,
            "transfer_room": transfer_room_name,
            "agent_a": request.agent_a_id
        }
        await broadcast_websocket_message(notification)

        return TransferCompleteResponse(status="success")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete transfer: {str(e)}")

@app.post("/api/generate-summary")
async def generate_call_summary_endpoint(request: dict):
    """Generate AI-powered call summary for warm transfer"""
    try:
        # Get conversation context from request
        conversation_context = request.get("conversation_context", "")
        caller_type = request.get("caller_type", "general")
        caller_info = request.get("caller_info", {})
        
        # Generate AI summary using Groq
        summary = generate_call_summary(
            conversation_context, 
            caller_type, 
            caller_info
        )
        
        return {
            "success": True,
            "summary": summary,
            "timestamp": "2025-01-15T10:30:00Z"
        }
    except Exception as e:
        return {
            "success": False,
            "summary": "Failed to generate call summary. Please try again.",
            "error": str(e)
        }

@app.post("/api/twilio/transfer")
async def twilio_transfer_endpoint(request: dict):
    """Initiate Twilio phone call for warm transfer with status tracking"""
    try:
        target_phone = request.get("target_phone", os.getenv("TWILIO_TARGET_PHONE"))
        room_name = request.get("room_name", "transfer_room")
        summary = request.get("summary", "Customer needs assistance")
        agent_a_id = request.get("agent_a_id")

        if not target_phone:
            raise ValueError("Target phone number is required")

        # Initiate warm transfer call with summary
        twilio_call_sid = await initiate_warm_transfer_call(target_phone, room_name, summary)

        # Get initial call status
        call_details = await get_call_status(twilio_call_sid)

        # Broadcast transfer initiation
        notification = {
            "type": "twilio_transfer_initiated",
            "call_sid": twilio_call_sid,
            "target_phone": target_phone,
            "room_name": room_name,
            "agent_a_id": agent_a_id,
            "status": call_details.get("status")
        }
        await broadcast_websocket_message(notification)

        return {
            "success": True,
            "call_sid": twilio_call_sid,
            "message": f"Warm transfer call initiated to {target_phone}",
            "room_name": room_name,
            "summary": summary,
            "call_details": call_details
        }
    except ValueError as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Invalid request parameters"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to initiate Twilio call"
        }

@app.get("/api/twilio/call/{call_sid}")
async def get_twilio_call_status(call_sid: str):
    """Get status of a specific Twilio call"""
    try:
        call_details = await get_call_status(call_sid)
        return {
            "success": True,
            "call_details": call_details
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "call_sid": call_sid
        }

@app.post("/api/room/cleanup")
async def cleanup_room(request: dict):
    """Clean up empty rooms to prevent resource leaks"""
    try:
        room_name = request.get("room_name")
        if not room_name:
            return {"success": False, "error": "Room name required"}

        # Check participants
        participants = await get_room_participants(room_name)
        if len(participants) == 0:
            # Room is empty, delete it
            success = await delete_room(room_name)
            return {"success": success, "message": f"Room {room_name} deleted"}
        else:
            return {"success": True, "message": f"Room {room_name} has {len(participants)} participants, not deleted"}

    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/analytics")
async def get_analytics_data(time_range: str = "7d"):
    """Get analytics data for dashboard"""
    try:
        # Mock analytics data - in production, this would query your database
        base_data = {
            "transferStats": {
                "totalTransfers": 156,
                "successfulTransfers": 142,
                "failedTransfers": 14,
                "averageDuration": 8.5
            },
            "callMetrics": {
                "totalCalls": 892,
                "averageCallDuration": 12.3,
                "peakHours": [
                    {"hour": "9:00", "calls": 45},
                    {"hour": "10:00", "calls": 52},
                    {"hour": "11:00", "calls": 48},
                    {"hour": "14:00", "calls": 38},
                    {"hour": "15:00", "calls": 42},
                    {"hour": "16:00", "calls": 35}
                ],
                "callVolumeByDay": [
                    {"date": "Mon", "calls": 120},
                    {"date": "Tue", "calls": 135},
                    {"date": "Wed", "calls": 142},
                    {"date": "Thu", "calls": 128},
                    {"date": "Fri", "calls": 156},
                    {"date": "Sat", "calls": 98},
                    {"date": "Sun", "calls": 113}
                ]
            },
            "agentPerformance": [
                {"agentId": "agent_a", "name": "Alice Johnson", "transfersHandled": 45, "successRate": 95.6, "averageHandleTime": 8.2},
                {"agentId": "agent_b", "name": "Bob Smith", "transfersHandled": 38, "successRate": 92.1, "averageHandleTime": 9.1},
                {"agentId": "agent_c", "name": "Carol Davis", "transfersHandled": 52, "successRate": 98.1, "averageHandleTime": 7.8}
            ],
            "realTimeMetrics": {
                "activeCalls": 12,
                "waitingQueue": 3,
                "averageWaitTime": 2.4
            }
        }

        # Adjust data based on time range
        if time_range == "1d":
            # Reduce all numbers for 1-day view
            multiplier = 0.1
        elif time_range == "30d":
            multiplier = 4.3
        elif time_range == "90d":
            multiplier = 13
        else:  # 7d
            multiplier = 1

        adjusted_data = {
            "transferStats": {
                "totalTransfers": int(base_data["transferStats"]["totalTransfers"] * multiplier),
                "successfulTransfers": int(base_data["transferStats"]["successfulTransfers"] * multiplier),
                "failedTransfers": int(base_data["transferStats"]["failedTransfers"] * multiplier),
                "averageDuration": base_data["transferStats"]["averageDuration"]
            },
            "callMetrics": {
                "totalCalls": int(base_data["callMetrics"]["totalCalls"] * multiplier),
                "averageCallDuration": base_data["callMetrics"]["averageCallDuration"],
                "peakHours": base_data["callMetrics"]["peakHours"],
                "callVolumeByDay": base_data["callMetrics"]["callVolumeByDay"]
            },
            "agentPerformance": base_data["agentPerformance"],
            "realTimeMetrics": base_data["realTimeMetrics"]
        }

        return {
            "success": True,
            "data": adjusted_data,
            "timeRange": time_range,
            "timestamp": "2025-01-15T10:30:00Z"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch analytics data"
        }

@app.get("/api/transfers/history")
async def get_transfer_history(agent_id: str = None, limit: int = 20):
    """Get transfer history for agents"""
    try:
        # Mock transfer history data
        mock_transfers = [
            {
                "id": "1",
                "timestamp": "2025-01-15T09:30:00Z",
                "agentA": "Alice Johnson",
                "agentB": "Bob Smith",
                "callerEmail": "john.doe@example.com",
                "callerType": "investor",
                "status": "completed",
                "duration": 420,
                "summary": "Customer needed help with account login issues. Password reset completed successfully.",
                "reason": "Technical support"
            },
            {
                "id": "2",
                "timestamp": "2025-01-15T08:15:00Z",
                "agentA": "Alice Johnson",
                "agentB": "Carol Davis",
                "callerEmail": "jane.smith@example.com",
                "callerType": "prospect",
                "status": "completed",
                "duration": 680,
                "summary": "Prospect interested in investment opportunities. Discussed portfolio options and next steps.",
                "reason": "Sales inquiry"
            },
            {
                "id": "3",
                "timestamp": "2025-01-15T07:45:00Z",
                "agentA": "Alice Johnson",
                "agentB": "Bob Smith",
                "callerEmail": "mike.wilson@example.com",
                "callerType": "investor",
                "status": "failed",
                "duration": 120,
                "summary": "Customer had questions about recent market performance.",
                "reason": "Connection lost"
            }
        ]

        # Filter by agent if specified
        if agent_id:
            filtered_transfers = [t for t in mock_transfers if t["agentA"].lower().replace(" ", "_") == agent_id.lower()]
        else:
            filtered_transfers = mock_transfers

        return {
            "success": True,
            "transfers": filtered_transfers[:limit],
            "total": len(filtered_transfers),
            "limit": limit
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch transfer history"
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
