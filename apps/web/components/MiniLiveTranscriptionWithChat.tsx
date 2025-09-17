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

  // Function to send transcribed text to LiveKit chat
  const sendToChat = async (text: string) => {
    if (!room || !text.trim() || !isAutoSendEnabled) return;
    
    try {
      // Add a prefix to indicate this is from voice transcription
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

      // Send to chat when speech is final and complete
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
      <div className={`bg-gradient-to-br from-gray-900 to-gray-800 backdrop-blur-sm rounded-lg shadow-lg border border-gray-700 transition-all duration-300 ${
        isMinimized ? 'w-16 h-16' : 'w-80 max-w-sm'
      }`}>
        
        {/* Minimized View */}
        {isMinimized ? (
          <div className="h-full flex items-center justify-center">
            <button
              onClick={() => setIsMinimized(false)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }`}
            >
              {isRecording ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
          </div>
        ) : (
          /* Expanded View */
          <div className="p-4 text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-200">Live Transcription</h3>
              <div className="flex items-center space-x-1">
                {room && (
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1 rounded hover:bg-gray-700 transition-colors"
                    title="Settings"
                  >
                    <Settings size={14} />
                  </button>
                )}
                <button
                  onClick={() => setIsMinimized(true)}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                >
                  −
                </button>
              </div>
            </div>

            {/* Settings Panel */}
            {showSettings && room && (
              <div className="mb-3 p-2 bg-gray-800 rounded border border-gray-600">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">Auto-send to chat:</span>
                  <button
                    onClick={() => setIsAutoSendEnabled(!isAutoSendEnabled)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      isAutoSendEnabled 
                        ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                        : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                    }`}
                  >
                    {isAutoSendEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center space-x-2 mb-3">
              <button
                onClick={toggleTranscription}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition-all ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                <span className="text-sm">
                  {isRecording ? 'Stop' : 'Start'}
                </span>
              </button>

              {room && (
                <button
                  onClick={() => setIsAutoSendEnabled(!isAutoSendEnabled)}
                  className={`p-2 rounded-md transition-colors ${
                    isAutoSendEnabled 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                  }`}
                  title={isAutoSendEnabled ? "Auto-send to chat: ON" : "Auto-send to chat: OFF"}
                >
                  <MessageSquare size={16} />
                </button>
              )}
            </div>

            {/* Status */}
            <div className="text-xs text-gray-400 mb-2 space-y-1">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={isConnected ? 'text-green-400' : 'text-yellow-400'}>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
              </div>
              {room && (
                <div className="flex justify-between">
                  <span>Chat Auto-send:</span>
                  <span className={isAutoSendEnabled ? 'text-green-400' : 'text-gray-400'}>
                    {isAutoSendEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              )}
            </div>

            {/* Transcription Display */}
            <div className="bg-black/30 rounded-md p-3 min-h-[80px] max-h-[120px] overflow-y-auto border border-gray-600">
              <div className="text-sm">
                {caption ? (
                  <span className={isRecording ? 'text-green-300' : 'text-gray-300'}>
                    {caption}
                  </span>
                ) : (
                  <span className="text-gray-500 italic">
                    {isConnected ? "Ready to transcribe..." : "Connecting..."}
                  </span>
                )}
              </div>
            </div>

            {/* Help Text */}
            {room && isAutoSendEnabled && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                🎤 Speech will be sent to chat automatically
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniLiveTranscription;
