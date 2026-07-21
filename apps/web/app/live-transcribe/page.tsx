"use client";

import LiveTranscriptionApp from "./components/LiveTranscriptionApp";
import { DeepgramContextProvider } from "../context/DeepgramContextProvider";
import { MicrophoneContextProvider } from "../context/MicrophoneContextProvider";

export default function LiveTranscribePage() {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-sm font-bold text-text-label uppercase tracking-widest mb-1">Live Transcription Monitor</h2>
        <p className="text-xs text-text-muted">Real-time speech-to-text monitoring via Deepgram</p>
      </div>
      <div className="flex-1 card overflow-hidden">
        <DeepgramContextProvider>
          <MicrophoneContextProvider>
            <LiveTranscriptionApp />
          </MicrophoneContextProvider>
        </DeepgramContextProvider>
      </div>
    </div>
  );
}
