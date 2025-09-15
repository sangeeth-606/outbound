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
import { Phone, MessageSquare, Users, PhoneOff, User, CheckCircle, AlertTriangle, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatInterface from '../../components/ChatInterface';
import TranscriptionDisplay from '../../components/TranscriptionDisplay';
import TransferHistory from '../../components/TransferHistory';

export default function AgentAPage() {
  const room = 'support_room';
  const name = 'agent_a';
  const [roomInstance] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));
  const [token, setToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
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

  useEffect(() => {
    return () => {
      roomInstance.disconnect();
    };
  }, [roomInstance]);

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
        } else {
          alert('You are now available to take calls.');
        }
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

      // Generate AI summary using Groq LLM
      const response = await fetch('/api/generate-summary', {
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

      const data = await response.json();

      if (data.success) {
        // Now initiate the actual transfer
        const transferResponse = await fetch('/api/transfer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            original_room_name: room,
            agent_a_id: name,
            transfer_target: "agent_b",
            caller_type: "investor",
            email: "john.doe@example.com",
            summary: data.summary
          }),
        });

        const transferData = await transferResponse.json();

        if (transferData.success && transferData.transfer_room_name) {
          setTransferStatus('in_progress');
          setTransferSummary(data.summary);

          // Switch Agent A to the transfer room
          const transferRoomName = transferData.transfer_room_name;
          const agentAToken = transferData.agent_a_token;

          // Disconnect from original room
          await roomInstance.disconnect();

          // Connect to transfer room
          await roomInstance.connect(
            process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com',
            agentAToken
          );

          // Update room name and token
          setToken(agentAToken);

          // Send room switch message to customer in original room before disconnecting
          const customerSwitchMessage = {
            type: 'switch_to_transfer_room',
            transfer_room_name: transferRoomName,
            caller_token: transferData.caller_token,
            summary: data.summary,
            agent_a_id: name,
            timestamp: new Date().toISOString()
          };

          try {
            await roomInstance.localParticipant.publishData(
              new TextEncoder().encode(JSON.stringify(customerSwitchMessage)),
              { reliable: true }
            );
          } catch (e) {
            console.error('Failed to send room switch message to customer:', e);
          }

          // Send data message in transfer room to notify Agent B
          const agentBMessage = {
            type: 'transfer_initiated',
            summary: data.summary,
            target_agent: 'agent_b',
            transfer_room: transferRoomName,
            timestamp: new Date().toISOString()
          };

          // Wait a moment for connection to establish
          setTimeout(async () => {
            try {
              await roomInstance.localParticipant.publishData(
                new TextEncoder().encode(JSON.stringify(agentBMessage)),
                { reliable: true }
              );
            } catch (e) {
              console.error('Failed to send transfer message:', e);
            }
          }, 1000);

          alert(`🎉 Warm Transfer Initiated!\n\n📋 AI-Generated Summary:\n${data.summary}\n\n🏠 Switched to Transfer Room: ${transferRoomName}\n\n📞 Agent B can now join this transfer room.`);
        } else {
          setTransferStatus('idle');
          alert(`Transfer initiated with summary:\n\n${data.summary}\n\nNote: Transfer room creation failed, but summary was generated successfully.`);
        }
      } else {
        setTransferStatus('idle');
        alert(`Transfer initiated!\n\nNote: AI summary generation failed, using fallback summary.\n\nCall Summary: Customer called about login issues. I verified their account is active and helped reset their password. They can now log in but can't see their dashboard. They need immediate access to their financial data for a meeting this afternoon. Customer seems frustrated but cooperative.`);
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      setTransferStatus('idle');
      alert('Transfer failed. Please try again.');
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
            room_name: room
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
            room_name: room,
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
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
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
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-black mr-3" />
              <h1 className="text-3xl font-bold">Agent A Dashboard</h1>
            </div>
            <p className="text-gray-600">First-line support specialist ready to take calls</p>
          </div>

          <div className="text-center">
            <div className="bg-gray-100 rounded-lg shadow-md p-8 max-w-md mx-auto border border-gray-200">
              <Phone className="w-16 h-16 text-black mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-4">Ready to Take Calls</h2>
              <p className="text-gray-600 mb-6">
                Click the button below to start taking customer calls and providing support.
              </p>
              <div className="space-y-3">
                <div className="space-y-3">
                  {agentStatus === 'offline' ? (
                    <button
                      onClick={startTakingCalls}
                      className="w-full bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                    >
                      Start Taking Calls
                    </button>
                  ) : agentStatus === 'available' ? (
                    <div className="space-y-3">
                      <div className="bg-green-100 border border-green-400 rounded-lg p-4 text-center">
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
                    <div className="bg-orange-100 border border-orange-400 rounded-lg p-4 text-center">
                      <div className="animate-pulse w-4 h-4 bg-orange-500 rounded-full mx-auto mb-2"></div>
                      <p className="text-orange-700 font-medium">On a call</p>
                      {nextCustomer && (
                        <p className="text-gray-600 text-sm">Customer: {nextCustomer.email}</p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowChat(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Start AI Chat Demo</span>
                </button>
              </div>
            </div>

            {/* Live Transcription */} 
            <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
              <TranscriptionDisplay
                roomName={room}
                isActive={isConnected}
                onToggleRecording={(recording) => setIsRecording(recording)}
              />
            </div>
          </div>

          {/* Transfer History */} 
          <div className="mt-8">
            <TransferHistory agentId={name} />
          </div>
        </div>
      </div>
    );
  }

  if (showChat) {
    return (
      <div className="min-h-screen bg-white text-black">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      <li>• Customer context integration</li>
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-white text-black"
      >
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center mb-4">
              <motion.div
                animate={{
                  scale: isConnected ? [1, 1.1, 1] : 1,
                  color: isConnected ? '#000' : '#9CA3AF'
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <User className="w-8 h-8 mr-3" />
              </motion.div>
              <h1 className="text-3xl font-bold">Agent A Dashboard</h1>
            </div>
            <p className="text-gray-600">First-line support specialist - taking customer calls</p>
          </motion.div>

          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video Conference */} 
              <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Customer Call</h2>
                <div data-lk-theme="default" style={{ height: '400px' }}>
                  <MyVideoConference />
                  <RoomAudioRenderer />
                  <ControlBar />
                </div>
              </div>

              {/* Caller Context */} 
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200"
              >
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-black" />
                  Caller Information
                </h2>

                <div className="space-y-4">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                    className="bg-blue-100 border border-blue-400 rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-black mb-2 flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      Call Status
                    </h3>
                    <div className="text-gray-600 text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Room:</span>
                        <span className="font-medium">support_room</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Connected:</span>
                        <div className="flex items-center space-x-2">
                          <motion.div
                            animate={{
                              scale: isConnected ? [1, 1.2, 1] : 1,
                              backgroundColor: isConnected ? '#10B981' : '#EF4444'
                            }}
                            transition={{ duration: 2, repeat: isConnected ? Infinity : 0 }}
                            className="w-2 h-2 rounded-full"
                          ></motion.div>
                          <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                            {isConnected ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Duration:</span>
                        <span className="font-medium text-green-600 font-mono">
                          {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Transfer Status:</span>
                        <div className="flex items-center space-x-2">
                          {transferStatus === 'idle' && <span className="text-gray-400">None</span>}
                          {transferStatus === 'initiating' && (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="flex items-center space-x-1"
                            >
                              <Clock className="w-4 h-4 text-yellow-600" />
                              <span className="text-yellow-600 font-medium">Initiating</span>
                            </motion.div>
                          )}
                          {transferStatus === 'in_progress' && (
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="flex items-center space-x-1"
                            >
                              <Zap className="w-4 h-4 text-orange-600" />
                              <span className="text-orange-600 font-medium">In Progress</span>
                            </motion.div>
                          )}
                          {transferStatus === 'completed' && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-600 font-medium">Completed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {transferSummary && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-gray-200 border border-gray-300 rounded-lg p-3 overflow-hidden"
                      >
                        <p className="text-xs text-gray-500 mb-1">Transfer Summary:</p>
                        <p className="text-xs text-black leading-relaxed">{transferSummary}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="bg-green-100 border border-green-400 rounded-lg p-4">
                    <h3 className="font-semibold text-black mb-2">Support Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={toggleLiveTranscription}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${ 
                          isTranscriptionActive
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isTranscriptionActive ? 'Stop Live Transcript' : 'Start Live Transcript'}
                      </button>
                      <button
                        onClick={initiateTransfer}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Initiate Warm Transfer (Agent B)
                      </button>
                      <button
                        onClick={initiateTwilioTransfer}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Initiate Twilio Transfer (Phone)
                      </button>
                      <button
                        onClick={() => setShowChat(true)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Use AI Assistant
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Transcription */} 
                <div className="bg-gray-100 rounded-lg shadow-md p-6 border border-gray-200">
                  <TranscriptionDisplay
                    roomName={room}
                    isActive={isConnected}
                    onToggleRecording={(recording) => setIsRecording(recording)}
                  />
                </div>
              </motion.div>
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
      </motion.div>
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
