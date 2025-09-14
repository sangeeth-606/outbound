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
import { Shield, MessageSquare, Users, Phone } from 'lucide-react';
import ChatInterface from '../../components/ChatInterface';

export default function ExpertPage() {
  const room = 'support_room';
  const name = 'expert';
  const [roomInstance] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferSummary, setTransferSummary] = useState<string | null>(null);
  const [isWaitingForTransfer, setIsWaitingForTransfer] = useState(true);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    return () => {
      mounted = false;
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
        
        // Wait for real transfer from Agent A
        // No automatic mock data - wait for actual transfer
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
    setTransferSummary(null);
    setIsWaitingForTransfer(true);
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 text-white flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-orange-500/20">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
          <p className="text-gray-300">Please wait while we connect you to the transfer system</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 text-white flex items-center justify-center">
        <div className="bg-red-600/20 border border-red-500 text-red-200 p-4 rounded-lg max-w-md mx-auto">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-orange-400 mr-3" />
              <h1 className="text-3xl font-bold">Expert Dashboard</h1>
            </div>
            <p className="text-gray-300">Receive warm transfers with full context and investor information</p>
          </div>

          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-orange-500/20">
              <Users className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Ready for Transfers</h2>
              <p className="text-gray-300 mb-6">
                Click the button below to connect and wait for warm transfers from Support Specialists.
              </p>
              <div className="space-y-3">
                <button
                  onClick={connectToRoom}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Connect to Transfer System
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[600px]">
                <ChatInterface 
                  callerType="investor"
                  email="demo@example.com"
                />
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-orange-500/20">
                <h2 className="text-xl font-semibold mb-4">AI Chat Demo</h2>
                <div className="space-y-4">
                  <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-400 mb-2">Features Available</h3>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Voice-to-text transcription</li>
                      <li>• Context-aware AI responses</li>
                      <li>• Text-to-speech playback</li>
                      <li>• Conversation history</li>
                      <li>• Investor context integration</li>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-orange-400 mr-3" />
              <h1 className="text-3xl font-bold">Expert Dashboard</h1>
            </div>
            <p className="text-gray-300">Receive warm transfers with full context and investor information</p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Conference */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-orange-500/20">
                <h2 className="text-xl font-semibold mb-4">Transfer Call</h2>
                <div data-lk-theme="default" style={{ height: '400px' }}>
                  <MyVideoConference />
                  <RoomAudioRenderer />
                  <ControlBar />
                </div>
              </div>

              {/* Context View */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-orange-500/20">
                <h2 className="text-xl font-semibold mb-4">Call Context</h2>
                
                {isWaitingForTransfer && !transferSummary && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Phone className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Waiting for Transfer</h3>
                    <p className="text-gray-500">
                      Support Specialists will transfer calls to you with full context and conversation summary.
                    </p>
                  </div>
                )}

                {transferSummary && (
                  <div className="space-y-4">
                    <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-400 mb-2">AI-Generated Call Summary</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">{transferSummary}</p>
                    </div>
                    
                    <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                      <h3 className="font-semibold text-green-400 mb-2">Transfer Active</h3>
                      <p className="text-gray-300 text-sm">
                        You are now connected to the caller and Support Specialist. The specialist will explain the context and then leave the call.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={disconnect}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 mx-auto"
              >
                <Phone className="w-5 h-5" />
                <span>Disconnect</span>
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