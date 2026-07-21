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

  useImperativeHandle(ref, () => ({
    addAutoMessage: (messageText: string) => {
      console.log('🏪 LiveKitChatInterface.addAutoMessage called with:', messageText);
      console.log('🏪 Room state:', { hasRoom: !!room, roomState: room?.state, localParticipant: room?.localParticipant?.identity });
      
      const autoMessage: ChatMessage = {
        id: `${Date.now()}-${Math.random()}`,
        content: messageText,
        sender: 'You',
        senderIdentity: room.localParticipant.identity,
        timestamp: new Date(),
        isLocal: true,
        type: 'message'
      };
      
      console.log('🏪 Created auto message:', autoMessage);
      
      setMessages(prev => {
        console.log('🏪 Current messages count:', prev.length);
        
        const messageExists = prev.some(msg => 
          msg.content === autoMessage.content && 
          msg.senderIdentity === autoMessage.senderIdentity &&
          Math.abs(msg.timestamp.getTime() - autoMessage.timestamp.getTime()) < 2000
        );
        
        if (messageExists) {
          console.log('🏪 Duplicate auto message detected, skipping:', autoMessage.content);
          return prev;
        }
        
        console.log('🏪 Adding auto-transcription message to chat display:', autoMessage);
        const newMessages = [...prev, autoMessage];
        console.log('🏪 New messages count:', newMessages.length);
        return newMessages;
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
      setMessages(prev => [summaryMessage, ...prev]);
    },
    getChatHistory: () => {
      return messages.filter(msg => msg.type === 'message');
    }
  }), [room, messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(room.state === 'connected');
    };

    checkConnection();
    
    room.on('connectionStateChanged', checkConnection);
    
    return () => {
      room.off('connectionStateChanged', checkConnection);
    };
  }, [room]);

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
            const messageExists = prev.some(msg => 
              msg.content === newMessage.content && 
              msg.senderIdentity === newMessage.senderIdentity &&
              Math.abs(msg.timestamp.getTime() - newMessage.timestamp.getTime()) < 3000
            );
            
            if (messageExists) {
              console.log('Duplicate message detected, skipping:', newMessage.content);
              return prev;
            }
            
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

    room.registerTextStreamHandler('chat', handleTextStream);

    return () => {
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
    
    if (message.senderIdentity.includes('agent')) {
      return `Agent ${message.senderIdentity.replace('agent_', '').toUpperCase()}`;
    }
    if (message.senderIdentity === 'customer' || message.senderIdentity.includes('caller')) {
      return 'Customer';
    }
    
    return message.sender;
  };

  return (
    <div className={`flex flex-col h-full bg-surface-card rounded-md border border-border-dim ${className}`}>
      <div className="bg-surface-secondary text-text-main px-3 py-2.5 rounded-t-md flex items-center gap-2 border-b border-border-dim">
        <MessageSquare className="w-4 h-4 text-accent-red" />
        <div>
          <h3 className="text-xs font-bold tracking-wide uppercase">Live Chat</h3>
          <p className="text-[10px] text-text-muted">
            {isConnected ? 'Connected' : 'Disconnected'} • {localUserType === 'caller' ? 'Customer' : 'Agent'} View
          </p>
        </div>
        <div className="ml-auto">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-accent-success' : 'bg-accent-red'}`}></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-text-muted text-xs py-4">
            {isConnected 
              ? 'Chat is ready. Send a message to start the conversation!'
              : (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-text-label uppercase tracking-wider">Chat Interface</p>
                  <p className="text-[10px] text-text-muted">This will be active when connected to a call</p>
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
              <div className="w-full max-w-full mb-4">
                <div className="bg-accent-cyan/10 border border-accent-cyan/20 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan"></div>
                    <span className="text-xs font-bold text-accent-cyan uppercase tracking-wide">
                      {message.sender}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-text-main leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`max-w-[80%] px-3 py-2 rounded-md text-xs ${
                  message.isLocal
                    ? 'bg-accent-red text-white'
                    : 'bg-surface-secondary text-text-main border border-border-dim'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold tracking-wide ${
                    message.isLocal ? 'text-white/70' : 'text-text-label'
                  }`}>
                    {getSenderDisplayName(message)}
                  </span>
                  <span className={`text-[10px] ${
                    message.isLocal ? 'text-white/50' : 'text-text-muted'
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

      <div className="p-3 border-t border-border-dim bg-surface-secondary rounded-b-md">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "Type a message..." : "Waiting for connection..."}
            className="input flex-1 text-xs"
            disabled={!isConnected}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!isConnected || !inputMessage.trim()}
            className="btn btn-accent px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
        {!isConnected && (
          <p className="text-[10px] text-text-muted mt-1 text-center">
            Chat will be available once connected to the call
          </p>
        )}
      </div>
    </div>
  );
});

LiveKitChatInterface.displayName = 'LiveKitChatInterface';

export default LiveKitChatInterface;
