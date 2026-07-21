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
  autoSendWordCount?: number;
  onMessageSent?: (message: string) => void;
  isHidden?: boolean;
  externalMicControl?: boolean;
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

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

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
            
            if (isAutoSendEnabled && room && wordCount >= autoSendWordCount) {
              console.log('🚀 Word threshold reached, sending to chat...');
              sendToChat(newText.trim());
              return "";
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

  if (isHidden) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-surface-card text-text-main p-3 rounded-md shadow-lg border border-border-dim hover:bg-surface-hover transition-colors"
        >
          {isActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className="card p-4 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isActive && connectionState === LiveConnectionState.OPEN ? 'bg-accent-success' : 'bg-text-muted'}`}></div>
            <span className="text-xs font-bold text-text-main uppercase tracking-wider">Live Transcription</span>
            {room && (
              <span className="text-[10px] bg-accent-cyan/10 text-accent-cyan px-1.5 py-0.5 rounded border border-accent-cyan/20">
                Auto-chat
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {room && (
              <button
                onClick={() => setIsAutoSendEnabled(!isAutoSendEnabled)}
                className={`p-1 rounded transition-colors ${
                  isAutoSendEnabled 
                    ? 'bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20' 
                    : 'bg-surface-secondary text-text-muted hover:bg-surface-hover'
                }`}
                title={`Auto-send ${isAutoSendEnabled ? 'enabled' : 'disabled'}`}
              >
                <MessageSquare size={14} />
              </button>
            )}
            <button
              onClick={toggleTranscription}
              disabled={externalMicControl}
              className={`p-1 rounded ${
                isActive 
                  ? 'bg-accent-red/10 text-accent-red hover:bg-accent-red/20' 
                  : 'bg-accent-success/10 text-accent-success hover:bg-accent-success/20'
              } transition-colors ${
                externalMicControl ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={externalMicControl ? 'Controlled by LiveKit microphone' : (isActive ? 'Stop transcription' : 'Start transcription')}
            >
              {isActive ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded bg-surface-secondary text-text-muted hover:bg-surface-hover transition-colors"
            >
              <VolumeX size={14} />
            </button>
          </div>
        </div>

        <div className="bg-surface-secondary rounded p-3 min-h-[60px]">
          <p className="text-xs text-text-main leading-relaxed">
            {isActive 
              ? (caption || "Listening...") 
              : "Click to start live transcription"
            }
          </p>
          {accumulatedText && (
            <div className="mt-2 pt-2 border-t border-border-dim">
              <p className="text-[10px] text-text-muted">
                Pending ({countWords(accumulatedText)}/{autoSendWordCount} words): 
              </p>
              <p className="text-[10px] text-text-muted italic">"{accumulatedText}"</p>
            </div>
          )}
        </div>

        <div className="mt-2 flex justify-between items-center text-[10px] text-text-muted">
          <span>
            {isActive ? (
              connectionState === LiveConnectionState.OPEN ? "Connected & Listening" : "Connecting..."
            ) : (
              externalMicControl ? "Use LiveKit microphone button" : "Click microphone to start"
            )}
          </span>
          {room && messagesSent > 0 && (
            <span className="bg-accent-success/10 text-accent-success px-1.5 py-0.5 rounded border border-accent-success/20">
              {messagesSent} sent
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

MiniLiveTranscription.displayName = 'MiniLiveTranscription';

export default MiniLiveTranscription;
