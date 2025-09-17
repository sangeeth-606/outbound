'use client';

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { Room, TextStreamReader } from 'livekit-client';

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  senderIdentity: string;
  timestamp: Date;
  isLocal: boolean;
  type?: 'message' | 'summary' | 'system';
}

export interface LiveKitChatInterfaceRef {
  addAutoMessage: (message: string) => void;
  addSummaryMessage: (summary: string, title?: string) => void;
  getChatHistory: () => ChatMessage[];
}

interface LiveKitChatInterfaceProps {
  room: Room;
  localUserType: 'caller' | 'agent';
  className?: string;
  onAutoMessage?: (message: string) => void;
}

const LiveKitChatInterface = forwardRef<LiveKitChatInterfaceRef, LiveKitChatInterfaceProps>(({ 
  room, 
  localUserType,
  className = '',
  onAutoMessage 
}, ref) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    addAutoMessage: (messageText: string) => {
      const autoMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        content: messageText,
        sender: 'You',
        senderIdentity: room.localParticipant.identity,
        timestamp: new Date(),
        isLocal: true,
        type: 'message'
      };
      
      setMessages(prev => {
        // Check if this message already exists to avoid duplicates
        const messageExists = prev.some(msg => 
          msg.content === autoMessage.content && 
          msg.senderIdentity === autoMessage.senderIdentity &&
          Math.abs(msg.timestamp.getTime() - autoMessage.timestamp.getTime()) < 2000 // 2 second window
        );
        
        if (messageExists) {
          console.log('Duplicate auto message detected, skipping:', autoMessage.content);
          return prev;
        }
        
        console.log('Adding auto-transcription message to chat display:', autoMessage);
        return [...prev, autoMessage];
      });
    },
    addSummaryMessage: (summary: string, title: string = 'Call Summary') => {
      const summaryMessage: ChatMessage = {
        id: `summary-${Date.now()}-${Math.random()}`,
        content: summary,
        sender: title,
        senderIdentity: 'system',
        timestamp: new Date(),
        isLocal: false,
        type: 'summary'
      };
      
      console.log('Adding summary message to chat display:', summaryMessage);
      setMessages(prev => [summaryMessage, ...prev]); // Add at the beginning
    },
    getChatHistory: () => {
      return messages.filter(msg => msg.type === 'message'); // Only return regular messages
    }
  }), [room, messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check room connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(room.state === 'connected');
    };

    checkConnection();
    
    // Listen for connection state changes
    room.on('connectionStateChanged', checkConnection);
    
    return () => {
      room.off('connectionStateChanged', checkConnection);
    };
  }, [room]);

  // Set up text stream handler for receiving messages
  useEffect(() => {
    if (!room) return;

    const handleTextStream = async (
      reader: TextStreamReader,
      participantInfo: { identity: string }
    ) => {
      try {
        const text = await reader.readAll();
        
        if (text.trim()) {
          const isLocalMessage = participantInfo.identity === room.localParticipant.identity;
          
          console.log('Received text stream:', {
            text: text.trim(),
            senderIdentity: participantInfo.identity,
            localIdentity: room.localParticipant.identity,
            isLocal: isLocalMessage
          });
          
          const newMessage: ChatMessage = {
            id: `${Date.now()}-${Math.random()}`,
            content: text.trim(),
            sender: isLocalMessage ? 'You' : participantInfo.identity || 'Unknown',
            senderIdentity: participantInfo.identity || 'Unknown',
            timestamp: new Date(),
            isLocal: isLocalMessage,
            type: 'message'
          };

          setMessages(prev => {
            // Check if this message already exists to avoid duplicates
            const messageExists = prev.some(msg => 
              msg.content === newMessage.content && 
              msg.senderIdentity === newMessage.senderIdentity &&
              Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) < 3000
            );
            
            if (messageExists) {
              console.log('Duplicate message detected, skipping:', newMessage.content);
              return prev;
            }
            
            // If it's a local message, don't add it again through text stream
            // (it should have been added immediately when sent)
            if (isLocalMessage) {
              console.log('Local message received through text stream, checking if already displayed');
              const localMessageExists = prev.some(msg => 
                msg.content === newMessage.content && 
                msg.isLocal === true &&
                Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) < 5000
              );
              
              if (localMessageExists) {
                console.log('Local message already displayed, skipping duplicate from text stream');
                return prev;
              }
            }
            
            console.log('Adding new message to chat:', newMessage);
            return [...prev, newMessage];
          });
        }
      } catch (error) {
        console.error('Error reading text stream:', error);
      }
    };

    // Register handler for 'chat' topic
    room.registerTextStreamHandler('chat', handleTextStream);

    return () => {
      // Clean up handler
      try {
        room.unregisterTextStreamHandler('chat');
      } catch (error) {
        console.error('Error unregistering text stream handler:', error);
      }
    };
  }, [room]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !isConnected) return;

    const messageText = inputMessage.trim();
    
    try {
      console.log('Sending manual message:', messageText);
      
      // Immediately add the message to local state so sender can see it
      const localMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        content: messageText,
        sender: 'You',
        senderIdentity: room.localParticipant.identity,
        timestamp: new Date(),
        isLocal: true,
        type: 'message'
      };
      
      setMessages(prev => [...prev, localMessage]);
      console.log('Added local message to chat display:', localMessage);
      
      // Send message via LiveKit text stream
      await room.localParticipant.sendText(messageText, { topic: 'chat' });
      setInputMessage('');
      console.log('Manual message sent successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getSenderDisplayName = (message: ChatMessage) => {
    if (message.isLocal) return 'You';
    
    // Determine sender type based on identity
    if (message.senderIdentity.includes('agent')) {
      return `Agent ${message.senderIdentity.replace('agent_', '').toUpperCase()}`;
    }
    if (message.senderIdentity === 'customer' || message.senderIdentity.includes('caller')) {
      return 'Customer';
    }
    
    return message.sender;
  };

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200 font-sans antialiased ${className}`}>
      {/* Chat Header */}
      <div className="bg-red-400 text-white p-3 rounded-t-lg flex items-center space-x-2">
        <MessageSquare className="w-5 h-5" />
        <div>
          <h3 className="text-sm font-bold tracking-tight">Live Chat</h3>
          <p className="text-xs text-red-100 font-medium">
            {isConnected ? 'Connected' : 'Disconnected'} • {localUserType === 'caller' ? 'Customer' : 'Agent'} View
          </p>
        </div>
        <div className="ml-auto">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-200'}`}></div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-4 font-medium">
            {isConnected 
              ? 'Chat is ready. Send a message to start the conversation!'
              : (
                <div className="space-y-2">
                  <p className="font-semibold">💬 Live Chat Interface</p>
                  <p className="text-xs text-gray-500">This will be active when connected to a call</p>
                  <p className="text-xs text-gray-500">You can type messages and they'll be sent in real-time</p>
                </div>
              )
            }
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'summary' ? 'justify-center' : message.isLocal ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'summary' ? (
              // Summary message styling
              <div className="w-full max-w-full mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                      {message.sender}
                    </span>
                    <span className="text-xs text-blue-500 font-medium">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            ) : (
              // Regular message styling
              <div
                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm font-medium ${
                  message.isLocal
                    ? 'bg-red-400 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-xs font-semibold tracking-wide ${
                    message.isLocal ? 'text-red-100' : 'text-gray-600'
                  }`}>
                    {getSenderDisplayName(message)}
                  </span>
                  <span className={`text-xs font-medium ${
                    message.isLocal ? 'text-red-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="break-words">{message.content}</p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t bg-gray-50 rounded-b-lg">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Waiting for connection..."}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent font-medium text-gray-900 placeholder:text-gray-500"
            disabled={!isConnected}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!isConnected || !inputMessage.trim()}
            className="px-3 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        {!isConnected && (
          <p className="text-xs text-gray-500 mt-1 text-center font-medium">
            Chat will be available once connected to the call
          </p>
        )}
      </div>
    </div>
  );
});

LiveKitChatInterface.displayName = 'LiveKitChatInterface';

export default LiveKitChatInterface;
