import React, { useState, useEffect } from 'react';
import { getAccessToken, googleSignIn } from '../lib/firebase';
import { Cloud, Loader2, FileText, CheckCircle2, X, Search, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface GoogleDrivePickerProps {
  onFileSelect: (file: Blob, name: string) => void;
  onClose: () => void;
}

export default function GoogleDrivePicker({ onFileSelect, onClose }: GoogleDrivePickerProps) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFiles = async (token: string, query: string = '') => {
    setLoading(true);
    setError(null);
    try {
      // Search for PDF and images
      const q = `(mimeType = 'application/pdf' or mimeType contains 'image/') and trashed = false ${query ? `and name contains '${query}'` : ''}`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType)`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch files from Google Drive');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = await getAccessToken();
      if (token) {
        setIsAuthenticated(true);
        fetchFiles(token);
      }
    };
    checkAuth();
  }, []);

  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setIsAuthenticated(true);
        fetchFiles(result.accessToken);
      }
    } catch (err: any) {
      setError('Could not sign into Google');
    }
  };

  const handleFileClick = async (file: DriveFile) => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to download file');

      const blob = await response.blob();
      onFileSelect(blob, file.name);
    } catch (err: any) {
      setError('Failed to download file: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 1.05, y: 10 }}
        className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col h-[600px]"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
              <Cloud className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Google Drive</h2>
              <p className="text-xs text-zinc-500 font-medium tracking-tight">Seleziona uno spartito da importare</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-[30px] flex items-center justify-center mb-8 border border-blue-100">
              <Cloud className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-4">Accedi a Google Drive</h3>
            <p className="text-zinc-500 text-sm mb-10 max-w-xs leading-relaxed font-medium">
              Connettiti al tuo account Google per sfogliare e importare direttamente i tuoi spartiti PDF e immagini.
            </p>
            <button
              onClick={handleSignIn}
              className="flex items-center gap-3 px-10 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              ACCEDI CON GOOGLE
            </button>
          </div>
        ) : (
          <>
            <div className="p-4 bg-white border-b border-zinc-100">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Cerca nei tuoi file..."
                  className="w-full pl-11 pr-4 py-3 bg-zinc-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 text-zinc-700 placeholder-zinc-400 transition-all font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      getAccessToken().then(token => token && fetchFiles(token, searchQuery));
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading && files.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Caricamento...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center p-20 text-center text-red-500">
                  <X className="w-10 h-10 mb-4" />
                  <p className="font-bold">{error}</p>
                  <button 
                    onClick={() => getAccessToken().then(token => token && fetchFiles(token))}
                    className="mt-4 text-sm font-bold text-blue-600 hover:underline"
                  >
                    Riprova
                  </button>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
                  <FileText className="w-12 h-12 mb-4" />
                  <p className="text-sm font-bold leading-relaxed">Nessun file musicale trovato in Google Drive.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {files.map(file => (
                    <button
                      key={file.id}
                      onClick={() => handleFileClick(file)}
                      disabled={loading}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl text-left hover:bg-blue-50/50 hover:shadow-sm border border-transparent transition-all group active:scale-[0.99] disabled:opacity-50"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center border border-zinc-100 group-hover:border-blue-200">
                        <FileText className={`w-6 h-6 ${file.mimeType === 'application/pdf' ? 'text-red-500' : 'text-blue-500'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-zinc-900 truncate">{file.name}</h3>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-1">
                          {file.mimeType.split('/').pop()?.toUpperCase()}
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
