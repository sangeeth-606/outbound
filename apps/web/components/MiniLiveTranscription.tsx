"use client";

import { useEffect, useRef, useState } from "react";
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
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";

interface MiniLiveTranscriptionProps {
  className?: string;
}

const MiniLiveTranscription = ({ className = "" }: MiniLiveTranscriptionProps) => {
  const [caption, setCaption] = useState<string | undefined>("Click to start live transcription");
  const [isMinimized, setIsMinimized] = useState(false);
  const [isActive, setIsActive] = useState(false);
  
  const { connection, connectToDeepgram, connectionState, disconnectFromDeepgram } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } = useMicrophone();
  const captionTimeout = useRef<any>(null);
  const keepAliveInterval = useRef<any>(null);

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
    if (!microphone || !connection || !isActive) return;

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

      if (isFinal && speechFinal) {
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
      startMicrophone();
      setCaption("Listening...");
    }

    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState, isActive]);

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
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={toggleTranscription}
              className={`p-1.5 rounded ${isActive ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'} transition-colors`}
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
            {caption || "Click to start live transcription"}
          </p>
        </div>

        {/* Status */}
        <div className="mt-2 text-xs text-gray-500">
          {isActive ? (
            connectionState === LiveConnectionState.OPEN ? "Connected" : "Connecting..."
          ) : (
            "Click microphone to start"
          )}
        </div>
      </div>
    </div>
  );
};

export default MiniLiveTranscription;
