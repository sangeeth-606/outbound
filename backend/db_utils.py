import json
import os
from typing import Dict, List, Optional, Union
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
