import os
import asyncio
import json
import threading
from typing import Dict, Any, Optional, Callable
from deepgram import DeepgramClient, PrerecordedOptions, FileSource, LiveOptions, LiveTranscriptionEvents
import base64
import logging

logger = logging.getLogger(__name__)

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


class RealTimeTranscription:
    """Handles real-time transcription using Deepgram"""

    def __init__(self, on_transcript_callback: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.client = get_deepgram_client()
        self.connection = None
        self.on_transcript_callback = on_transcript_callback
        self.is_active = False

    async def start_transcription(self) -> bool:
        """Start real-time transcription"""
        try:
            self.connection = self.client.listen.live.v("1")

            # Configure options
            options = LiveOptions(
                model="nova-2",
                language="en-US",
                smart_format=True,
                punctuate=True,
                diarize=True,
                interim_results=True,
                encoding="linear16",
                channels=1,
                sample_rate=16000
            )

            # Register event handlers
            self.connection.on(LiveTranscriptionEvents.Transcript, self._on_transcript)
            self.connection.on(LiveTranscriptionEvents.Error, self._on_error)
            self.connection.on(LiveTranscriptionEvents.Close, self._on_close)

            # Start connection
            await self.connection.start(options)
            self.is_active = True
            logger.info("Real-time transcription started")
            return True

        except Exception as e:
            logger.error(f"Failed to start real-time transcription: {e}")
            return False

    async def send_audio(self, audio_data: bytes) -> bool:
        """Send audio data for transcription"""
        if not self.connection or not self.is_active:
            return False

        try:
            await self.connection.send(audio_data)
            return True
        except Exception as e:
            logger.error(f"Failed to send audio data: {e}")
            return False

    async def stop_transcription(self) -> bool:
        """Stop real-time transcription"""
        if not self.connection:
            return True

        try:
            self.is_active = False
            await self.connection.finish()
            logger.info("Real-time transcription stopped")
            return True
        except Exception as e:
            logger.error(f"Failed to stop transcription: {e}")
            return False

    def _on_transcript(self, result, **kwargs):
        """Handle transcript event"""
        try:
            if result and result.channel and result.channel.alternatives:
                transcript = result.channel.alternatives[0]
                transcript_data = {
                    "text": transcript.transcript,
                    "is_final": result.is_final,
                    "confidence": transcript.confidence,
                    "start": result.start,
                    "duration": result.duration,
                    "words": [
                        {
                            "word": word.word,
                            "start": word.start,
                            "end": word.end,
                            "confidence": word.confidence,
                            "speaker": getattr(word, 'speaker', None)
                        }
                        for word in transcript.words
                    ] if hasattr(transcript, 'words') else []
                }

                if self.on_transcript_callback:
                    self.on_transcript_callback(transcript_data)

        except Exception as e:
            logger.error(f"Error processing transcript: {e}")

    def _on_error(self, error, **kwargs):
        """Handle error event"""
        logger.error(f"Deepgram transcription error: {error}")

    def _on_close(self, **kwargs):
        """Handle close event"""
        logger.info("Deepgram connection closed")
        self.is_active = False
