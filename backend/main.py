from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional
import os
from dotenv import load_dotenv

from livekit_utils import create_room_token, create_room
from twilio_utils import initiate_twilio_call
from llm_utils import generate_call_summary
from db_utils import get_caller_context, get_agent_by_role
from models import (
    CreateRoomRequest, CreateRoomResponse,
    TransferInitiateRequest, TransferInitiateResponse,
    TransferCompleteRequest, TransferCompleteResponse,
    CallerContextRequest, CallerContextResponse
)

# Load environment variables
load_dotenv()

app = FastAPI(title="Warm Transfer API", version="1.0.0")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
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
        # Get caller context from mock database
        caller_context = get_caller_context(request.email, request.caller_type)
        
        # Determine target agent based on transfer type
        if request.transfer_target == "compliance":
            target_agent = get_agent_by_role("Compliance Officer")
        elif request.transfer_target == "general_partner":
            target_agent = get_agent_by_role("General Partner")
        else:
            target_agent = get_agent_by_role("Compliance Officer")  # Default
        
        # Generate dynamic call summary using LLM with context
        summary = generate_call_summary(
            MOCK_CONVERSATION_HISTORY, 
            request.caller_type, 
            caller_context
        )
        
        # Create new transfer room
        transfer_room_name = f"transfer_{request.original_room_name}_{request.agent_a_id}"
        await create_room(transfer_room_name)
        
        # Generate tokens for both agents
        agent_a_token = create_room_token(
            room_name=transfer_room_name,
            participant_identity=f"agent_a_{request.agent_a_id}"
        )
        
        agent_b_token = create_room_token(
            room_name=transfer_room_name,
            participant_identity="agent_b_transfer"
        )
        
        # Initiate Twilio call to target agent's phone number
        twilio_call_sid = None
        if target_agent and target_agent.get("twilio_phone"):
            twilio_call_sid = await initiate_twilio_call(
                target_agent["twilio_phone"], 
                transfer_room_name
            )
        else:
            # Fallback to default phone number
            target_phone = os.getenv("TWILIO_TARGET_PHONE", "+1234567890")
            twilio_call_sid = await initiate_twilio_call(target_phone, transfer_room_name)
        
        return TransferInitiateResponse(
            transfer_room_name=transfer_room_name,
            summary=summary,
            agent_a_token=agent_a_token,
            agent_b_token=agent_b_token,
            twilio_call_sid=twilio_call_sid,
            target_agent=target_agent
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initiate transfer: {str(e)}")

@app.post("/api/twilio/voice")
async def twilio_voice_webhook(room_name: str):
    """Twilio webhook endpoint - returns TwiML to connect call to LiveKit room"""
    twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Room>{room_name}</Room>
    </Connect>
</Response>"""
    
    return {"twiml": twiml_response}

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

@app.post("/api/transfer/complete", response_model=TransferCompleteResponse)
async def complete_transfer(request: TransferCompleteRequest):
    """Agent A completes transfer by disconnecting from original room"""
    try:
        # In a real implementation, you would disconnect Agent A from the original room
        # For this demo, we'll just return success
        # The frontend will handle the actual disconnection
        
        return TransferCompleteResponse(status="success")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete transfer: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
