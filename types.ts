/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ViewType, Score, Folder } from './types';
import { getScoresMetadata, getFolders } from './lib/db';
import LibraryView from './components/LibraryView';
import ReaderView from './components/ReaderView';
import ConverterView from './components/ConverterView';
import InstallPrompt from './components/InstallPrompt';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState<ViewType>('library');
  const [selectedScoreId, setSelectedScoreId] = useState<string | undefined>();
  const [scores, setScores] = useState<Score[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    async function loadData() {
      const s = await getScoresMetadata();
      const f = await getFolders();
      setScores(s);
      setFolders(f);
    }
    loadData();
  }, [view]);

  const handleOpenScore = (id: string) => {
    setSelectedScoreId(id);
    setView('reader');
  };

  const handleBackToLibrary = () => {
    setView('library');
    setSelectedScoreId(undefined);
  };

  return (
    <div className="min-h-screen bg-[#E9EDF2] text-zinc-800 font-sans relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-200 rounded-full blur-[120px] opacity-40"></div>
        <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-indigo-200 rounded-full blur-[150px] opacity-30"></div>
        <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-orange-100 rounded-full blur-[100px] opacity-40"></div>
      </div>

      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="wait">
          {view === 'library' ? (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-screen overflow-auto"
            >
              <LibraryView 
                scores={scores} 
                folders={folders} 
                onOpenScore={handleOpenScore} 
                onOpenConverter={() => setView('converter')}
                refreshData={() => {
                  getScoresMetadata().then(setScores);
                  getFolders().then(setFolders);
                }}
              />
            </motion.div>
          ) : view === 'converter' ? (
            <motion.div
              key="converter"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-screen overflow-auto"
            >
              <ConverterView onBack={handleBackToLibrary} />
            </motion.div>
          ) : (
            <motion.div
              key="reader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="fixed inset-0 z-50 overflow-hidden bg-black/20 backdrop-blur-3xl"
            >
              {selectedScoreId && (
                <ReaderView 
                  scoreId={selectedScoreId} 
                  onBack={handleBackToLibrary} 
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <InstallPrompt />
    </div>
  );
}

