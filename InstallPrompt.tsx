import React, { useState, useMemo, useEffect } from 'react';
import { Score, Folder } from '../types';
import { Search, Plus, FolderPlus, Grid, List, Star, MoreVertical, FileText, ChevronRight, ArrowLeft, Cloud } from 'lucide-react';
import { cn } from '../lib/utils';
import { saveScoreBlob, saveScoresMetadata, saveFolders, deleteScore } from '../lib/db';
import * as pdfjsLib from 'pdfjs-dist';
import GoogleDrivePicker from './GoogleDrivePicker';
import { initAuth } from '../lib/firebase';
import { AnimatePresence } from 'motion/react';

// Configure PDF.js worker removed (already in main.tsx)

interface LibraryViewProps {
  scores: Score[];
  folders: Folder[];
  onOpenScore: (id: string) => void;
  onOpenConverter: () => void;
  refreshData: () => void;
}

export default function LibraryView({ scores, folders, onOpenScore, onOpenConverter, refreshData }: LibraryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const filteredScores = useMemo(() => {
    return scores.filter(score => {
      const matchSearch = score.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchFolder = score.folderId === currentFolderId;
      return matchSearch && matchFolder;
    });
  }, [scores, searchQuery, currentFolderId]);

  const currentFolders = useMemo(() => {
    return folders.filter(f => f.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  const processFile = async (file: Blob | File, name: string) => {
    const id = crypto.randomUUID();
    const isPdf = file.type === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
    const type = isPdf ? 'pdf' : 'image';

    // Basic thumbnail generation for PDF
    let thumbnail = '';
    if (isPdf) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        if (context) {
          await page.render({ 
            canvasContext: context, 
            viewport,
            canvas: canvas as any 
          }).promise;
          thumbnail = canvas.toDataURL();
        }
      } catch (e) {
        console.error('Thumbnail generation failed', e);
      }
    }

    const newScore: Score = {
      id,
      name: name,
      type: type as 'pdf' | 'image',
      blob: file,
      thumbnail,
      dateImported: Date.now(),
      isFavorite: false,
      baseSize: 100,
      annotations: [],
      folderId: currentFolderId
    };

    await saveScoreBlob(id, file);
    const sMetadata = await (import('../lib/db').then(m => m.getScoresMetadata()));
    const metadata = [...sMetadata, newScore];
    await saveScoresMetadata(metadata);
    refreshData();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      await processFile(files[i], files[i].name);
    }
  };

  const handleDriveFileSelect = async (blob: Blob, name: string) => {
    setShowDrivePicker(false);
    await processFile(blob, name);
  };

  const handleCreateFolder = async () => {
    const name = prompt('Nome cartella:');
    if (!name) return;

    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      parentId: currentFolderId
    };

    const updatedFolders = [...folders, newFolder];
    await saveFolders(updatedFolders);
    refreshData();
  };

  const toggleFavorite = async (id: string) => {
    const updated = scores.map(s => s.id === id ? { ...s, isFavorite: !s.isFavorite } : s);
    await saveScoresMetadata(updated);
    refreshData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Eliminare questo spartito?')) {
      await deleteScore(id);
      refreshData();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div className="flex items-center gap-4 group">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200/50 relative overflow-hidden transition-transform hover:scale-105">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-white font-serif text-xl font-bold tracking-tighter drop-shadow-md select-none">MCS</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-500">MCScores</h1>
            <p className="text-sm text-zinc-500 font-medium lowercase tracking-wide italic">La tua libreria musicale</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] md:min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Cerca spartiti, compositori..."
              className="w-full pl-11 pr-4 py-3 bg-white/50 backdrop-blur-xl border border-white rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-zinc-700 placeholder-zinc-400 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsGridView(!isGridView)}
            className="p-3 bg-white/60 backdrop-blur-md border border-white rounded-2xl text-zinc-600 shadow-sm hover:bg-white/80 transition-all"
          >
            {isGridView ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
          </button>
          <button 
            onClick={onOpenConverter}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            <FileText className="w-4 h-4" /> OMR
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {currentFolderId && (
        <div className="flex items-center gap-2 mb-8 bg-white/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/50 w-fit">
          <button 
            onClick={() => setCurrentFolderId(undefined)}
            className="text-zinc-500 hover:text-indigo-600 font-medium transition-colors"
          >
            Libreria
          </button>
          <ChevronRight className="w-4 h-4 text-zinc-300" />
          <span className="font-semibold text-zinc-800">
            {folders.find(f => f.id === currentFolderId)?.name}
          </span>
          <button 
            onClick={() => {
              const parentId = folders.find(f => f.id === currentFolderId)?.parentId;
              setCurrentFolderId(parentId);
            }}
            className="ml-4 text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1 hover:underline underline-offset-4"
          >
            <ArrowLeft className="w-3 h-3" /> Indietro
          </button>
        </div>
      )}

      {/* Folders Section */}
      {currentFolders.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1 mb-5">Cartelle</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {currentFolders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setCurrentFolderId(folder.id)}
                className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-md border border-white rounded-[20px] hover:bg-white/80 hover:shadow-md transition-all text-left shadow-sm group"
              >
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm text-zinc-800 truncate">{folder.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scores Grid/List */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">
            {filteredScores.length} Spartiti
          </h2>
        </div>

        {filteredScores.length === 0 ? (
          <div className="py-24 text-center bg-white/40 backdrop-blur-xl border-2 border-dashed border-white rounded-[32px]">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-zinc-300" />
            </div>
            <p className="text-zinc-500 font-bold text-lg">Nessuno spartito trovato</p>
            <p className="text-sm text-zinc-400 mt-2">Trascina un file o usa il pulsante Importa</p>
          </div>
        ) : isGridView ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
            {filteredScores.map(score => (
              <div key={score.id} className="group relative">
                <div 
                  onClick={() => onOpenScore(score.id)}
                  className="aspect-[3/4] bg-white rounded-[24px] shadow-xl shadow-zinc-200/40 p-5 flex flex-col border border-white group-hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer relative"
                >
                  <div className="flex-1 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-center overflow-hidden">
                    {score.thumbnail ? (
                      <img src={score.thumbnail} alt={score.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl opacity-20">🎼</span>
                    )}
                  </div>
                  <div className="mt-4">
                    <h3 className="font-bold text-zinc-900 truncate leading-tight">{score.name}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                        {score.type} • {new Date(score.dateImported).toLocaleDateString()}
                      </span>
                      {score.annotations.length > 0 && (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-bold rounded uppercase">Annotato</span>
                      )}
                    </div>
                  </div>
                  {score.isFavorite && (
                    <div className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-md border border-white">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    </div>
                  )}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(score.id);
                  }}
                  className="absolute -top-2 -right-2 p-2 bg-white text-zinc-300 hover:text-red-500 rounded-full shadow-lg border border-white opacity-0 group-hover:opacity-100 transition-all z-20"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredScores.map(score => (
              <div 
                key={score.id}
                onClick={() => onOpenScore(score.id)}
                className="flex items-center gap-5 p-4 bg-white/70 backdrop-blur-md border border-white rounded-2xl hover:bg-white/90 hover:shadow-lg transition-all cursor-pointer group shadow-sm"
              >
                <div className="w-14 h-20 bg-zinc-50 rounded-lg flex-shrink-0 border border-zinc-100 overflow-hidden shadow-inner">
                  {score.thumbnail ? (
                    <img src={score.thumbnail} alt={score.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-zinc-100" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-zinc-900 truncate">{score.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">{score.type}</span>
                    <div className="w-1 h-1 bg-zinc-200 rounded-full" />
                    <span className="text-xs text-zinc-400 font-medium">
                      Importato il {new Date(score.dateImported).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 pr-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(score.id);
                    }}
                    className={cn("p-3 rounded-full transition-all", score.isFavorite ? "bg-yellow-50 text-yellow-500" : "bg-zinc-50 text-zinc-300 hover:bg-zinc-100")}
                  >
                    <Star className={cn("w-5 h-5", score.isFavorite && "fill-current")} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(score.id);
                    }}
                    className="p-3 bg-zinc-50 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dock UI */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 px-10 py-5 bg-white/40 backdrop-blur-2xl border border-white shadow-2xl rounded-full z-40">
        <label className="flex items-center gap-3 group cursor-pointer hover:scale-105 transition-all">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <span className="text-sm font-bold text-indigo-700 tracking-tight">FILE</span>
          <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={handleFileUpload} />
        </label>
        
        <div className="w-px h-8 bg-zinc-300/50" />
        
        <button 
          onClick={() => setShowDrivePicker(true)}
          className="flex items-center gap-3 group hover:scale-105 transition-all text-zinc-600 hover:text-indigo-600"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <Cloud className="w-6 h-6 text-blue-600" />
          </div>
          <span className="text-sm font-bold tracking-tight">CLOUD</span>
        </button>

        <div className="w-px h-8 bg-zinc-300/50" />
        
        <button 
          onClick={handleCreateFolder}
          className="flex items-center gap-3 group hover:scale-105 transition-all text-zinc-600 hover:text-zinc-900"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center group-hover:bg-white transition-colors">
            <FolderPlus className="w-6 h-6" />
          </div>
          <span className="text-sm font-bold tracking-tight">CARTELLA</span>
        </button>
      </div>

      <AnimatePresence>
        {showDrivePicker && (
          <GoogleDrivePicker 
            onFileSelect={handleDriveFileSelect} 
            onClose={() => setShowDrivePicker(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
