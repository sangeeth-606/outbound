'use client';

import { useState, useEffect } from 'react';
import { LiveKitManager } from '../../lib/livekit';
import { Phone, Mic, MicOff, Video, VideoOff, PhoneOff, User, Users } from 'lucide-react';

export default function AgentBPage() {
  const [liveKitManager, setLiveKitManager] = useState<LiveKitManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [transferSummary, setTransferSummary] = useState<string | null>(null);
  const [isWaitingForTransfer, setIsWaitingForTransfer] = useState(true);

  const connectToTransferRoom = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Create room and get token for Agent B
      const response = await fetch('/api/room', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_name: 'transfer_room_agent_b',
          participant_identity: 'agent_b_transfer',
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
          
          // If Agent A connects, they might have the transfer summary
          if (participant.identity.includes('agent_a')) {
            // In a real implementation, you would receive the summary via data channel
            // For demo purposes, we'll use a mock summary
            setTransferSummary("Customer (John Doe) called about a login issue. Agent A verified his account is active and had him reset his password. He reported it worked but now can't see his dashboard. The customer seems frustrated but cooperative and needs urgent access to financial data for a meeting this afternoon.");
            setIsWaitingForTransfer(false);
          }
        },
        (participant) => {
          console.log('Participant disconnected:', participant.identity);
          setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
        },
        () => {
          console.log('Connected to transfer room');
          setIsConnected(true);
          setIsConnecting(false);
        },
        () => {
          console.log('Disconnected from transfer room');
          setIsConnected(false);
          setParticipants([]);
        }
      );

      // Connect to room
      await manager.connect({
        url: process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com',
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
    }
    setIsConnected(false);
    setParticipants([]);
    setTransferSummary(null);
    setIsWaitingForTransfer(true);
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
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Agent B Dashboard</h1>
          <p className="text-gray-400">Receive transferred calls with full context</p>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-4 rounded-lg mb-6 text-center">
            Error: {error}
          </div>
        )}

        {!isConnected && !isConnecting && (
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
              <Users className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Ready for Transfers</h2>
              <p className="text-gray-400 mb-6">
                Click the button below to connect and wait for transferred calls from Agent A.
              </p>
              <button
                onClick={connectToTransferRoom}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Connect to Transfer System
              </button>
            </div>
          </div>
        )}

        {isConnecting && (
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
              <p className="text-gray-400">Please wait while we connect you to the transfer system</p>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Call View */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Transfer Call</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Your Video</h3>
                    <div className="aspect-video bg-gray-600 rounded-lg flex items-center justify-center">
                      <Video className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Other Participants</h3>
                    <div className="aspect-video bg-gray-600 rounded-lg flex items-center justify-center">
                      {participants.length > 0 ? (
                        <div className="text-center">
                          <Users className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">{participants.length} participant(s)</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="animate-pulse w-12 h-12 bg-gray-500 rounded-full mx-auto mb-2"></div>
                          <p className="text-sm text-gray-400">Waiting for transfer...</p>
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
                </div>
              </div>

              {/* Context View */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Call Context</h2>
                
                {isWaitingForTransfer && !transferSummary && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Phone className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-400 mb-2">Waiting for Transfer</h3>
                    <p className="text-gray-500">
                      Agent A will transfer a call to you with full context and conversation summary.
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
                        You are now connected to the customer and Agent A. Agent A will explain the context and then leave the call.
                      </p>
                    </div>

                    <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-400 mb-2">Next Steps</h3>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Listen to Agent A's explanation</li>
                        <li>• Ask any clarifying questions</li>
                        <li>• Take over the call when Agent A leaves</li>
                        <li>• Continue helping the customer</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Connected Participants</h3>
              <div className="space-y-2">
                {participants.length > 0 ? (
                  participants.map((participant, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-300">{participant.identity}</span>
                      {participant.identity.includes('agent_a') && (
                        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">Transferring Agent</span>
                      )}
                      {participant.identity.includes('caller') && (
                        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">Customer</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No participants connected</p>
                )}
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={disconnect}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 mx-auto"
              >
                <PhoneOff className="w-5 h-5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
