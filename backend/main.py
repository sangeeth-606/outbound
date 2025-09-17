from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
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

from livekit_utils import create_room_token, create_room, disconnect_participant, get_room_participants, delete_room, start_room_transcription, stop_room_transcription, is_room_transcription_active
from twilio_utils import initiate_twilio_call, initiate_warm_transfer_call, get_call_status, handle_call_status_callback, generate_twiml_response
from llm_utils import generate_call_summary
from db_utils import (
    get_caller_context, get_agent_by_role,
    add_customer_to_queue, get_queue_position, get_next_customer,
    get_queue_length, get_available_agents_count, update_agent_status,
    get_agent_status, remove_customer_from_queue, get_estimated_wait_time,
    get_room_transcriptions, get_transcription_summary
)
from deepgram_utils import transcribe_base64_audio
from ai_chat_utils import generate_ai_response, create_conversation_entry
from models import (
    CreateRoomRequest, CreateRoomResponse,
    TransferInitiateRequest, TransferInitiateResponse,
    TransferCompleteRequest, TransferCompleteResponse,
    CallerContextRequest, CallerContextResponse,
    ChatRequest, ChatResponse, TranscribeRequest, TranscribeResponse,
    ChatMessage,
    QueueStatusRequest, QueueStatusResponse,
    AgentAvailabilityRequest, AgentAvailabilityResponse,
    PickNextCustomerRequest, PickNextCustomerResponse,
    StartTranscriptionRequest, StartTranscriptionResponse,
    StopTranscriptionRequest, StopTranscriptionResponse,
    GetTranscriptionRequest, GetTranscriptionResponse
)
import asyncio
from fastapi import WebSocket
from typing import List
import json
from datetime import datetime

# WebSocket connections for real-time notifications
websocket_connections: List[WebSocket] = []

# In-memory storage for pending transfers (in production, use a database)
pending_transfers = {}

# In-memory storage for customer assignments to ensure HTTP fallback delivery
# Keyed by customer email → { room_name, customer_token }
assigned_customers = {}

# Targeted WebSocket maps for customers and agents
customer_sockets = {}
agent_sockets = {}

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
    
    # Store connection type for targeted messaging
    connection_info = {
        "websocket": websocket,
        "type": "unknown",  # Will be updated when client identifies itself
        "email": None,
        "agent_id": None
    }
    
    try:
        while True:
            # Receive and process identification messages
            data = await websocket.receive_text()
            logger.debug(f"📨 WebSocket received: {data}")
            
            try:
                message = json.loads(data)
                
                # Handle client identification
                if "email" in message:
                    connection_info["type"] = "customer"
                    connection_info["email"] = message["email"]
                    logger.info(f"👤 Customer identified: {message['email']}")
                    customer_sockets[message["email"]] = websocket
                    
                elif "agent_id" in message:
                    connection_info["type"] = "agent"
                    connection_info["agent_id"] = message["agent_id"]
                    logger.info(f"👔 Agent identified: {message['agent_id']}")
                    agent_sockets[message["agent_id"]] = websocket
                    
                # Send acknowledgment instead of echo
                await websocket.send_text(json.dumps({
                    "type": "acknowledgment",
                    "message": "Message received",
                    "timestamp": datetime.now().isoformat()
                }))
                
            except json.JSONDecodeError:
                logger.warning(f"Received non-JSON message: {data}")
                # Send error response in JSON format
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
                
    except WebSocketDisconnect:
        logger.info("🔌 WebSocket client disconnected normally")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
    finally:
        if websocket in websocket_connections:
            websocket_connections.remove(websocket)
        # Cleanup targeted maps
        try:
            if connection_info.get("email") and customer_sockets.get(connection_info["email"]) is websocket:
                del customer_sockets[connection_info["email"]]
        except Exception:
            pass
        try:
            if connection_info.get("agent_id") and agent_sockets.get(connection_info["agent_id"]) is websocket:
                del agent_sockets[connection_info["agent_id"]]
        except Exception:
            pass
        logger.info(f"🔌 WebSocket connection closed. Total connections: {len(websocket_connections)}")

# Targeted send helpers with broadcast fallback
async def send_to_customer(email: str, message: dict):
    ws = customer_sockets.get(email)
    if ws:
        try:
            await ws.send_json(message)
            return
        except Exception:
            pass
    await broadcast_websocket_message(message)

async def send_to_agent(agent_id: str, message: dict):
    ws = agent_sockets.get(agent_id)
    if ws:
        try:
            await ws.send_json(message)
            return
        except Exception:
            pass
    await broadcast_websocket_message(message)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Removed mock conversation history
# TODO: Implement conversation history storage and retrieval from database

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
    """Create a new LiveKit room and generate access token for participant with caller context and queue management"""
    try:
        # Always add customer to queue first, regardless of agent availability
        # This ensures proper queue management and agent-controlled connections
        position = add_customer_to_queue(request.email, request.caller_type)
        estimated_wait = get_estimated_wait_time(position)
        
        logger.info(f"Customer {request.email} added to queue at position {position}")

        return CreateRoomResponse(
            room_name=request.room_name,
            access_token="",  # No token yet - customer must wait for agent to pick them
            caller_context=None,
            queue_status="waiting",
            queue_position=position,
            estimated_wait_time=estimated_wait
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

        # Use the summary provided by Agent A from chat history (frontend already generated it)
        # This is more accurate than generating from transcription data
        if hasattr(request, 'summary') and request.summary and request.summary.strip():
            summary = request.summary
            logger.info(f"📝 Using frontend-provided summary: {summary[:100]}...")
            # Initialize transcription variables for consistent data structure
            transcription_segments = []
            transcription_summary = ""
            transcription_active = False
            transcription_status = "inactive"
            transcription_error = None
        else:
            # Fallback: Generate summary using LLM with transcription context
            logger.info("🤖 No summary provided, generating call summary with LLM...")

            # Check transcription status and handle errors
            transcription_active = is_room_transcription_active(request.original_room_name)
            transcription_segments = get_room_transcriptions(request.original_room_name)
            transcription_summary = get_transcription_summary(request.original_room_name)
            transcription_status = "active" if transcription_active else "inactive"
            transcription_error = None

            # Error handling for transcription failures
            if transcription_active and not transcription_segments:
                logger.warning(f"⚠️  Transcription was active for room {request.original_room_name} but no segments found - possible transcription failure")
                conversation_context = "Transcription service encountered an issue during the call. Customer conversation context may be incomplete."
            elif transcription_segments:
                # Create rich context with timestamps and speakers
                conversation_context = f"Call transcription with {len(transcription_segments)} segments:\n"
                for segment in transcription_segments[-10:]:  # Last 10 segments for context
                    speaker = segment.get('speaker', 'unknown')
                    text = segment.get('text', '').strip()
                    timestamp = segment.get('timestamp', 'unknown')
                    if text:
                        conversation_context += f"[{timestamp}] {speaker}: {text}\n"

                # Add summary if available
                if transcription_summary:
                    conversation_context += f"\nSummary: {transcription_summary}"

                logger.info(f"📝 Using detailed transcription context: {len(transcription_segments)} segments")
            elif transcription_summary:
                conversation_context = transcription_summary
                logger.info(f"📝 Using transcription summary: {transcription_summary[:100]}...")
            else:
                if transcription_active:
                    conversation_context = "Transcription service failed to capture conversation. Please ask the customer to repeat key details."
                    logger.error(f"❌ Transcription active but no data captured for room {request.original_room_name}")
                else:
                    conversation_context = "Customer conversation context not available - transcription was not started for this call"
                    logger.info("📝 No transcription data available, using fallback context")

            summary = generate_call_summary(
                conversation_context,
                request.caller_type,
                caller_context
            )
            logger.info(f"📝 Generated fallback summary: {summary[:100]}...")

        # Use the ORIGINAL room for transfer - no need to create a new room
        # Agent A and caller stay in original room, Agent B joins them
        transfer_room_name = request.original_room_name
        logger.info(f"🏠 Using original room for transfer: {transfer_room_name}")

        # Generate token for Agent B to join the existing room
        logger.info("🎫 Generating access token for Agent B to join existing room")
        agent_b_token = create_room_token(
            room_name=transfer_room_name,
            participant_identity="agent_b_transfer"
        )

        # Agent A and caller already have tokens and are in the room
        agent_a_token = None  # Not needed - Agent A stays in current room
        caller_token = None   # Not needed - caller stays in current room

        # NOTE: No room switching needed - Agent B simply joins the existing room
        # This is much simpler and more intuitive than moving everyone to a new room
        logger.info(f"🎫 Token generated for Agent B to join original room: {transfer_room_name}")
        logger.info("🔄 Agent B will join the existing room where Agent A and caller are already connected")

        # Speak the call summary in the original room
        await speak_summary(transfer_room_name, summary)

        # Store transfer information for Agent B to retrieve
        transfer_data = {
            'transfer_room_name': transfer_room_name,
            'summary': summary,
            'agent_b_token': agent_b_token,
            'agent_a_id': request.agent_a_id,
            'timestamp': datetime.now().isoformat(),
            'transcription_context': {
                'segments': transcription_segments[-20:] if transcription_segments else [],  # Last 20 segments
                'total_segments': len(transcription_segments) if transcription_segments else 0,
                'transcription_active': transcription_active,
                'transcription_status': transcription_status,
                'transcription_error': transcription_error,
                'summary_text': transcription_summary
            },
            'caller_info': {
                'email': request.email,
                'caller_type': request.caller_type
            },
            'ready_to_join': True  # Agent B can join immediately since no room switching is needed
        }
        pending_transfers['agent_b'] = transfer_data

        # No need for room switch notifications - everyone stays in the original room
        # Just broadcast that transfer is ready for Agent B
        await broadcast_websocket_message({
            "type": "transfer_ready",
            "original_room": request.original_room_name,
            "transfer_room": transfer_room_name,
            "summary": summary,
            "message": "Transfer ready - Agent B can join the room"
        })

        # Optional: Initiate Twilio call for external agents
        twilio_call_sid = None
        if target_agent and target_agent.get('phone'):
            try:
                twilio_call_sid = await initiate_warm_transfer_call(
                    target_agent['phone'], 
                    transfer_room_name, 
                    summary
                )
                logger.info(f"📞 Twilio call initiated: {twilio_call_sid}")
            except Exception as e:
                logger.warning(f"⚠️ Twilio call failed: {str(e)}")

        # NOTE: No room switching needed - much simpler flow
        # Agent A and caller stay in original room, Agent B joins them

        logger.info(f"🎉 Transfer initiated successfully: {transfer_room_name}")
        logger.info("🔄 Agent B can now join the original room")
        return TransferInitiateResponse(
            transfer_room_name=transfer_room_name,
            summary=summary,
            agent_a_token=agent_a_token,  # Will be None - not needed
            agent_b_token=agent_b_token,
            caller_token=caller_token,    # Will be None - not needed
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

# Queue Management Endpoints
@app.post("/api/queue/status", response_model=QueueStatusResponse)
async def get_queue_status(request: QueueStatusRequest):
    """Get customer's current queue status"""
    try:
        position = get_queue_position(request.email)
        if position is None:
            raise HTTPException(status_code=404, detail="Customer not found in queue")

        estimated_wait = get_estimated_wait_time(position)
        total_waiting = get_queue_length()
        agents_available = get_available_agents_count()

        # If this customer was already assigned via WebSocket flow, return token immediately
        if request.email in assigned_customers:
            info = assigned_customers.pop(request.email)
            return QueueStatusResponse(
                position=0,
                estimated_wait_time=0,
                total_waiting=get_queue_length(),
                agents_available=get_available_agents_count(),
                access_token=info.get("customer_token", ""),
                room_name=info.get("room_name", "support_room")
            )

        # If position is 1 and agents available, connect immediately
        access_token = ""
        room_name = "support_room"  # default
        if position == 1 and agents_available > 0:
            # Select agent (demo: agent_a)
            selected_agent = "agent_a"
            if get_agent_status(selected_agent) and get_agent_status(selected_agent).get("status") == "available":
                # Pop customer from queue
                next_customer = get_next_customer()
                if next_customer and next_customer['email'] == request.email:
                    # Create dynamic room
                    room_name = f"support_{selected_agent}_{next_customer['email'].replace('@', '_').replace('.', '_')}"
                    await create_room(room_name)

                    # Generate customer token
                    access_token = create_room_token(room_name, f"customer_{next_customer['email']}")

                    # Update agent busy
                    update_agent_status(selected_agent, "busy", next_customer['email'])

                    # Broadcast to agent
                    agent_token = create_room_token(room_name, f"agent_{selected_agent}")
                    agent_notification = {
                        "type": "customer_assigned",
                        "agent_id": selected_agent,
                        "customer_email": next_customer['email'],
                        "room_name": room_name,
                        "agent_token": agent_token
                    }
                    await send_to_agent(selected_agent, agent_notification)

                    logger.info(f"Queue connect: assigned {request.email} to {selected_agent} in {room_name}")

                    # Store assignment for HTTP fallback to the specific customer
                    assigned_customers[next_customer['email']] = {
                        "room_name": room_name,
                        "customer_token": access_token
                    }

                    # Update position to 0 (connected)
                    position = 0
                    estimated_wait = 0

        return QueueStatusResponse(
            position=position,
            estimated_wait_time=estimated_wait,
            total_waiting=total_waiting,
            agents_available=agents_available,
            access_token=access_token if position == 0 else "",
            room_name=room_name if position == 0 else "support_room"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get queue status: {str(e)}")

@app.post("/api/agent/availability", response_model=AgentAvailabilityResponse)
async def update_agent_availability(request: AgentAvailabilityRequest):
    """Update agent availability status"""
    try:
        update_agent_status(request.agent_id, request.status)

        # If agent becomes available, try to connect them with next customer
        if request.status == "available":
            next_customer = get_next_customer()
            if next_customer:
                logger.info(f"Agent {request.agent_id} available, popping customer {next_customer['email']}")
                # Create room for this customer-agent pair
                room_name = f"support_{request.agent_id}_{next_customer['email'].replace('@', '_').replace('.', '_')}"
                await create_room(room_name)

                # Generate tokens
                agent_token = create_room_token(room_name, f"agent_{request.agent_id}")
                customer_token = create_room_token(room_name, f"customer_{next_customer['email']}")

                # Update agent status to busy
                update_agent_status(request.agent_id, "busy", next_customer['email'])

                # Targeted notify agent for auto-join
                notification = {
                    "type": "customer_assigned",
                    "agent_id": request.agent_id,
                    "customer_email": next_customer['email'],
                    "room_name": room_name,
                    "agent_token": agent_token
                }
                await send_to_agent(request.agent_id, notification)

                # Notify customer with token directly
                customer_notification = {
                    "type": "agent_assigned",
                    "email": next_customer['email'],
                    "room_name": room_name,
                    "customer_token": customer_token
                }
                await send_to_customer(next_customer['email'], customer_notification)

                return AgentAvailabilityResponse(
                    success=True,
                    message=f"Connected to customer {next_customer['email']} in room {room_name}"
                )

        return AgentAvailabilityResponse(
            success=True,
            message=f"Agent {request.agent_id} status updated to {request.status}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update agent availability: {str(e)}")

@app.post("/api/agent/pick-next", response_model=PickNextCustomerResponse)
async def pick_next_customer(request: PickNextCustomerRequest):
    """Agent picks next customer from queue"""
    try:
        # Check if agent is available
        agent_status = get_agent_status(request.agent_id)
        if not agent_status or agent_status.get("status") != "available":
            return PickNextCustomerResponse(
                success=False,
                message="Agent is not available to take calls"
            )

        # Get next customer from queue
        next_customer = get_next_customer()
        if not next_customer:
            return PickNextCustomerResponse(
                success=False,
                message="No customers in queue"
            )

        # Create room for this customer-agent pair
        room_name = f"support_{request.agent_id}_{next_customer['email'].replace('@', '_').replace('.', '_')}"
        await create_room(room_name)
        logger.info(f"Pick-next for {request.agent_id}: customer {next_customer['email']}, room: {room_name}")

        # Generate tokens
        agent_token = create_room_token(room_name, f"agent_{request.agent_id}")
        customer_token = create_room_token(room_name, f"customer_{next_customer['email']}")

        # Update agent status to busy
        update_agent_status(request.agent_id, "busy", next_customer['email'])

        # Targeted notify agent for auto-join
        notification = {
            "type": "customer_assigned",
            "agent_id": request.agent_id,
            "customer_email": next_customer['email'],
            "room_name": room_name,
            "agent_token": agent_token
        }
        await send_to_agent(request.agent_id, notification)

        # Notify customer with token directly
        customer_notification = {
            "type": "agent_assigned",
            "email": next_customer['email'],
            "room_name": room_name,
            "customer_token": customer_token
        }
        await send_to_customer(next_customer['email'], customer_notification)

        return PickNextCustomerResponse(
            success=True,
            customer=next_customer,
            room_name=room_name,
            access_token=agent_token,
            message=f"Connected to customer {next_customer['email']}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pick next customer: {str(e)}")

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

@app.post("/api/chat/summarize")
async def summarize_chat_history(request: dict):
    """Generate AI summary from chat history for warm transfer"""
    try:
        room_name = request.get("room_name")
        conversation_text = request.get("conversation_text", "")
        message_count = request.get("message_count", 0)
        raw_messages = request.get("raw_messages", [])
        
        logger.info(f"🤖 Generating chat summary for room: {room_name} with {message_count} messages")
        
        if not conversation_text.strip():
            return {
                "success": True,
                "summary": "No chat conversation available for this session.",
                "message_count": 0
            }
        
        # Generate AI summary using the existing function
        summary = generate_call_summary(
            conversation_text,
            "investor",  # Default to investor for now
            {"conversation_length": message_count}
        )
        
        logger.info(f"✅ Generated chat summary: {summary[:100]}...")
        
        return {
            "success": True,
            "summary": summary,
            "message_count": message_count,
            "room_name": room_name,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Failed to generate chat summary: {str(e)}")
        return {
            "success": False,
            "summary": "Failed to generate conversation summary from chat history.",
            "error": str(e)
        }

@app.get("/api/agent/transfer-status/{agent_id}")
async def get_agent_transfer_status(agent_id: str):
    """Check if there's a pending transfer for a specific agent"""
    try:
        if agent_id in pending_transfers:
            transfer_info = pending_transfers[agent_id]
            
            # Only return the transfer if it's ready for Agent B to join
            # This prevents Agent B from joining before Agent A and caller have switched
            ready_to_join = transfer_info.get('ready_to_join', False)
            
            if ready_to_join:
                return {
                    "success": True,
                    "has_pending_transfer": True,
                    "transfer_details": transfer_info,
                    "message": "Transfer ready for Agent B to join"
                }
            else:
                return {
                    "success": True,
                    "has_pending_transfer": False,
                    "transfer_details": None,
                    "message": "Transfer pending - waiting for room switch completion"
                }
        else:
            return {
                "success": True,
                "has_pending_transfer": False,
                "transfer_details": None,
                "message": "No pending transfers"
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "has_pending_transfer": False
        }

@app.delete("/api/agent/transfer-status/{agent_id}")
async def clear_agent_transfer_status(agent_id: str):
    """Clear pending transfer for a specific agent"""
    try:
        if agent_id in pending_transfers:
            del pending_transfers[agent_id]
            return {
                "success": True,
                "message": f"Transfer cleared for agent {agent_id}"
            }
        else:
            return {
                "success": True,
                "message": f"No pending transfer found for agent {agent_id}"
            }
    except Exception as e:
        return {
            "success": False,
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
        # TODO: Replace with actual database queries for analytics data
        # For now, return empty data structure to indicate no mock data dependency
        empty_data = {
            "transferStats": {
                "totalTransfers": 0,
                "successfulTransfers": 0,
                "failedTransfers": 0,
                "averageDuration": 0
            },
            "callMetrics": {
                "totalCalls": 0,
                "averageCallDuration": 0,
                "peakHours": [],
                "callVolumeByDay": []
            },
            "agentPerformance": [],
            "realTimeMetrics": {
                "activeCalls": 0,
                "waitingQueue": 0,
                "averageWaitTime": 0
            }
        }

        return {
            "success": True,
            "data": empty_data,
            "timeRange": time_range,
            "timestamp": "2025-01-15T10:30:00Z",
            "message": "Analytics data not available - implement database integration"
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
        # TODO: Replace with actual database queries for transfer history
        # For now, return empty list to indicate no mock data dependency
        return {
            "success": True,
            "transfers": [],
            "total": 0,
            "limit": limit,
            "message": "Transfer history not available - implement database integration"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to fetch transfer history"
        }

# Transcription Endpoints
@app.post("/api/transcription/start", response_model=StartTranscriptionResponse)
async def start_transcription(request: StartTranscriptionRequest):
    """Start real-time transcription for a room"""
    try:
        if is_room_transcription_active(request.room_name):
            return StartTranscriptionResponse(
                success=True,
                message="Transcription already active for this room"
            )

        success = await start_room_transcription(request.room_name)
        if success:
            return StartTranscriptionResponse(
                success=True,
                message=f"Transcription started for room {request.room_name}"
            )
        else:
            return StartTranscriptionResponse(
                success=False,
                message="Failed to start transcription"
            )
    except Exception as e:
        return StartTranscriptionResponse(
            success=False,
            message=f"Failed to start transcription: {str(e)}"
        )

@app.post("/api/transcription/stop", response_model=StopTranscriptionResponse)
async def stop_transcription(request: StopTranscriptionRequest):
    """Stop real-time transcription for a room"""
    try:
        success = await stop_room_transcription(request.room_name)
        if success:
            return StopTranscriptionResponse(
                success=True,
                message=f"Transcription stopped for room {request.room_name}"
            )
        else:
            return StopTranscriptionResponse(
                success=False,
                message="Failed to stop transcription"
            )
    except Exception as e:
        return StopTranscriptionResponse(
            success=False,
            message=f"Failed to stop transcription: {str(e)}"
        )

@app.post("/api/transcription/get", response_model=GetTranscriptionResponse)
async def get_transcription(request: GetTranscriptionRequest):
    """Get transcription data for a room"""
    try:
        transcripts = get_room_transcriptions(request.room_name)
        return GetTranscriptionResponse(
            success=True,
            transcripts=transcripts,
            message=f"Retrieved {len(transcripts)} transcription segments"
        )
    except Exception as e:
        return GetTranscriptionResponse(
            success=False,
            transcripts=[],
            message=f"Failed to get transcription: {str(e)}"
        )

@app.post("/api/agent/notify-transfer")
async def notify_agent_transfer(request: dict):
    """Notify agent that transfer is ready to join"""
    try:
        agent_id = request.get("agent_id")
        action = request.get("action")
        
        logger.info(f"🔔 Notifying {agent_id} to {action}")
        
        if action == "join_transfer_room" and agent_id in pending_transfers:
            # Mark the transfer as ready for the agent to join
            pending_transfers[agent_id]["ready_to_join"] = True
            logger.info(f"✅ Transfer marked as ready for {agent_id}")
            
            return {
                "success": True,
                "message": f"Agent {agent_id} notified to join transfer room"
            }
        else:
            return {
                "success": False,
                "message": f"No pending transfer found for {agent_id} or invalid action"
            }
            
    except Exception as e:
        logger.error(f"❌ Failed to notify agent transfer: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
