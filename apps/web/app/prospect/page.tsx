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
import { Phone, MessageSquare, Users, PhoneOff, Building2, TrendingUp } from 'lucide-react';
import ChatInterface from '../../components/ChatInterface';

export default function ProspectPage() {
  const room = 'prospect_support_room';
  const name = 'prospect';
  const [roomInstance] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [email, setEmail] = useState('');
  const [prospectContext, setProspectContext] = useState<any>(null);

  useEffect(() => {
    return () => {
      roomInstance.disconnect();
    };
  }, [roomInstance]);

  const connectToCall = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

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
        
        // Mock prospect context for demo
        setProspectContext({
          name: "Jane Smith",
          email: email,
          interest: "Early-stage AI investments",
          budget: "$25,000 - $100,000",
          experience: "First-time investor",
          status: "Qualified Prospect",
          lastContact: "1 week ago"
        });
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
    setProspectContext(null);
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="bg-gray-100 rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
          <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
          <p className="text-gray-600">Please wait while we connect you to our investment team</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 p-4 rounded-lg max-w-md mx-auto">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-black mr-3" />
              <h1 className="text-3xl font-bold">Investment Opportunities</h1>
            </div>
            <p className="text-gray-600">Connect with our investment team to learn about opportunities</p>
          </div>

          <div className="text-center">
            <div className="bg-gray-100 rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
              <TrendingUp className="w-16 h-16 text-black mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Start Your Investment Journey</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Your Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="prospect@example.com"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={connectToCall}
                  className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Connect to Investment Team
                </button>
                <button
                  onClick={() => setShowChat(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
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
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[600px]">
                <ChatInterface 
                  callerType="prospect"
                  email={email}
                />
              </div>
              <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">AI Investment Assistant</h2>
                <div className="space-y-4">
                  <div className="bg-blue-100 border border-blue-400 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-700 mb-2">Prospect Features</h3>
                    <ul className="text-gray-600 text-sm space-y-1">
                      <li>• Investment opportunity exploration</li>
                      <li>• Portfolio strategy guidance</li>
                      <li>• Risk assessment information</li>
                      <li>• Due diligence support</li>
                      <li>• Investment process guidance</li>
                    </ul>
                  </div>
                  
                  {prospectContext && (
                    <div className="bg-green-100 border border-green-400 rounded-lg p-4">
                      <h3 className="font-semibold text-green-700 mb-2">Your Profile</h3>
                      <div className="text-gray-600 text-sm space-y-1">
                        <p><strong>Status:</strong> {prospectContext.status}</p>
                        <p><strong>Interest:</strong> {prospectContext.interest}</p>
                        <p><strong>Budget:</strong> {prospectContext.budget}</p>
                        <p><strong>Experience:</strong> {prospectContext.experience}</p>
                        <p><strong>Last Contact:</strong> {prospectContext.lastContact}</p>
                      </div>
                    </div>
                  )}
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
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-black mr-3" />
              <h1 className="text-3xl font-bold">Investment Consultation</h1>
            </div>
            <p className="text-gray-600">Connected to our investment team</p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Conference */}
              <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Investment Consultation</h2>
                <div data-lk-theme="default" style={{ height: '400px' }}>
                  <MyVideoConference />
                  <RoomAudioRenderer />
                  <ControlBar />
                </div>
              </div>

              {/* Prospect Context */}
              <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Prospect Information</h2>
                
                {prospectContext ? (
                  <div className="space-y-4">
                    <div className="bg-green-100 border border-green-400 rounded-lg p-4">
                      <h3 className="font-semibold text-black mb-2">Prospect Details</h3>
                      <div className="text-gray-600 text-sm space-y-1">
                        <p><strong>Name:</strong> {prospectContext.name}</p>
                        <p><strong>Email:</strong> {prospectContext.email}</p>
                        <p><strong>Status:</strong> {prospectContext.status}</p>
                        <p><strong>Interest:</strong> {prospectContext.interest}</p>
                        <p><strong>Budget:</strong> {prospectContext.budget}</p>
                        <p><strong>Experience:</strong> {prospectContext.experience}</p>
                        <p><strong>Last Contact:</strong> {prospectContext.lastContact}</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-100 border border-blue-400 rounded-lg p-4">
                      <h3 className="font-semibold text-black mb-2">Consultation Options</h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => setShowChat(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Use AI Assistant
                        </button>
                        <button
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Schedule Follow-up
                        </button>
                        <button
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          Send Investment Materials
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-500 mb-2">Loading Prospect Data</h3>
                    <p className="text-gray-400">
                      Your prospect information will appear here once connected.
                    </p>
                  </div>
                )}
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
