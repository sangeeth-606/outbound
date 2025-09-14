'use client';

import { useState, useEffect } from 'react';
import { LiveKitManager } from '../../lib/livekit';
import { Phone, Mic, MicOff, Video, VideoOff, PhoneOff, User } from 'lucide-react';

export default function CallerPage() {
  const [liveKitManager, setLiveKitManager] = useState<LiveKitManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const connectToCall = async () => {
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
          room_name: 'caller_room',
          participant_identity: 'caller',
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
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Caller View</h1>
          <p className="text-gray-400">You are the customer calling for support</p>
        </div>

        {error && (
          <div className="bg-red-600 text-white p-4 rounded-lg mb-6 text-center">
            Error: {error}
          </div>
        )}

        {!isConnected && !isConnecting && (
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
              <Phone className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Ready to Call</h2>
              <p className="text-gray-400 mb-6">
                Click the button below to connect to Agent A and start your support call.
              </p>
              <button
                onClick={connectToCall}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Start Call
              </button>
            </div>
          </div>
        )}

        {isConnecting && (
          <div className="text-center">
            <div className="bg-gray-800 rounded-lg p-8 max-w-md mx-auto">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
              <p className="text-gray-400">Please wait while we connect you to Agent A</p>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Call in Progress</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Your Video</h3>
                  <div className="aspect-video bg-gray-600 rounded-lg flex items-center justify-center">
                    <Video className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Agent Video</h3>
                  <div className="aspect-video bg-gray-600 rounded-lg flex items-center justify-center">
                    {participants.length > 0 ? (
                      <div className="text-center">
                        <User className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Agent Connected</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="animate-pulse w-12 h-12 bg-gray-500 rounded-full mx-auto mb-2"></div>
                        <p className="text-sm text-gray-400">Waiting for agent...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Call Controls</h3>
              <div className="flex justify-center space-x-4">
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
              <div className="mt-6 bg-gray-800 rounded-lg p-6">
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
      </div>
    </div>
  );
}
