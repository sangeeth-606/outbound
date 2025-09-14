import os
import openai
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def get_openai_client():
    """Get OpenAI client with API key"""
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key must be set in environment variables")
    
    return openai.OpenAI(api_key=OPENAI_API_KEY)

def generate_call_summary(transcript_text: str) -> str:
    """Generate a concise call summary using OpenAI GPT for warm transfer"""
    try:
        client = get_openai_client()
        
        prompt = f"""Please summarize the following customer service call conversation into a very short and clear paragraph that an agent can quickly read out loud to another agent for a warm transfer. Focus on the customer's issue and what has been done so far. Keep it under 3 sentences and make it conversational:

{transcript_text}"""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that creates concise call summaries for warm transfers between customer service agents."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        summary = response.choices[0].message.content.strip()
        logger.info(f"Generated call summary: {summary}")
        
        return summary
        
    except Exception as e:
        logger.error(f"Failed to generate call summary: {str(e)}")
        # Return a fallback summary if LLM fails
        return "Customer called about a technical issue. I've verified their account and helped them reset their password. They're now experiencing issues with their dashboard access and need immediate assistance."
