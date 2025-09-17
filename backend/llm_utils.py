import os
import requests
import logging
from typing import Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Groq configuration
GROQ_API_KEY = os.getenv("groq_key")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

def generate_call_summary(conversation_text: str, caller_type: str = "customer", context: Dict = None) -> str:
    """Generate a conversation summary using Groq LLM for warm transfer"""
    try:
        logger.info(f"🤖 Generating conversation summary with Groq")
        logger.info(f"📝 Input conversation: {conversation_text[:200]}...")
        
        if not GROQ_API_KEY:
            logger.error("❌ Groq API key not found in environment variables")
            return "Unable to generate summary - API key not configured"
        
        if not conversation_text.strip():
            logger.warning("⚠️ Empty conversation text provided")
            return "No conversation content available for summary"
        
        # Simple prompt for conversation summary
        prompt = f"""Please create a brief, professional summary of this customer support conversation for a warm transfer. Focus on the customer's issue and what assistance has been provided so far. Keep it under 2-3 sentences:

Conversation:
{conversation_text}

Summary:"""
        
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 150,
            "temperature": 0.3
        }
        
        logger.info("📡 Sending request to Groq API...")
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        
        if response.status_code != 200:
            logger.error(f"❌ Groq API error: {response.status_code} - {response.text}")
            return f"LLM API error (status {response.status_code}). Using fallback summary."
        
        result = response.json()
        if "choices" not in result or len(result["choices"]) == 0:
            logger.error(f"❌ Unexpected Groq API response format: {result}")
            return "LLM response format error. Using fallback summary."
            
        summary = result["choices"][0]["message"]["content"].strip()
        logger.info(f"✅ Generated conversation summary: {summary}")
        return summary

    except requests.exceptions.Timeout:
        logger.error("❌ Groq API timeout")
        return "LLM request timeout. Customer needs assistance with their inquiry."
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Groq API request failed: {str(e)}")
        return "LLM service unavailable. Customer needs assistance with their inquiry."
    except Exception as e:
        logger.error(f"❌ Unexpected error in LLM summary generation: {str(e)}")
        return "Summary generation failed. Customer needs assistance with their inquiry."
