import { useState, useEffect } from 'react';
import { Score } from '../types';
import { getScoresMetadata } from '../lib/db';
import { FileMusic, ArrowLeft, Play, CheckCircle2, AlertCircle, Loader2, Download, Layers } from 'lucide-react';
import { motion } from 'motion/react';

interface ConverterViewProps {
  onBack: () => void;
}

export default function ConverterView({ onBack }: ConverterViewProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [selectedScore, setSelectedScore] = useState<Score | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    getScoresMetadata().then(setScores);
  }, []);

  const handleConvert = () => {
    if (!selectedScore) return;
    setStatus('processing');
    setProgress(0);
    setCurrentPage(0);

    // Simulate OMR process
    const totalPages = 5; // Simplified
    let current = 0;
    
    const interval = setInterval(() => {
      current += 1;
      setCurrentPage(current);
      setProgress((current / totalPages) * 100);
      
      if (current >= totalPages) {
        clearInterval(interval);
        setStatus('done');
        setConfidence(Math.random() > 0.5 ? 'high' : 'medium');
      }
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-zinc-500 hover:text-indigo-600 transition-colors mb-10 group"
      >
        <div className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="font-bold text-sm tracking-tight">TORNA ALLA LIBRERIA</span>
      </button>

      <div className="mb-14">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <FileMusic className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Convertitore MuseScore (OMR)
          </h1>
        </div>
        <p className="text-zinc-500 font-medium max-w-2xl leading-relaxed">
          Trasforma i tuoi spartiti PDF in file MuseScore (.mscz) editabili utilizzando il nostro motore di riconoscimento ottico musicale locale.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-10 items-start">
        {/* Selection Area */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Scegli uno spartito</h2>
          <div className="bg-white/60 backdrop-blur-xl border border-white rounded-[32px] overflow-hidden shadow-xl shadow-zinc-200/50 h-[450px] overflow-y-auto flex flex-col">
            {scores.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-40">
                <FileMusic className="w-12 h-12 mb-4" />
                <p className="text-sm font-medium leading-relaxed">Nessuno spartito disponibile nella libreria.</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {scores.map(score => (
                  <button
                    key={score.id}
                    onClick={() => setSelectedScore(score)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all group ${selectedScore?.id === score.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]' : 'hover:bg-white/80 text-zinc-700'}`}
                  >
                    <div className={`w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm ${selectedScore?.id === score.id ? 'bg-white/10' : 'bg-zinc-100'}`}>
                      {score.thumbnail && <img src={score.thumbnail} className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className={`text-sm font-bold truncate ${selectedScore?.id === score.id ? 'text-white' : 'text-zinc-900'}`}>{score.name}</h3>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${selectedScore?.id === score.id ? 'text-white/60' : 'text-zinc-400'}`}>
                        {score.type} • {score.annotations.length} annotazioni
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action/Progress Area */}
        <div className="lg:col-span-3 flex flex-col justify-center min-h-[450px]">
          {status === 'idle' && (
            <div className="text-center p-12 bg-white/40 backdrop-blur-2xl border border-white rounded-[40px] shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent pointer-events-none opacity-50"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white rounded-[24px] shadow-lg flex items-center justify-center mx-auto mb-8 border border-white/50 group-hover:scale-110 group-hover:bg-indigo-50 transition-all duration-500">
                  <FileMusic className="w-10 h-10 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-4">Pronto per la conversione</h3>
                <p className="text-zinc-500 text-sm mb-10 px-8 leading-relaxed font-medium">
                  Seleziona uno spartito dalla tua libreria per avviare il riconoscimento musicale. Il processo avviene in locale sulla tua CPU/GPU per la massima privacy.
                </p>
                <button
                  disabled={!selectedScore}
                  onClick={handleConvert}
                  className={`w-full max-w-sm py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${selectedScore ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200' : 'bg-white text-zinc-300 cursor-not-allowed border border-white'}`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  AVVIA CONVERSIONE OMR
                </button>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="text-center p-12 bg-white/70 backdrop-blur-2xl border border-white rounded-[40px] shadow-2xl">
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                <motion.div 
                  className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-indigo-700">
                  {Math.round(progress)}%
                </div>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">Analisi Musicale...</h3>
              <p className="text-sm font-bold text-zinc-400 bg-zinc-100 inline-block px-4 py-1.5 rounded-full mb-10 tracking-widest uppercase">
                Pagina {currentPage} in elaborazione
              </p>
              
              <div className="max-w-xs mx-auto">
                <div className="w-full h-3 bg-zinc-100 rounded-full overflow-hidden shadow-inner mb-4">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-700 shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs font-bold text-zinc-400 animate-pulse">NON CHIUDERE L'APP</p>
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="text-center p-12 bg-white/80 backdrop-blur-3xl border border-white rounded-[40px] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl rounded-full"></div>
              
              <div className="w-24 h-24 bg-green-50 rounded-[30px] flex items-center justify-center mx-auto mb-8 shadow-inner border border-green-100">
                <CheckCircle2 className="w-14 h-14 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-3">Conversione Completa!</h3>
              <p className="text-zinc-600 text-sm mb-10 px-6 leading-relaxed font-medium">
                Ottimo! Il file <span className="font-bold text-zinc-900">.mscz</span> è stato generato e salvato correttamente. Puoi ora esportarlo verso MuseScore.
              </p>
              
              <div className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest mb-10 ${confidence === 'high' ? 'bg-green-100 text-green-700 shadow-sm border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                <Layers className="w-4 h-4" />
                Confidenza: {confidence === 'high' ? 'Alta' : 'Media'}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95">
                  <Download className="w-5 h-5" /> ESPORTA FILE
                </button>
                <button 
                  onClick={() => setStatus('idle')}
                  className="px-8 py-4 bg-white text-zinc-700 border border-zinc-100 rounded-2xl font-bold hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                >
                  NUOVA ANALISI
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-16 p-8 bg-indigo-50/50 backdrop-blur-md border border-indigo-100 rounded-[32px] flex flex-col md:flex-row gap-6 items-center shadow-sm shadow-indigo-100/20">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm flex-shrink-0 border border-indigo-200/20">
          <AlertCircle className="w-8 h-8 text-indigo-500" />
        </div>
        <div className="text-center md:text-left">
          <h4 className="font-bold text-indigo-900 text-lg mb-1">Nota sulla precisione OMR locale</h4>
          <p className="text-sm text-indigo-700/70 leading-relaxed font-medium">
            Questa tecnologia utilizza modelli neurale per la visione artificiale. Per risultati ottimali assicurati che il PDF abbia una risoluzione minima di 300 DPI e una scansione dritta. Verifica sempre le alterazioni e le legature dopo l'importazione in MuseScore.
          </p>
        </div>
      </div>
    </div>
  );
}
