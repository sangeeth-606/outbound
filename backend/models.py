from pydantic import BaseModel
from typing import Optional

class CreateRoomRequest(BaseModel):
    room_name: str
    participant_identity: str

class CreateRoomResponse(BaseModel):
    room_name: str
    access_token: str

class TransferInitiateRequest(BaseModel):
    original_room_name: str
    agent_a_id: str

class TransferInitiateResponse(BaseModel):
    transfer_room_name: str
    summary: str
    agent_a_token: str
    agent_b_token: str

class TransferCompleteRequest(BaseModel):
    original_room_name: str
    agent_a_id: str

class TransferCompleteResponse(BaseModel):
    status: str
