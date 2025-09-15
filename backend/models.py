from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class CreateRoomRequest(BaseModel):
    room_name: str
    participant_identity: str
    caller_type: str = "investor"  # "investor" or "prospect"
    email: str

class CreateRoomResponse(BaseModel):
    room_name: str
    access_token: str
    caller_context: Optional[Dict[str, Any]] = None

class TransferInitiateRequest(BaseModel):
    original_room_name: str
    agent_a_id: str
    transfer_target: str = "compliance"  # "compliance" or "general_partner"
    caller_type: str = "investor"
    email: str

class TransferInitiateResponse(BaseModel):
    transfer_room_name: str
    summary: str
    agent_a_token: str
    agent_b_token: str
    caller_token: str
    twilio_call_sid: Optional[str] = None
    target_agent: Optional[Dict[str, Any]] = None

class TransferCompleteRequest(BaseModel):
    original_room_name: str
    agent_a_id: str

class TransferCompleteResponse(BaseModel):
    status: str

class CallerContextRequest(BaseModel):
    email: str
    caller_type: str

class CallerContextResponse(BaseModel):
    context: Optional[Dict[str, Any]] = None
    found: bool

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    caller_type: str
    email: str
    conversation_history: Optional[List[ChatMessage]] = None

class ChatResponse(BaseModel):
    success: bool
    response: str
    conversation_history: Optional[List[ChatMessage]] = None
    error: Optional[str] = None

class TranscribeRequest(BaseModel):
    audio_data: str  # Base64 encoded audio
    caller_type: str
    email: str

class TranscribeResponse(BaseModel):
    success: bool
    transcript: str
    ai_response: Optional[str] = None
    conversation_history: Optional[List[ChatMessage]] = None
    error: Optional[str] = None
