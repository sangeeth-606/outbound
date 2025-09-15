import os
import requests
import json
from typing import Dict, Any, List, Optional

def get_groq_client():
    """Get Groq API key from environment"""
    api_key = os.getenv("groq_key")
    if not api_key:
        raise ValueError("groq_key environment variable is required")
    return api_key

def generate_ai_response(
    user_message: str,
    caller_type: str,
    caller_context: Optional[Dict[str, Any]] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Generate AI response based on user message, caller type, and context
    
    Args:
        user_message: The user's message/transcription
        caller_type: "investor" or "prospect"
        caller_context: Context about the caller from database
        conversation_history: Previous conversation messages
        
    Returns:
        AI response text
    """
    try:
        api_key = get_groq_client()
        
        # Build conversation context
        system_prompt = build_system_prompt(caller_type, caller_context)
        
        # Prepare messages for the API
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add conversation history if available
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        # Make API request to Groq
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "messages": messages,
            "model": "llama-3.1-70b-versatile",
            "temperature": 0.7,
            "max_tokens": 500,
            "stream": False
        }
        
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if "choices" in result and len(result["choices"]) > 0:
                return result["choices"][0]["message"]["content"].strip()
        
        # Fallback response
        return get_fallback_response(caller_type, user_message)
        
    except Exception as e:
        print(f"AI response generation error: {e}")
        return get_fallback_response(caller_type, user_message)

def build_system_prompt(caller_type: str, caller_context: Optional[Dict[str, Any]]) -> str:
    """Build system prompt based on caller type and context"""
    
    if caller_type == "investor":
        base_prompt = """You are a professional support specialist at Attack Capital, a venture capital firm. You are speaking with a current investor who has questions about their investment or portfolio.

Key guidelines:
- Be professional, knowledgeable, and helpful
- Focus on compliance, portfolio performance, and investor relations
- If you don't know something specific, offer to connect them with the appropriate specialist
- Maintain confidentiality and professionalism
- Keep responses concise but informative
"""
        
        if caller_context:
            name = caller_context.get("name", "the investor")
            invested_amount = caller_context.get("invested_amount", "their investment")
            portfolio = caller_context.get("portfolio", "their portfolio")
            
            context_info = f"""
Current caller context:
- Name: {name}
- Invested Amount: {invested_amount}
- Portfolio: {portfolio}
"""
            base_prompt += context_info
    
    else:  # prospect
        base_prompt = """You are a professional representative at Attack Capital, a venture capital firm. You are speaking with a prospective investor who is interested in learning about investment opportunities.

Key guidelines:
- Be welcoming, professional, and informative
- Focus on our investment thesis, portfolio companies, and track record
- If they have specific questions about investment opportunities, offer to connect them with a General Partner
- Highlight our expertise and success stories
- Keep responses engaging but professional
"""
        
        if caller_context:
            name = caller_context.get("name", "the prospect")
            company = caller_context.get("company", "their company")
            interest = caller_context.get("interest", "investment opportunities")
            
            context_info = f"""
Current caller context:
- Name: {name}
- Company: {company}
- Interest: {interest}
"""
            base_prompt += context_info
    
    base_prompt += """
Remember: You are representing Attack Capital professionally. If the conversation requires specialized knowledge (compliance, legal, investment decisions), offer to transfer them to the appropriate expert.
"""
    
    return base_prompt

def get_fallback_response(caller_type: str, user_message: str) -> str:
    """Generate fallback response when AI fails"""
    
    if caller_type == "investor":
        return "I understand you have questions about your investment. Let me connect you with our compliance specialist who can provide more detailed assistance."
    else:
        return "Thank you for your interest in Attack Capital. Let me connect you with one of our General Partners who can discuss investment opportunities with you."

def create_conversation_entry(role: str, content: str) -> Dict[str, str]:
    """Create a conversation history entry"""
    return {"role": role, "content": content}
