/*
 * Copyright (c) 2024 Tiny Tales Team. All Rights Reserved.
 * This software is proprietary and confidential.
 */

import React, { useState } from 'react';
import { generateStoryStructure, DEFAULT_STORY_PROMPT, DEFAULT_IMAGE_STYLE } from './services/geminiService';
import StoryBook from './components/StoryBook';
import LoadingOverlay from './components/LoadingOverlay';
import AdminPanel from './components/AdminPanel';
import { StoryData, AppState, AppSettings } from './types';
import { Sparkles, BookOpen, Star, Settings, Library, Plus, Pencil } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [stories, setStories] = useState<StoryData[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // App Configuration
  const [settings, setSettings] = useState<AppSettings>({
    storyPrompt: DEFAULT_STORY_PROMPT,
    imageStylePrompt: DEFAULT_IMAGE_STYLE,
    audioVoice: 'Kore'
  });

  const activeStory = stories.find(s => s.id === currentStoryId) || null;

  // This function is now also used by the AdminPanel
  const startStory = async () => {
    // If called from IDLE state, show full screen loader.
    // If called from AdminPanel, AdminPanel handles its own loading state, 
    // but we still need to generate and set data.
    
    if (appState === AppState.IDLE) {
        setAppState(AppState.GENERATING_STORY);
    }
    
    setError(null);
    try {
      const newStory = await generateStoryStructure(settings.storyPrompt);
      setStories(prev => [newStory, ...prev]);
      setCurrentStoryId(newStory.id);
      
      // If we were in IDLE, go to READING. 
      // If we are in ADMIN, we stay in ADMIN (App state remains ADMIN), but the activeStory updates.
      if (appState === AppState.GENERATING_STORY || appState === AppState.IDLE) {
          setAppState(AppState.READING);
      }
    } catch (err) {
      console.error(err);
      setError("Oops! The magical story machine needs a break. Please try again.");
      if (appState === AppState.GENERATING_STORY) {
        setAppState(AppState.ERROR);
      }
      throw err; // Re-throw so AdminPanel knows it failed
    }
  };

  const handleUpdateActiveStory = (updatedStory: StoryData) => {
    setStories(prev => prev.map(s => s.id === updatedStory.id ? updatedStory : s));
  };

  const handleOpenStory = (id: string) => {
    setCurrentStoryId(id);
    setAppState(AppState.READING);
  };

  const handleEditStory = (id: string) => {
    setCurrentStoryId(id);
    setAppState(AppState.ADMIN);
  };

  const handleGlobalSettings = () => {
    setCurrentStoryId(null);
    setAppState(AppState.ADMIN);
  };

  // --- RENDERERS ---

  if (appState === AppState.GENERATING_STORY) {
    return <LoadingOverlay message="Writing a magical story for you..." />;
  }

  if (appState === AppState.READING && activeStory) {
    return (
      <>
        <StoryBook 
          story={activeStory} 
          onBack={() => setAppState(AppState.IDLE)}
          onOpenManager={() => setAppState(AppState.ADMIN)}
        />
      </>
    );
  }

  if (appState === AppState.ADMIN) {
      return (
          <AdminPanel 
            story={activeStory}
            settings={settings}
            onUpdateStory={handleUpdateActiveStory}
            onUpdateSettings={setSettings}
            onCreateStory={startStory}
            onClose={() => setAppState(AppState.IDLE)}
          />
      );
  }

  // --- MAIN MENU / LIBRARY ---

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 via-sky-200 to-yellow-100 flex flex-col p-4">
      
      {/* Navbarish */}
      <div className="flex justify-between items-center max-w-6xl mx-auto w-full py-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2 drop-shadow-md">
            <BookOpen className="text-yellow-300" /> Tiny Tales
        </h1>
        
        {/* Global Settings Button */}
        <button 
            onClick={handleGlobalSettings}
            className="p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors backdrop-blur-sm"
            title="Global Settings"
        >
            <Settings size={24} />
        </button>
      </div>

      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-8">
        
        {/* Left: Create New */}
        <div className="md:w-1/3 flex flex-col justify-center">
            <div className="bg-white/80 backdrop-blur-md rounded-[3rem] shadow-2xl p-8 text-center border-8 border-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-400 to-rose-400"></div>
                
                <h2 className="text-4xl font-bold text-sky-700 mb-6 font-[Fredoka]">New Adventure</h2>
                <p className="text-slate-500 mb-8 text-lg">Create a brand new story with a unique character!</p>

                {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4 text-sm">{error}</div>}

                <button
                    onClick={startStory}
                    className="w-full group relative inline-flex items-center justify-center px-8 py-6 overflow-hidden font-bold text-white transition-all duration-300 bg-orange-500 rounded-3xl hover:bg-orange-600 hover:scale-105 shadow-xl"
                >
                    <span className="relative flex items-center gap-3 text-2xl font-[Fredoka]">
                        <Sparkles className="animate-pulse" />
                        Create Story
                    </span>
                </button>
            </div>
        </div>

        {/* Right: Library */}
        <div className="md:w-2/3">
            <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] p-8 h-full min-h-[500px] flex flex-col shadow-xl">
                <h3 className="text-2xl font-bold text-sky-800 mb-6 flex items-center gap-2">
                    <Library /> Your Story Library
                </h3>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {stories.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <BookOpen size={64} className="mb-4" />
                            <p className="text-xl font-[Fredoka]">No stories yet.</p>
                            <p>Create your first one on the left!</p>
                        </div>
                    ) : (
                        stories.map((s) => (
                            <div key={s.id} className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-between group border border-transparent hover:border-sky-200">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                                        {/* Show first image as thumb if available */}
                                        {s.pages.find(p => p.imageUrl)?.imageUrl ? (
                                            <img src={s.pages.find(p => p.imageUrl)?.imageUrl} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-700">{s.title}</h4>
                                        <p className="text-xs text-slate-400">
                                            {new Date(s.createdAt).toLocaleDateString()} • {s.pages.length} Pages
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleEditStory(s.id); }}
                                        className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-full transition-colors"
                                        title="Manage Story Assets"
                                    >
                                        <Pencil size={20} />
                                    </button>
                                    <button 
                                        onClick={() => handleOpenStory(s.id)}
                                        className="bg-sky-100 text-sky-600 px-6 py-2 rounded-full font-bold group-hover:bg-sky-500 group-hover:text-white transition-colors"
                                    >
                                        Read
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>

      </div>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;