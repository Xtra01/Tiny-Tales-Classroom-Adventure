import React, { useState, useRef, useEffect } from 'react';
import { StoryData } from '../types';
import { Volume2, ArrowRight, ArrowLeft, Home, Sparkles, Image as ImageIcon, RotateCcw, PartyPopper } from 'lucide-react';

interface StoryBookProps {
  story: StoryData;
  onBack: () => void;
  onOpenManager: () => void;
}

const StoryBook: React.FC<StoryBookProps> = ({ story, onBack, onOpenManager }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const currentPage = story.pages[currentIndex];
  const totalPages = story.pages.length;

  // Simple auto-play audio if available when page changes
  useEffect(() => {
    if (!showSummary) {
      const audioUrl = currentPage.audioUrl;
      const audioEl = audioRef.current;
      if (audioUrl && audioEl) {
        audioEl.src = audioUrl;
        audioEl.play().catch(() => {});
      }
    }
  }, [currentIndex, currentPage.audioUrl, showSummary]);

  const handleNext = () => {
    if (currentIndex < totalPages - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
        // End of story - show summary
        setShowSummary(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleReplay = (specificUrl?: string) => {
    if (audioRef.current) {
      const urlToPlay = specificUrl || currentPage.audioUrl;
      if (urlToPlay) {
        audioRef.current.src = urlToPlay;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Playback failed:", e));
      }
    }
  };

  const handleRestart = () => {
      setShowSummary(false);
      setCurrentIndex(0);
  };

  // --- SECRET ADMIN ACCESS LOGIC ---
  const handlePressStart = () => {
    longPressTimer.current = setTimeout(() => {
      onOpenManager();
    }, 2000); // 2 seconds hold to open manager
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const progress = ((currentIndex + 1) / totalPages) * 100;

  // --- SUMMARY VIEW RENDERER ---
  if (showSummary) {
      return (
        <div className="flex flex-col h-screen max-w-5xl mx-auto p-4 md:p-8 select-none relative">
            
            {/* Confetti Background Effect (Simple CSS) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="absolute animate-[fall_3s_infinite]" 
                         style={{
                             left: `${Math.random() * 100}%`,
                             top: `-${Math.random() * 20}%`,
                             animationDelay: `${Math.random() * 2}s`,
                             fontSize: `${Math.random() * 20 + 20}px`
                         }}>
                        {['🎉', '⭐', '🎈', '✨'][Math.floor(Math.random() * 4)]}
                    </div>
                ))}
            </div>

            <div className="flex justify-between items-center mb-6 relative z-10">
                <button onClick={onBack} className="flex items-center gap-2 bg-white text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-full font-bold transition-colors shadow-sm">
                    <Home size={20} /> Home
                </button>
                <div className="text-3xl font-bold text-sky-700 font-[Fredoka]">Well Done!</div>
                <div className="w-24"></div> 
            </div>

            <div className="flex-1 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border-8 border-white p-8 flex flex-col items-center relative z-10">
                <div className="mb-6 text-center">
                    <h2 className="text-4xl font-bold text-orange-500 font-[Fredoka] mb-2">Story Map</h2>
                    <p className="text-slate-500 text-lg">Tap the pictures to tell the story again!</p>
                </div>

                {/* The Map */}
                <div className="flex-1 w-full overflow-x-auto overflow-y-hidden flex items-center gap-6 px-4 pb-4 snap-x">
                    {story.pages.map((page, idx) => (
                        <div key={page.id} className="relative flex-shrink-0 snap-center group cursor-pointer" onClick={() => handleReplay(page.audioUrl)}>
                             {/* Connector Line */}
                             {idx < story.pages.length - 1 && (
                                 <div className="absolute top-1/2 -right-6 w-6 h-2 bg-sky-200 z-0"></div>
                             )}

                             <div className="w-48 h-48 md:w-64 md:h-64 bg-white rounded-2xl shadow-lg border-4 border-sky-100 overflow-hidden relative z-10 transition-transform hover:scale-105 active:scale-95">
                                {page.imageUrl ? (
                                    <img src={page.imageUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-sky-50 text-sky-200">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Volume2 className="text-white drop-shadow-md" size={48} />
                                </div>
                             </div>
                             <div className="text-center mt-3 font-bold text-sky-600 bg-white inline-block px-3 py-1 rounded-full shadow-sm text-sm">
                                Page {idx + 1}
                             </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="mt-8 flex gap-4">
                    <button onClick={handleRestart} className="flex items-center gap-2 px-8 py-4 bg-sky-100 text-sky-700 rounded-2xl font-bold text-xl hover:bg-sky-200 transition-colors">
                        <RotateCcw /> Read Again
                    </button>
                    <button onClick={onBack} className="flex items-center gap-2 px-8 py-4 bg-orange-500 text-white rounded-2xl font-bold text-xl hover:bg-orange-600 shadow-lg hover:scale-105 transition-transform">
                        <Sparkles /> New Story
                    </button>
                </div>
            </div>

            <audio ref={audioRef} className="hidden" />
            <style>{`
                @keyframes fall {
                    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
                }
            `}</style>
        </div>
      );
  }

  // --- REGULAR READING VIEW ---
  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto p-4 md:p-8 select-none">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 relative">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 bg-white text-slate-600 hover:bg-slate-100 px-4 py-2 rounded-full font-bold transition-colors shadow-sm z-10"
        >
          <Home size={20} />
          Library
        </button>
        
        <div className="text-2xl font-bold text-sky-700 truncate max-w-md hidden md:block">
          {story.title}
        </div>
        
        {/* SECRET TRIGGER AREA: Top Right Page Indicator */}
        <div 
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            className="bg-white/50 px-4 py-2 rounded-full text-sky-800 font-bold cursor-default active:scale-95 transition-transform"
            title="Teacher Access"
        >
          Page {currentIndex + 1} / {totalPages}
        </div>
      </div>

      {/* Book Container */}
      <div className="flex-1 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border-8 border-white ring-4 ring-sky-200">
        
        {/* Illustration Side */}
        <div className="w-full md:w-1/2 bg-sky-50 relative flex items-center justify-center overflow-hidden border-b-4 md:border-b-0 md:border-r-4 border-sky-100 min-h-[300px]">
          {currentPage.imageUrl ? (
             <img 
                src={currentPage.imageUrl} 
                alt="Story Illustration"
                className="w-full h-full object-cover animate-[fadeIn_0.5s_ease-in]"
              />
          ) : (
            // Student-Friendly Placeholder
            <div className="flex flex-col items-center justify-center p-8 text-center text-sky-200">
               <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                  <Sparkles size={64} className="text-sky-300" />
               </div>
               <p className="font-[Fredoka] text-xl text-sky-400 opacity-60">Imagine the scene...</p>
            </div>
          )}
        </div>

        {/* Text Side */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center items-center bg-yellow-50/50 relative">
          
          <div className="flex-1 flex flex-col justify-center items-center w-full">
            <p className="text-4xl md:text-6xl leading-tight text-center font-bold text-slate-800 font-[Fredoka] mb-12 drop-shadow-sm">
              {currentPage.text}
            </p>

            {/* Audio Controls */}
            <div className="flex flex-col items-center gap-4 min-h-[80px] justify-center">
              {currentPage.audioUrl ? (
                <button 
                  onClick={() => handleReplay()}
                  className="flex items-center gap-3 px-8 py-6 rounded-3xl bg-orange-400 hover:bg-orange-500 text-white shadow-[0_8px_0_rgb(194,65,12)] active:shadow-none active:translate-y-2 transition-all font-bold text-2xl"
                  aria-label="Replay Audio"
                >
                  <Volume2 size={36} />
                  Listen
                </button>
              ) : (
                 // Empty state for audio - keeps layout stable but invisible to student
                 <div className="h-20" />
              )}
            </div>
          </div>

          <audio ref={audioRef} className="hidden" />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="mt-8 flex justify-between items-center px-4">
        <button 
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-xl font-bold transition-all
            ${currentIndex === 0 ? 'opacity-0 pointer-events-none' : 'bg-white text-sky-600 hover:bg-sky-50 shadow-lg hover:scale-105'}`}
        >
          <ArrowLeft size={28} /> Back
        </button>

        <div className="w-1/3 h-4 bg-white/50 rounded-full overflow-hidden mx-4 hidden md:block">
          <div 
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <button 
          onClick={handleNext} 
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl text-xl font-bold shadow-xl transition-all hover:scale-105
            ${currentIndex === totalPages - 1 ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-sky-500 text-white hover:bg-sky-600'}`}
        >
          {currentIndex === totalPages - 1 ? (
              <>Finish! <PartyPopper size={28} /></>
          ) : (
              <>Next <ArrowRight size={28} /></>
          )}
        </button>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default StoryBook;