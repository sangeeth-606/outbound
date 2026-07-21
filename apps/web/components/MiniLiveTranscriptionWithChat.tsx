"use client";

import { useEffect, useRef, useState } from "react";
import { Room } from "livekit-client";
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
import { Mic, MicOff, MessageSquare, Settings } from "lucide-react";

interface MiniLiveTranscriptionProps {
  room?: Room;
  className?: string;
}

const MiniLiveTranscription = ({ room, className = "" }: MiniLiveTranscriptionProps) => {
  const [caption, setCaption] = useState<string | undefined>("Click to start live transcription");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isAutoSendEnabled, setIsAutoSendEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  const { connection, connectToDeepgram, connectionState, disconnectFromDeepgram } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();
  const captionTimeout = useRef<any>(null);
  const keepAliveInterval = useRef<any>(null);

  const sendToChat = async (text: string) => {
    if (!room || !text.trim() || !isAutoSendEnabled) return;
    
    try {
      const messageText = `🎤 ${text.trim()}`;
      await room.localParticipant.sendText(messageText, { topic: 'chat' });
      console.log("Sent transcription to chat:", messageText);
    } catch (error) {
      console.error("Failed to send transcription to chat:", error);
    }
  };

  const toggleTranscription = async () => {
    if (!isActive) {
      try {
        await setupMicrophone();
        setIsActive(true);
      } catch (error) {
        console.error("Failed to setup microphone:", error);
        setCaption("Microphone access denied");
      }
    } else {
      setIsActive(false);
      stopMicrophone();
      disconnectFromDeepgram();
      setCaption("Click to start live transcription");
    }
  };

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready && isActive) {
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
    if (!microphone) return;
    if (!connection) return;

    const onData = (e: BlobEvent) => {
      if (e.data.size > 0) {
        connection?.send(e.data);
      }
    };

    const onTranscript = (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0]?.transcript;

      if (thisCaption !== "") {
        setCaption(thisCaption);
      }

      if (isFinal && speechFinal && thisCaption && thisCaption.trim()) {
        sendToChat(thisCaption);
        
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption("Listening...");
          clearTimeout(captionTimeout.current);
        }, 2000);
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);

      if (isActive) {
        startMicrophone();
        setCaption("Listening...");
      }
    }

    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, isActive, isAutoSendEnabled, room]);

  useEffect(() => {
    if (!connection) return;

    if (
      microphoneState !== MicrophoneState.Open &&
      connectionState === LiveConnectionState.OPEN
    ) {
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
  }, [microphoneState, connectionState]);

  const isRecording = microphoneState === MicrophoneState.Open && isActive;
  const isConnected = connectionState === LiveConnectionState.OPEN;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className={`bg-surface-card border border-border-dim rounded-md shadow-lg transition-all duration-300 ${
        isMinimized ? 'w-16 h-16' : 'w-80 max-w-sm'
      }`}>
        
        {isMinimized ? (
          <div className="h-full flex items-center justify-center">
            <button
              onClick={() => setIsMinimized(false)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isRecording 
                  ? 'bg-accent-red hover:bg-accent-red/80 text-white' 
                  : 'bg-surface-secondary hover:bg-surface-hover text-text-muted'
              }`}
            >
              {isRecording ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Live Transcription</h3>
              <div className="flex items-center gap-1">
                {room && (
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1 rounded hover:bg-surface-hover transition-colors"
                    title="Settings"
                  >
                    <Settings size={14} className="text-text-muted" />
                  </button>
                )}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-xs bg-surface-secondary hover:bg-surface-hover text-text-muted px-2 py-1 rounded transition-colors"
                >
                  −
                </button>
              </div>
            </div>

            {showSettings && room && (
              <div className="mb-3 p-2 bg-surface-secondary rounded border border-border-dim">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">Auto-send to chat:</span>
                  <button
                    onClick={() => setIsAutoSendEnabled(!isAutoSendEnabled)}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors font-bold ${
                      isAutoSendEnabled 
                        ? 'bg-accent-cyan text-white' 
                        : 'bg-surface-card text-text-muted border border-border-dim'
                    }`}
                  >
                    {isAutoSendEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={toggleTranscription}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  isRecording 
                    ? 'bg-accent-red text-white hover:bg-accent-red/80' 
                    : 'bg-surface-secondary text-text-main border border-border-dim hover:bg-surface-hover'
                }`}
              >
                {isRecording ? <MicOff size={14} /> : <Mic size={14} />}
                <span>{isRecording ? 'Stop' : 'Start'}</span>
              </button>

              {room && (
                <button
                  onClick={() => setIsAutoSendEnabled(!isAutoSendEnabled)}
                  className={`p-1.5 rounded transition-colors ${
                    isAutoSendEnabled 
                      ? 'bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20' 
                      : 'bg-surface-secondary text-text-muted hover:bg-surface-hover'
                  }`}
                  title={isAutoSendEnabled ? "Auto-send to chat: ON" : "Auto-send to chat: OFF"}
                >
                  <MessageSquare size={14} />
                </button>
              )}
            </div>

            <div className="text-[10px] text-text-muted mb-2 space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={isConnected ? 'text-accent-success' : 'text-accent-warning'}>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
              </div>
              {room && (
                <div className="flex justify-between">
                  <span>Chat Auto-send:</span>
                  <span className={isAutoSendEnabled ? 'text-accent-success' : 'text-text-muted'}>
                    {isAutoSendEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-surface-primary rounded p-3 min-h-[80px] max-h-[120px] overflow-y-auto border border-border-dim">
              <div className="text-xs">
                {caption ? (
                  <span className={isRecording ? 'text-accent-success' : 'text-text-main'}>
                    {caption}
                  </span>
                ) : (
                  <span className="text-text-muted italic">
                    {isConnected ? "Ready to transcribe..." : "Connecting..."}
                  </span>
                )}
              </div>
            </div>

            {room && isAutoSendEnabled && (
              <div className="mt-2 text-[10px] text-text-muted text-center">
                Speech will be sent to chat automatically
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniLiveTranscription;
