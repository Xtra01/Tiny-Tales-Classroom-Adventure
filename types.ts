export interface StoryPage {
  id: string; // Unique ID for the page (for updates)
  text: string;
  imagePrompt: string; // The specific action
  imageUrl?: string;
  audioUrl?: string;
}

export interface StoryData {
  id: string;
  createdAt: number;
  title: string;
  characterDescription: string; // Visual Bible for consistency
  pages: StoryPage[];
}

export interface AppSettings {
  storyPrompt: string;
  imageStylePrompt: string;
  audioVoice: string;
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING_STORY = 'GENERATING_STORY',
  READING = 'READING',
  ADMIN = 'ADMIN', // New Manager View
  ERROR = 'ERROR'
}

export interface VocabularyItem {
  word: string;
  image: string;
}