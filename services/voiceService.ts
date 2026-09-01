/**
 * Voice Service - Real Human-like Neural Voice AI Engine
 * Delivers natural, compassionate human-like speech for Rural Telemedicine & IVR.
 * Supports Hindi, Punjabi, Hinglish, English, Gujarati, Marathi, Bengali, Tamil, Telugu, Kannada, Malayalam.
 * Multi-lingual per-sentence adaptation with zero repeat duplication.
 */

let currentAudioElement: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let isPlaying = false;
let onStateChangeCallback: ((speaking: boolean) => void) | null = null;

// Unique playback session token to prevent concurrent duplicate audio loops
let activeSessionToken = 0;

export const setVoiceStateListener = (callback: (speaking: boolean) => void) => {
  onStateChangeCallback = callback;
};

const notifyState = (speaking: boolean) => {
  isPlaying = speaking;
  if (onStateChangeCallback) {
    onStateChangeCallback(speaking);
  }
};

/**
 * Clean text for natural conversational speech by stripping markdown, emojis & code
 */
export const cleanTextForSpeech = (rawText: string): string => {
  if (!rawText) return '';

  let cleaned = rawText
    // Remove markdown bold, italic, headers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove emojis and special symbols
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}]/gu, '')
    // Replace common medical symbols with spoken words
    .replace(/°C/g, ' degree celsius')
    .replace(/°F/g, ' degree fahrenheit')
    .replace(/\bTDS\b/gi, 'din mein teen baar')
    .replace(/\bBD\b/gi, 'din mein do baar')
    .replace(/\bOD\b/gi, 'din mein ek baar')
    .replace(/\bSTAT\b/gi, 'turant')
    .replace(/₹\s?(\d+)/g, '$1 rupaye')
    .replace(/km\b/gi, ' kilometer')
    .replace(/min\b/gi, ' minute')
    // Clean remaining punctuation
    .replace(/[-_~*#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
};

/**
 * Split long text into non-duplicate natural sentence chunks (under 180 chars)
 */
const splitIntoSentences = (text: string): string[] => {
  const rawSentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
  const chunks: string[] = [];
  const seenSentences = new Set<string>();

  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    // Filter out accidental duplicate consecutive sentences
    const normalized = trimmed.toLowerCase();
    if (seenSentences.has(normalized)) {
      continue;
    }
    seenSentences.add(normalized);

    if (trimmed.length <= 180) {
      chunks.push(trimmed);
    } else {
      const parts = trimmed.split(/[,،;]\s*/);
      let currentChunk = '';
      for (const p of parts) {
        if ((currentChunk + ' ' + p).length <= 180) {
          currentChunk = currentChunk ? `${currentChunk}, ${p}` : p;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = p;
        }
      }
      if (currentChunk) chunks.push(currentChunk);
    }
  }

  return chunks.filter(c => c.trim().length > 0);
};

/**
 * Detect language code with full pan-Indian multilingual recognition
 */
export const detectSpeechLanguage = (text: string): { langCode: string; ttsLang: string } => {
  // Unicode ranges for Indian scripts
  const isHindi = /[\u0900-\u097F]/.test(text);
  const isPunjabi = /[\u0A00-\u0A7F]/.test(text);
  const isGujarati = /[\u0A80-\u0AFF]/.test(text);
  const isBengali = /[\u0980-\u09FF]/.test(text);
  const isTamil = /[\u0B80-\u0BFF]/.test(text);
  const isTelugu = /[\u0C00-\u0C7F]/.test(text);
  const isKannada = /[\u0C80-\u0CFF]/.test(text);
  const isMalayalam = /[\u0D00-\u0D7F]/.test(text);

  if (isPunjabi) return { langCode: 'pa-IN', ttsLang: 'pa' };
  if (isGujarati) return { langCode: 'gu-IN', ttsLang: 'gu' };
  if (isBengali) return { langCode: 'bn-IN', ttsLang: 'bn' };
  if (isTamil) return { langCode: 'ta-IN', ttsLang: 'ta' };
  if (isTelugu) return { langCode: 'te-IN', ttsLang: 'te' };
  if (isKannada) return { langCode: 'kn-IN', ttsLang: 'kn' };
  if (isMalayalam) return { langCode: 'ml-IN', ttsLang: 'ml' };
  if (isHindi) return { langCode: 'hi-IN', ttsLang: 'hi' };

  // Hinglish / Punjabi transliterated in Latin alphabet
  const isHinglish = /\b(namaste|sat sri akal|bukhar|khansi|dard|dawa|upchaar|kripya|aapko|takleef|hai|haan|theek|bataiye|doctor|kem cho|kasa kay|vanakkam|elavunnaru)\b/i.test(text);
  if (isHinglish) {
    return { langCode: 'hi-IN', ttsLang: 'hi' };
  }

  // English
  return { langCode: 'en-IN', ttsLang: 'en-IN' };
};

/**
 * Stop any ongoing speech playback
 */
export const stopRealisticVoice = () => {
  activeSessionToken++;
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  notifyState(false);
};

/**
 * Play text using High-Definition Human Cloud Audio with per-sentence language adaptation and zero repeating
 */
export const playRealisticVoice = async (text: string): Promise<void> => {
  const clean = cleanTextForSpeech(text);
  if (!clean) return;

  stopRealisticVoice();
  notifyState(true);

  const sessionToken = ++activeSessionToken;
  const chunks = splitIntoSentences(clean);

  if (chunks.length === 0) {
    notifyState(false);
    return;
  }

  let chunkIndex = 0;

  const playNextChunk = async () => {
    if (sessionToken !== activeSessionToken) {
      return;
    }

    if (chunkIndex >= chunks.length) {
      notifyState(false);
      return;
    }

    const currentText = chunks[chunkIndex++];
    const { langCode, ttsLang } = detectSpeechLanguage(currentText);
    const streamUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      currentText
    )}&tl=${ttsLang}&client=tw-ob`;

    let chunkHandled = false;

    const handleChunkEnd = () => {
      if (chunkHandled || sessionToken !== activeSessionToken) return;
      chunkHandled = true;
      playNextChunk();
    };

    const triggerBrowserFallback = () => {
      if (chunkHandled || sessionToken !== activeSessionToken) return;
      chunkHandled = true;
      playViaBrowserSynthesis(currentText, langCode, () => {
        if (sessionToken === activeSessionToken) {
          playNextChunk();
        }
      });
    };

    try {
      const audio = new Audio(streamUrl);
      currentAudioElement = audio;

      audio.onended = () => {
        handleChunkEnd();
      };

      audio.onerror = () => {
        triggerBrowserFallback();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          triggerBrowserFallback();
        });
      }
    } catch (err) {
      triggerBrowserFallback();
    }
  };

  await playNextChunk();
};

/**
 * Fallback: Natural browser speech synthesis with enhanced Indian voices
 */
const playViaBrowserSynthesis = (text: string, langCode: string, onComplete: () => void) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onComplete();
    return;
  }

  let completed = false;
  const finish = () => {
    if (!completed) {
      completed = true;
      onComplete();
    }
  };

  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;

  utterance.rate = 0.95;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();

  const naturalVoice =
    voices.find(v => (v.name.includes('Natural') || v.name.includes('Online')) && v.lang.includes(langCode)) ||
    voices.find(v => v.name.includes('Google') && (v.lang.includes(langCode) || v.lang.includes('hi') || v.lang.includes('IN'))) ||
    voices.find(v => v.lang.includes(langCode)) ||
    voices.find(v => v.lang.includes('IN')) ||
    voices[0];

  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  utterance.onend = finish;
  utterance.onerror = finish;

  window.speechSynthesis.speak(utterance);
};
