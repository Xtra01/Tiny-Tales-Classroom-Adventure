/*
 * Copyright (c) 2024 Tiny Tales Team. All Rights Reserved.
 * This software is proprietary and confidential.
 */

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { StoryData, StoryPage } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper for rate limiting/quota issues
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const isQuotaError = error?.status === 429 || error?.code === 429 || 
                         (error?.message && error.message.includes('429')) ||
                         (error?.message && error.message.includes('quota'));
    
    if (retries > 0 && isQuotaError) {
      console.warn(`Quota exceeded. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

const pcmToWav = (base64PCM: string, sampleRate: number = 24000): string => {
  const binaryString = atob(base64PCM);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); 
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); 
  view.setUint16(34, 16, true); 
  writeString(view, 36, 'data');
  view.setUint32(40, len, true);

  const headerBytes = new Uint8Array(wavHeader);
  const wavBytes = new Uint8Array(headerBytes.length + bytes.length);
  wavBytes.set(headerBytes);
  wavBytes.set(bytes, headerBytes.length);

  let binary = '';
  const lenWav = wavBytes.byteLength;
  for (let i = 0; i < lenWav; i += 1024) {
      binary += String.fromCharCode.apply(null, Array.from(wavBytes.slice(i, i + 1024)));
  }
  
  return `data:audio/wav;base64,${btoa(binary)}`;
};

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Default Prompts (Can be overridden by Admin Panel)
export const DEFAULT_STORY_PROMPT = `
You are an expert ESL preschool teacher. Write a story for a 5-year-old (Level A0).
Target Vocab: school bag, classroom, book, pencil, desk, chair, door, window.

CRITICAL:
1. Define a "characterDescription" field first. This must be a detailed visual description (e.g., "A small boy with messy red hair, blue t-shirt with a star, green shorts"). This will be used for image consistency.
2. Use "Search Logic" (Is it under the X? No.).
3. Simple Present Tense.
4. 6 Pages maximum.
`;

export const DEFAULT_IMAGE_STYLE = "Children's book illustration, flat vector style, bright primary colors, simple clean background, no text, cute, happy.";

export const generateStoryStructure = async (customPrompt: string = DEFAULT_STORY_PROMPT): Promise<StoryData> => {
  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: customPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            characterDescription: { type: Type.STRING, description: "Detailed visual description of the main character to be used in every image prompt for consistency." },
            pages: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING, description: "The specific action for this page (do not repeat character description here, just the action)." }
                },
                required: ["text", "imagePrompt"]
              }
            }
          },
          required: ["title", "characterDescription", "pages"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text generated");
    
    const rawData = JSON.parse(text);
    
    // Enrich with IDs
    return {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      title: rawData.title,
      characterDescription: rawData.characterDescription,
      pages: rawData.pages.map((p: any) => ({
        ...p,
        id: crypto.randomUUID()
      }))
    };
  });
};

export const generateIllustration = async (characterDesc: string, actionPrompt: string, stylePrompt: string = DEFAULT_IMAGE_STYLE): Promise<string> => {
  // We combine the Style + Character "Bible" + Specific Action to ensure consistency
  const finalPrompt = `${stylePrompt}. CHARACTER: ${characterDesc}. SCENE: ${actionPrompt}`;

  try {
    return await retryWithBackoff(async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: finalPrompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image generated");
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return `https://placehold.co/1024x1024/e0f2fe/0ea5e9?text=Error`; 
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  try {
    return await retryWithBackoff(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio generated");
      return pcmToWav(base64Audio, 24000);
    });
  } catch (error) {
    console.error("Error generating speech:", error);
    return "";
  }
};

/**
 * AI-powered prompt enhancement.
 * Takes a raw user idea and converts it into a structured, professional system prompt.
 */
export const enhancePrompt = async (currentPrompt: string, type: 'STORY' | 'IMAGE'): Promise<string> => {
  try {
    return await retryWithBackoff(async () => {
      const metaPrompt = type === 'STORY' 
        ? `You are a prompt engineer. The user will provide a rough idea for a children's story generator. 
           Rewrite it into a strict, high-quality system instruction for an LLM.
           Include rules for: Level A0 English, Simple Present Tense, defining a consistent character description, and JSON structure output.
           Keep it concise but technical.
           
           User Input: "${currentPrompt}"`
        : `You are an art director. The user will provide a rough idea for an illustration style.
           Rewrite it into a high-quality stable-diffusion style prompt. 
           Focus on lighting, art style (vector, watercolor, etc), color palette, and mood.
           Do NOT include specific subjects, just the style description.
           
           User Input: "${currentPrompt}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: metaPrompt,
      });

      return response.text?.trim() || currentPrompt;
    });
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return currentPrompt;
  }
};