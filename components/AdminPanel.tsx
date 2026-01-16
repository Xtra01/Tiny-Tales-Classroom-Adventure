import React, { useState, useEffect } from 'react';
import { StoryData, StoryPage, AppSettings } from '../types';
import { generateIllustration, generateSpeech, enhancePrompt } from '../services/geminiService';
import { X, Save, Play, RefreshCw, Image as ImageIcon, Volume2, Upload, Wand2, Layers, BookOpen, Plus, Sparkles, Zap, Loader2 } from 'lucide-react';

interface AdminPanelProps {
  story: StoryData | null; // Story is now optional (for global settings mode)
  settings: AppSettings;
  onUpdateStory: (updatedStory: StoryData) => void;
  onUpdateSettings: (newSettings: AppSettings) => void;
  onCreateStory: () => Promise<void>; // Function to trigger story creation from app
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ story, settings, onUpdateStory, onUpdateSettings, onCreateStory, onClose }) => {
  // If no story is provided, default to prompts tab
  const [activeTab, setActiveTab] = useState<'visuals' | 'audio' | 'prompts'>(story ? 'visuals' : 'prompts');
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [globalProcessing, setGlobalProcessing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState<'story' | 'image' | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);

  useEffect(() => {
    if (!story) {
      setActiveTab('prompts');
    } else {
        // If we just created a story, switch to visuals to see it
        setActiveTab('visuals');
    }
  }, [story?.id]); // Only switch when story ID changes (new story loaded)

  // --- BATCH GENERATION HELPERS ---

  const generateAllImages = async () => {
    if (!story) return;
    setGlobalProcessing(true);
    const newPages = [...story.pages];
    
    // Process sequentially to be kind to the API rate limits
    for (let i = 0; i < newPages.length; i++) {
        if (!newPages[i].imageUrl) {
            setProcessing(prev => ({ ...prev, [`img-${newPages[i].id}`]: true }));
            const url = await generateIllustration(story.characterDescription, newPages[i].imagePrompt, settings.imageStylePrompt);
            newPages[i].imageUrl = url;
            setProcessing(prev => ({ ...prev, [`img-${newPages[i].id}`]: false }));
            onUpdateStory({ ...story, pages: [...newPages] });
        }
    }
    setGlobalProcessing(false);
  };

  const generateAllAudio = async () => {
    if (!story) return;
    setGlobalProcessing(true);
    const newPages = [...story.pages];
    for (let i = 0; i < newPages.length; i++) {
        if (!newPages[i].audioUrl) {
            setProcessing(prev => ({ ...prev, [`aud-${newPages[i].id}`]: true }));
            const url = await generateSpeech(newPages[i].text, settings.audioVoice);
            newPages[i].audioUrl = url;
            setProcessing(prev => ({ ...prev, [`aud-${newPages[i].id}`]: false }));
            onUpdateStory({ ...story, pages: [...newPages] });
        }
    }
    setGlobalProcessing(false);
  };

  const forceRegenerateAllImages = async () => {
    if (!story) return;
    if(!confirm("This will replace ALL existing images. Are you sure?")) return;
    setGlobalProcessing(true);
    const newPages = [...story.pages];
    for (let i = 0; i < newPages.length; i++) {
        setProcessing(prev => ({ ...prev, [`img-${newPages[i].id}`]: true }));
        const url = await generateIllustration(story.characterDescription, newPages[i].imagePrompt, settings.imageStylePrompt);
        newPages[i].imageUrl = url;
        setProcessing(prev => ({ ...prev, [`img-${newPages[i].id}`]: false }));
        onUpdateStory({ ...story, pages: [...newPages] });
    }
    setGlobalProcessing(false);
  };

  // --- SINGLE ITEM ACTIONS ---

  const handleRegenerateImage = async (pageId: string, prompt: string) => {
    if (!story) return;
    setProcessing(prev => ({ ...prev, [`img-${pageId}`]: true }));
    const url = await generateIllustration(story.characterDescription, prompt, settings.imageStylePrompt);
    const updatedPages = story.pages.map(p => p.id === pageId ? { ...p, imageUrl: url } : p);
    onUpdateStory({ ...story, pages: updatedPages });
    setProcessing(prev => ({ ...prev, [`img-${pageId}`]: false }));
  };

  const handleRegenerateAudio = async (pageId: string, text: string) => {
    if (!story) return;
    setProcessing(prev => ({ ...prev, [`aud-${pageId}`]: true }));
    const url = await generateSpeech(text, settings.audioVoice);
    const updatedPages = story.pages.map(p => p.id === pageId ? { ...p, audioUrl: url } : p);
    onUpdateStory({ ...story, pages: updatedPages });
    setProcessing(prev => ({ ...prev, [`aud-${pageId}`]: false }));
  };

  const handleManualUpload = (pageId: string, file: File) => {
    if (!story) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const updatedPages = story.pages.map(p => p.id === pageId ? { ...p, imageUrl: reader.result as string } : p);
      onUpdateStory({ ...story, pages: updatedPages });
    };
    reader.readAsDataURL(file);
  };

  // --- PROMPT ENGINEERING ACTIONS ---

  const handleEnhancePrompt = async (type: 'STORY' | 'IMAGE') => {
    const currentText = type === 'STORY' ? settings.storyPrompt : settings.imageStylePrompt;
    if (!currentText) return;
    
    if (type === 'STORY') setIsEnhancing('story');
    else setIsEnhancing('image');

    const enhanced = await enhancePrompt(currentText, type);

    if (type === 'STORY') onUpdateSettings({ ...settings, storyPrompt: enhanced });
    else onUpdateSettings({ ...settings, imageStylePrompt: enhanced });

    setIsEnhancing(null);
  };

  const handleCreateStoryInside = async () => {
    setIsCreatingStory(true);
    try {
        await onCreateStory();
        // The App component will update the 'story' prop, triggering the useEffect to switch to visuals
    } catch (e) {
        console.error(e);
        alert("Failed to create story");
    } finally {
        setIsCreatingStory(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border-4 border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-100 p-4 flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-sm">
                <Layers className="text-sky-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-700">
                {story ? `Editing: ${story.title}` : 'Global Settings & Production'}
              </h2>
              {story && <p className="text-xs text-slate-500 font-mono">{story.id.split('-')[0]}</p>}
            </div>
          </div>

          <div className="flex items-center gap-4">
             {/* QUICK CREATE BUTTON */}
             <button 
                onClick={handleCreateStoryInside}
                disabled={isCreatingStory}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-400 to-rose-500 text-white px-6 py-2 rounded-full font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
             >
                {isCreatingStory ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                {isCreatingStory ? 'Writing...' : 'Generate New Story'}
             </button>

            <button onClick={onClose} className="p-2 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                <X size={28} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white">
          <button 
             onClick={() => setActiveTab('prompts')}
             className={`flex-1 py-4 font-bold flex justify-center items-center gap-2 transition-colors border-b-4 ${activeTab === 'prompts' ? 'text-amber-600 border-amber-500 bg-amber-50' : 'text-slate-400 border-transparent hover:bg-slate-50'}`}
          >
            <Wand2 size={20} /> Prompt Engineering
          </button>
          {story && (
            <>
              <button 
                onClick={() => setActiveTab('visuals')}
                className={`flex-1 py-4 font-bold flex justify-center items-center gap-2 transition-colors border-b-4 ${activeTab === 'visuals' ? 'text-indigo-600 border-indigo-600 bg-indigo-50' : 'text-slate-400 border-transparent hover:bg-slate-50'}`}
              >
                <ImageIcon size={20} /> Visual Director
              </button>
              <button 
                onClick={() => setActiveTab('audio')}
                className={`flex-1 py-4 font-bold flex justify-center items-center gap-2 transition-colors border-b-4 ${activeTab === 'audio' ? 'text-rose-600 border-rose-600 bg-rose-50' : 'text-slate-400 border-transparent hover:bg-slate-50'}`}
              >
                <Volume2 size={20} /> Audio Studio
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          {/* VISUALS TAB */}
          {activeTab === 'visuals' && story && (
            <div className="space-y-6">
              <div className="flex gap-4 mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 items-center justify-between">
                <div>
                    <h3 className="font-bold text-indigo-900">Batch Production</h3>
                    <p className="text-sm text-indigo-700/60">Generate all assets for this story at once.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                    onClick={generateAllImages}
                    disabled={globalProcessing}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                    {globalProcessing ? <RefreshCw className="animate-spin" /> : <Wand2 size={18} />}
                    Fill Missing
                    </button>
                    <button 
                    onClick={forceRegenerateAllImages}
                    disabled={globalProcessing}
                    className="bg-white text-indigo-600 border-2 border-indigo-600 px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-50 disabled:opacity-50 text-sm"
                    >
                    Regenerate All
                    </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {story.pages.map((page, idx) => (
                   <div key={page.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 group hover:shadow-md transition-shadow">
                      <div className="flex justify-between mb-2 px-1">
                        <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Page {idx + 1}</span>
                      </div>
                      <div className="aspect-square bg-slate-100 rounded-xl mb-3 overflow-hidden relative">
                        {page.imageUrl ? (
                          <img src={page.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">No Image</div>
                        )}
                        
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                           <button 
                             onClick={() => handleRegenerateImage(page.id, page.imagePrompt)}
                             disabled={processing[`img-${page.id}`]}
                             className="bg-white text-indigo-700 px-4 py-2 rounded-full font-bold text-xs hover:scale-105 transition-transform flex items-center gap-2 shadow-lg w-32 justify-center"
                           >
                              <RefreshCw size={14} className={processing[`img-${page.id}`] ? "animate-spin" : ""} />
                              Regenerate
                           </button>
                           <label className="bg-white text-slate-700 px-4 py-2 rounded-full font-bold text-xs hover:scale-105 transition-transform cursor-pointer flex items-center gap-2 shadow-lg w-32 justify-center">
                              <Upload size={14} />
                              Upload
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleManualUpload(page.id, e.target.files[0])} />
                           </label>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-3 italic bg-slate-50 p-2 rounded-lg border border-slate-100 h-16">{page.imagePrompt}</p>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {/* AUDIO TAB */}
          {activeTab === 'audio' && story && (
            <div className="space-y-6">
              <div className="flex gap-4 mb-6 p-4 bg-rose-50 rounded-xl border border-rose-100 items-center justify-between">
                <div>
                    <h3 className="font-bold text-rose-900">Audio Batching</h3>
                    <p className="text-sm text-rose-700/60">Synthesize voiceovers for all text blocks.</p>
                </div>
                <button 
                  onClick={generateAllAudio}
                  disabled={globalProcessing}
                  className="bg-rose-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                   {globalProcessing ? <RefreshCw className="animate-spin" /> : <Wand2 size={18} />}
                   Generate All
                </button>
              </div>

              <div className="space-y-3">
                 {story.pages.map((page, idx) => (
                   <div key={page.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-rose-200 transition-colors">
                      <div className="flex-1 pr-6">
                        <span className="font-bold text-rose-400 text-[10px] uppercase tracking-wider block mb-1">Page {idx + 1}</span>
                        <p className="text-slate-800 font-medium text-lg leading-tight">{page.text}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                         {page.audioUrl && (
                           <button 
                             onClick={() => new Audio(page.audioUrl).play()}
                             className="p-3 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                           >
                             <Play size={20} fill="currentColor" />
                           </button>
                         )}
                         <button 
                           onClick={() => handleRegenerateAudio(page.id, page.text)}
                           disabled={processing[`aud-${page.id}`]}
                           className="p-3 bg-slate-100 text-slate-500 rounded-full hover:bg-slate-200 transition-colors"
                         >
                            <RefreshCw size={20} className={processing[`aud-${page.id}`] ? "animate-spin" : ""} />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {/* PROMPTS TAB - NEW PROFESSIONAL DESIGN */}
          {activeTab === 'prompts' && (
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
              
              {/* Left Column: Narrative */}
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-amber-700 flex items-center gap-2">
                        <BookOpen size={16} /> Story System Prompt
                    </label>
                    <button 
                        onClick={() => handleEnhancePrompt('STORY')}
                        disabled={!!isEnhancing}
                        className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold hover:bg-amber-200 transition-colors flex items-center gap-1"
                    >
                        {isEnhancing === 'story' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        Auto-Enhance
                    </button>
                </div>
                <div className="flex-1 bg-white p-1 rounded-2xl border-2 border-amber-100 shadow-sm focus-within:ring-4 ring-amber-500/20 transition-all relative">
                    <textarea 
                    value={settings.storyPrompt}
                    onChange={(e) => onUpdateSettings({...settings, storyPrompt: e.target.value})}
                    className="w-full h-full p-4 rounded-xl outline-none font-mono text-sm bg-white text-slate-800 resize-none"
                    placeholder="Describe the type of story you want to generate..."
                    />
                </div>
                <p className="text-xs text-slate-400 mt-2 px-1">
                    Defines the pedagogy, vocabulary list, grammar constraints (e.g. "Simple Present"), and JSON structure rules.
                </p>
              </div>

              {/* Right Column: Visuals */}
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                        <ImageIcon size={16} /> Art Direction Prompt
                    </label>
                    <button 
                        onClick={() => handleEnhancePrompt('IMAGE')}
                        disabled={!!isEnhancing}
                        className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold hover:bg-indigo-200 transition-colors flex items-center gap-1"
                    >
                        {isEnhancing === 'image' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        Auto-Enhance
                    </button>
                </div>
                <div className="flex-1 bg-white p-1 rounded-2xl border-2 border-indigo-100 shadow-sm focus-within:ring-4 ring-indigo-500/20 transition-all">
                    <textarea 
                    value={settings.imageStylePrompt}
                    onChange={(e) => onUpdateSettings({...settings, imageStylePrompt: e.target.value})}
                    className="w-full h-full p-4 rounded-xl outline-none font-mono text-sm bg-white text-slate-800 resize-none"
                    placeholder="Describe the art style (e.g. 'Watercolor, vector, pastel colors')..."
                    />
                </div>
                <p className="text-xs text-slate-400 mt-2 px-1">
                    Applied to every generated image. The character description (generated by the story prompt) is automatically appended to this.
                </p>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminPanel;