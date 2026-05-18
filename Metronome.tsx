import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Play, Download, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AudioRecorderProps {
  onClose: () => void;
}

export default function AudioRecorder({ onClose }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed left-6 top-1/2 -translate-y-1/2 w-56 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl z-[60] no-toggle"
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-white text-xs font-bold uppercase tracking-widest opacity-50">Registratore</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className={`text-4xl font-mono font-bold tracking-tighter ${isRecording ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {formatTime(recordingTime)}
        </div>

        <div className="flex items-center gap-4">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
            >
              <Mic className="w-7 h-7" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-zinc-900 hover:bg-zinc-200 transition-all"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {audioUrl && !isRecording && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="w-full space-y-4 pt-4 border-t border-white/10 overflow-hidden"
            >
              <audio src={audioUrl} controls className="w-full h-8 opacity-50" />
              <div className="flex gap-2">
                <a
                  href={audioUrl}
                  download="registrazione-mcs.wav"
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/20 transition-colors"
                >
                  <Download className="w-3 h-3" /> SALVA
                </a>
                <button
                  onClick={() => setAudioUrl(null)}
                  className="p-3 bg-white/10 rounded-xl text-red-400 hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 text-center">
            Qualità professionale WAV
        </div>
      </div>
    </motion.div>
  );
}
