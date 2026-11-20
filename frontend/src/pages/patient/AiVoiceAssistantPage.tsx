import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Mic, MicOff, Volume2, Bot, ShieldAlert, Globe, Languages, StopCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const AiVoiceAssistantPage: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'en-IN' | 'hi-IN' | 'en-US'>('en-IN');
  const [voiceHistory, setVoiceHistory] = useState<Array<{ text: string; role: 'user' | 'assistant' }>>([]);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startVoiceInput = async () => {
    stopSpeaking();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = speechLanguage;

        recognition.onstart = () => {
          setIsRecording(true);
          setTranscript('Listening... Please speak your symptoms now.');
        };

        recognition.onresult = (event: any) => {
          const speechText = event.results[0][0].transcript;
          setTranscript(speechText);
          setIsRecording(false);
          handleProcessSpeech(speechText);
        };

        recognition.onerror = (event: any) => {
          console.warn('Browser SpeechRecognition error, attempting mic recorder fallback:', event.error);
          setIsRecording(false);
          // If browser recognition fails (e.g. network error), try MediaRecorder + Groq Whisper
          startMediaRecorderFallback();
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
        return;
      } catch (e) {
        console.warn('SpeechRecognition start failed, falling back to MediaRecorder:', e);
      }
    }

    // Fallback: Use MediaRecorder directly
    startMediaRecorderFallback();
  };

  const startMediaRecorderFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleAudioBlobUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript('Recording with microphone (Groq Whisper)... Click Stop Recording when done.');
    } catch (err: any) {
      console.error('Microphone access error:', err);
      setIsRecording(false);
      setTranscript('Microphone permission was denied or not available. Please allow mic access in your browser.');
    }
  };

  const handleAudioBlobUpload = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setTranscript('Transcribing speech with Groq Whisper AI...');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      formData.append('mimeType', 'audio/wav');

      const res: any = await api.post('/ai/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const transcribedText = res.data?.text || res.data?.data?.text;
      if (transcribedText) {
        setTranscript(transcribedText);
        await handleProcessSpeech(transcribedText);
      } else {
        setTranscript('Could not capture clear audio. Please speak closer to the microphone.');
      }
    } catch (err: any) {
      console.error('Audio transcription error:', err);
      setTranscript('Failed to transcribe audio. Please verify backend connection or try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);
  };

  const handleProcessSpeech = async (spokenText: string) => {
    if (!spokenText.trim()) return;

    setIsProcessing(true);
    setVoiceHistory((prev) => [...prev, { text: spokenText, role: 'user' }]);

    try {
      const res: any = await api.post('/ai/voice/turn', { text: spokenText });
      const reply = res.data?.aiReply || res.data?.data?.aiReply || res.aiReply;

      if (reply) {
        setAiResponse(reply);
        setVoiceHistory((prev) => [...prev, { text: reply, role: 'assistant' }]);
        speakText(reply);
      } else {
        setAiResponse('No clinical response received. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setAiResponse('Unable to process voice turn. Please check connection and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Clean markdown symbols for natural speech synthesis
      const cleanText = text
        .replace(/[*#_`>]/g, '')
        .replace(/🚨|⚠️|💊|🩺|👨‍⚕️|👩‍⚕️/g, '')
        .slice(0, 450);

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select voice matching speechLanguage if available
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const langCode = speechLanguage === 'hi-IN' ? 'hi' : 'en';
        const matchVoice = voices.find((v) => v.lang.startsWith(langCode));
        if (matchVoice) {
          utterance.voice = matchVoice;
        }
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Disclaimer */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Voice Assistant Disclaimer:</strong> Voice recognition operates under your device microphone permission. For life-threatening emergencies, call <strong>112 / 102</strong> immediately.
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-8 text-center space-y-8">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Mic className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Voice Assistant (Upchaar Voice)</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Speak naturally about how you feel in Hindi or English. Powered by Groq AI & Whisper with instant spoken diagnosis guidance.
          </p>

          {/* Language Selector */}
          <div className="mt-4 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 text-xs text-slate-700">
            <Languages className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-semibold text-slate-500">Language:</span>
            <select
              value={speechLanguage}
              onChange={(e) => setSpeechLanguage(e.target.value as any)}
              className="bg-transparent font-medium focus:outline-none cursor-pointer"
            >
              <option value="en-IN">Hinglish / Indian English (en-IN)</option>
              <option value="hi-IN">Hindi / हिन्दी (hi-IN)</option>
              <option value="en-US">English (en-US)</option>
            </select>
          </div>
        </div>

        {/* Visual Pulse Orb */}
        <div className="flex flex-col items-center justify-center py-4">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse shadow-2xl shadow-rose-500/50 scale-110'
                : isSpeaking
                ? 'bg-teal-500 text-white animate-bounce shadow-2xl shadow-teal-500/50'
                : isProcessing
                ? 'bg-indigo-500 text-white animate-spin shadow-2xl shadow-indigo-500/50'
                : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
            }`}
          >
            {isRecording ? (
              <Mic className="w-12 h-12" />
            ) : isSpeaking ? (
              <Volume2 className="w-12 h-12" />
            ) : (
              <Mic className="w-12 h-12" />
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {!isRecording ? (
              <Button
                variant="primary"
                size="lg"
                onClick={startVoiceInput}
                disabled={isProcessing}
                className="px-6 shadow-md"
              >
                <Mic className="w-4 h-4 mr-2" />
                Tap to Speak
              </Button>
            ) : (
              <Button variant="danger" size="lg" onClick={stopVoiceInput} className="px-6 shadow-md">
                <MicOff className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
            )}

            {isSpeaking && (
              <Button variant="outline" size="lg" onClick={stopSpeaking}>
                <StopCircle className="w-4 h-4 mr-1 text-slate-500" />
                Stop Audio
              </Button>
            )}
          </div>
        </div>

        {/* Live Transcript & Status */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Speech Recognition Status:
          </span>
          <p className="text-xs text-slate-700 italic min-h-[30px]">
            {isProcessing ? 'Processing symptoms with Groq AI...' : transcript || 'Press "Tap to Speak" and describe your symptoms aloud...'}
          </p>
        </div>

        {/* AI Voice Response Output */}
        {aiResponse && (
          <div className="p-5 bg-teal-50/70 border border-teal-200 rounded-2xl text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-teal-600" />
                Assistant Voice Diagnosis Advice:
              </span>
              <button
                onClick={() => speakText(aiResponse)}
                className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
              >
                <Volume2 className="w-3.5 h-3.5" /> Replay Speech
              </button>
            </div>
            <p className="text-xs text-teal-900 leading-relaxed whitespace-pre-line font-medium">
              {aiResponse}
            </p>
          </div>
        )}

        {/* Conversation Turn History */}
        {voiceHistory.length > 0 && (
          <div className="pt-4 border-t border-slate-100 text-left space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voice Session Transcript</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {voiceHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl text-xs ${
                    item.role === 'user'
                      ? 'bg-primary-50 text-primary-900 ml-8 font-medium'
                      : 'bg-slate-100 text-slate-800 mr-8'
                  }`}
                >
                  <strong>{item.role === 'user' ? 'You:' : 'Praan AI:'}</strong> {item.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
