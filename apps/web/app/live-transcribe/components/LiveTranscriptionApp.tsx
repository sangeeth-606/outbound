"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveConnectionState,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  useDeepgram,
} from "../../context/DeepgramContextProvider";
import {
  MicrophoneEvents,
  MicrophoneState,
  useMicrophone,
} from "../../context/MicrophoneContextProvider";
import Visualizer from "../../../components/Visualizer";

const LiveTranscriptionApp = () => {
  const [caption, setCaption] = useState<string | undefined>("Powered by Deepgram");
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, microphoneState } = useMicrophone();
  const captionTimeout = useRef<any>(null);
  const keepAliveInterval = useRef<any>(null);

  useEffect(() => {
    const initMicrophone = async () => {
      try {
        await setupMicrophone();
      } catch (error) {
        console.error("Failed to setup microphone:", error);
        setCaption("Microphone access denied. Please allow microphone access and refresh the page.");
      }
    };
    initMicrophone();
  }, []);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      connectToDeepgram({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
      });
    }
  }, [microphoneState]);

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

      if (isFinal && speechFinal) {
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption(undefined);
          clearTimeout(captionTimeout.current);
        }, 3000);
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
      startMicrophone();
    }

    return () => {
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
  }, [connectionState]);

  useEffect(() => {
    if (!connection) return;

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
  }, [microphoneState, connectionState]);

  return (
    <div className="flex h-full antialiased">
      <div className="flex flex-row h-full w-full overflow-x-hidden">
        <div className="flex flex-col flex-auto h-full">
          <div className="relative w-full h-full">
            {microphone && <Visualizer microphone={microphone} />}
            
            <div className="absolute top-4 left-4 bg-surface-card/90 p-4 rounded-md border border-border-dim text-xs text-text-main space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-text-label">Microphone:</span>
                <span className={microphoneState !== null ? 'text-accent-success' : 'text-text-muted'}>
                  {microphoneState !== null ? MicrophoneState[microphoneState] : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-text-label">Connection:</span>
                <span className={connectionState === LiveConnectionState.OPEN ? 'text-accent-success' : 'text-accent-warning'}>
                  {LiveConnectionState[connectionState]}
                </span>
              </div>
            </div>
            
            <div className="absolute bottom-[8rem] inset-x-0 max-w-4xl mx-auto text-center px-4">
              {caption && (
                <span className="bg-surface-card/90 px-6 py-3 rounded-md text-text-main text-lg border border-border-dim inline-block">
                  {caption}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTranscriptionApp;
