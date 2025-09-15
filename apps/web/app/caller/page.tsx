'use client';

import {
  ControlBar,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  RoomContext,
} from '@livekit/components-react';
import { Room, Track, RoomEvent } from 'livekit-client';
import '@livekit/components-styles';
import { useEffect, useState } from 'react';
import { Phone, MessageSquare, Users, PhoneOff, User } from 'lucide-react';
import ChatInterface from '../../components/ChatInterface';

export default function CallerPage() {
  const room = 'support_room';
  const name = 'customer';
  const [roomInstance] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [callerType, setCallerType] = useState('investor');
  const [email, setEmail] = useState('');
  const [transferStatus, setTransferStatus] = useState<'idle' | 'in_progress' | 'completed'>('idle');
  const [transferMessage, setTransferMessage] = useState<string | null>(null);

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
        await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', data.token);
        setIsConnected(true);
        setIsConnecting(false);

        // Set up data channel listener for transfer events
        roomInstance.on(RoomEvent.DataReceived, (payload, participant) => {
          try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data.type === 'transfer_initiated') {
              setTransferStatus('in_progress');
              setTransferMessage('Your call is being transferred to a specialist. Please hold...');
            } else if (data.type === 'transfer_completed') {
              setTransferStatus('completed');
              setTransferMessage('Transfer completed. You are now connected to a specialist.');
            }
          } catch (e) {
            console.error('Failed to parse data message:', e);
          }
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
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 text-white flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-green-500/20">
          <div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
          <p className="text-gray-300">Please wait while we connect you to support</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 text-white flex items-center justify-center">
        <div className="bg-red-600/20 border border-red-500 text-red-200 p-4 rounded-lg max-w-md mx-auto">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-green-400 mr-3" />
              <h1 className="text-3xl font-bold">Customer Support</h1>
            </div>
            <p className="text-gray-300">Connect with our support team for assistance</p>
          </div>

          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-green-500/20">
              <User className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Start Your Call</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Your Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-2 bg-white/10 border border-green-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Caller Type
                  </label>
                  <select
                    value={callerType}
                    onChange={(e) => setCallerType(e.target.value)}
                    className="w-full px-4 py-2 bg-white/10 border border-green-500/20 rounded-lg text-white focus:outline-none focus:border-green-500"
                  >
                    <option value="investor">Investor</option>
                    <option value="prospect">Prospect</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={connectToCall}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Start Call
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[600px]">
                <ChatInterface 
                  callerType={callerType as "investor" | "prospect"}
                  email={email}
                />
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-green-500/20">
                <h2 className="text-xl font-semibold mb-4">AI Chat Demo</h2>
                <div className="space-y-4">
                  <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-400 mb-2">Features Available</h3>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Voice-to-text transcription</li>
                      <li>• Context-aware AI responses</li>
                      <li>• Text-to-speech playback</li>
                      <li>• Conversation history</li>
                      <li>• Personalized assistance</li>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-green-400 mr-3" />
              <h1 className="text-3xl font-bold">Customer Support Call</h1>
            </div>
            <p className="text-gray-300">Connected to our support team</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-green-500/20">
              <h2 className="text-xl font-semibold mb-4 text-center">Support Call in Progress</h2>
              <div data-lk-theme="default" style={{ height: '500px' }}>
                <MyVideoConference />
                <RoomAudioRenderer />
                <ControlBar />
              </div>
            </div>

            {transferMessage && (
              <div className="mt-4 bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                <h3 className="font-semibold text-blue-400 mb-2">Transfer Status</h3>
                <p className="text-gray-300 text-sm">{transferMessage}</p>
                {transferStatus === 'in_progress' && (
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-sm text-gray-400">Transferring...</span>
                  </div>
                )}
              </div>
            )}

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