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
import ChatInterface from '../components/ChatInterface';
import LiveKitChatInterface, { LiveKitChatInterfaceRef } from '../components/LiveKitChatInterface';
import MiniLiveTranscription, { MiniLiveTranscriptionRef } from '../components/MiniLiveTranscription';
import { DeepgramContextProvider } from './context/DeepgramContextProvider';
import { MicrophoneContextProvider } from './context/MicrophoneContextProvider';

export default function Home() {
  const room = 'support_room';
  const name = 'customer';
  const [roomInstance] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const chatInterfaceRef = useRef<LiveKitChatInterfaceRef>(null);
  const miniTranscriptionRef = useRef<MiniLiveTranscriptionRef>(null);
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
        const backendProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost:8000';
        const wsUrl = `${backendProtocol}//${backendHost}/ws/notifications`;
        
        console.log('Attempting WebSocket connection to:', wsUrl);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Customer WebSocket connected');
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ email }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('Customer WebSocket message:', message);
            
            if (message.type === 'agent_assigned' && message.email === email) {
              console.log('AGENT ASSIGNED! Email:', message.email, 'Room:', message.room_name);
              setCurrentRoom(message.room_name);
              setToken(message.customer_token);
              
              console.log('Setting UI to connecting state...');
              setQueueStatus('connecting');
              setIsConnecting(true);
              roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', message.customer_token)
                .then(() => {
                  console.log('Successfully connected to LiveKit room');
                  setIsConnected(true);
                  setQueueStatus('connected');
                  setIsConnecting(false);
                  
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

  useEffect(() => {
    if (!roomInstance) return;

    console.log('Setting up room event listeners...');

    const onConnected = () => {
      console.log('Room connected successfully');
      
      if (roomInstance.localParticipant?.audioTrackPublications.size > 0) {
        roomInstance.localParticipant.audioTrackPublications.forEach((publication) => {
          if (miniTranscriptionRef.current && !miniTranscriptionRef.current.isTranscriptionActive()) {
            miniTranscriptionRef.current.startTranscription().then(() => {
              console.log('Transcription state after start (existing):', miniTranscriptionRef.current?.getTranscriptionState());
            }).catch((error) => {
              console.error('Failed to start transcription for existing track:', error);
            });
          }
        });
      }
    };

    const onTrackPublished = (publication: any, participant: any) => {
      if (publication.kind === 'audio' && participant.isLocal) {
        if (miniTranscriptionRef.current && !miniTranscriptionRef.current.isTranscriptionActive()) {
          miniTranscriptionRef.current.startTranscription().then(() => {
            console.log('Transcription state after start (published):', miniTranscriptionRef.current?.getTranscriptionState());
          }).catch((error) => {
            console.error('Failed to start transcription:', error);
          });
        }
      }
    };

    const onTrackUnpublished = (publication: any, participant: any) => {
      if (publication.kind === 'audio' && participant.isLocal) {
        if (miniTranscriptionRef.current && miniTranscriptionRef.current.isTranscriptionActive()) {
          miniTranscriptionRef.current.stopTranscription();
        }
      }
    };

    const onTrackMuted = (track: any, participant: any) => {
      if (track.kind === 'audio' && participant.isLocal) {
        setTimeout(() => {
          const localParticipant = roomInstance.localParticipant;
          if (localParticipant) {
            const microphoneEnabled = localParticipant.isMicrophoneEnabled;
            
            if (!microphoneEnabled) {
              if (miniTranscriptionRef.current && miniTranscriptionRef.current.isTranscriptionActive()) {
                miniTranscriptionRef.current.stopTranscription();
              }
            }
          }
        }, 100);
      }
    };

    const onTrackUnmuted = (track: any, participant: any) => {
      if (track.kind === 'audio' && participant.isLocal) {
        const localParticipant = roomInstance.localParticipant;
        if (localParticipant) {
          const microphoneEnabled = localParticipant.isMicrophoneEnabled;
          
          if (microphoneEnabled) {
            if (miniTranscriptionRef.current && !miniTranscriptionRef.current.isTranscriptionActive()) {
              miniTranscriptionRef.current.startTranscription().then(() => {
                console.log('Transcription state after start (re-enabled):', miniTranscriptionRef.current?.getTranscriptionState());
              }).catch((error) => {
                console.error('Failed to start transcription (re-enabled):', error);
              });
            }
          }
        }
      }
    };

    roomInstance.on(RoomEvent.Connected, onConnected);
    roomInstance.on(RoomEvent.TrackPublished, onTrackPublished);
    roomInstance.on(RoomEvent.LocalTrackPublished, onTrackPublished);
    roomInstance.on(RoomEvent.TrackUnpublished, onTrackUnpublished);
    roomInstance.on(RoomEvent.LocalTrackUnpublished, onTrackUnpublished);
    roomInstance.on(RoomEvent.TrackMuted, onTrackMuted);
    roomInstance.on(RoomEvent.TrackUnmuted, onTrackUnmuted);

    return () => {
      roomInstance.off(RoomEvent.Connected, onConnected);
      roomInstance.off(RoomEvent.TrackPublished, onTrackPublished);
      roomInstance.off(RoomEvent.LocalTrackPublished, onTrackPublished);
      roomInstance.off(RoomEvent.TrackUnpublished, onTrackUnpublished);
      roomInstance.off(RoomEvent.LocalTrackUnpublished, onTrackUnpublished);
      roomInstance.off(RoomEvent.TrackMuted, onTrackMuted);
      roomInstance.off(RoomEvent.TrackUnmuted, onTrackUnmuted);
    };
  }, [roomInstance, miniTranscriptionRef]);

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

        const t = data.token || data.access_token;
        if (t && data.room_name) {
          console.log('Received access token from queue, connecting...');
          setToken(t);
          setCurrentRoom(data.room_name);
          await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', t);
          setIsConnected(true);
          setQueueStatus('connected');

          if (queuePollInterval) {
            clearInterval(queuePollInterval);
            setQueuePollInterval(null);
          }
          return;
        }

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

        if (data.position === 1 && data.agents_available > 0) {
          await attemptConnection();
        }
      } else if (resp.status === 404) {
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

      const t = data.token || data.access_token;
      if (data.queue_status === 'connected' && t) {
        console.log('Connected immediately to agent!');
        setToken(t);
        setCurrentRoom(data.room_name || currentRoom);
        await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', t);
        setIsConnected(true);
        setQueueStatus('connected');

        if (queuePollInterval) {
          clearInterval(queuePollInterval);
          setQueuePollInterval(null);
        }

        roomInstance.on(RoomEvent.DataReceived, (payload, participant) => {
          try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data.type === 'transfer_initiated') {
              setTransferStatus('in_progress');
              setTransferMessage('Your call is being transferred to a specialist. Please hold...');
            } else if (data.type === 'transfer_ready') {
              setTransferStatus('completed');
              setTransferMessage('Transfer completed. A specialist has joined your call.');
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
        
        const interval = setInterval(pollQueueStatus, 3000);
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

      if (queueStatus === 'waiting') {
        const interval = setInterval(pollQueueStatus, 5000);
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

    if (queuePollInterval) {
      clearInterval(queuePollInterval);
      setQueuePollInterval(null);
    }
  };

  const handleAutoTranscriptionMessage = (message: string) => {
    console.log('Caller received auto-transcription message:', message);
    if (chatInterfaceRef.current) {
      chatInterfaceRef.current.addAutoMessage(message);
    }
  };

  const switchToTransferRoom = async (transferRoomName: string, callerToken: string, summary: string) => {
    try {
      setTransferMessage(`Transferring to specialist... ${summary}`);

      await roomInstance.disconnect();

      setToken(callerToken);
      setCurrentRoom(transferRoomName);
      await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', callerToken);

      setTransferStatus('completed');
      setTransferMessage('You are now connected to a specialist.');

      alert(`Transferred to specialist!\n\nTransfer Summary: ${summary}\n\nRoom: ${transferRoomName}`);
    } catch (e) {
      console.error('Failed to switch to transfer room:', e);
      setTransferMessage('Transfer failed. Please try again.');
    }
  };

  if (isConnecting || queueStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-surface-primary text-text-main flex items-center justify-center">
        <div className="card p-8 max-w-md mx-auto">
          <div className="animate-spin w-8 h-8 border-2 border-accent-red border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-lg font-bold mb-2 text-text-main tracking-tight">Connecting...</h2>
          <p className="text-xs text-text-muted">Please wait while we connect you to support</p>
        </div>
      </div>
    );
  }

  if (queueStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-surface-primary text-text-main flex items-center justify-center">
        <div className="card p-8 max-w-md mx-auto">
          <div className="animate-pulse w-16 h-16 bg-accent-red/15 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-accent-red" />
          </div>
          <h2 className="text-lg font-bold mb-2 text-text-main tracking-tight">Waiting in Queue</h2>
          <p className="text-xs text-text-muted mb-4">All our agents are currently busy. You're in the queue to speak with support.</p>

          {queuePosition && (
            <div className="bg-surface-secondary border border-border-dim rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-label font-bold">Position:</span>
                <span className="text-accent-red font-bold text-lg tracking-tight">#{queuePosition}</span>
              </div>
              {estimatedWaitTime && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-label font-bold">Est. Wait:</span>
                  <span className="text-accent-red font-bold tracking-tight">
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
              className="btn btn-accent px-6"
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
      <div className="min-h-screen bg-surface-primary text-text-main flex items-center justify-center">
        <div className="bg-accent-red/10 border border-accent-red/30 text-accent-red p-4 rounded-md max-w-md mx-auto text-xs font-bold">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 w-full flex justify-center items-center px-4">
          <section className="w-full max-w-md">
            <h2 className="text-sm font-bold text-text-label uppercase tracking-widest mb-6 text-center">Start Your Call</h2>
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); connectToCall(); }}>
              <div>
                <label className="block text-xs font-bold text-text-label mb-2 tracking-wide uppercase">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input w-full"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-label mb-2 tracking-wide uppercase">Caller Type</label>
                <select
                  value={callerType}
                  onChange={e => setCallerType(e.target.value)}
                  className="input w-full"
                >
                  <option value="investor">Investor</option>
                  <option value="prospect">Prospect</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn btn-accent w-full mt-2 text-sm"
              >
                Start Call
              </button>
            </form>
          </section>
        </div>
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="min-h-screen bg-surface-primary text-text-main">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[600px]">
                <ChatInterface 
                  callerType={callerType as "investor" | "prospect"}
                  email={email}
                />
              </div>
              <div className="card p-6">
                <h2 className="text-sm font-bold text-text-main mb-4 tracking-tight">AI Chat Demo</h2>
                <div className="space-y-4">
                  <div className="bg-surface-card border border-border-dim rounded-md p-4">
                    <h3 className="text-xs font-bold text-accent-red mb-2 tracking-wide uppercase">Features</h3>
                    <ul className="text-text-muted text-xs space-y-1">
                      <li>Voice-to-text transcription</li>
                      <li>Context-aware AI responses</li>
                      <li>Text-to-speech playback</li>
                      <li>Conversation history</li>
                      <li>Personalized assistance</li>
                    </ul>
                  </div>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="btn btn-accent w-full mt-6"
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
          <div className="h-full w-full bg-surface-primary text-text-main flex flex-col">
            <div className="flex items-center justify-between px-6 py-3 border-b border-border-dim bg-surface-secondary">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
                <span className="text-xs font-bold text-text-main tracking-wide">Support Call in Progress</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">Room:</span>
                <span className="text-xs font-mono text-text-label bg-surface-card px-2 py-1 rounded border border-border-dim">
                  {currentRoom}
                </span>
              </div>
            </div>
            <main className="flex-1 flex flex-row overflow-hidden">
              <section className="flex flex-1 flex-row">
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="flex items-center justify-between px-6 py-3 border-b border-border-dim bg-surface-card">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-main">{email}</span>
                      <span className="text-xs text-text-muted">{roomInstance.localParticipant.identity}</span>
                    </div>
                    <button
                      onClick={() => setShowChat(true)}
                      className="btn btn-ghost text-xs"
                    >
                      <MessageSquare className="w-3 h-3" />
                      AI Chat
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col bg-surface-primary min-h-0">
                    <div className="flex-1 min-h-0 p-4">
                      <MyVideoConference />
                      <RoomAudioRenderer />
                    </div>
                    <div className="border-t border-border-dim bg-surface-card px-4 py-2 flex-shrink-0 flex justify-center">
                      <ControlBar />
                    </div>
                  </div>
                </div>
                <div className="w-px bg-border-dim mx-0" style={{ minHeight: '100%' }} />
                <aside className="w-full max-w-[380px] flex flex-col bg-surface-card">
                  <div className="flex flex-col h-full px-0 py-0">
                    <div className="flex-1 min-h-0">
                      <LiveKitChatInterface 
                        ref={chatInterfaceRef}
                        room={roomInstance}
                        localUserType="caller"
                        className="h-full"
                      />
                    </div>
                  </div>
                </aside>
              </section>
            </main>
            
            <MiniLiveTranscription 
              ref={miniTranscriptionRef}
              room={roomInstance} 
              autoSendWordCount={7} 
              onMessageSent={handleAutoTranscriptionMessage}
              isHidden={true}
              externalMicControl={true}
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
    <div className="w-full h-full bg-surface-primary rounded-md overflow-hidden relative">
      <GridLayout 
        tracks={tracks} 
        style={{ 
          height: '100%', 
          width: '100%',
          backgroundColor: '#0A0A12'
        }}
      >
        <ParticipantTile 
          style={{
            backgroundColor: '#111119',
            borderRadius: '4px',
            minHeight: '200px'
          }}
        />
      </GridLayout>
    </div>
  );
}
