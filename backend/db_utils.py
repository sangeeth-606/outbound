import json
import os
from typing import Dict, List, Optional, Union
from datetime import datetime
from collections import deque

# In-memory storage for queue system (replace with database/Redis in production)
customer_queue = deque()  # FIFO queue for customers
agent_status = {}  # agent_id -> status dict

def get_caller_context(email: str, caller_type: str) -> Optional[Dict]:
    """
    Get caller context from database based on email and type.
    In production, this should query a real database.
    For now, returns None to indicate no mock data dependency.
    """
    # TODO: Replace with actual database query
    # Example: query database for user with email and type
    return None

def get_agent_by_role(role: str) -> Optional[Dict]:
    """
    Get agent information by role.
    In production, this should query a real database or user management system.
    For now, returns None to indicate no mock data dependency.
    """
    # TODO: Replace with actual database query or user management system
    return None

def get_all_agents() -> List[Dict]:
    """
    Get all agents from the database.
    In production, this should query a real database or user management system.
    For now, returns empty list to indicate no mock data dependency.
    """
    # TODO: Replace with actual database query or user management system
    return []

# Queue Management Functions
def add_customer_to_queue(email: str, caller_type: str) -> int:
    """Add customer to queue and return position"""
    queue_entry = {
        "email": email,
        "caller_type": caller_type,
        "timestamp": datetime.now(),
        "status": "waiting"
    }
    customer_queue.append(queue_entry)
    return len(customer_queue)

def get_queue_position(email: str) -> Optional[int]:
    """Get customer's position in queue"""
    for i, customer in enumerate(customer_queue):
        if customer["email"] == email:
            return i + 1
    return None

def get_next_customer() -> Optional[Dict]:
    """Get next customer from queue"""
    if customer_queue:
        return customer_queue.popleft()
    return None

def get_queue_length() -> int:
    """Get total number of customers in queue"""
    return len(customer_queue)

def get_available_agents_count() -> int:
    """Get count of available agents"""
    # Initialize default agents if not exists
    if not agent_status:
        # Initialize with default agents
        agent_status["agent_a"] = {
            "status": "offline",
            "current_customer": None,
            "last_updated": datetime.now()
        }
        agent_status["agent_b"] = {
            "status": "offline",
            "current_customer": None,
            "last_updated": datetime.now()
        }
    
    return sum(1 for status in agent_status.values() if status.get("status") == "available")

def update_agent_status(agent_id: str, status: str, current_customer: Optional[str] = None):
    """Update agent status"""
    agent_status[agent_id] = {
        "status": status,
        "current_customer": current_customer,
        "last_updated": datetime.now()
    }

def get_agent_status(agent_id: str) -> Optional[Dict]:
    """Get agent status"""
    # Initialize default agent if not exists
    if agent_id not in agent_status:
        agent_status[agent_id] = {
            "status": "offline",
            "current_customer": None,
            "last_updated": datetime.now()
        }
    return agent_status.get(agent_id)

def remove_customer_from_queue(email: str):
    """Remove customer from queue (when they connect or leave)"""
    global customer_queue
    customer_queue = deque([c for c in customer_queue if c["email"] != email])

def get_estimated_wait_time(position: int) -> int:
    """Estimate wait time based on position and available agents"""
    agents_available = get_available_agents_count()
    if agents_available == 0:
        return 300  # 5 minutes default when no agents available
    # Assume average call time of 5 minutes per customer
    return (position * 300) // max(agents_available, 1)

# Removed mock data dependent functions
# TODO: Implement these functions with real database queries when needed

# Transcription Storage
room_transcriptions = {}  # room_name -> list of transcription segments

def store_transcription_segment(segment: Dict) -> bool:
    """Store a transcription segment"""
    try:
        room_name = segment["room_name"]
        if room_name not in room_transcriptions:
            room_transcriptions[room_name] = []
        room_transcriptions[room_name].append(segment)
        return True
    except Exception as e:
        print(f"Failed to store transcription segment: {e}")
        return False

def get_room_transcriptions(room_name: str) -> List[Dict]:
    """Get all transcription segments for a room"""
    return room_transcriptions.get(room_name, [])

def clear_room_transcriptions(room_name: str) -> bool:
    """Clear all transcription segments for a room"""
    try:
        if room_name in room_transcriptions:
            del room_transcriptions[room_name]
        return True
    except Exception as e:
        print(f"Failed to clear transcriptions for room {room_name}: {e}")
        return False

def get_transcription_summary(room_name: str) -> str:
    """Get concatenated transcription text for a room"""
    transcripts = get_room_transcriptions(room_name)
    # Get final transcripts only
    final_transcripts = [t for t in transcripts if t.get("is_final", True)]
    return " ".join([t["text"] for t in final_transcripts if t["text"]])
