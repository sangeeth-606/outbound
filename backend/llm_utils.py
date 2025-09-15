import os
import requests
import logging
from typing import Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Groq configuration
GROQ_API_KEY = os.getenv("groq_key")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

def generate_call_summary(transcript_text: str, caller_type: str = "investor", context: Dict = None) -> str:
    """Generate a dynamic call summary using Groq LLM for warm transfer based on caller type"""
    try:
        logger.info(f"🤖 Starting LLM summary generation for {caller_type}")
        if not GROQ_API_KEY:
            logger.error("❌ Groq API key not found in environment variables")
            raise ValueError("Groq API key must be set in environment variables")
        
        # Dynamic prompts based on caller type and context
        if caller_type == "investor" and context:
            investor_data = context.get("data", {})
            portfolio_summary = f"${investor_data.get('invested_amount', 0):,} invested across {len(investor_data.get('portfolio_companies', []))} companies"
            companies = ", ".join(investor_data.get('portfolio_companies', []))
            
            prompt = f"""Generate a concise summary for a warm transfer to a Compliance Officer at Attack Capital. Focus on the investor's issue and their portfolio context.

Investor: {investor_data.get('name', 'Unknown')} ({portfolio_summary})
Portfolio Companies: {companies}
Recent Issues: {', '.join(investor_data.get('recent_tickets', []))}
Current Issue: {transcript_text}

Make it easy to read aloud and include key portfolio context. Keep under 3 sentences."""

        elif caller_type == "prospect" and context:
            prospect_data = context.get("data", {})
            amount = f"${prospect_data.get('interested_amount', 0):,}"
            
            prompt = f"""Generate a sales-focused summary for a General Partner to help close a prospective investor at Attack Capital.

Prospect: {prospect_data.get('name', 'Unknown')} (interested in investing {amount})
Accreditation Status: {prospect_data.get('accredited_status', 'Unknown')}
Source: {prospect_data.get('source', 'Unknown')}
Background: {prospect_data.get('notes', 'No additional notes')}
Current Inquiry: {transcript_text}

Arm the GP with key details to personalize their pitch. Keep under 3 sentences."""

        else:
            # Fallback generic prompt
            prompt = f"""Please summarize the following customer service call conversation into a very short and clear paragraph that an agent can quickly read out loud to another agent for a warm transfer. Focus on the customer's issue and what has been done so far. Keep it under 3 sentences and make it conversational:

{transcript_text}"""
        
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.1-70b-versatile",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that creates concise call summaries for warm transfers between financial services agents at Attack Capital."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 200,
            "temperature": 0.7
        }
        
        logger.info("📡 Sending request to Groq API...")
        response = requests.post(GROQ_API_URL, headers=headers, json=payload)
        response.raise_for_status()

        result = response.json()
        summary = result["choices"][0]["message"]["content"].strip()
        logger.info(f"✅ Generated {caller_type} call summary using Groq: {summary[:100]}...")

        return summary
        
    except Exception as e:
        logger.error(f"Failed to generate call summary with Groq: {str(e)}")
        # Return a fallback summary if LLM fails
        if caller_type == "investor":
            return "Investor called about a portfolio-related issue. I've verified their account and provided initial assistance. They need further support from compliance."
        else:
            return "Prospective investor called with questions about our investment process. I've provided initial information and they're interested in speaking with a General Partner."
