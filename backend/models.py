from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class CreateRoomRequest(BaseModel):
    room_name: str
    participant_identity: str
    caller_type: str = "investor"  # "investor" or "prospect"
    email: str

class CreateRoomResponse(BaseModel):
    room_name: str
    access_token: str
    caller_context: Optional[Dict[str, Any]] = None
    queue_status: str = "connected"  # "connected", "waiting", "no_agents"
    queue_position: Optional[int] = None
    estimated_wait_time: Optional[int] = None  # in seconds

class TransferInitiateRequest(BaseModel):
    original_room_name: str
    agent_a_id: str
    transfer_target: str = "compliance"  # "compliance" or "general_partner"
    caller_type: str = "investor"
    email: str
    summary: Optional[str] = None  # Frontend-generated summary from chat history
    chat_history: Optional[List[Dict[str, Any]]] = None  # Chat history for context

class TransferInitiateResponse(BaseModel):
    transfer_room_name: str
    summary: str
    agent_a_token: Optional[str] = None  # Optional - not needed in simplified flow
    agent_b_token: str
    caller_token: Optional[str] = None   # Optional - not needed in simplified flow
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

# Queue System Models
class QueueEntry(BaseModel):
    email: str
    caller_type: str
    timestamp: datetime
    status: str = "waiting"  # "waiting", "connecting", "connected"

class AgentStatus(BaseModel):
    agent_id: str
    status: str = "offline"  # "offline", "available", "busy"
    current_customer: Optional[str] = None  # email of customer being served

class QueueStatusRequest(BaseModel):
    email: str

class QueueStatusResponse(BaseModel):
    position: int
    estimated_wait_time: int  # in seconds
    total_waiting: int
    agents_available: int
    access_token: Optional[str] = None
    room_name: Optional[str] = None

class AgentAvailabilityRequest(BaseModel):
    agent_id: str
    status: str  # "available", "busy", "offline"

class AgentAvailabilityResponse(BaseModel):
    success: bool
    message: str

class PickNextCustomerRequest(BaseModel):
    agent_id: str

class PickNextCustomerResponse(BaseModel):
    success: bool
    customer: Optional[Dict[str, Any]] = None
    room_name: Optional[str] = None
    access_token: Optional[str] = None
    message: str

# Transcription Models
class TranscriptionSegment(BaseModel):
    id: str
    room_name: str
    speaker: str  # "agent_a", "customer", etc.
    text: str
    timestamp: str
    confidence: Optional[float] = None
    is_final: bool = True
    words: Optional[List[Dict[str, Any]]] = None

class StartTranscriptionRequest(BaseModel):
    room_name: str
    agent_id: str

class StartTranscriptionResponse(BaseModel):
    success: bool
    message: str

class StopTranscriptionRequest(BaseModel):
    room_name: str

class StopTranscriptionResponse(BaseModel):
    success: bool
    message: str

class GetTranscriptionRequest(BaseModel):
    room_name: str

class GetTranscriptionResponse(BaseModel):
    success: bool
    transcripts: List[TranscriptionSegment]
    message: str
