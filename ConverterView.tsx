import React, { useState, useEffect, useRef } from 'react';
import { Score, Annotation } from '../types';
import { getScoreBlob, saveScoresMetadata, getScoresMetadata } from '../lib/db';
import { ArrowLeft, Edit3, Eraser, Minus, Plus, Search, Share2, Layers, Download, Timer, Activity, Mic, Keyboard as PianoIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
import AnnotationCanvas from './AnnotationCanvas';
import Metronome from './Metronome';
import Tuner from './Tuner';
import AudioRecorder from './AudioRecorder';
import PianoKeyboard from './PianoKeyboard';

interface ReaderViewProps {
  scoreId: string;
  onBack: () => void;
}

export default function ReaderView({ scoreId, onBack }: ReaderViewProps) {
  const [score, setScore] = useState<Score | null>(null);
  const [showUI, setShowUI] = useState(false);
  const [activeTool, setActiveTool] = useState<'pen' | 'eraser' | 'none'>('none');
  const [activeUtility, setActiveUtility] = useState<'metronome' | 'tuner' | 'recorder' | 'piano' | null>(null);
  const [penColor, setPenColor] = useState('#141414');
  const [penThickness, setPenThickness] = useState(2);
  const [pageSize, setPageSize] = useState(100);
  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const uiTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadScore() {
      const metadata = await getScoresMetadata();
      const current = metadata.find(s => s.id === scoreId);
      if (current) {
        setScore(current);
        setPageSize(current.baseSize || 100);
        const blob = await getScoreBlob(scoreId);
        if (blob) {
          const arrayBuffer = await blob.arrayBuffer();
          const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          setPdf(loadedPdf);
          setNumPages(loadedPdf.numPages);
        }
      }
    }
    loadScore();
  }, [scoreId]);

  // UI Auto-hide logic
  useEffect(() => {
    if (showUI && !activeUtility) {
      if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
      uiTimerRef.current = setTimeout(() => setShowUI(false), 5000);
    } else {
      if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    }
    return () => {
      if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
    };
  }, [showUI, activeUtility]);

  const toggleUI = (e: React.MouseEvent) => {
    // Only toggle if clicking in the center or generally not on a control
    const target = e.target as HTMLElement;
    if (target.closest('.no-toggle')) {
      // If we clicked a tool, refresh the UI timer or keep it open
      if (showUI && !activeUtility) {
        if (uiTimerRef.current) clearTimeout(uiTimerRef.current);
        uiTimerRef.current = setTimeout(() => setShowUI(false), 8000); // Give more time
      }
      return;
    }
    setShowUI(!showUI);
  };

  const handleSaveAnnotations = async (page: number, newAnnotations: Annotation[]) => {
    if (!score) return;
    const metadata = await getScoresMetadata();
    const updated = metadata.map(s => {
      if (s.id === scoreId) {
        if (page === 0) {
          // Clear all
          return { ...s, annotations: [] };
        }
        // Filter out existing annotations for this page and add new ones
        const otherPages = s.annotations.filter(a => a.page !== page);
        return { ...s, annotations: [...otherPages, ...newAnnotations] };
      }
      return s;
    });
    await saveScoresMetadata(updated);
    setScore(updated.find(s => s.id === scoreId)!);
  };

  const handlePageSizeChange = async (newSize: number) => {
    setPageSize(newSize);
    if (!score) return;
    
    // Update local state immediately for responsiveness
    setScore(prev => prev ? { ...prev, baseSize: newSize } : null);
    
    // Persist to database
    const metadata = await getScoresMetadata();
    const updated = metadata.map(s => s.id === scoreId ? { ...s, baseSize: newSize } : s);
    await saveScoresMetadata(updated);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!score) return;
    
    try {
      const blob = await getScoreBlob(scoreId);
      if (!blob) return;

      const file = new File([blob], `${score.title}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: score.title,
          text: `Spartito: ${score.title}`
        });
      } else if (navigator.share) {
        await navigator.share({
          title: score.title,
          text: `Spartito: ${score.title}`,
          url: window.location.href
        });
      } else {
        // Fallback for browsers that don't support share API
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${score.title}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.log("Sharing failed", err);
    }
  };

  if (!score || !pdf) return <div className="bg-black w-full h-full flex items-center justify-center text-white">Caricamento...</div>;

  return (
    <div 
      className="relative w-full h-full bg-[#141414] overflow-hidden" 
      onClick={toggleUI}
    >
      {/* PDF Pages Container */}
      <div 
        ref={containerRef}
        className="w-full h-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth"
      >
        <div 
          className="flex flex-col items-center py-8 gap-8"
          style={{ width: `${pageSize}%`, margin: '0 auto' }}
        >
          {Array.from({ length: numPages }).map((_, i) => (
            <div 
              key={i} 
              className="relative shadow-2xl bg-white snap-center"
              style={{ width: '100%', minHeight: '100px' }}
            >
              <PdfPage 
                pdf={pdf} 
                pageNumber={i + 1} 
                scale={2} // Render high quality
              />
              <AnnotationCanvas 
                page={i + 1}
                activeTool={activeTool}
                color={penColor}
                thickness={penThickness}
                annotations={score.annotations.filter(a => a.page === i + 1)}
                onSave={(annos) => handleSaveAnnotations(i + 1, annos)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Overlay UI */}
      <AnimatePresence>
        {showUI && (
          <>
            {/* Top Bar */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 left-6 right-6 flex items-center justify-between z-50 no-toggle gap-4"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); onBack(); }}
                className="p-4 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-2xl text-white hover:bg-white/40 transition-all shadow-xl"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1 bg-white p-1 rounded-full shadow-2xl border border-zinc-200 no-toggle">
                <button 
                  onClick={() => handlePageSizeChange(Math.max(30, pageSize - 5))}
                  className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-900 transition-all active:scale-90"
                  title="Zoom Out"
                >
                  <Minus className="w-4 h-4" />
                </button>
                
                <div className="flex flex-col items-center px-1 min-w-[80px]">
                  <input 
                    type="range"
                    min="30"
                    max="200"
                    step="1"
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-zinc-500 text-[9px] font-bold font-mono mt-0.5">{pageSize}%</span>
                </div>

                <button 
                  onClick={() => handlePageSizeChange(Math.min(200, pageSize + 5))}
                  className="p-1.5 hover:bg-zinc-100 rounded-full text-zinc-900 transition-all active:scale-90"
                  title="Zoom In"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={handleShare}
                  className="p-4 bg-white/20 backdrop-blur-2xl border border-white/30 rounded-2xl text-white hover:bg-white/40 transition-all shadow-xl"
                  title="Condividi"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>

            {/* Side Utilities - Musical Tools */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 no-toggle"
            >
              {[
                { id: 'metronome', icon: Timer, label: 'Metronomo' },
                { id: 'tuner', icon: Activity, label: 'Accordatore' },
                { id: 'recorder', icon: Mic, label: 'Registra' },
                { id: 'piano', icon: PianoIcon, label: 'Pianoforte' },
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveUtility(activeUtility === tool.id ? null : tool.id as any)}
                  className={cn(
                    "p-4 rounded-2xl transition-all shadow-xl backdrop-blur-2xl border flex flex-col items-center gap-1 group",
                    activeUtility === tool.id 
                      ? "bg-indigo-600 border-indigo-400 text-white scale-110" 
                      : "bg-white/20 border-white/30 text-white hover:bg-white/30"
                  )}
                >
                  <tool.icon className="w-5 h-5" />
                  <span className="text-[8px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                    {tool.label}
                  </span>
                </button>
              ))}
            </motion.div>

            {/* Bottom Tools - Floating Pill Dock */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-5 bg-white/40 backdrop-blur-2xl text-zinc-900 rounded-[32px] shadow-2xl z-50 flex items-center gap-8 border border-white no-toggle"
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveTool(activeTool === 'pen' ? 'none' : 'pen')}
                  className={cn(
                    "p-4 rounded-2xl transition-all shadow-sm",
                    activeTool === 'pen' ? "bg-indigo-600 text-white scale-110 shadow-indigo-200" : "bg-white/50 text-zinc-600 hover:bg-white/80"
                  )}
                >
                  <Edit3 className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setActiveTool(activeTool === 'eraser' ? 'none' : 'eraser')}
                  className={cn(
                    "p-4 rounded-2xl transition-all shadow-sm",
                    activeTool === 'eraser' ? "bg-indigo-600 text-white scale-110 shadow-indigo-200" : "bg-white/50 text-zinc-600 hover:bg-white/80"
                  )}
                >
                  <Eraser className="w-6 h-6" />
                </button>
                <button 
                  onClick={async () => {
                    if (confirm('Cancellare tutte le annotazioni?')) {
                      handleSaveAnnotations(0, []);
                    }
                  }}
                  className="p-4 rounded-2xl bg-white/50 text-zinc-600 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                >
                  <Layers className="w-6 h-6" />
                </button>
              </div>

              <div className="w-px h-10 bg-zinc-400/20" />

              <div className="flex items-center gap-3">
                {['#18181b', '#ef4444', '#10b981', '#4f46e5', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff'].map(color => (
                  <button
                    key={color}
                    onClick={() => { setPenColor(color); setActiveTool('pen'); }}
                    className={cn(
                      "w-7 h-7 rounded-full border-[3px] transition-all shadow-sm",
                      penColor === color && activeTool === 'pen' ? "scale-125 border-white ring-4 ring-indigo-500/10" : "border-white/50 hover:scale-110",
                      color === '#18181b' && "bg-zinc-900",
                      color === '#ef4444' && "bg-red-500",
                      color === '#10b981' && "bg-emerald-500",
                      color === '#4f46e5' && "bg-indigo-600",
                      color === '#f59e0b' && "bg-amber-500",
                      color === '#8b5cf6' && "bg-violet-500",
                      color === '#ec4899' && "bg-pink-500",
                      color === '#ffffff' && "bg-white"
                    )}
                  />
                ))}
              </div>

              <div className="w-px h-10 bg-zinc-400/20" />

              <div className="flex items-center gap-4">
                {[1, 2, 4, 8].map(size => (
                  <button
                    key={size}
                    onClick={() => { setPenThickness(size); setActiveTool('pen'); }}
                    className={cn(
                      "relative flex items-center justify-center transition-all group",
                      penThickness === size && activeTool === 'pen' ? "text-indigo-600 scale-125" : "text-zinc-300 hover:text-zinc-500"
                    )}
                  >
                    <div style={{ width: size + 6, height: size + 6 }} className="bg-current rounded-full shadow-sm" />
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Actual Tool Modals/Overlays */}
      <AnimatePresence>
        {showUI && activeUtility === 'metronome' && <Metronome onClose={() => setActiveUtility(null)} />}
        {showUI && activeUtility === 'tuner' && <Tuner onClose={() => setActiveUtility(null)} />}
        {showUI && activeUtility === 'recorder' && <AudioRecorder onClose={() => setActiveUtility(null)} />}
        {showUI && activeUtility === 'piano' && <PianoKeyboard onClose={() => setActiveUtility(null)} />}
      </AnimatePresence>
    </div>
  );
}

function PdfPage({ pdf, pageNumber, scale = 1.5 }: { pdf: any, pageNumber: number, scale?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function renderPage() {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ 
        canvasContext: context, 
        viewport,
        canvas: canvas as any
      }).promise;
    }
    renderPage();
  }, [pdf, pageNumber, scale]);

  return <canvas ref={canvasRef} className="w-full h-auto block" />;
}
