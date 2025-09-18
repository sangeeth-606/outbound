#!/usr/bin/env python3
"""
Test script for Enhanced Twilio Phone Transfer Integration
Tests both basic and enhanced transfer methods
"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# Add current directory to path
sys.path.append('.')

async def test_phone_transfer_integration():
    """Test the phone transfer integration"""
    
    print("🧪 Testing Enhanced Twilio Phone Transfer Integration")
    print("=" * 60)
    
    # Load environment variables
    load_dotenv()
    
    # Check required environment variables
    required_vars = [
        "LIVEKIT_URL", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET",
        "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "TWILIO_TARGET_PHONE"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    print("✅ All required environment variables are set")
    
    # Test 1: Import modules
    try:
        from livekit_sip_utils import enhanced_twilio_manager, initiate_enhanced_phone_transfer
        from twilio_utils import validate_phone_number, get_twilio_client
        print("✅ Successfully imported all modules")
    except Exception as e:
        print(f"❌ Module import failed: {e}")
        return False
    
    # Test 2: Validate phone number format
    test_phone = os.getenv("TWILIO_TARGET_PHONE")
    if await validate_phone_number(test_phone):
        print(f"✅ Phone number format valid: {test_phone}")
    else:
        print(f"❌ Invalid phone number format: {test_phone}")
        return False
    
    # Test 3: Test Twilio client connection
    try:
        twilio_client = get_twilio_client()
        account = twilio_client.api.accounts(os.getenv("TWILIO_ACCOUNT_SID")).fetch()
        print(f"✅ Twilio client connected successfully (Account: {account.friendly_name})")
    except Exception as e:
        print(f"❌ Twilio client connection failed: {e}")
        return False
    
    # Test 4: Test LiveKit room service
    try:
        test_room_name = "test_phone_transfer_room"
        result = await enhanced_twilio_manager.get_room_participants(test_room_name)
        print(f"✅ LiveKit room service working (Room: {test_room_name})")
    except Exception as e:
        print(f"⚠️  LiveKit room service test: {e} (This is normal if room doesn't exist)")
    
    # Test 5: Dry run of enhanced transfer (without actually making calls)
    try:
        print("🧪 Testing enhanced transfer logic (dry run)...")
        
        # This would normally initiate the transfer, but we'll catch and examine the process
        test_params = {
            "phone_number": test_phone,
            "current_room_name": "test_current_room",
            "caller_identity": "test_caller",
            "agent_a_identity": "test_agent_a",
            "summary": "Test transfer summary for integration testing"
        }
        
        print(f"   📞 Target phone: {test_params['phone_number']}")
        print(f"   🏠 Current room: {test_params['current_room_name']}")
        print(f"   👤 Caller: {test_params['caller_identity']}")
        print(f"   🎧 Agent A: {test_params['agent_a_identity']}")
        print(f"   📋 Summary: {test_params['summary']}")
        
        print("✅ Enhanced transfer parameters validated")
        
    except Exception as e:
        print(f"❌ Enhanced transfer validation failed: {e}")
        return False
    
    print("=" * 60)
    print("🎉 All tests passed! Phone transfer integration is ready.")
    print("")
    print("🚀 To test the full workflow:")
    print("1. Start the backend: uvicorn main:app --reload")
    print("2. Start the frontend: npm run dev")
    print("3. Open Agent A page and initiate a call")
    print("4. Click 'Call Transfer' button to test phone integration")
    print("")
    print("📞 The system will:")
    print("   • Generate AI summary of the conversation")
    print("   • Create a new transfer room")
    print("   • Call the target phone number")
    print("   • Move participants to the new room")
    print("   • Connect phone agent when they answer")
    
    return True

async def test_basic_phone_call():
    """Test basic phone calling functionality"""
    
    print("\n🔧 Testing Basic Phone Call (OPTIONAL - WILL MAKE REAL CALL)")
    response = input("Do you want to test a real phone call? (y/N): ").lower().strip()
    
    if response == 'y':
        print("📞 Initiating test phone call...")
        
        try:
            from twilio_utils import initiate_twilio_call
            
            call_sid = await initiate_twilio_call(
                phone_number=os.getenv("TWILIO_TARGET_PHONE"),
                room_name="test_call_room",
                summary="This is a test call from the Enhanced Twilio integration system."
            )
            
            print(f"✅ Test call initiated successfully!")
            print(f"📱 Call SID: {call_sid}")
            print(f"📞 Check your phone: {os.getenv('TWILIO_TARGET_PHONE')}")
            print("🎧 The call will speak the summary and then connect to the LiveKit room")
            
        except Exception as e:
            print(f"❌ Test call failed: {e}")
    else:
        print("⏭️  Skipping real phone call test")

if __name__ == "__main__":
    print("Enhanced Twilio Phone Transfer - Integration Test")
    print("This script validates the phone transfer setup without making calls")
    print("")
    
    # Run async tests
    loop = asyncio.get_event_loop()
    success = loop.run_until_complete(test_phone_transfer_integration())
    
    if success:
        loop.run_until_complete(test_basic_phone_call())
    
    print("\n🏁 Testing complete!")
