'use client';

import { useState, useEffect } from 'react';
import { LiveKitManager } from '../../lib/livekit';
import { Phone, Mic, MicOff, Video, VideoOff, PhoneOff, User, TrendingUp, Building2, MessageSquare } from 'lucide-react';
import ChatInterface from '../../components/ChatInterface';

export default function InvestorPage() {
  const [liveKitManager, setLiveKitManager] = useState<LiveKitManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [callerContext, setCallerContext] = useState<any>(null);
  const [contextLoaded, setContextLoaded] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const loadCallerContext = async () => {
    if (!email) return;
    
    try {
      const response = await fetch('/api/caller/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          caller_type: 'investor'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.found) {
          setCallerContext(data.context);
          setContextLoaded(true);
        } else {
          setError('Investor not found. Please check your email address.');
        }
      }
    } catch (err) {
      setError('Failed to load investor information.');
    }
  };

  const connectToCall = async () => {
    if (!email || !contextLoaded) {
      setError('Please enter your email and load your information first.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Create room and get token
      const response = await fetch('/api/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: 'investor_support_room',
          participant_identity: 'investor',
          caller_type: 'investor',
          email: email
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const { room_name, access_token } = await response.json();

      // Create LiveKit manager
      const manager = new LiveKitManager(
        (participant) => {
          console.log('Participant connected:', participant.identity);
          setParticipants(prev => [...prev, participant]);
        },
        (participant) => {
          console.log('Participant disconnected:', participant.identity);
          setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
        },
        () => {
          console.log('Connected to room');
          setIsConnected(true);
          setIsConnecting(false);
        },
        () => {
          console.log('Disconnected from room');
          setIsConnected(false);
          setParticipants([]);
        }
      );

      // Connect to room
      await manager.connect({
        url: process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://outbound-gkkdznzy.livekit.cloud',
        token: access_token,
        roomName: room_name,
      });

      setLiveKitManager(manager);
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (liveKitManager) {
      await liveKitManager.disconnect();
      setLiveKitManager(null);
      setIsConnected(false);
      setParticipants([]);
    }
  };

  const toggleMicrophone = async () => {
    if (liveKitManager) {
      await liveKitManager.toggleMicrophone();
    }
  };

  const toggleCamera = async () => {
    if (liveKitManager) {
      await liveKitManager.toggleCamera();
    }
  };

  useEffect(() => {
    return () => {
      if (liveKitManager) {
        liveKitManager.disconnect();
      }
    };
  }, [liveKitManager]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-blue-400 mr-3" />
            <h1 className="text-3xl font-bold">Investor Support</h1>
          </div>
          <p className="text-gray-300">Access your portfolio support and compliance assistance</p>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6 text-center">
            Error: {error}
          </div>
        )}

        {!contextLoaded && (
          <div className="max-w-md mx-auto mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 border border-blue-500/20">
              <h2 className="text-xl font-semibold mb-4 text-center">Investor Verification</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your investor email"
                    className="w-full px-4 py-2 bg-white/10 border border-blue-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                  />
                </div>
                <button
                  onClick={loadCallerContext}
                  disabled={!email}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Load My Information
                </button>
              </div>
            </div>
          </div>
        )}

        {contextLoaded && callerContext && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
              <h2 className="text-xl font-semibold mb-4">Your Portfolio Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-blue-300 mb-2">Investor Details</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-400">Name:</span> {callerContext.data.name}</p>
                    <p><span className="text-gray-400">Email:</span> {callerContext.data.email}</p>
                    <p><span className="text-gray-400">Status:</span> {callerContext.data.accredited_status}</p>
                    <p><span className="text-gray-400">Invested:</span> ${callerContext.data.invested_amount.toLocaleString()}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-300 mb-2">Portfolio Companies</h3>
                  <div className="space-y-1 text-sm">
                    {callerContext.data.portfolio_companies.map((company: string, index: number) => (
                      <div key={index} className="flex items-center">
                        <Building2 className="w-4 h-4 text-blue-400 mr-2" />
                        <span>{company}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isConnected && !isConnecting && contextLoaded && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-blue-500/20">
              <Phone className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Ready to Connect</h2>
              <p className="text-gray-300 mb-6">
                Click the button below to connect with our support specialist.
              </p>
              <div className="space-y-3">
                <button
                  onClick={connectToCall}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Start Support Call
                </button>
                <button
                  onClick={() => setShowChat(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Start AI Chat</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {isConnecting && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-blue-500/20">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
              <p className="text-gray-300">Please wait while we connect you to our support specialist</p>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6 border border-blue-500/20">
              <h2 className="text-xl font-semibold mb-4">Support Call in Progress</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Your Video</h3>
                  <div className="aspect-video bg-white/10 rounded-lg flex items-center justify-center">
                    <Video className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Specialist Video</h3>
                  <div className="aspect-video bg-white/10 rounded-lg flex items-center justify-center">
                    {participants.length > 0 ? (
                      <div className="text-center">
                        <User className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Specialist Connected</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="animate-pulse w-12 h-12 bg-gray-500 rounded-full mx-auto mb-2"></div>
                        <p className="text-sm text-gray-400">Waiting for specialist...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={toggleMicrophone}
                  className={`p-3 rounded-full transition-colors ${
                    liveKitManager?.isMicrophoneEnabled() 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {liveKitManager?.isMicrophoneEnabled() ? (
                    <Mic className="w-6 h-6" />
                  ) : (
                    <MicOff className="w-6 h-6" />
                  )}
                </button>
                
                <button
                  onClick={toggleCamera}
                  className={`p-3 rounded-full transition-colors ${
                    liveKitManager?.isCameraEnabled() 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {liveKitManager?.isCameraEnabled() ? (
                    <Video className="w-6 h-6" />
                  ) : (
                    <VideoOff className="w-6 h-6" />
                  )}
                </button>
                
                <button
                  onClick={disconnect}
                  className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
              </div>
            </div>

            {participants.length > 0 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
                <h3 className="text-lg font-semibold mb-4">Connected Participants</h3>
                <div className="space-y-2">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-300">{participant.identity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showChat && (
          <div className="max-w-6xl mx-auto mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chat Interface */}
              <div className="h-[600px]">
                <ChatInterface 
                  callerType="investor"
                  email={email || "demo@example.com"}
                />
              </div>

              {/* Investor Context Panel */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-blue-500/20">
                <h2 className="text-xl font-semibold mb-4">Your Investment Profile</h2>
                
                {callerContext ? (
                  <div className="space-y-4">
                    <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-400 mb-2">Portfolio Overview</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Total Invested:</span>
                          <span className="text-white font-medium">{callerContext.invested_amount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Portfolio Companies:</span>
                          <span className="text-white font-medium">{callerContext.portfolio?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                      <h3 className="font-semibold text-green-400 mb-2">AI Assistant Features</h3>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Portfolio performance insights</li>
                        <li>• Compliance question handling</li>
                        <li>• K1 form assistance</li>
                        <li>• Portal access support</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Enter your email above to load your investment context</p>
                  </div>
                )}

                <button
                  onClick={() => setShowChat(false)}
                  className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Close Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
