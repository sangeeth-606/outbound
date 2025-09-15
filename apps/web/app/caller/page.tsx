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
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="bg-gray-100 rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
          <div className="animate-spin w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
          <p className="text-gray-600">Please wait while we connect you to support</p>
        </div>
      </div>
    );
  }

  if (queueStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="bg-gray-100 rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
          <div className="animate-pulse w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Waiting in Queue</h2>
          <p className="text-gray-600 mb-4">All our agents are currently busy. You're in the queue to speak with support.</p>

          {queuePosition && (
            <div className="bg-gray-200 border border-gray-300 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-black font-medium">Your Position:</span>
                <span className="text-black font-bold text-lg">#{queuePosition}</span>
              </div>
              {estimatedWaitTime && (
                <div className="flex items-center justify-between">
                  <span className="text-black font-medium">Estimated Wait:</span>
                  <span className="text-black font-bold">
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
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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
              <Phone className="w-8 h-8 text-black mr-3" />
              <h1 className="text-3xl font-bold">Customer Support</h1>
            </div>
            <p className="text-gray-600">Connect with our support team for assistance</p>
          </div>

          <div className="text-center">
            <div className="bg-gray-100 rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
              <User className="w-16 h-16 text-black mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Start Your Call</h2>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Your Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:border-black"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Caller Type
                  </label>
                  <select
                    value={callerType}
                    onChange={(e) => setCallerType(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-black focus:outline-none focus:border-black"
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
                  className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[600px]">
                <ChatInterface 
                  callerType={callerType as "investor" | "prospect"}
                  email={email}
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
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-black mr-3" />
              <h1 className="text-3xl font-bold">Customer Support Call</h1>
            </div>
            <p className="text-gray-600">Connected to our support team</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-center">Support Call in Progress</h2>
              <div className="mb-4 text-center">
                <p className="text-sm text-gray-500">Room: <span className="font-mono text-black">{currentRoom}</span></p>
              </div>
              <div data-lk-theme="default" style={{ height: '500px' }}>
                <MyVideoConference />
                <RoomAudioRenderer />
                <ControlBar />
              </div>
            </div>

            {transferMessage && (
              <div className="mt-4 bg-blue-100 border border-blue-400 rounded-lg p-4">
                <h3 className="font-semibold text-blue-700 mb-2">Transfer Status</h3>
                <p className="text-gray-600 text-sm">{transferMessage}</p>
                {transferStatus === 'in_progress' && (
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full"></div>
                    <span className="text-sm text-gray-500">Transferring...</span>
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
