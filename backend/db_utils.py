import json
import os
from typing import Dict, List, Optional, Union

def load_mock_db() -> Dict:
    """Load the mock database from JSON file"""
    db_path = os.path.join(os.path.dirname(__file__), 'mock_db.json')
    with open(db_path, 'r') as f:
        return json.load(f)

def get_caller_context(email: str, caller_type: str) -> Optional[Dict]:
    """Get caller context from mock database based on email and type"""
    db = load_mock_db()
    
    if caller_type == "investor":
        for investor in db["investors"]:
            if investor["email"].lower() == email.lower():
                return {
                    "type": "investor",
                    "data": investor
                }
    elif caller_type == "prospect":
        for prospect in db["prospects"]:
            if prospect["email"].lower() == email.lower():
                return {
                    "type": "prospect", 
                    "data": prospect
                }
    
    return None

def get_agent_by_role(role: str) -> Optional[Dict]:
    """Get agent information by role"""
    db = load_mock_db()
    
    for agent in db["agents"]:
        if agent["role"].lower() == role.lower():
            return agent
    
    return None

def get_all_agents() -> List[Dict]:
    """Get all agents from the database"""
    db = load_mock_db()
    return db["agents"]

def get_investor_portfolio_summary(investor_data: Dict) -> str:
    """Generate a summary of investor's portfolio for context"""
    companies = ", ".join(investor_data["portfolio_companies"])
    amount = f"${investor_data['invested_amount']:,}"
    return f"Invested {amount} across {len(investor_data['portfolio_companies'])} companies: {companies}"

def get_prospect_summary(prospect_data: Dict) -> str:
    """Generate a summary of prospect for context"""
    amount = f"${prospect_data['interested_amount']:,}"
    return f"Interested in investing {amount}. {prospect_data['notes']} Source: {prospect_data['source']}"
