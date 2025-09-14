'use client';

import { useState, useEffect } from 'react';
import { LiveKitManager } from '../../lib/livekit';
import { Phone, Mic, MicOff, Video, VideoOff, PhoneOff, User, ArrowRight, Check, Shield, Building2, TrendingUp } from 'lucide-react';

export default function SpecialistPage() {
  const [liveKitManager, setLiveKitManager] = useState<LiveKitManager | null>(null);
  const [transferManager, setTransferManager] = useState<LiveKitManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [transferSummary, setTransferSummary] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState(false);
  const [callerContext, setCallerContext] = useState<any>(null);
  const [currentCallerType, setCurrentCallerType] = useState<string>('');

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
          room_name: 'specialist_support_room',
          participant_identity: 'specialist',
          caller_type: 'specialist',
          email: 'specialist@attackcapital.com'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const { room_name, access_token, caller_context } = await response.json();

      // Store caller context if available
      if (caller_context) {
        setCallerContext(caller_context);
        setCurrentCallerType(caller_context.type);
      }

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

  const initiateTransfer = async (transferTarget: string) => {
    setIsTransferring(true);
    setError(null);

    try {
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'initiate',
          original_room_name: 'specialist_support_room',
          agent_a_id: 'specialist',
          transfer_target: transferTarget,
          caller_type: currentCallerType,
          email: callerContext?.data?.email || 'unknown@example.com'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate transfer');
      }

      const { transfer_room_name, summary, agent_a_token, agent_b_token, target_agent } = await response.json();
      
      setTransferSummary(summary);

      // Create transfer room manager
      const transferManager = new LiveKitManager(
        (participant) => {
          console.log('Transfer participant connected:', participant.identity);
        },
        (participant) => {
          console.log('Transfer participant disconnected:', participant.identity);
        },
        () => {
          console.log('Connected to transfer room');
        },
        () => {
          console.log('Disconnected from transfer room');
        }
      );

      // Connect to transfer room
      await transferManager.connect({
        url: process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://outbound-gkkdznzy.livekit.cloud',
        token: agent_a_token,
        roomName: transfer_room_name,
      });

      setTransferManager(transferManager);
      setIsTransferring(false);
    } catch (err) {
      console.error('Failed to initiate transfer:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate transfer');
      setIsTransferring(false);
    }
  };

  const completeTransfer = async () => {
    try {
      const response = await fetch('/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          original_room_name: 'specialist_support_room',
          agent_a_id: 'specialist',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete transfer');
      }

      // Disconnect from original room
      if (liveKitManager) {
        await liveKitManager.disconnect();
        setLiveKitManager(null);
      }

      setTransferCompleted(true);
    } catch (err) {
      console.error('Failed to complete transfer:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete transfer');
    }
  };

  const disconnect = async () => {
    if (liveKitManager) {
      await liveKitManager.disconnect();
      setLiveKitManager(null);
    }
    if (transferManager) {
      await transferManager.disconnect();
      setTransferManager(null);
    }
    setIsConnected(false);
    setParticipants([]);
    setTransferSummary(null);
    setTransferCompleted(false);
    setCallerContext(null);
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
      if (transferManager) {
        transferManager.disconnect();
      }
    };
  }, [liveKitManager, transferManager]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-purple-400 mr-3" />
            <h1 className="text-3xl font-bold">Support Specialist Dashboard</h1>
          </div>
          <p className="text-gray-300">Handle investor inquiries and route to appropriate experts</p>
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-500 text-red-200 p-4 rounded-lg mb-6 text-center">
            Error: {error}
          </div>
        )}

        {!isConnected && !isConnecting && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-purple-500/20">
              <User className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Ready to Take Calls</h2>
              <p className="text-gray-300 mb-6">
                Click the button below to connect and wait for investor calls.
              </p>
              <button
                onClick={connectToCall}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Start Taking Calls
              </button>
            </div>
          </div>
        )}

        {isConnecting && (
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-8 max-w-md mx-auto border border-purple-500/20">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
              <p className="text-gray-300">Please wait while we connect you to the call system</p>
            </div>
          </div>
        )}

        {isConnected && (
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Main Call View */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-500/20">
                <h2 className="text-xl font-semibold mb-4">Current Call</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Your Video</h3>
                    <div className="aspect-video bg-white/10 rounded-lg flex items-center justify-center">
                      <Video className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Caller Video</h3>
                    <div className="aspect-video bg-white/10 rounded-lg flex items-center justify-center">
                      {participants.length > 0 ? (
                        <div className="text-center">
                          <User className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">Caller Connected</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="animate-pulse w-12 h-12 bg-gray-500 rounded-full mx-auto mb-2"></div>
                          <p className="text-sm text-gray-400">Waiting for caller...</p>
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

                {participants.length > 0 && !transferSummary && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-4">Transfer Options</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          onClick={() => initiateTransfer('compliance')}
                          disabled={isTransferring}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 justify-center"
                        >
                          <Shield className="w-5 h-5" />
                          <span>Transfer to Compliance</span>
                        </button>
                        <button
                          onClick={() => initiateTransfer('general_partner')}
                          disabled={isTransferring}
                          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 justify-center"
                        >
                          <Building2 className="w-5 h-5" />
                          <span>Transfer to General Partner</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Caller Context & Transfer View */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-500/20">
                <h2 className="text-xl font-semibold mb-4">Caller Information</h2>
                
                {callerContext ? (
                  <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-300 mb-2">
                        {callerContext.type === 'investor' ? 'Current Investor' : 'Prospective Investor'}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-400">Name:</span> {callerContext.data.name}</p>
                        <p><span className="text-gray-400">Email:</span> {callerContext.data.email}</p>
                        {callerContext.type === 'investor' ? (
                          <>
                            <p><span className="text-gray-400">Invested:</span> ${callerContext.data.invested_amount.toLocaleString()}</p>
                            <p><span className="text-gray-400">Companies:</span> {callerContext.data.portfolio_companies.length}</p>
                          </>
                        ) : (
                          <>
                            <p><span className="text-gray-400">Interest:</span> ${callerContext.data.interested_amount.toLocaleString()}</p>
                            <p><span className="text-gray-400">Source:</span> {callerContext.data.source}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-400">No caller information available</p>
                  </div>
                )}

                {transferSummary && !transferCompleted && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-400 mb-2">AI-Generated Call Summary</h3>
                      <p className="text-gray-300 text-sm leading-relaxed">{transferSummary}</p>
                    </div>
                    
                    <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                      <h3 className="font-semibold text-green-400 mb-2">Transfer Room Active</h3>
                      <p className="text-gray-300 text-sm">
                        You are now connected to the transfer room. Please read the summary above to provide context.
                      </p>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={completeTransfer}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 mx-auto"
                      >
                        <Check className="w-5 h-5" />
                        <span>Complete Transfer</span>
                      </button>
                    </div>
                  </div>
                )}

                {transferCompleted && (
                  <div className="mt-6 text-center py-8">
                    <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-400 mb-2">Transfer Completed</h3>
                    <p className="text-gray-400">
                      The caller has been successfully transferred with full context.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold mb-4">Connected Participants</h3>
              <div className="space-y-2">
                {participants.length > 0 ? (
                  participants.map((participant, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-300">{participant.identity}</span>
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
                <span>End All Calls</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
