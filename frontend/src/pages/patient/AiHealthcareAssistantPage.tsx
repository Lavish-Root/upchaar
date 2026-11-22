import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Bot,
  Send,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Mic,
  MicOff,
  Volume2,
  StopCircle,
  Stethoscope,
  PhoneCall,
  Video,
  Languages,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

interface Message {
  id?: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  isEmergency?: boolean;
  urgencyLevel?: 'EMERGENCY' | 'SERIOUS' | 'ROUTINE';
  emergencyCategory?: string;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en-IN', name: 'English (India)', speechLang: 'en-IN' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)', speechLang: 'hi-IN' },
  { code: 'hinglish', name: 'Hinglish (हिंग्लिश)', speechLang: 'hi-IN' },
  { code: 'bn-IN', name: 'বাংলা (Bengali)', speechLang: 'bn-IN' },
  { code: 'mr-IN', name: 'मराठी (Marathi)', speechLang: 'mr-IN' },
  { code: 'gu-IN', name: 'ગુજરાતી (Gujarati)', speechLang: 'gu-IN' },
  { code: 'ta-IN', name: 'தமிழ் (Tamil)', speechLang: 'ta-IN' },
  { code: 'te-IN', name: 'తెలుగు (Telugu)', speechLang: 'te-IN' },
];

export const AiHealthcareAssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ASSISTANT',
      content:
        'नमस्ते! मैं Upchaar AI क्लीनिकल हेल्थ असिस्टेंट हूँ (Powered by Groq LLaMA-3.3)।\n\n' +
        'मैं आपके लक्षणों की प्राथमिक जांच (Clinical Triage), प्रामाणिक घरेलू उपचार (Evidence-Based Home Remedies), और आपातकालीन सहायता प्रदान करता हूँ।\n\n' +
        'Upchaar पर सभी सरकारी विशेषज्ञ डॉक्टरों से वीडियो व ऑडियो परामर्श 100% निःशुल्क हैं। आज मैं आपकी क्या सहायता कर सकता हूँ?',
      urgencyLevel: 'ROUTINE',
    },
  ]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleMicInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome/Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;

      const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
      recognition.lang = langObj?.speechLang || 'hi-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${text}` : text));
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const speakMessage = (text: string, index: number) => {
    if (!('speechSynthesis' in window)) return;

    if (speakingIdx === index) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingIdx(index);

    const cleanText = text
      .replace(/[*#_`>]/g, '')
      .replace(/🚨|⚠️|💊|🩺|🌿|👨‍⚕️|👩‍⚕️/g, '')
      .slice(0, 500);

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const prefix = selectedLanguage === 'hi-IN' || selectedLanguage === 'hinglish' ? 'hi' : selectedLanguage.slice(0, 2);
      const matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);

    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    const updated = [...messages, { role: 'USER' as const, content: userText }];
    setMessages(updated);

    try {
      const res: any = await api.post('/ai/chat', {
        message: userText,
        conversationId,
        conversationType: 'HEALTH_ASSISTANT',
        language: selectedLanguage,
      });

      const data = res.data?.data || res.data || res;
      if (data) {
        setConversationId(data.conversationId);
        const replyContent = data.reply || data.message?.content || 'Thank you for consulting. Please consult a doctor for diagnosis.';
        setMessages((prev) => [
          ...prev,
          {
            role: 'ASSISTANT',
            content: replyContent,
            isEmergency: data.isEmergency,
            urgencyLevel: data.urgencyLevel,
            emergencyCategory: data.emergencyCategory,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ASSISTANT',
          content: 'I apologize, but I encountered an error reaching the clinical assistant service. Please check your network or try again.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const samplePrompts = [
    'पेट में गैस और एसिडिटी के घरेलू उपाय क्या हैं?',
    'I have a sore throat, mild cough and fever since yesterday',
    'Cold and cough home remedies (सर्दी जुकाम का काढ़ा)',
    'When should chest tightness be treated as a medical emergency?',
    'माइग्रेन और सिरदर्द से तुरंत राहत पाने के उपाय',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Disclaimer Banner */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Mandatory Medical Notice:</strong> Upchaar AI is an informational triage support assistant, NOT a substitute for licensed medical care. In any acute emergency, immediately call <strong>112 / 102</strong> or visit the nearest emergency hospital.
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col h-[700px] overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                Upchaar Clinical AI Assistant
                <span className="px-2 py-0.5 rounded-full bg-teal-700 text-white font-mono text-[10px] font-bold">
                  Groq LLaMA-3.3
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Clinical Triage • Authentic Home Remedies • 1-Click Doctor Consultation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-xs shadow-2xs">
              <Languages className="w-3.5 h-3.5 text-teal-600" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Direct Connect to Doctor Button in Header */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/doctors')}
              className="text-teal-700 border-teal-300 hover:bg-teal-50 text-xs font-bold shadow-2xs"
            >
              <Stethoscope className="w-3.5 h-3.5 mr-1" />
              Connect to Doctor
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMessages([
                  {
                    role: 'ASSISTANT',
                    content: 'बातचीत रीसेट हो गई है। आप अपने लक्षणों या घरेलू उपचार के बारे में पूछ सकते हैं।',
                  },
                ]);
                setConversationId(undefined);
              }}
              title="Reset conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'USER';
            const isSeriousOrEmergency = msg.isEmergency || msg.urgencyLevel === 'EMERGENCY' || msg.urgencyLevel === 'SERIOUS';

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                    AI
                  </div>
                )}

                <div className="max-w-[85%] space-y-2">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs ${
                      isUser
                        ? 'bg-teal-600 text-white rounded-tr-none'
                        : isSeriousOrEmergency
                        ? 'bg-rose-50 text-rose-950 border-2 border-rose-300 rounded-tl-none font-medium'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {isSeriousOrEmergency && (
                      <div className="flex items-center gap-1.5 text-rose-700 font-extrabold mb-2 text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                        CRITICAL MEDICAL ATTENTION REQUIRED
                      </div>
                    )}
                    {msg.content}
                  </div>

                  {/* Doctor Escalation Card if Serious or Emergency */}
                  {!isUser && isSeriousOrEmergency && (
                    <div className="p-3.5 bg-rose-100/80 border border-rose-300 rounded-2xl space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                          <Stethoscope className="w-4 h-4 text-rose-700" />
                          तत्काल डॉक्टर से परामर्श लें (Immediate Clinical Action):
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-850 leading-normal">
                        आपके लक्षणों के आधार पर चिकित्सीय परामर्श आवश्यक है। आप तुरंत सरकारी विशेषज्ञ डॉक्टर से निःशुल्क वीडियो कॉल कर सकते हैं या आपातकालीन 112 पर कॉल करें।
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => navigate('/doctors')}
                          className="text-xs font-bold px-3 py-1.5 shadow-sm flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Connect with Verified Doctor Now (Free)
                        </Button>
                        <a
                          href="tel:112"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-300 text-xs font-bold text-rose-700 hover:bg-rose-50 transition shadow-2xs"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          Emergency 112 / 102
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Non-emergency Quick Doctor Referral Action */}
                  {!isUser && !isSeriousOrEmergency && idx > 0 && (
                    <div className="flex items-center justify-between pt-0.5">
                      <button
                        onClick={() => navigate('/doctors')}
                        className="inline-flex items-center gap-1.5 text-[11px] text-teal-700 hover:text-teal-900 font-semibold bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 transition"
                      >
                        <Stethoscope className="w-3 h-3" />
                        डॉक्टर से मुफ्त वीडियो सलाह लें (Connect to Doctor)
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>

                      <button
                        onClick={() => speakMessage(msg.content, idx)}
                        className="text-[11px] text-slate-400 hover:text-teal-700 flex items-center gap-1 px-1 transition"
                        title="Listen to this reply"
                      >
                        {speakingIdx === idx ? (
                          <>
                            <StopCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                            <span className="text-rose-500 font-semibold">Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {!isUser && isSeriousOrEmergency && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => speakMessage(msg.content, idx)}
                        className="text-[11px] text-slate-400 hover:text-teal-700 flex items-center gap-1 px-1 transition"
                      >
                        {speakingIdx === idx ? (
                          <>
                            <StopCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                            <span className="text-rose-500 font-semibold">Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                    You
                  </div>
                )}
              </div>
            );
          })}

          {sending && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                AI
              </div>
              <div className="bg-slate-100 p-3.5 rounded-2xl text-xs text-slate-600 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-ping"></span>
                Evaluating symptoms, clinical triage & evidence-based Indian home remedies...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Sample Prompt Chips */}
        {messages.length <= 2 && (
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 overflow-x-auto flex gap-2">
            {samplePrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => setInputMessage(p)}
                className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 hover:border-teal-500 hover:text-teal-700 transition"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 flex gap-2 bg-white">
          <button
            type="button"
            onClick={toggleMicInput}
            className={`p-3 rounded-xl border transition ${
              isListening
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title={isListening ? 'Listening... click to stop' : 'Click to speak (Voice Input)'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            placeholder={
              isListening
                ? 'Listening to your voice...'
                : 'लक्षण या बीमारी का नाम लिखें (e.g. 2 din se sar dard aur sardi hai / fever home remedies)...'
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={sending}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
          <Button type="submit" variant="primary" disabled={sending || !inputMessage.trim()}>
            <Send className="w-4 h-4 mr-1" />
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};
