"use client";

import LiveTranscriptionApp from "./components/LiveTranscriptionApp";
import { DeepgramContextProvider } from "../context/DeepgramContextProvider";
import { MicrophoneContextProvider } from "../context/MicrophoneContextProvider";

export default function LiveTranscribePage() {
  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-b from-black/50 to-black/10 backdrop-blur-[2px] h-16 flex items-center">
        <header className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Live Transcription</h1>
          </div>
          <div className="text-sm text-gray-300">
            Powered by Deepgram
          </div>
        </header>
      </div>

      {/* Main Content */}
      <main className="h-[calc(100vh-4rem)]">
        <DeepgramContextProvider>
          <MicrophoneContextProvider>
            <LiveTranscriptionApp />
          </MicrophoneContextProvider>
        </DeepgramContextProvider>
      </main>
    </div>
  );
}
