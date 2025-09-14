import os
import asyncio
import json
from typing import Dict, Any, Optional
from deepgram import DeepgramClient, PrerecordedOptions, FileSource
import base64

def get_deepgram_client():
    """Initialize Deepgram client with API key from environment"""
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise ValueError("DEEPGRAM_API_KEY environment variable is required")
    return DeepgramClient(api_key)

async def transcribe_audio(audio_data: bytes) -> str:
    """
    Transcribe audio data to text using Deepgram
    
    Args:
        audio_data: Raw audio bytes
        
    Returns:
        Transcribed text
    """
    try:
        client = get_deepgram_client()
        
        # Configure Deepgram options
        options = PrerecordedOptions(
            model="nova-2",
            smart_format=True,
            punctuate=True,
            diarize=False,
            language="en-US"
        )
        
        # Create file source from audio data
        payload: FileSource = {
            "buffer": audio_data,
        }
        
        # Make the transcription request
        response = await client.listen.prerecorded.v("1").transcribe_file(
            payload, options
        )
        
        # Extract transcript
        if response.results and response.results.channels:
            transcript = response.results.channels[0].alternatives[0].transcript
            return transcript.strip()
        
        return ""
        
    except Exception as e:
        print(f"Deepgram transcription error: {e}")
        return ""

def transcribe_audio_sync(audio_data: bytes) -> str:
    """
    Synchronous wrapper for audio transcription
    """
    try:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(transcribe_audio(audio_data))
    except RuntimeError:
        # If no event loop is running, create a new one
        return asyncio.run(transcribe_audio(audio_data))

async def transcribe_base64_audio(base64_audio: str) -> str:
    """
    Transcribe base64 encoded audio data
    
    Args:
        base64_audio: Base64 encoded audio string
        
    Returns:
        Transcribed text
    """
    try:
        # Decode base64 audio
        audio_data = base64.b64decode(base64_audio)
        return await transcribe_audio(audio_data)
    except Exception as e:
        print(f"Base64 audio transcription error: {e}")
        return ""
