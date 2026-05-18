import React, { useState, useEffect, useRef } from 'react';
import { Activity, Mic, X } from 'lucide-react';
import { motion } from 'motion/react';

interface TunerProps {
  onClose: () => void;
}

const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export default function Tuner({ onClose }: TunerProps) {
  const [pitch, setPitch] = useState<number | null>(null);
  const [note, setNote] = useState<string>("-");
  const [detune, setDetune] = useState<number>(0);
  const audioContext = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrame = useRef<number | null>(null);

  const startTuner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext.current = new AudioContext();
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 2048;
      mediaStreamSource.current = audioContext.current.createMediaStreamSource(stream);
      mediaStreamSource.current.connect(analyser.current);
      updatePitch();
    } catch (err) {
      console.error("Error accessing microphone", err);
    }
  };

  const updatePitch = () => {
    const buffer = new Float32Array(analyser.current!.fftSize);
    analyser.current!.getFloatTimeDomainData(buffer);
    
    const ac = autoCorrelate(buffer, audioContext.current!.sampleRate);
    if (ac !== -1) {
      setPitch(Math.round(ac));
      const noteNum = 12 * (Math.log(ac / 440) / Math.log(2)) + 69;
      const noteIndex = Math.round(noteNum) % 12;
      setNote(noteStrings[noteIndex]);
      setDetune(Math.floor((noteNum - Math.round(noteNum)) * 100));
    } else {
      setPitch(null);
      setNote("-");
      setDetune(0);
    }
    animationFrame.current = requestAnimationFrame(updatePitch);
  };

  const autoCorrelate = (buf: Float32Array, sampleRate: number) => {
    let SIZE = buf.length;
    let MAX_SAMPLES = Math.floor(SIZE / 2);
    let best_offset = -1;
    let best_correlation = 0;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
      rms += buf[i] * buf[i];
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;

    let lastCorrelation = 1;
    for (let offset = 0; offset < MAX_SAMPLES; offset++) {
      let correlation = 0;

      for (let i = 0; i < MAX_SAMPLES; i++) {
        correlation += Math.abs(buf[i] - buf[i + offset]);
      }
      correlation = 1 - (correlation / MAX_SAMPLES);
      if ((correlation > 0.9) && (correlation > lastCorrelation)) {
        if (correlation > best_correlation) {
          best_correlation = correlation;
          best_offset = offset;
        }
      }
      lastCorrelation = correlation;
    }
    if (best_correlation > 0.01) {
      return sampleRate / best_offset;
    }
    return -1;
  };

  useEffect(() => {
    startTuner();
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (audioContext.current) audioContext.current.close();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed left-6 top-1/2 -translate-y-1/2 w-48 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl z-[60] no-toggle"
    >
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-white text-xs font-bold uppercase tracking-widest opacity-50">Accordatore</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
            <div className={`text-6xl font-bold tracking-tighter text-white ${pitch ? 'opacity-100' : 'opacity-20 transition-opacity'}`}>
                {note}
            </div>
            {pitch && (
                <div className="absolute -bottom-4 text-xs font-mono text-indigo-400 font-bold">
                    {pitch} Hz
                </div>
            )}
        </div>

        <div className="w-full h-2 bg-white/5 rounded-full relative overflow-hidden mt-4">
            <motion.div 
                className={`absolute top-0 bottom-0 w-1 ${Math.abs(detune) < 5 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}
                animate={{ left: `${50 + detune}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30">
            <Activity className="w-3 h-3" />
            <span>Frequenza Real-time</span>
        </div>
      </div>
    </motion.div>
  );
}
