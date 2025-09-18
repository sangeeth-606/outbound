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
import { Phone, MessageSquare, Users, PhoneOff, User, CheckCircle, AlertTriangle, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatInterface from '../../components/ChatInterface';
import TranscriptionDisplay from '../../components/TranscriptionDisplay';
import LiveKitChatInterface, { LiveKitChatInterfaceRef } from '../../components/LiveKitChatInterface';
import MiniLiveTranscription, { MiniLiveTranscriptionRef } from '../../components/MiniLiveTranscription';
import { DeepgramContextProvider } from '../context/DeepgramContextProvider';
import { MicrophoneContextProvider } from '../context/MicrophoneContextProvider';

export default function AgentAPage() {
  const [currentRoom, setCurrentRoom] = useState('support_room'); // Dynamic room name
  const name = 'agent_a';
  const [roomInstance] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callerContext, setCallerContext] = useState<any>(null);
  const [transferStatus, setTransferStatus] = useState<'idle' | 'initiating' | 'in_progress' | 'completed'>('idle');
  const [transferSummary, setTransferSummary] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState<'call' | 'history'>('call');
  const [agentStatus, setAgentStatus] = useState<'offline' | 'available' | 'busy'>('offline');
  const [nextCustomer, setNextCustomer] = useState<any>(null);
  const [isPickingCustomer, setIsPickingCustomer] = useState(false);
  const [isTranscriptionActive, setIsTranscriptionActive] = useState(false);
  const chatInterfaceRef = useRef<LiveKitChatInterfaceRef>(null);
  const miniTranscriptionRef = useRef<MiniLiveTranscriptionRef>(null);

  // WebSocket for real-time notifications
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        // Get backend URL from environment or use default
        const backendProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const backendHost = process.env.NEXT_PUBLIC_BACKEND_HOST || 'localhost:8000';
        const wsUrl = `${backendProtocol}//${backendHost}/ws/notifications`;
        
        console.log('Agent WebSocket connecting to:', wsUrl);
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('Agent WebSocket connected');
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ agent_id: name })); // Identify agent
          }
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('Agent WebSocket message:', message);
            
            // Handle different message types
            if (message.type === 'customer_assigned' && message.agent_id === name) {
              console.log('Customer assigned to agent:', message);
              // Auto-connect to the assigned room
              if (message.room_name && message.agent_token) {
                setToken(message.agent_token);
                setCurrentRoom(message.room_name); // Update current room
                setAgentStatus('busy');
                setNextCustomer({ email: message.customer_email });
                
                roomInstance.connect(
                  process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com',
                  message.agent_token
                ).then(() => {
                  setIsConnected(true);
                  alert(`Connected to customer: ${message.customer_email}`);
                }).catch((e) => {
                  console.error('Auto-connect failed:', e);
                  alert('Failed to auto-connect to customer');
                });
              }
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
          console.log('Agent WebSocket disconnected:', event.code, event.reason);
          // Attempt to reconnect after 3 seconds
          reconnectTimeout = setTimeout(() => {
            console.log('Attempting WebSocket reconnection...');
            connectWebSocket();
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error('Agent WebSocket error:', error);
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
  }, [name, roomInstance]);

  // Setup room event listeners whenever room instance is available
  useEffect(() => {
    if (!roomInstance) return;

    console.log('🔧 Setting up room event listeners...');
    console.log('🏠 Room instance state:', roomInstance.state);
    console.log('🎯 Available RoomEvents:', Object.keys(RoomEvent));

    // Additional debugging for room state
    const onConnected = () => {
      console.log('🔗 Room connected successfully');
      console.log('📋 Local participant:', roomInstance.localParticipant?.identity);
      console.log('🎤 Local audio tracks:', roomInstance.localParticipant?.audioTrackPublications.size);
      
      // Check if audio tracks are already published and unmuted when we first connect
      if (roomInstance.localParticipant?.audioTrackPublications.size > 0) {
        console.log('🔍 Found existing audio tracks on connection, checking their state...');
        roomInstance.localParticipant.audioTrackPublications.forEach((publication) => {
          console.log('🎤 Existing audio track:', {
            isMuted: publication.isMuted,
            kind: publication.kind,
            source: publication.source
          });
          
          // If track exists, start transcription (regardless of mute state)
          // The track being published means the user has enabled their microphone
          console.log('🎤 Existing audio track found, starting transcription...');
          if (miniTranscriptionRef.current && !miniTranscriptionRef.current.isTranscriptionActive()) {
            console.log('🚀 Calling startTranscription for existing track...');
            miniTranscriptionRef.current.startTranscription().then(() => {
              console.log('🔍 Transcription state after start (existing):', miniTranscriptionRef.current?.getTranscriptionState());
            }).catch((error) => {
              console.error('❌ Failed to start transcription for existing track:', error);
            });
          }
        });
      }
    };

    const onTrackPublished = (publication: any, participant: any) => {
      console.log('📤 Track published:', {
        kind: publication.kind,
        isLocal: participant.isLocal,
        participantIdentity: participant.identity,
        isMuted: publication.isMuted
      });
      console.log('🔍 Full publication object:', publication);
      console.log('🔍 Full participant object:', participant);
      
      // When local audio track is published, start transcription (regardless of mute state)
      // The user has enabled their microphone, so we should start listening
      if (publication.kind === 'audio' && participant.isLocal) {
        console.log('🎤 Local audio track published - starting transcription...');
        if (miniTranscriptionRef.current && !miniTranscriptionRef.current.isTranscriptionActive()) {
          console.log('🚀 Calling startTranscription...');
          miniTranscriptionRef.current.startTranscription().then(() => {
            console.log('🔍 Transcription state after start (published):', miniTranscriptionRef.current?.getTranscriptionState());
          }).catch((error) => {
            console.error('❌ Failed to start transcription:', error);
          });
        } else {
          console.log('⚠️ Transcription already active or ref not available');
        }
      }
    };

    const onTrackUnpublished = (publication: any, participant: any) => {
      console.log('� Track unpublished:', {
        kind: publication.kind,
        isLocal: participant.isLocal,
        participantIdentity: participant.identity
      });
      
      // When local audio track is unpublished, stop transcription
      // This means the user has disabled their microphone completely
      if (publication.kind === 'audio' && participant.isLocal) {
        console.log('🎤 Local audio track unpublished - stopping transcription...');
        if (miniTranscriptionRef.current && miniTranscriptionRef.current.isTranscriptionActive()) {
          console.log('🛑 Calling stopTranscription...');
          miniTranscriptionRef.current.stopTranscription();
        } else {
          console.log('⚠️ Transcription already inactive or ref not available');
        }
      }
    };

    const onTrackMuted = (track: any, participant: any) => {
      console.log('🔇 Track muted event:', { 
        trackKind: track.kind, 
        isLocal: participant.isLocal, 
        participantIdentity: participant.identity
      });
      
      if (track.kind === 'audio' && participant.isLocal) {
        // Check if this is intentional muting (user disabled mic) vs automatic silence detection
        // We'll check this after a short delay to see if the mic is still "enabled" in LiveKit
        setTimeout(() => {
          const localParticipant = roomInstance.localParticipant;
          if (localParticipant) {
            // Check if microphone is completely disabled (not just muted due to silence)
            const microphoneEnabled = localParticipant.isMicrophoneEnabled;
            console.log('🔍 Checking microphone state after mute event:', {
              microphoneEnabled,
              audioTrackCount: localParticipant.audioTrackPublications.size
            });
            
            if (!microphoneEnabled) {
              console.log('🎤 Microphone is disabled - stopping transcription');
              if (miniTranscriptionRef.current && miniTranscriptionRef.current.isTranscriptionActive()) {
                console.log('🛑 Calling stopTranscription (mic disabled)...');
                miniTranscriptionRef.current.stopTranscription();
              }
            } else {
              console.log('🎤 Audio track muted but microphone still enabled (likely silence detection)');
            }
          }
        }, 100); // Short delay to let LiveKit update its state
      }
    };

    const onTrackUnmuted = (track: any, participant: any) => {
      console.log('🔊 Track unmuted event:', { 
        trackKind: track.kind, 
        isLocal: participant.isLocal, 
        participantIdentity: participant.identity
      });
      
      if (track.kind === 'audio' && participant.isLocal) {
        // Check if this is the user re-enabling their microphone
        const localParticipant = roomInstance.localParticipant;
        if (localParticipant) {
          const microphoneEnabled = localParticipant.isMicrophoneEnabled;
          console.log('🔍 Checking microphone state after unmute event:', {
            microphoneEnabled,
            audioTrackCount: localParticipant.audioTrackPublications.size
          });
          
          if (microphoneEnabled) {
            console.log('🎤 Microphone re-enabled - starting transcription if not active');
            if (miniTranscriptionRef.current && !miniTranscriptionRef.current.isTranscriptionActive()) {
              console.log('🚀 Calling startTranscription (mic re-enabled)...');
              miniTranscriptionRef.current.startTranscription().then(() => {
                console.log('🔍 Transcription state after start (re-enabled):', miniTranscriptionRef.current?.getTranscriptionState());
              }).catch((error) => {
                console.error('❌ Failed to start transcription (re-enabled):', error);
              });
            } else {
              console.log('⚠️ Transcription already active or ref not available');
            }
          } else {
            console.log('🎤 Track unmuted but microphone not enabled (automatic unmute)');
          }
        }
      }
    };

    // Add event listeners
    console.log('🎯 Adding event listeners...');
    roomInstance.on(RoomEvent.Connected, onConnected);
    roomInstance.on(RoomEvent.TrackPublished, onTrackPublished);
    roomInstance.on(RoomEvent.LocalTrackPublished, onTrackPublished); // Also listen to LocalTrackPublished
    roomInstance.on(RoomEvent.TrackUnpublished, onTrackUnpublished);
    roomInstance.on(RoomEvent.LocalTrackUnpublished, onTrackUnpublished); // Also listen to LocalTrackUnpublished
    roomInstance.on(RoomEvent.TrackMuted, onTrackMuted);
    roomInstance.on(RoomEvent.TrackUnmuted, onTrackUnmuted);
    console.log('✅ Event listeners added successfully');

    return () => {
      // Clean up event listeners
      console.log('🧹 Cleaning up event listeners...');
      roomInstance.off(RoomEvent.Connected, onConnected);
      roomInstance.off(RoomEvent.TrackPublished, onTrackPublished);
      roomInstance.off(RoomEvent.LocalTrackPublished, onTrackPublished);
      roomInstance.off(RoomEvent.TrackUnpublished, onTrackUnpublished);
      roomInstance.off(RoomEvent.LocalTrackUnpublished, onTrackUnpublished);
      roomInstance.off(RoomEvent.TrackMuted, onTrackMuted);
      roomInstance.off(RoomEvent.TrackUnmuted, onTrackUnmuted);
    };
  }, [roomInstance, miniTranscriptionRef]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isConnected && !isConnecting) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, isConnecting]);

  const connectToRoom = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const resp = await fetch(`/api/token?room=${currentRoom}&username=${name}`);
      const data = await resp.json();
      
      if (data.token) {
        setToken(data.token);
        await roomInstance.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com', data.token);
        setIsConnected(true);
        setIsConnecting(false);
        
        // Update current room to the actual room we connected to
        if (roomInstance.name) {
          setCurrentRoom(roomInstance.name);
          console.log('Connected to room:', roomInstance.name);
        }

        // Set up data channel listener for transfer events
        roomInstance.on(RoomEvent.DataReceived, (payload, participant) => {
          try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data.type === 'transfer_initiated') {
              setTransferStatus('in_progress');
              setTransferSummary(data.summary);
            } else if (data.type === 'transfer_completed') {
              setTransferStatus('completed');
            }
          } catch (e) {
            console.error('Failed to parse data message:', e);
          }
        });

        // Wait for real caller to connect
        // No automatic mock data - wait for actual caller
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
    setCallerContext(null);
    setAgentStatus('offline');
    setNextCustomer(null);
  };

  const startTakingCalls = async () => {
    try {
      setAgentStatus('available');

      // Update agent availability in backend
      const response = await fetch('/api/agent/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: name,
          status: 'available'
        }),
      });
      const data = await response.json();
      console.log('Setting availability for agent:', name, 'response:', data);
      if (data.success) {
        // If a customer was connected immediately, handle it
        if (data.message.includes('Connected to customer')) {
          // The backend already connected us, so we should be getting a token
          // For now, we'll wait for the customer to connect
          alert('You are now taking calls! A customer may connect soon.');
        }
        // No alert for 'You are now available to take calls.'
      } else {
        alert('Failed to start taking calls. Please try again.');
        setAgentStatus('offline');
      }
    } catch (error) {
      console.error('Failed to start taking calls:', error);
      alert('Failed to start taking calls. Please try again.');
      setAgentStatus('offline');
    }
  };

  const stopTakingCalls = async () => {
    try {
      setAgentStatus('offline');

      // Update agent availability in backend
      await fetch('/api/agent/availability', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: name,
          status: 'offline'
        }),
      });
    } catch (error) {
      console.error('Failed to stop taking calls:', error);
    }
  };

  const pickNextCustomer = async () => {
    try {
      setIsPickingCustomer(true);

      const response = await fetch('/api/agent/pick-next', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: name
        }),
      });

      const data = await response.json();
      setIsPickingCustomer(false);
      console.log('Pick-next result for', name, ': room', data.room_name, 'token', (data.token || data.access_token) ? (data.token || data.access_token).substring(0, 20) + '...' : 'none', 'customer:', data.customer ? data.customer.email : 'none');

      if (data.success) {
        setNextCustomer(data.customer);
        setAgentStatus('busy');

        // Connect to the room with the customer
        const t = data.token || data.access_token;
        if (data.room_name && t) {
          await roomInstance.connect(
            process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com',
            t
          );
          setIsConnected(true);
          setToken(t);
        }

        alert(`Connected to customer: ${data.customer.email}`);
      } else {
        alert(data.message || 'No customers in queue');
      }
    } catch (error) {
      console.error('Failed to pick next customer:', error);
      alert('Failed to pick next customer. Please try again.');
      setIsPickingCustomer(false);
    }
  };

  const initiateTransfer = async () => {
    try {
      setTransferStatus('initiating');

      // Collect chat history from current session
      let chatSummary = "No chat history available";
      let conversationContext = "Customer called about login issues. I verified their account is active and helped reset their password. They can now log in but can't see their dashboard. They need immediate access to their financial data for a meeting this afternoon. Customer seems frustrated but cooperative.";
      
      if (chatInterfaceRef.current) {
        const chatHistory = chatInterfaceRef.current.getChatHistory();
        
        if (chatHistory.length > 0) {
          console.log('Collected chat history for transfer:', chatHistory);
          
          // Convert chat history to conversation text
          const chatConversationText = chatHistory
            .map(msg => `${msg.sender}: ${msg.content}`)
            .join('\n');
          
          // Send chat history to backend for AI summarization
          try {
            const chatResponse = await fetch('/api/chat/history', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                room_name: currentRoom,
                messages: chatHistory
              }),
            });

            const chatData = await chatResponse.json();
            if (chatData.success && chatData.summary) {
              chatSummary = chatData.summary;
              conversationContext = chatSummary; // Use the LLM-generated summary
              console.log('Generated chat summary from LLM:', chatSummary);
            } else {
              // Fallback to conversation text if LLM summary failed
              conversationContext = chatConversationText;
              console.log('Using raw chat conversation as fallback:', conversationContext);
            }
          } catch (error) {
            console.error('Failed to generate chat summary:', error);
            // Fallback to conversation text
            conversationContext = chatConversationText;
          }
        }
      }

      // Use the chat-based conversation context directly (no second API call needed)
      const finalSummary = conversationContext;

      // Now initiate the actual transfer
      console.log('Initiating transfer API call...');
      const transferResponse = await fetch('/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_room_name: currentRoom,
          agent_a_id: name,
          transfer_target: "agent_b",
          caller_type: "investor",
          email: nextCustomer?.email || "unknown@example.com",
          summary: finalSummary,
          chat_history: chatInterfaceRef.current?.getChatHistory() || []
        }),
      });

      console.log('Transfer API response status:', transferResponse.status);
      
      if (!transferResponse.ok) {
        const errorText = await transferResponse.text();
        console.error('Transfer API failed:', errorText);
        throw new Error(`Transfer API failed with status ${transferResponse.status}: ${errorText}`);
      }

      const transferData = await transferResponse.json();
      console.log('Transfer API response data:', transferData);

      if (transferData.transfer_room_name) {
        setTransferStatus('in_progress');
        setTransferSummary(finalSummary);

        // Simple approach: Agent A and caller stay in current room
        // Agent B will join this room - no room switching needed!
        const transferRoomName = transferData.transfer_room_name;

        console.log(`✅ Transfer initiated! Agent B will join room: ${transferRoomName}`);
        console.log('📋 Summary generated:', finalSummary);
        
        // Show success message - no complex room switching needed
        alert(`🎉 Warm Transfer Initiated!\n\n📋 AI-Generated Summary:\n${finalSummary}\n\n🏠 Room: ${transferRoomName}\n\n� Agent B will join this room shortly.\n\nYou and the caller can continue the conversation while waiting.`);
      } else {
        setTransferStatus('idle');
        console.error('Transfer failed - API returned:', transferData);
        alert(`❌ Transfer Failed!\n\nError: ${transferData.error || 'Room creation failed'}\n\nGenerated Summary (for reference):\n${finalSummary}`);
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      setTransferStatus('idle');
      alert(`❌ Transfer Failed!\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or contact support.`);
    }
  };

  const initiateTwilioTransfer = async () => {
    try {
      // Generate AI summary first
      const summaryResponse = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_context: "Customer called about login issues. I verified their account is active and helped reset their password. They can now log in but can't see their dashboard. They need immediate access to their financial data for a meeting this afternoon. Customer seems frustrated but cooperative.",
          caller_type: "investor",
          caller_info: {
            name: "John Doe",
            email: "john.doe@example.com",
            portfolio: "$50,000 across 3 companies"
          }
        }),
      });

      const summaryData = await summaryResponse.json();
      const summary = summaryData.success ? summaryData.summary : "Customer needs assistance with login and dashboard access issues.";

      // Initiate Twilio call
      const twilioResponse = await fetch('/api/twilio-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_phone: "+917306161621", // Your Twilio target phone
          room_name: "twilio_transfer_room",
          summary: summary
        }),
      });

      const twilioData = await twilioResponse.json();

      if (twilioData.success) {
        alert(`📞 Twilio Transfer Initiated!\n\n📋 AI-Generated Summary:\n${summary}\n\n🔄 Call SID: ${twilioData.call_sid}\n\n📞 Phone call initiated to ${twilioData.target_phone || "+917306161621"}\n\nAgent A should now explain the context to the phone agent.`);
      } else {
        alert(`Twilio transfer failed: ${twilioData.message}\n\nUsing fallback summary:\n${summary}`);
      }
    } catch (error) {
      console.error('Twilio transfer failed:', error);
      alert('Twilio transfer failed. Please try again.');
    }
  };

  const toggleLiveTranscription = async () => {
    try {
      if (isTranscriptionActive) {
        // Stop transcription
        const response = await fetch('/api/transcription/stop', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_name: currentRoom
          }),
        });

        const data = await response.json();
        if (data.success) {
          setIsTranscriptionActive(false);
          alert('Live transcription stopped');
        } else {
          alert(`Failed to stop transcription: ${data.message}`);
        }
      } else {
        // Start transcription
        const response = await fetch('/api/transcription/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_name: currentRoom,
            agent_id: name
          }),
        });

        const data = await response.json();
        if (data.success) {
          setIsTranscriptionActive(true);
          alert('Live transcription started');
        } else {
          alert(`Failed to start transcription: ${data.message}`);
        }
      }
    } catch (error) {
      console.error('Transcription toggle failed:', error);
      alert('Failed to toggle transcription. Please try again.');
    }
  };

  // Callback function to handle auto-transcription messages
  const handleAutoTranscriptionMessage = (message: string) => {
    console.log('📨 Agent received auto-transcription message:', message);
    console.log('📋 Chat interface ref available:', !!chatInterfaceRef.current);
    if (chatInterfaceRef.current) {
      console.log('✅ Adding message to chat interface');
      chatInterfaceRef.current.addAutoMessage(message);
    } else {
      console.error('❌ Chat interface ref not available');
    }
  };

  if (isConnecting) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-white text-black flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-100 rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto mb-4"
          ></motion.div>
          <h2 className="text-xl font-semibold mb-2">Connecting...</h2>
          <p className="text-gray-600">Please wait while we connect you to the support system</p>
        </motion.div>
      </motion.div>
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
              Agent A Dashboard
            </h1>
            <p className="text-gray-600">
              First-line support specialist
            </p>
          </div>

          <div className="max-w-4xl mx-auto flex justify-center">
            <div className="max-w-md w-full">
              <h2 className="text-2xl font-semibold mb-6 text-gray-900 text-center">Ready to Take Calls</h2>
              <div className="space-y-4">
                {agentStatus === 'offline' ? (
                  <button
                    onClick={startTakingCalls}
                    className="w-full bg-red-400 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Start Taking Calls
                  </button>
                ) : agentStatus === 'available' ? (
                  <div className="space-y-4">
                    <div className="bg-green-100 border border-green-400 rounded-lg p-6 text-center">
                      <div className="animate-pulse w-4 h-4 bg-green-500 rounded-full mx-auto mb-2"></div>
                      <p className="text-green-700 font-medium">Available for calls</p>
                      <p className="text-gray-600 text-sm">Waiting for customers...</p>
                    </div>
                    <button
                      onClick={pickNextCustomer}
                      disabled={isPickingCustomer}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      {isPickingCustomer ? 'Connecting...' : 'Pick Next Customer'}
                    </button>
                    <button
                      onClick={stopTakingCalls}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Stop Taking Calls
                    </button>
                  </div>
                ) : (
                  <div className="bg-orange-100 border border-orange-400 rounded-lg p-6 text-center">
                    <div className="animate-pulse w-4 h-4 bg-orange-500 rounded-full mx-auto mb-2"></div>
                    <p className="text-orange-700 font-medium">On a call</p>
                    {nextCustomer && (
                      <p className="text-gray-600 text-sm">Customer: {nextCustomer.email}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Connected state: unified, responsive, modern layout
  return (
    <DeepgramContextProvider>
      <MicrophoneContextProvider>
        <RoomContext.Provider value={roomInstance}>
          <div className="min-h-screen h-screen w-full bg-gray-50 text-gray-900 flex flex-col font-sans antialiased">            <header className="w-full py-4 px-6 border-b border-gray-200 bg-white shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                    Agent A Call in Progress
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
          <section className="flex flex-1 flex-row h-full w-full">
            {/* Video Conference - left side */}
            <div className="flex-1 flex flex-col h-full min-w-0">
              <div className="flex flex-row items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-gray-900">{nextCustomer?.email || 'No customer assigned'}</span>
                  <span className="text-xs text-gray-500">{roomInstance.localParticipant.identity}</span>
                </div>
                
                {/* Transfer Controls */}
                <div className="flex items-center gap-3">
                  {transferStatus !== 'idle' && (
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        transferStatus === 'initiating' ? 'bg-yellow-500 animate-pulse' :
                        transferStatus === 'in_progress' ? 'bg-orange-500 animate-pulse' :
                        'bg-green-500'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {transferStatus === 'initiating' ? 'Preparing Transfer...' :
                         transferStatus === 'in_progress' ? 'Transfer in Progress' :
                         'Transfer Complete'}
                      </span>
                    </div>
                  )}
                  
                  <button
                    onClick={initiateTransfer}
                    disabled={transferStatus !== 'idle' || !nextCustomer}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                    title="Transfer call to Agent B with conversation summary"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {transferStatus === 'idle' ? 'Transfer Call' : 'Transferring...'}
                  </button>
                </div>
              </div>
              {/* Video and controls stacked, controls pinned bottom, responsive */}
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
              </div>
            </div>
            {/* Divider */}
            <div className="w-[1.5px] bg-gradient-to-b from-gray-200/80 via-gray-300/60 to-gray-100/0 mx-0" style={{ minHeight: '100%' }} />
            {/* Chat - right side */}
            <aside className="w-full max-w-[380px] flex flex-col h-full bg-white">
              <div className="flex flex-col h-full px-0 py-0">
                {/* <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-xl font-semibold text-green-700 flex items-center gap-2">
                    <span role="img" aria-label="chat">🔥</span> Live Chat
                  </h2>
                </div> */}
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
        
        {/* Mini Live Transcription Component - Hidden UI but functionality remains */}
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
