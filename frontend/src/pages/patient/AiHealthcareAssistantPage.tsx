import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { Bot, Send, User, AlertTriangle, Sparkles, ShieldAlert, PhoneCall, RefreshCw } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

interface Message {
  id?: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  isEmergency?: boolean;
}

export const AiHealthcareAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ASSISTANT',
      content:
        'Hello! I am your PraanSewa Health Assistant powered by Grok AI. I provide evidence-based triage support, symptom education, and emergency guidance. All clinical consultations on PraanSewa are with verified Government Medical Officers and are 100% Free. How can I assist you today?',
    },
  ]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      });

      if (res.data) {
        setConversationId(res.data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            role: 'ASSISTANT',
            content: res.data.message.content,
            isEmergency: res.data.isEmergency,
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
    'I have a sore throat and mild headache since yesterday',
    'What are the first-line home care measures for acute fever?',
    'When should chest tightness be treated as a medical emergency?',
    'Tips for managing acid reflux and bloating naturally',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Disclaimer Banner */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Mandatory Medical Notice:</strong> PraanSewa AI is an informational triage support assistant, NOT a licensed doctor. It does not provide definitive diagnoses or issue prescriptions. In any emergency situation, immediately call <strong>112 / 102</strong> or visit the nearest emergency room.
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md flex flex-col h-[650px] overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                PraanSewa Clinical AI Assistant
                <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono text-[10px] font-bold">
                  Grok Engine
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h2>
              <p className="text-[11px] text-slate-500">Live Grok-powered clinical triage, symptom analysis & free Govt. doctor referrals</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMessages([
                {
                  role: 'ASSISTANT',
                  content: 'Conversation reset. How can I assist you with your health questions?',
                },
              ]);
              setConversationId(undefined);
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            New Chat
          </Button>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'USER';
            return (
              <div
                key={idx}
                className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                    AI
                  </div>
                )}

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed max-w-[85%] whitespace-pre-line shadow-xs ${
                    isUser
                      ? 'bg-primary-600 text-white rounded-tr-none'
                      : msg.isEmergency
                      ? 'bg-rose-50 text-rose-900 border border-rose-300 rounded-tl-none font-medium'
                      : 'bg-slate-100 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.isEmergency && (
                    <div className="flex items-center gap-1.5 text-rose-700 font-bold mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      CRITICAL EMERGENCY ALERT
                    </div>
                  )}
                  {msg.content}
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
              <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold shrink-0">
                AI
              </div>
              <div className="bg-slate-100 p-3 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-600 animate-ping"></span>
                Evaluating symptoms and clinical references...
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
                className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600 hover:border-primary-500 hover:text-primary-700 transition"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 flex gap-2 bg-white">
          <input
            type="text"
            placeholder="Type your medical symptom or question (e.g., headache for 2 days)..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={sending}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
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
