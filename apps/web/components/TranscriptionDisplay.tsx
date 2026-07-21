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

  useEffect(() => {
    if (isActive && isRecording) {
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

          setRetryCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 3) {
              setTranscriptionError('Transcription service is unavailable. Please restart transcription.');
            }
            return newCount;
          });
        }
      }, Math.min(2000 * Math.pow(1.5, retryCount), 10000));

      return () => clearInterval(interval);
    } else {
      setCurrentTranscript('');
      setTranscriptionError(null);
      setRetryCount(0);
    }
  }, [isActive, isRecording, roomName, retryCount]);

  useEffect(() => {
    if (isActive) {
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
      className="card overflow-hidden"
    >
      <div className="bg-surface-secondary p-4 border-b border-border-dim">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-text-label" />
            <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">Live Transcription</h3>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleRecording}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold transition-colors ${
                isRecording
                  ? 'bg-accent-red text-white hover:bg-accent-red/80'
                  : 'bg-accent-success/20 text-accent-success hover:bg-accent-success/30 border border-accent-success/30'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-3 h-3" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3" />
                  <span>Start</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <motion.div
            animate={{
              scale: isRecording ? [1, 1.2, 1] : 1,
              backgroundColor: transcriptionError ? '#FF6B6B' : (isRecording ? '#FF6B6B' : '#4A4A5A')
            }}
            transition={{ duration: 1, repeat: (isRecording && !transcriptionError) ? Infinity : 0 }}
            className="w-1.5 h-1.5 rounded-full"
          ></motion.div>
          <span className={`text-xs ${
            transcriptionError ? 'text-accent-red' :
            isRecording ? 'text-accent-red' : 'text-text-muted'
          }`}>
            {transcriptionError ? 'Transcription Error' :
             isRecording ? 'Recording & Transcribing' : 'Ready to record'}
          </span>
        </div>

        {transcriptionError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-accent-red/10 border border-accent-red/20 rounded-md"
          >
            <div className="flex items-center gap-2">
              <span className="text-accent-red text-xs">⚠</span>
              <span className="text-accent-red text-xs">{transcriptionError}</span>
            </div>
            {retryCount < 3 && (
              <p className="text-accent-red/70 text-[10px] mt-1">
                Retrying... ({retryCount}/3)
              </p>
            )}
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {currentTranscript && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-surface-primary border-b border-border-dim"
          >
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="w-3 h-3 text-accent-cyan" />
              <span className="text-xs text-accent-cyan font-bold uppercase tracking-wider">Live</span>
            </div>
            <p className="text-xs text-text-main italic">{currentTranscript}</p>
          </motion.div>
        )}
      </AnimatePresence>

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
                className={`max-w-xs lg:max-w-md px-3 py-2 rounded text-xs ${
                  transcript.speaker === 'customer'
                    ? 'bg-accent-success/10 border border-accent-success/20 text-text-main'
                    : 'bg-accent-cyan/10 border border-accent-cyan/20 text-text-main'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold ${
                    transcript.speaker === 'customer' ? 'text-accent-success' : 'text-accent-cyan'
                  }`}>
                    {transcript.speaker === 'customer' ? 'Customer' : 'Agent'}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {formatTime(transcript.timestamp)}
                  </span>
                  {transcript.confidence && (
                    <span className="text-[10px] text-text-muted">
                      {Math.round(transcript.confidence * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-text-main leading-relaxed">{transcript.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {transcripts.length === 0 && !isRecording && (
          <div className="text-center py-8">
            <FileText className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-xs">No transcripts yet</p>
            <p className="text-text-muted text-[10px]">Click Start to begin recording</p>
          </div>
        )}
      </div>

      <div className="bg-surface-secondary p-3 border-t border-border-dim">
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>Transcripts: {transcripts.length}</span>
          <span>Room: {roomName}</span>
        </div>
      </div>
    </motion.div>
  );
}
