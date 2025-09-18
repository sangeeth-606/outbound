"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
  LiveConnectionState,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  useDeepgram,
} from "../app/context/DeepgramContextProvider";
import {
  MicrophoneEvents,
  MicrophoneState,
  useMicrophone,
} from "../app/context/MicrophoneContextProvider";
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, Send } from "lucide-react";
import { Room } from "livekit-client";

interface MiniLiveTranscriptionProps {
  className?: string;
  room?: Room;
  autoSendWordCount?: number; // Number of words to trigger auto-send
  onMessageSent?: (message: string) => void; // Callback for when a message is sent
  isHidden?: boolean; // Hide the UI but keep functionality
  externalMicControl?: boolean; // Control microphone externally
}

export interface MiniLiveTranscriptionRef {
  startTranscription: () => Promise<void>;
  stopTranscription: () => void;
  isTranscriptionActive: () => boolean;
  getTranscriptionState: () => { isActive: boolean; connectionState: string; caption: string };
}

const MiniLiveTranscription = forwardRef<MiniLiveTranscriptionRef, MiniLiveTranscriptionProps>(({ 
  className = "", 
  room,
  autoSendWordCount = 7,
  onMessageSent,
  isHidden = false,
  externalMicControl = false
}, ref) => {
  const [caption, setCaption] = useState<string | undefined>("Click to start live transcription");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isAutoSendEnabled, setIsAutoSendEnabled] = useState(true);
  const [accumulatedText, setAccumulatedText] = useState("");
  const [messagesSent, setMessagesSent] = useState(0);
  
  const { connection, connectToDeepgram, connectionState, disconnectFromDeepgram } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();
  const captionTimeout = useRef<any>(null);
  const keepAliveInterval = useRef<any>(null);

  // Function to count words in a string
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Function to send message to LiveKit chat
  const sendToChat = async (text: string) => {
    console.log('🚀 sendToChat called with:', { text, hasRoom: !!room, roomConnected: room?.state });
    
    if (!room) {
      console.error('❌ No room available for sending message');
      return;
    }
    
    if (!text.trim()) {
      console.error('❌ Empty text, not sending');
      return;
    }
    
    try {
      console.log('📤 MiniLiveTranscription sending to chat:', {
        text: text.trim(),
        localParticipantIdentity: room.localParticipant?.identity,
        roomState: room.state,
        localParticipant: !!room.localParticipant
      });
      
      if (!room.localParticipant) {
        console.error('❌ No local participant available');
        return;
      }
      
      await room.localParticipant.sendText(text.trim(), { topic: 'chat' });
      setMessagesSent(prev => prev + 1);
      console.log("✅ Auto-transcription message sent successfully:", text.trim());
      
      // Notify parent component that a message was sent
      if (onMessageSent) {
        console.log('📞 Calling onMessageSent callback');
        onMessageSent(text.trim());
      } else {
        console.log('⚠️ No onMessageSent callback provided');
      }
    } catch (error) {
      console.error("❌ Failed to send auto-transcription message to chat:", error);
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    startTranscription: async () => {
      console.log('🎤 startTranscription called, isActive:', isActive);
      if (!isActive) {
        try {
          console.log('🔧 Setting up microphone...');
          await setupMicrophone();
          setIsActive(true);
          setAccumulatedText("");
          setMessagesSent(0);
          setCaption("Starting transcription...");
          console.log('✅ Transcription started successfully');
        } catch (error) {
          console.error("❌ Failed to setup microphone:", error);
          setCaption("Microphone access denied");
          throw error;
        }
      } else {
        console.log('⚠️ Transcription already active');
      }
    },
    stopTranscription: () => {
      console.log('🛑 stopTranscription called, isActive:', isActive);
      if (isActive) {
        setIsActive(false);
        stopMicrophone();
        disconnectFromDeepgram();
        setCaption("Click to start live transcription");
        setAccumulatedText("");
        console.log('✅ Transcription stopped successfully');
      } else {
        console.log('⚠️ Transcription already inactive');
      }
    },
    isTranscriptionActive: () => {
      console.log('❓ isTranscriptionActive called, returning:', isActive);
      return isActive;
    },
    getTranscriptionState: () => {
      return {
        isActive,
        connectionState: connectionState?.toString() || 'unknown',
        caption: caption || 'no caption'
      };
    }
  }));

  const toggleTranscription = async () => {
    if (!isActive) {
      try {
        await setupMicrophone();
        setIsActive(true);
        setAccumulatedText("");
        setMessagesSent(0);
      } catch (error) {
        console.error("Failed to setup microphone:", error);
        setCaption("Microphone access denied");
      }
    } else {
      setIsActive(false);
      stopMicrophone();
      disconnectFromDeepgram();
      setCaption("Click to start live transcription");
      setAccumulatedText("");
    }
  };

  useEffect(() => {
    console.log('🔄 Microphone state effect triggered:', { microphoneState, isActive });
    if (microphoneState === MicrophoneState.Ready && isActive) {
      console.log('🔌 Connecting to Deepgram...');
      connectToDeepgram({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState, isActive]);

  useEffect(() => {
    if (!microphone || !connection || !isActive) return;

    const onData = (e: BlobEvent) => {
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0]?.transcript;

      console.log('🎯 Transcript received:', { thisCaption, isFinal, speechFinal });

      if (thisCaption !== "") {
        setCaption(thisCaption);
        
        // Accumulate text for auto-sending
        if (isFinal) {
          console.log('📝 Final transcript, updating accumulated text...');
          setAccumulatedText(prev => {
            const newText = prev + " " + thisCaption;
            const wordCount = countWords(newText);
            
            console.log('📊 Text accumulation:', {
              previousText: prev,
              newCaption: thisCaption,
              combinedText: newText,
              wordCount,
              threshold: autoSendWordCount,
              isAutoSendEnabled,
              hasRoom: !!room
            });
            
            // Auto-send when reaching word count threshold
            if (isAutoSendEnabled && room && wordCount >= autoSendWordCount) {
              console.log('🚀 Word threshold reached, sending to chat...');
              sendToChat(newText.trim());
              return ""; // Reset accumulated text after sending
            }
            
            return newText.trim();
          });
        }
      }

      if (isFinal && speechFinal) {
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption("Listening...");
          clearTimeout(captionTimeout.current);
        }, 2000);
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      console.log('🔗 Deepgram connection is open, setting up listeners and starting microphone...');
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
      startMicrophone();
      setCaption("Listening...");
    } else {
      console.log('⏳ Deepgram connection not open yet, state:', connectionState);
    }

    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, isActive, isAutoSendEnabled, autoSendWordCount]);

  useEffect(() => {
    if (!connection || !isActive) return;

    if (microphoneState !== MicrophoneState.Open && connectionState === LiveConnectionState.OPEN) {
      connection.keepAlive();
      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      clearInterval(keepAliveInterval.current);
    }

    return () => {
      clearInterval(keepAliveInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState, connectionState, isActive]);

  // Conditionally render the UI - hide if isHidden is true but keep functionality
  if (isHidden) {
    return null; // Component is hidden but all hooks and functionality remain active
  }

  if (isMinimized) {
    return (
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        >
          {isActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isActive && connectionState === LiveConnectionState.OPEN ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-gray-700">Live Transcription</span>
            {room && (
              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                Auto-chat
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {room && (
              <button
                onClick={() => setIsAutoSendEnabled(!isAutoSendEnabled)}
                className={`p-1.5 rounded transition-colors ${
                  isAutoSendEnabled 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={`Auto-send ${isAutoSendEnabled ? 'enabled' : 'disabled'}`}
              >
                <MessageSquare size={16} />
              </button>
            )}
            <button
              onClick={toggleTranscription}
              disabled={externalMicControl}
              className={`p-1.5 rounded ${isActive ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'} transition-colors ${
                externalMicControl ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={externalMicControl ? 'Controlled by LiveKit microphone' : (isActive ? 'Stop transcription' : 'Start transcription')}
            >
              {isActive ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <VolumeX size={16} />
            </button>
          </div>
        </div>

        {/* Transcript Display */}
        <div className="bg-gray-50 rounded p-3 min-h-[60px]">
          <p className="text-sm text-gray-700 leading-relaxed">
            {isActive 
              ? (caption || "Listening...") 
              : "Click to start live transcription"
            }
          </p>
          {accumulatedText && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Pending ({countWords(accumulatedText)}/{autoSendWordCount} words): 
              </p>
              <p className="text-xs text-gray-600 italic">"{accumulatedText}"</p>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
          <span>
            {isActive ? (
              connectionState === LiveConnectionState.OPEN ? "Connected & Listening" : "Connecting..."
            ) : (
              externalMicControl ? "Use LiveKit microphone button" : "Click microphone to start"
            )}
          </span>
          {room && messagesSent > 0 && (
            <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded">
              {messagesSent} sent
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// Set display name for debugging
MiniLiveTranscription.displayName = 'MiniLiveTranscription';

export default MiniLiveTranscription;
