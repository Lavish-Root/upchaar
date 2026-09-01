/**
 * Voice Service - Real Human-like Neural Voice AI Engine
 * Delivers natural, compassionate human-like speech for Rural Telemedicine & IVR.
 * Supports Hindi, Punjabi, Hinglish, and Indian English with high-definition audio streaming.
 */

let currentAudioElement: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
let speechQueue: string[] = [];
let isPlaying = false;
let onStateChangeCallback: ((speaking: boolean) => void) | null = null;

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
 * Split long text into natural sentence chunks (under 180 chars) for seamless streaming
 */
const splitIntoSentences = (text: string): string[] => {
  const sentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
  const chunks: string[] = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if (trimmed.length <= 180) {
      chunks.push(trimmed);
    } else {
      // Split by commas or pauses if sentence is too long
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
 * Detect language code for natural speech synthesis
 */
export const detectSpeechLanguage = (text: string): { langCode: string; ttsLang: string } => {
  const isHindi = /[\u0900-\u097F]/.test(text);
  const isPunjabi = /[\u0A00-\u0A7F]/.test(text);

  if (isPunjabi) {
    return { langCode: 'pa-IN', ttsLang: 'pa' };
  }
  if (isHindi) {
    return { langCode: 'hi-IN', ttsLang: 'hi' };
  }

  // Check for common Hinglish keywords (Namaste, bukhar, dard, takleef, etc.)
  const isHinglish = /\b(namaste|bukhar|khansi|dard|dawa|upchaar|kripya|aapko|takleef|hai|haan|theek|bataiye|doctor)\b/i.test(text);
  if (isHinglish) {
    return { langCode: 'hi-IN', ttsLang: 'hi' };
  }

  return { langCode: 'en-IN', ttsLang: 'en-IN' };
};

/**
 * Stop any ongoing speech playback
 */
export const stopRealisticVoice = () => {
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  speechQueue = [];
  notifyState(false);
};

/**
 * Play text using High-Definition Human Cloud Audio with fallback to Web Speech Neural voice
 */
export const playRealisticVoice = async (text: string): Promise<void> => {
  const clean = cleanTextForSpeech(text);
  if (!clean) return;

  stopRealisticVoice();
  notifyState(true);

  const { langCode, ttsLang } = detectSpeechLanguage(clean);
  const chunks = splitIntoSentences(clean);

  if (chunks.length === 0) {
    notifyState(false);
    return;
  }

  speechQueue = [...chunks];

  const playNextChunk = async () => {
    if (speechQueue.length === 0) {
      notifyState(false);
      return;
    }

    const currentText = speechQueue.shift()!;
    const streamUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      currentText
    )}&tl=${ttsLang}&client=tw-ob`;

    try {
      const audio = new Audio(streamUrl);
      currentAudioElement = audio;

      audio.onended = () => {
        playNextChunk();
      };

      audio.onerror = () => {
        console.warn('Cloud audio stream error, switching to browser Neural synthesis...');
        playViaBrowserSynthesis(currentText, langCode, () => {
          playNextChunk();
        });
      };

      await audio.play();
    } catch (err) {
      console.warn('Direct audio play failed, utilizing browser neural synthesis fallback', err);
      playViaBrowserSynthesis(currentText, langCode, () => {
        playNextChunk();
      });
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

  const utterance = new SpeechSynthesisUtterance(text);
  currentUtterance = utterance;

  utterance.rate = 0.95;
  utterance.pitch = 1.05; // Slightly warmer, conversational pitch

  const voices = window.speechSynthesis.getVoices();

  // Prioritize high-definition Natural / Online neural voices
  const naturalVoice =
    voices.find(v => (v.name.includes('Natural') || v.name.includes('Online')) && v.lang.includes(langCode)) ||
    voices.find(v => v.name.includes('Google') && (v.lang.includes(langCode) || v.lang.includes('hi') || v.lang.includes('IN'))) ||
    voices.find(v => v.lang.includes(langCode)) ||
    voices.find(v => v.lang.includes('IN')) ||
    voices[0];

  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  utterance.onend = () => {
    onComplete();
  };

  utterance.onerror = () => {
    onComplete();
  };

  window.speechSynthesis.speak(utterance);
};
