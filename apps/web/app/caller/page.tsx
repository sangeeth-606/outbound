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
import LiveKitChatInterface from '../../components/LiveKitChatInterface';
import MiniLiveTranscription from '../../components/MiniLiveTranscription';
import { DeepgramContextProvider } from '../context/DeepgramContextProvider';
import { MicrophoneContextProvider } from '../context/MicrophoneContextProvider';

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
  const [queueStatus, setQueueStatus] = useState<'idle' | 'waiting' | 'connecting' | 'connected'>('idle');
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number | null>(null);
  const [queuePollInterval, setQueuePollInterval] = useState<NodeJS.Timeout | null>(null);
  const [currentRoom, setCurrentRoom] = useState(room);
  const [transferRoomToken, setTransferRoomToken] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      roomInstance.disconnect();
    };
  }, [roomInstance]);

  // WebSocket for notifications - connect directly to backend
  useEffect(() => {
    if (!email) {
      console.log('No email provided, skipping WebSocket connection');
      return;
    }

    console.log('Setting up WebSocket connection for email:', email);
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        // Get backend URL from environment or use default
        const backendProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost:8000';
        const wsUrl = `${backendProtocol}//${backendHost}/ws/notifications`;
        
        console.log('Attempting WebSocket connection to:', wsUrl);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Customer WebSocket connected');
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ email })); // Identify customer
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('Customer WebSocket message:', message);
            
            if (message.type === 'agent_assigned' && message.email === email) {
              console.log('🎯 AGENT ASSIGNED! Email:', message.email, 'Room:', message.room_name);
              setCurrentRoom(message.room_name);
              setToken(message.customer_token);
              
              // Immediately update UI state to show connecting
              console.log('🔄 Setting UI to connecting state...');
              setQueueStatus('connecting');
              setIsConnecting(true);
              roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', message.customer_token)
                .then(() => {
                  console.log('Successfully connected to LiveKit room');
                  setIsConnected(true);
                  setQueueStatus('connected');
                  setIsConnecting(false);
                  
                  // Clear any remaining polling
                  if (queuePollInterval) {
                    clearInterval(queuePollInterval);
                    setQueuePollInterval(null);
                  }
                })
                .catch((e) => {
                  console.error('WS connect failed:', e);
                  setIsConnecting(false);
                  setQueueStatus('idle');
                });
            } else if (message.type === 'acknowledgment') {
              console.log('WebSocket acknowledgment received:', message);
            } else if (message.type === 'error') {
              console.error('WebSocket error from server:', message);
            }
          } catch (parseError) {
            console.error('Failed to parse WebSocket message:', parseError, 'Raw data:', event.data);
          }
        };

        ws.onclose = (event) => {
          console.log('Customer WebSocket disconnected:', event.code, event.reason);
          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            console.log('Attempting WebSocket reconnection...');
            connectWebSocket();
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error('Customer WebSocket error:', error);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [email, roomInstance, queuePollInterval]);

  // Ensure WebSocket connects when customer starts call
  useEffect(() => {
    if (queueStatus === 'waiting' || queueStatus === 'connecting') {
      console.log('Customer is waiting/connecting, ensuring WebSocket is active for email:', email);
    }
  }, [queueStatus, email]);

  const pollQueueStatus = async () => {
    try {
      const resp = await fetch('/api/queue/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (resp.ok) {
        const data = await resp.json();
        console.log('Queue status response:', data);

        // If we got a token, connect immediately
        const t = data.token || data.access_token;
        if (t && data.room_name) {
          console.log('Received access token from queue, connecting...');
          setToken(t);
          setCurrentRoom(data.room_name);
          await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', t);
          setIsConnected(true);
          setQueueStatus('connected');

          // Clear polling since we're connected
          if (queuePollInterval) {
            clearInterval(queuePollInterval);
            setQueuePollInterval(null);
          }
          return;
        }

        // If customer is no longer in queue (connected or removed), stop polling
        if (data.position === 0 || data.error === "Customer not found in queue") {
          console.log('Customer no longer in queue, stopping polling');
          if (queuePollInterval) {
            clearInterval(queuePollInterval);
            setQueuePollInterval(null);
          }
          return;
        }

        setQueuePosition(data.position);
        setEstimatedWaitTime(data.estimated_wait_time);

        // If position 1 and agents available, try to connect
        if (data.position === 1 && data.agents_available > 0) {
          await attemptConnection();
        }
      } else if (resp.status === 404) {
        // Customer not found in queue - probably connected or removed
        console.log('Customer not found in queue, stopping polling');
        if (queuePollInterval) {
          clearInterval(queuePollInterval);
          setQueuePollInterval(null);
        }
      } else {
        console.error('Queue status request failed:', resp.status);
      }
    } catch (e) {
      console.error('Failed to poll queue status:', e);
      // Stop polling on error to prevent infinite loops
      if (queuePollInterval) {
        clearInterval(queuePollInterval);
        setQueuePollInterval(null);
      }
    }
  };

  const attemptConnection = async () => {
    try {
      setQueueStatus('connecting');
      console.log('Attempting connection with room:', currentRoom, 'email:', email);
      
      const resp = await fetch(`/api/token?room=${currentRoom}&username=${name}&callerType=${callerType}&email=${email}`);
      const data = await resp.json();
      console.log('Token response:', data);

      const t = data.token || data.access_token;
      if (data.queue_status === 'connected' && t) {
        console.log('Connected immediately to agent!');
        setToken(t);
        setCurrentRoom(data.room_name || currentRoom);
        await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', t);
        setIsConnected(true);
        setQueueStatus('connected');

        // Clear polling since we're already connected
        if (queuePollInterval) {
          clearInterval(queuePollInterval);
          setQueuePollInterval(null);
        }

        // Set up data channel listener for transfer events
        roomInstance.on(RoomEvent.DataReceived, (payload, participant) => {
          try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data.type === 'transfer_initiated') {
              setTransferStatus('in_progress');
              setTransferMessage('Your call is being transferred to a specialist. Please hold...');
            } else if (data.type === 'switch_to_transfer_room') {
              // Handle room switch for customer
              switchToTransferRoom(data.transfer_room_name, data.caller_token, data.summary);
            } else if (data.type === 'transfer_completed') {
              setTransferStatus('completed');
              setTransferMessage('Transfer completed. You are now connected to a specialist.');
            }
          } catch (e) {
            console.error('Failed to parse data message:', e);
          }
        });
      } else if (data.queue_status === 'waiting') {
        setQueueStatus('waiting');
        setQueuePosition(data.queue_position || null);
        setEstimatedWaitTime(data.estimated_wait_time || null);
        console.log('Added to queue, position:', data.queue_position);
        
        // Start polling for queue status
        const interval = setInterval(pollQueueStatus, 3000); // Poll every 3 seconds
        setQueuePollInterval(interval);
      } else {
        console.error('Unexpected queue status:', data.queue_status);
        setError('Unexpected response from server');
        setQueueStatus('idle');
      }
    } catch (e) {
      console.error('Connection error:', e);
      setError(e instanceof Error ? e.message : 'Failed to connect');
      setQueueStatus('idle');
    }
  };

  const connectToCall = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setQueueStatus('connecting');

      await attemptConnection();
      console.log('Polling queue, current room:', currentRoom, 'status:', queueStatus);

      // If still waiting, start polling
      if (queueStatus === 'waiting') {
        const interval = setInterval(pollQueueStatus, 5000); // Poll every 5 seconds
        setQueuePollInterval(interval);
      }

      setIsConnecting(false);
    } catch (e) {
      console.error('Connection error:', e);
      setError(e instanceof Error ? e.message : 'Failed to connect');
      setIsConnecting(false);
      setQueueStatus('idle');
    }
  };

  const disconnect = async () => {
    await roomInstance.disconnect();
    setIsConnected(false);
    setQueueStatus('idle');
    setQueuePosition(null);
    setEstimatedWaitTime(null);

    // Clear polling interval
    if (queuePollInterval) {
      clearInterval(queuePollInterval);
      setQueuePollInterval(null);
    }
  };

  const switchToTransferRoom = async (transferRoomName: string, callerToken: string, summary: string) => {
    try {
      setTransferMessage(`Transferring to specialist... ${summary}`);

      // Disconnect from current room
      await roomInstance.disconnect();

      // Connect to transfer room
      setToken(callerToken);
      setCurrentRoom(transferRoomName);
      await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', callerToken);

      setTransferStatus('completed');
      setTransferMessage('You are now connected to a specialist.');

      alert(`✅ Transferred to specialist!\n\n📋 Transfer Summary: ${summary}\n\n🏠 Room: ${transferRoomName}`);
    } catch (e) {
      console.error('Failed to switch to transfer room:', e);
      setTransferMessage('Transfer failed. Please try again.');
    }
  };

  if (isConnecting || queueStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center font-sans antialiased">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
          <div className="animate-spin w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 tracking-tight">Connecting...</h2>
          <p className="text-gray-600 font-medium">Please wait while we connect you to support</p>
        </div>
      </div>
    );
  }

  if (queueStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center font-sans antialiased">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
          <div className="animate-pulse w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 tracking-tight">Waiting in Queue</h2>
          <p className="text-gray-600 mb-4 font-medium">All our agents are currently busy. You're in the queue to speak with support.</p>

          {queuePosition && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-semibold">Your Position:</span>
                <span className="text-red-400 font-bold text-lg tracking-tight">#{queuePosition}</span>
              </div>
              {estimatedWaitTime && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-semibold">Estimated Wait:</span>
                  <span className="text-red-400 font-bold tracking-tight">
                    {Math.floor(estimatedWaitTime / 60)}:{(estimatedWaitTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => {
                if (queuePollInterval) {
                  clearInterval(queuePollInterval);
                  setQueuePollInterval(null);
                }
                setQueueStatus('idle');
                setQueuePosition(null);
                setEstimatedWaitTime(null);
              }}
              className="bg-red-400 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-bold tracking-wide transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center font-sans antialiased">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg max-w-md mx-auto font-semibold">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans antialiased">
        
        {/* Main Content */}
        <main className="flex-1 w-full flex justify-center items-center px-4 md:px-8 lg:px-20 pb-8">
          {/* Call Form - Centered */}
          <section className="w-full max-w-md">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900 text-center tracking-tight">Start Your Call</h2>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 tracking-wide">Your Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white text-gray-900 font-medium placeholder:text-gray-500 placeholder:font-normal"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 tracking-wide">Caller Type</label>
                <select
                  value={callerType}
                  onChange={e => setCallerType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 bg-white text-gray-900 font-medium"
                >
                  <option value="investor">Investor</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
              <button
                type="button"
                onClick={connectToCall}
                className="w-full bg-red-400 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-bold tracking-wide transition-colors mt-2 text-base"
              >
                Start Call
              </button>
            </form>
          </section>
        </main>
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[600px]">
                <ChatInterface 
                  callerType={callerType as "investor" | "prospect"}
                  email={email}
                />
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-bold mb-4 text-gray-900 tracking-tight">AI Chat Demo</h2>
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-bold text-red-700 mb-2 tracking-wide">Features Available</h3>
                    <ul className="text-gray-600 text-sm space-y-1 font-medium">
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
                  className="w-full mt-6 bg-red-400 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-bold tracking-wide transition-colors"
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
    <DeepgramContextProvider>
      <MicrophoneContextProvider>
        <RoomContext.Provider value={roomInstance}>
          <div className="min-h-screen h-screen w-full bg-gray-50 text-gray-900 flex flex-col font-sans antialiased">
            <header className="w-full py-4 px-6 border-b border-gray-200 bg-white shadow-sm">
              <div className="flex items-start">
                <div className="flex flex-col">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                    Support Call in Progress
                  </h1>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className="text-sm text-gray-500 font-medium">Room:</span>
                    <span className="text-sm font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded border">
                      {currentRoom}
                </span>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full flex flex-row h-full overflow-hidden">
          {/* Unified container for video and chat */}
          <section className="flex flex-1 flex-row h-full w-full">
            {/* Video Conference - left side */}
            <div className="flex-1 flex flex-col h-full min-w-0">
              <div className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900 tracking-tight">{email}</span>
                  <span className="text-xs text-gray-500 font-medium">{roomInstance.localParticipant.identity}</span>
                </div>
                {/* Removed custom Leave button, rely on ControlBar */}
              </div>
              {/* Video and controls stacked, controls pinned bottom, responsive */}
              <div className="flex-1 flex flex-col bg-gray-100 min-h-0">
                <div className="flex-1 min-h-0 p-4">
                  <MyVideoConference />
                  <RoomAudioRenderer />
                </div>
                <div className="w-full border-t border-gray-200 bg-white px-4 py-3 flex-shrink-0 flex justify-center shadow-sm z-10">
                  <ControlBar />
                </div>
              </div>
            </div>
            {/* Divider */}
            <div className="w-[1.5px] bg-gradient-to-b from-gray-200/80 via-gray-300/60 to-gray-100/0 mx-0" style={{ minHeight: '100%' }} />
            {/* Chat - right side */}
            <aside className="w-full max-w-[380px] flex flex-col h-full bg-white">
              <div className="flex flex-col h-full px-0 py-0">
                {/* <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-red-400 flex items-center gap-2 tracking-tight">
                    <span role="img" aria-label="chat">🔥</span> Live Chat
                  </h2>
                </div> */}
                <div className="flex-1 min-h-0">
                  <LiveKitChatInterface 
                    room={roomInstance}
                    localUserType="caller"
                    className="h-full"
                  />
                </div>
              </div>
            </aside>
          </section>
        </main>
        
        {/* Mini Live Transcription Component */}
        <MiniLiveTranscription />
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
    <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden relative">
      <GridLayout 
        tracks={tracks} 
        style={{ 
          height: '100%', 
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
    </div>
  );
}
