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
import { useEffect, useState, useRef } from 'react';
import { Phone, MessageSquare, Users, PhoneOff, User } from 'lucide-react';
import LiveKitChatInterface, { LiveKitChatInterfaceRef } from '../../components/LiveKitChatInterface';
import MiniLiveTranscription from '../../components/MiniLiveTranscription';
import { DeepgramContextProvider } from '../context/DeepgramContextProvider';
import { MicrophoneContextProvider } from '../context/MicrophoneContextProvider';

export default function AgentBPage() {
  const room = 'transfer_waiting_room';
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
  const chatInterfaceRef = useRef<LiveKitChatInterfaceRef>(null);

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

            // Add summary to chat interface
            if (chatInterfaceRef.current && transfer.summary) {
              chatInterfaceRef.current.addSummaryMessage(
                transfer.summary, 
                `📋 Transfer Summary from Agent A`
              );
            }

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
              
              // Add summary to chat interface
              if (chatInterfaceRef.current && data.summary) {
                chatInterfaceRef.current.addSummaryMessage(
                  data.summary, 
                  `📋 Call Transfer Summary from Agent A`
                );
              }
            } else if (data.type === 'transfer_completed') {
              setTransferStatus('completed');
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

  // Callback function to handle auto-transcription messages
  const handleAutoTranscriptionMessage = (message: string) => {
    console.log('Agent B received auto-transcription message:', message);
    if (chatInterfaceRef.current) {
      chatInterfaceRef.current.addAutoMessage(message);
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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Agent B Dashboard
            </h1>
            <p className="text-gray-600">
              Senior support specialist - Ready to receive warm transfers
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="space-y-4">
              <button
                onClick={connectToRoom}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Connect to Transfer System
              </button>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <h3 className="font-semibold text-blue-700 mb-2">🔄 Transfer Ready</h3>
                <p className="text-blue-600 text-sm">
                  When Agent A initiates a transfer, you'll see the conversation summary and can join the call seamlessly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connected state: modern layout similar to Agent A
  return (
    <DeepgramContextProvider>
      <MicrophoneContextProvider>
        <RoomContext.Provider value={roomInstance}>
          <div className="min-h-screen h-screen w-full bg-gray-50 text-gray-900 flex flex-col font-sans antialiased">
            <header className="w-full py-4 px-6 border-b border-gray-200 bg-white shadow-sm">
              <div className="flex items-start">
                <div className="flex flex-col">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                    Agent B Transfer Interface
                  </h1>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className="text-sm text-gray-500 font-medium">Room:</span>
                    <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded border">
                      {transferRoomName || room}
                    </span>
                    {transferStatus !== 'waiting' && (
                      <>
                        <span className="text-sm text-gray-500">•</span>
                        <span className={`text-sm font-medium ${
                          transferStatus === 'transfer_available' ? 'text-green-600' :
                          transferStatus === 'completed' ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {transferStatus === 'transfer_available' ? 'Transfer Ready' :
                           transferStatus === 'completed' ? 'Transfer Complete' : 'Processing...'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </header>
            
            <main className="flex-1 w-full flex flex-row h-full overflow-hidden">
              <section className="flex flex-1 flex-row h-full w-full">
                {/* Video Conference - left side */}
                <div className="flex-1 flex flex-col h-full min-w-0">
                  <div className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-900">
                        {callerInfo?.email || transferSummary ? 'Transfer Session' : 'Waiting for Transfer'}
                      </span>
                      <span className="text-xs text-gray-500">{roomInstance.localParticipant.identity}</span>
                    </div>
                  </div>
                  
                  {/* Video and controls */}
                  <div className="flex-1 flex flex-col bg-white min-h-0">
                    {isConnected && (
                      <>
                        <div className="flex-1 min-h-0 flex flex-col justify-center">
                          <MyVideoConference />
                          <RoomAudioRenderer />
                        </div>
                        <div className="w-full border-t border-gray-200 bg-white px-4 py-3 flex-shrink-0 flex justify-center shadow-sm z-10">
                          <ControlBar />
                        </div>
                      </>
                    )}
                    
                    {!isConnected && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Phone className="w-8 h-8 text-gray-500" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-500 mb-2">Waiting for Transfer</h3>
                          <p className="text-gray-400">Ready to receive transferred calls with conversation summaries</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Divider */}
                <div className="w-[1.5px] bg-gradient-to-b from-gray-200/80 via-gray-300/60 to-gray-100/0 mx-0" style={{ minHeight: '100%' }} />
                
                {/* Chat - right side */}
                <aside className="w-full max-w-[380px] flex flex-col h-full bg-white">
                  <div className="flex flex-col h-full px-0 py-0">
                    <div className="flex-1 min-h-0">
                      <LiveKitChatInterface 
                        ref={chatInterfaceRef}
                        room={roomInstance}
                        localUserType="agent"
                        className="h-full"
                      />
                    </div>
                  </div>
                </aside>
              </section>
            </main>
            
            {/* Mini Live Transcription Component */}
            <MiniLiveTranscription 
              room={roomInstance} 
              autoSendWordCount={7} 
              onMessageSent={handleAutoTranscriptionMessage}
            />
          </div>
        </RoomContext.Provider>
      </MicrophoneContextProvider>
    </DeepgramContextProvider>
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
    <GridLayout 
      tracks={tracks} 
      style={{ 
        height: 'calc(100% - 60px)', 
        width: '100%',
        backgroundColor: '#1f2937'
      }}
    >
      <ParticipantTile 
        style={{
          backgroundColor: '#374151',
          borderRadius: '8px',
          minHeight: '200px'
        }}
      />
    </GridLayout>
  );
}
