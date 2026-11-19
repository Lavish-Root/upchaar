import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Mic, MicOff, Volume2, Bot, AlertTriangle, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const AiVoiceAssistantPage: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [voiceHistory, setVoiceHistory] = useState<Array<{ text: string; role: 'user' | 'assistant' }>>([]);

  let recognition: any = null;

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or type in the text AI assistant.');
      return;
    }

    try {
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('Listening... Speak your symptoms now.');
      };

      recognition.onresult = (event: any) => {
        const speechText = event.results[0][0].transcript;
        setTranscript(speechText);
        setIsRecording(false);
        handleProcessSpeech(speechText);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setTranscript(`Could not recognize audio (${event.error}). Please try speaking again.`);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsRecording(false);
    }
  };

  const stopVoiceInput = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsRecording(false);
  };

  const handleProcessSpeech = async (spokenText: string) => {
    setIsProcessing(true);
    setVoiceHistory((prev) => [...prev, { text: spokenText, role: 'user' }]);

    try {
      const res: any = await api.post('/ai/voice/turn', { text: spokenText });
      if (res.data) {
        const reply = res.data.aiReply;
        setAiResponse(reply);
        setVoiceHistory((prev) => [...prev, { text: reply, role: 'assistant' }]);
        speakText(reply);
      }
    } catch (err) {
      console.error(err);
      setAiResponse('Unable to process voice turn. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      // Clean markdown tags for natural speech
      const cleanText = text.replace(/[*#_`]/g, '').slice(0, 350);
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

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
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Voice Assistant Disclaimer:</strong> Voice recognition operates under your device microphone permission. For life-threatening symptoms, call <strong>112 / 102</strong> immediately.
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-8 text-center space-y-8">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Mic className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">AI Voice Assistant</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Speak naturally about how you feel. Our voice triage engine analyzes your speech and responds verbally with clinical care recommendations.
          </p>
        </div>

        {/* Visual Pulse Orb */}
        <div className="flex flex-col items-center justify-center py-4">
          <div
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse shadow-2xl shadow-rose-500/50 scale-110'
                : isSpeaking
                ? 'bg-teal-500 text-white animate-bounce shadow-2xl shadow-teal-500/50'
                : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
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

          <div className="mt-6 flex items-center gap-3">
            {!isRecording ? (
              <Button
                variant="primary"
                size="lg"
                onClick={startVoiceInput}
                disabled={isProcessing}
                className="px-6"
              >
                <Mic className="w-4 h-4 mr-2" />
                Tap to Speak
              </Button>
            ) : (
              <Button variant="danger" size="lg" onClick={stopVoiceInput}>
                <MicOff className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
            )}

            {isSpeaking && (
              <Button variant="outline" size="lg" onClick={stopSpeaking}>
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
            {transcript || 'Press "Tap to Speak" and describe your symptoms aloud...'}
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
