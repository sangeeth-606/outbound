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

export default function AgentBPage() {
  const room = 'transfer_waiting_room'; // Changed from 'support_room'
  const name = 'agent_b';
  const [roomInstance] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [transferSummary, setTransferSummary] = useState<string | null>(null);
  const [isWaitingForTransfer, setIsWaitingForTransfer] = useState(true);
  const [transferStatus, setTransferStatus] = useState<string>("waiting");
  const [transferRoomName, setTransferRoomName] = useState<string | null>(null);
  const [transferToken, setTransferToken] = useState<string | null>(null);
  const [transcriptionContext, setTranscriptionContext] = useState<any>(null);
  const [callerInfo, setCallerInfo] = useState<any>(null);

  useEffect(() => {
    return () => {
      roomInstance.disconnect();
    };
  }, [roomInstance]);

  // Poll for transfer notifications
  useEffect(() => {
    if (isConnected && isWaitingForTransfer) {
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/agent/transfer-status/${name}`);
          const data = await response.json();

          if (data.success && data.has_pending_transfer) {
            const transfer = data.transfer_details;
            setTransferSummary(transfer.summary);
            setTransferRoomName(transfer.transfer_room_name);
            setTransferToken(transfer.agent_b_token);
            setTranscriptionContext(transfer.transcription_context);
            setCallerInfo(transfer.caller_info);
            setIsWaitingForTransfer(false);
            setTransferStatus('transfer_available');

            const transcriptionInfo = transfer.transcription_context?.total_segments
              ? `\n\n📝 Transcription: ${transfer.transcription_context.total_segments} segments available`
              : '\n\n📝 No transcription data available';

            alert(`🎉 Transfer Available!\n\n📋 Summary: ${transfer.summary}\n\n🏠 Transfer Room: ${transfer.transfer_room_name}${transcriptionInfo}`);
          }
        } catch (error) {
          console.error('Failed to check transfer status:', error);
        }
      }, 2000); // Check every 2 seconds

      return () => clearInterval(pollInterval);
    }
  }, [isConnected, isWaitingForTransfer, name]);

  const connectToRoom = async () => {
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
            if (data.type === 'transfer_initiated' && data.target_agent === 'agent_b') {
              setTransferSummary(data.summary);
              setTransferRoomName(data.transfer_room);
              setIsWaitingForTransfer(false);
              setTransferStatus('transfer_available');
            } else if (data.type === 'transfer_completed') {
              setTransferStatus('completed');
            }
          } catch (e) {
            console.error('Failed to parse data message:', e);
          }
        });

        // Wait for real transfer from Agent A
        // No automatic mock data - wait for actual transfer
      }
    } catch (e) {
      console.error('Connection error:', e);
      setError(e instanceof Error ? e.message : 'Failed to connect');
      setIsConnecting(false);
    }
  };

  const joinTransferRoom = async () => {
    if (!transferRoomName || !transferToken) {
      alert('No transfer room available');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Disconnect from waiting room
      await roomInstance.disconnect();

      // Use the pre-generated transfer token
      setToken(transferToken);
      await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', transferToken);
      setIsConnected(true);
      setTransferStatus('connected');
      setIsConnecting(false);

      // Clear the transfer from backend
      await fetch(`/api/agent/transfer-status/${name}`, { method: 'DELETE' });

      alert(`✅ Joined transfer room: ${transferRoomName}`);
    } catch (e) {
      console.error('Transfer room connection error:', e);
      setError(e instanceof Error ? e.message : 'Failed to join transfer room');
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
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="bg-gray-100 rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
          <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
          <p className="text-gray-600">Please wait while we connect you to the transfer system</p>
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
              <User className="w-8 h-8 text-black mr-3" />
              <h1 className="text-3xl font-bold">Agent B Dashboard</h1>
            </div>
            <p className="text-gray-600">Senior support specialist ready for warm transfers</p>
          </div>

          <div className="text-center">
            <div className="bg-gray-100 rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
              <Users className="w-16 h-16 text-black mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Ready for Transfers</h2>
              <p className="text-gray-600 mb-6">
                Click the button below to connect and wait for warm transfers from Agent A.
              </p>
              <div className="space-y-3">
                <button
                  onClick={connectToRoom}
                  className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  Connect to Transfer System
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
                  callerType="investor"
                  email="demo@example.com"
                />
              </div>
              <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">AI Chat Demo</h2>
                <div className="space-y-4">
                  <div className="bg-blue-100 border border-blue-400 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-700 mb-2">Features Available</h3>
                    <ul className="text-gray-600 text-sm space-y-1">
                      <li>• Voice-to-text transcription</li>
                      <li>• Context-aware AI responses</li>
                      <li>• Text-to-speech playback</li>
                      <li>• Conversation history</li>
                      <li>• Advanced support context</li>
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
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-black mr-3" />
              <h1 className="text-3xl font-bold">Agent B Dashboard</h1>
            </div>
            <p className="text-gray-600">Senior support specialist - receiving warm transfers</p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Conference */}
              <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Transfer Call</h2>
                <div data-lk-theme="default" style={{ height: '400px' }}>
                  <MyVideoConference />
                  <RoomAudioRenderer />
                  <ControlBar />
                </div>
              </div>

              {/* Transfer Context */}
              <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Transfer Context</h2>
                
                {isWaitingForTransfer && !transferSummary && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Phone className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-500 mb-2">Waiting for Transfer</h3>
                    <p className="text-gray-400">
                      Agent A will transfer calls to you with full context and conversation summary.
                    </p>
                  </div>
                )}

                {transferSummary && transferStatus === 'transfer_available' && (
                   <div className="space-y-4">
                     <div className="bg-blue-100 border border-blue-400 rounded-lg p-4">
                       <h3 className="font-semibold text-black mb-2">Transfer Summary</h3>
                       <p className="text-gray-600 text-sm leading-relaxed">{transferSummary}</p>
                       {callerInfo && (
                         <div className="mt-3 pt-3 border-t border-blue-200">
                           <p className="text-xs text-gray-500">
                             Customer: {callerInfo.email} ({callerInfo.caller_type})
                           </p>
                         </div>
                       )}
                     </div>

                     {transcriptionContext && (
                       <>
                         {transcriptionContext.transcription_status === 'failed' && (
                           <div className="bg-red-100 border border-red-400 rounded-lg p-4">
                             <h3 className="font-semibold text-red-700 mb-2 flex items-center">
                               <span>⚠️ Transcription Error</span>
                             </h3>
                             <p className="text-red-600 text-sm">
                               {transcriptionContext.transcription_error || 'Transcription service encountered an error during the call.'}
                             </p>
                             <p className="text-red-700 text-xs mt-2">
                               Please ask the customer to repeat key details from their conversation with Agent A.
                             </p>
                           </div>
                         )}

                         {transcriptionContext.segments && transcriptionContext.segments.length > 0 && (
                           <div className="bg-green-100 border border-green-400 rounded-lg p-4">
                             <h3 className="font-semibold text-green-700 mb-2 flex items-center">
                               <span>📝 Conversation Transcript</span>
                               <span className="ml-2 text-xs bg-green-200 px-2 py-1 rounded">
                                 {transcriptionContext.total_segments} segments
                               </span>
                             </h3>
                             <div className="max-h-40 overflow-y-auto space-y-2">
                               {transcriptionContext.segments.slice(-5).map((segment: any, index: number) => (
                                 <div key={segment.id || index} className="text-xs bg-green-200 rounded p-2">
                                   <div className="flex justify-between items-start mb-1">
                                     <span className="font-medium text-green-800">
                                       {segment.speaker || 'Unknown'}
                                     </span>
                                     <span className="text-gray-500">
                                       {segment.timestamp ? new Date(segment.timestamp * 1000).toLocaleTimeString() : ''}
                                     </span>
                                   </div>
                                   <p className="text-gray-700">{segment.text}</p>
                                 </div>
                               ))}
                             </div>
                             {transcriptionContext.total_segments > 5 && (
                               <p className="text-xs text-gray-500 mt-2">
                                 Showing last 5 of {transcriptionContext.total_segments} segments
                               </p>
                             )}
                           </div>
                         )}

                         {transcriptionContext.transcription_status === 'not_started' && (
                           <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
                             <h3 className="font-semibold text-yellow-700 mb-2 flex items-center">
                               <span>📝 No Transcription Available</span>
                             </h3>
                             <p className="text-yellow-600 text-sm">
                               Live transcription was not enabled for this call. The summary above is based on Agent A's notes.
                             </p>
                           </div>
                         )}
                       </>
                     )}

                     <div className="bg-orange-100 border border-orange-400 rounded-lg p-4">
                       <h3 className="font-semibold text-orange-700 mb-2">Join Transfer Room</h3>
                       <p className="text-gray-600 text-sm mb-3">
                         A customer transfer is ready. Click below to join the transfer room and continue the conversation.
                       </p>
                       <button
                         onClick={joinTransferRoom}
                         className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                       >
                         Join Transfer Room
                       </button>
                     </div>
                   </div>
                 )}

                {transferSummary && transferStatus === 'connected' && (
                  <div className="space-y-4">
                    <div className="bg-blue-100 border border-blue-400 rounded-lg p-4">
                      <h3 className="font-semibold text-black mb-2">Transfer Summary</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{transferSummary}</p>
                    </div>

                    <div className="bg-green-100 border border-green-400 rounded-lg p-4">
                      <h3 className="font-semibold text-green-700 mb-2">Transfer Active</h3>
                      <p className="text-gray-600 text-sm">
                        You are now connected to the customer with full context from Agent A.
                      </p>
                    </div>

                    <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-700 mb-2">Next Steps</h3>
                      <ul className="text-gray-600 text-sm space-y-1">
                        <li>• Review the transfer summary above</li>
                        <li>• Continue helping the customer</li>
                        <li>• Use AI assistant if needed</li>
                        <li>• Escalate to Expert if required</li>
                      </ul>
                    </div>
                  </div>
                )}

                {transferStatus === 'completed' && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-green-700" />
                    </div>
                    <h3 className="text-lg font-semibold text-green-700 mb-2">Transfer Completed</h3>
                    <p className="text-gray-500">
                      The transfer has been successfully completed.
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
