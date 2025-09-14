'use client';

import {
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  RoomContext,
} from '@livekit/components-react';
import { Room, Track } from 'livekit-client';
import '@livekit/components-styles';
import { useEffect, useState } from 'react';
import { Phone, MessageSquare, Users, PhoneOff, User } from 'lucide-react';
import ChatInterface from '../../components/ChatInterface';

export default function AgentAPage() {
  const room = 'support_room';
  const name = 'agent_a';
  const [roomInstance] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [callerContext, setCallerContext] = useState<any>(null);

  useEffect(() => {
    return () => {
      roomInstance.disconnect();
    };
  }, [roomInstance]);

  const connectToRoom = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const resp = await fetch(`/api/token?room=${room}&username=${name}`);
      const data = await resp.json();
      
      if (data.token) {
        setToken(data.token);
        await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL, data.token);
        setIsConnected(true);
        setIsConnecting(false);
        
        // Wait for real caller to connect
        // No automatic mock data - wait for actual caller
      }
    } catch (e) {
      console.error('Connection error:', e);
      setError(e instanceof Error ? e.message : 'Failed to connect');
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    await roomInstance.disconnect();
    setIsConnected(false);
    setCallerContext(null);
  };

  const initiateTransfer = async () => {
    try {
      // Generate AI summary using Groq LLM
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_context: "Customer called about login issues. I verified their account is active and helped reset their password. They can now log in but can't see their dashboard. They need immediate access to their financial data for a meeting this afternoon. Customer seems frustrated but cooperative.",
          caller_type: "investor",
          caller_info: {
            name: "John Doe",
            email: "john.doe@example.com",
            portfolio: "$50,000 across 3 companies"
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Now initiate the actual transfer
        const transferResponse = await fetch('/api/transfer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            original_room_name: room,
            agent_a_id: name,
            transfer_target: "agent_b",
            caller_type: "investor",
            email: "john.doe@example.com",
            summary: data.summary
          }),
        });

        const transferData = await transferResponse.json();
        
        if (transferData.success) {
          alert(`🎉 Warm Transfer Initiated!\n\n📋 AI-Generated Summary:\n${data.summary}\n\n🔄 Transfer Status: ${transferData.status}\n\n📞 Agent B should now be connected to hear this summary.`);
        } else {
          alert(`Transfer initiated with summary:\n\n${data.summary}\n\nNote: Transfer room creation failed, but summary was generated successfully.`);
        }
      } else {
        alert(`Transfer initiated!\n\nNote: AI summary generation failed, using fallback summary.\n\nCall Summary: Customer called about login issues. I verified their account is active and helped reset their password. They can now log in but can't see their dashboard. They need immediate access to their financial data for a meeting this afternoon. Customer seems frustrated but cooperative.`);
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Transfer failed. Please try again.');
    }
  };

  const initiateTwilioTransfer = async () => {
    try {
      // Generate AI summary first
      const summaryResponse = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_context: "Customer called about login issues. I verified their account is active and helped reset their password. They can now log in but can't see their dashboard. They need immediate access to their financial data for a meeting this afternoon. Customer seems frustrated but cooperative.",
          caller_type: "investor",
          caller_info: {
            name: "John Doe",
            email: "john.doe@example.com",
            portfolio: "$50,000 across 3 companies"
          }
        }),
      });

      const summaryData = await summaryResponse.json();
      const summary = summaryData.success ? summaryData.summary : "Customer needs assistance with login and dashboard access issues.";

      // Initiate Twilio call
      const twilioResponse = await fetch('/api/twilio-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_phone: "+917306161621", // Your Twilio target phone
          room_name: "twilio_transfer_room",
          summary: summary
        }),
      });

      const twilioData = await twilioResponse.json();
      
      if (twilioData.success) {
        alert(`📞 Twilio Transfer Initiated!\n\n📋 AI-Generated Summary:\n${summary}\n\n🔄 Call SID: ${twilioData.call_sid}\n\n📞 Phone call initiated to ${twilioData.target_phone || "+917306161621"}\n\nAgent A should now explain the context to the phone agent.`);
      } else {
        alert(`Twilio transfer failed: ${twilioData.message}\n\nUsing fallback summary:\n${summary}`);
      }
    } catch (error) {
      console.error('Twilio transfer failed:', error);
      alert('Twilio transfer failed. Please try again.');
    }
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-blue-500/20">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
          <p className="text-gray-300">Please wait while we connect you to the support system</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
        <div className="bg-red-600/20 border border-red-500 text-red-200 p-4 rounded-lg max-w-md mx-auto">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-blue-400 mr-3" />
              <h1 className="text-3xl font-bold">Agent A Dashboard</h1>
            </div>
            <p className="text-gray-300">First-line support specialist ready to take calls</p>
          </div>

          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-blue-500/20">
              <Phone className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Ready to Take Calls</h2>
              <p className="text-gray-300 mb-6">
                Click the button below to start taking customer calls and providing support.
              </p>
              <div className="space-y-3">
                <button
                  onClick={connectToRoom}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Start Taking Calls
                </button>
                <button
                  onClick={() => setShowChat(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Start AI Chat Demo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[600px]">
                <ChatInterface 
                  callerType="investor"
                  email="demo@example.com"
                />
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
                <h2 className="text-xl font-semibold mb-4">AI Chat Demo</h2>
                <div className="space-y-4">
                  <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-400 mb-2">Features Available</h3>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Voice-to-text transcription</li>
                      <li>• Context-aware AI responses</li>
                      <li>• Text-to-speech playback</li>
                      <li>• Conversation history</li>
                      <li>• Customer context integration</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Close Chat Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoomContext.Provider value={roomInstance}>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-blue-400 mr-3" />
              <h1 className="text-3xl font-bold">Agent A Dashboard</h1>
            </div>
            <p className="text-gray-300">First-line support specialist - taking customer calls</p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Conference */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
                <h2 className="text-xl font-semibold mb-4">Customer Call</h2>
                <div data-lk-theme="default" style={{ height: '400px' }}>
                  <MyVideoConference />
                  <RoomAudioRenderer />
                  <ControlBar />
                </div>
              </div>

              {/* Caller Context */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
                <h2 className="text-xl font-semibold mb-4">Caller Information</h2>
                
                <div className="space-y-4">
                  <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-400 mb-2">Call Status</h3>
                    <div className="text-gray-300 text-sm space-y-1">
                      <p><strong>Room:</strong> support_room</p>
                      <p><strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
                      <p><strong>Participants:</strong> Check video feed above</p>
                    </div>
                  </div>
                  
                  <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                    <h3 className="font-semibold text-green-400 mb-2">Support Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={initiateTransfer}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Initiate Warm Transfer (Agent B)
                      </button>
                      <button
                        onClick={initiateTwilioTransfer}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Initiate Twilio Transfer (Phone)
                      </button>
                      <button
                        onClick={() => setShowChat(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Use AI Assistant
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={disconnect}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 mx-auto"
              >
                <PhoneOff className="w-5 h-5" />
                <span>End Call</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </RoomContext.Provider>
  );
}

function MyVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100% - 60px)' }}>
      <ParticipantTile />
    </GridLayout>
  );
}