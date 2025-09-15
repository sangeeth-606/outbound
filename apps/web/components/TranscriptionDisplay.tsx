'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, FileText } from 'lucide-react';

interface TranscriptMessage {
  id: string;
  speaker: 'agent' | 'customer';
  text: string;
  timestamp: Date;
  confidence?: number;
}

interface TranscriptionDisplayProps {
  roomName: string;
  isActive: boolean;
  onToggleRecording?: (recording: boolean) => void;
}

export default function TranscriptionDisplay({
  roomName,
  isActive,
  onToggleRecording
}: TranscriptionDisplayProps) {
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Removed mock transcription data for production
  // TODO: Implement real-time transcription integration

  useEffect(() => {
    if (isActive && isRecording) {
      // Fetch transcription data periodically with error handling
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/transcription/get', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              room_name: roomName
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          if (data.success) {
            setTranscripts(data.transcripts || []);
            setTranscriptionError(null);
            setRetryCount(0);

            // Set current transcript to the latest final transcript
            const finalTranscripts = (data.transcripts || []).filter((t: any) => t.is_final);
            if (finalTranscripts.length > 0) {
              setCurrentTranscript(finalTranscripts[finalTranscripts.length - 1].text);
            }
          } else {
            throw new Error(data.message || 'Failed to fetch transcription data');
          }
        } catch (error) {
          console.error('Failed to fetch transcription:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          setTranscriptionError(`Transcription service error: ${errorMessage}`);

          // Implement retry logic with exponential backoff
          setRetryCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 3) {
              setTranscriptionError('Transcription service is unavailable. Please restart transcription.');
            }
            return newCount;
          });
        }
      }, Math.min(2000 * Math.pow(1.5, retryCount), 10000)); // Exponential backoff, max 10s

      return () => clearInterval(interval);
    } else {
      setCurrentTranscript('');
      setTranscriptionError(null);
      setRetryCount(0);
    }
  }, [isActive, isRecording, roomName, retryCount]);

  useEffect(() => {
    if (isActive) {
      // Load existing transcription data
      const loadTranscripts = async () => {
        try {
          const response = await fetch('/api/transcription/get', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              room_name: roomName
            }),
          });

          const data = await response.json();
          if (data.success) {
            setTranscripts(data.transcripts);
          }
        } catch (error) {
          console.error('Failed to load transcription:', error);
          // Don't show error for missing transcription API - it's optional
          setTranscripts([]);
        }
      };

      loadTranscripts();
    }
  }, [isActive, roomName]);

  const toggleRecording = () => {
    const newRecordingState = !isRecording;
    setIsRecording(newRecordingState);
    setIsListening(newRecordingState);
    onToggleRecording?.(newRecordingState);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white/10 backdrop-blur-sm rounded-xl shadow-lg border border-blue-500/20 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 border-b border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Live Transcription</h3>
          </div>
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleRecording}
              className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Start</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Recording Status */}
        <div className="flex items-center space-x-2 mt-2">
          <motion.div
            animate={{
              scale: isRecording ? [1, 1.2, 1] : 1,
              backgroundColor: transcriptionError ? '#EF4444' : (isRecording ? '#EF4444' : '#6B7280')
            }}
            transition={{ duration: 1, repeat: (isRecording && !transcriptionError) ? Infinity : 0 }}
            className="w-2 h-2 rounded-full"
          ></motion.div>
          <span className={`text-sm ${
            transcriptionError ? 'text-red-400' :
            isRecording ? 'text-red-400' : 'text-gray-400'
          }`}>
            {transcriptionError ? 'Transcription Error' :
             isRecording ? 'Recording & Transcribing' : 'Ready to record'}
          </span>
        </div>

        {/* Error Display */}
        {transcriptionError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <span className="text-red-400 text-sm">⚠️</span>
              <span className="text-red-300 text-sm">{transcriptionError}</span>
            </div>
            {retryCount < 3 && (
              <p className="text-red-400 text-xs mt-1">
                Retrying... ({retryCount}/3)
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Current Transcript */}
      <AnimatePresence>
        {currentTranscript && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-blue-900/10 border-b border-blue-500/20"
          >
            <div className="flex items-center space-x-2 mb-2">
              <Volume2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-400 font-medium">Live Transcript</span>
            </div>
            <p className="text-white text-sm italic">{currentTranscript}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript History */}
      <div className="max-h-64 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {transcripts.map((transcript, index) => (
            <motion.div
              key={transcript.id}
              initial={{ opacity: 0, x: transcript.speaker === 'customer' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`flex ${transcript.speaker === 'customer' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm ${
                  transcript.speaker === 'customer'
                    ? 'bg-green-600/20 border border-green-500/30 text-green-100'
                    : 'bg-blue-600/20 border border-blue-500/30 text-blue-100'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-xs font-medium ${
                    transcript.speaker === 'customer' ? 'text-green-400' : 'text-blue-400'
                  }`}>
                    {transcript.speaker === 'customer' ? 'Customer' : 'Agent'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatTime(transcript.timestamp)}
                  </span>
                  {transcript.confidence && (
                    <span className="text-xs text-gray-500">
                      {Math.round(transcript.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-white leading-relaxed">{transcript.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {transcripts.length === 0 && !isRecording && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No transcripts yet</p>
            <p className="text-gray-500 text-xs">Click "Start" to begin recording</p>
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="bg-gray-800/50 p-3 border-t border-gray-600/20">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Transcripts: {transcripts.length}</span>
          <span>Room: {roomName}</span>
        </div>
      </div>
    </motion.div>
  );
}