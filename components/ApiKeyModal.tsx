import React, { useState, useEffect } from 'react';
import { Key, CheckCircle, AlertCircle, Loader2, Sparkles, X, Shield, Cpu, Zap, RefreshCw } from 'lucide-react';
import { getAIConfig, saveAIConfig, AIConfig, AIProvider } from '../services/aiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<AIConfig>(getAIConfig());
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testMessage, setTestMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setConfig(getAIConfig());
      setTestStatus('IDLE');
      setTestMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveAIConfig(config);
    onClose();
  };

  const handleTestConnection = async () => {
    setTestStatus('TESTING');
    setTestMessage('');

    try {
      if (config.provider === 'groq') {
        const apiKey = config.groqApiKey?.trim();
        if (!apiKey) {
          throw new Error('Please enter a Groq API Key first (starts with gsk_...)');
        }

        const candidateModels = [
          config.groqModel || 'openai/gpt-oss-120b',
          'openai/gpt-oss-120b',
          'openai/gpt-oss-20b',
          'qwen/qwen3.8-27b',
          'llama-3.3-70b-versatile'
        ];

        let successReply = '';
        let matchedModel = '';

        for (const m of Array.from(new Set(candidateModels))) {
          try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: m,
                messages: [{ role: 'user', content: 'Say "PraanSeva Groq Connected"' }],
                max_tokens: 15
              })
            });

            if (res.ok) {
              const data = await res.json();
              successReply = data.choices?.[0]?.message?.content || 'OK';
              matchedModel = m;
              break;
            }
          } catch (e) {
            // try next model
          }
        }

        if (!successReply) {
          throw new Error('Groq connection failed. Please check your API key.');
        }

        setTestStatus('SUCCESS');
        setTestMessage(`Connection verified! Groq (${matchedModel}) responded: "${successReply.trim()}"`);
        saveAIConfig({ ...config, groqModel: matchedModel || config.groqModel });
      } else if (config.provider === 'gemini') {
        const apiKey = config.geminiApiKey?.trim();
        if (!apiKey) {
          throw new Error('Please enter a Google Gemini API Key first');
        }

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Ping' }] }]
          })
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Gemini returned ${res.status}: ${err}`);
        }

        setTestStatus('SUCCESS');
        setTestMessage('Connection verified! Google Gemini is ready.');
        saveAIConfig(config);
      } else {
        setTestStatus('SUCCESS');
        setTestMessage('Smart Local Fallback mode active. Ready without external API keys.');
        saveAIConfig(config);
      }
    } catch (err: any) {
      setTestStatus('ERROR');
      setTestMessage(err.message || 'Connection test failed. Please check your API key.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold">AI Provider & API Key Setup</h3>
              <p className="text-xs text-white/80 mt-0.5">Configure Groq, Gemini, or Local Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition text-white/80 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Select Primary AI Engine
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, provider: 'groq' }))}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition ${
                  config.provider === 'groq'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Zap size={18} className={config.provider === 'groq' ? 'text-emerald-600' : 'text-slate-400'} />
                  {config.provider === 'groq' && <CheckCircle size={14} className="text-emerald-600" />}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-slate-900">Groq Cloud</p>
                  <p className="text-[10px] text-emerald-600 font-semibold">Ultra-Fast ⚡ (Recommended)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, provider: 'gemini' }))}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition ${
                  config.provider === 'gemini'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sparkles size={18} className={config.provider === 'gemini' ? 'text-blue-600' : 'text-slate-400'} />
                  {config.provider === 'gemini' && <CheckCircle size={14} className="text-blue-600" />}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-slate-900">Google Gemini</p>
                  <p className="text-[10px] text-slate-500">1.5 Flash</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, provider: 'offline' }))}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition ${
                  config.provider === 'offline'
                    ? 'border-purple-600 bg-purple-50/50 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Shield size={18} className={config.provider === 'offline' ? 'text-purple-600' : 'text-slate-400'} />
                  {config.provider === 'offline' && <CheckCircle size={14} className="text-purple-600" />}
                </div>
                <div className="mt-2">
                  <p className="text-xs font-bold text-slate-900">Local Fallback</p>
                  <p className="text-[10px] text-slate-500">Zero API Key</p>
                </div>
              </button>
            </div>
          </div>

          {/* Groq Key Input */}
          {config.provider === 'groq' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Groq API Key</span>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 hover:underline text-[11px] font-medium"
                  >
                    Get free Groq key →
                  </a>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={config.groqApiKey || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, groqApiKey: e.target.value }))}
                    placeholder="gsk_..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Key is saved securely in your browser session and never sent to third parties.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Groq Model</label>
                <select
                  value={config.groqModel || 'openai/gpt-oss-120b'}
                  onChange={(e) => setConfig(prev => ({ ...prev, groqModel: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-sm outline-none font-medium"
                >
                  <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (High Reasoning & Triage)</option>
                  <option value="openai/gpt-oss-20b">openai/gpt-oss-20b (Fastest IVR & Doctor Chat)</option>
                  <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (Multilingual)</option>
                  <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                  <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                </select>
              </div>
            </div>
          )}

          {/* Gemini Key Input */}
          {config.provider === 'gemini' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Google Gemini API Key</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline text-[11px] font-medium"
                  >
                    Get Gemini key →
                  </a>
                </label>
                <input
                  type="password"
                  value={config.geminiApiKey || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Gemini Model</label>
                <select
                  value={config.geminiModel || 'gemini-1.5-flash'}
                  onChange={(e) => setConfig(prev => ({ ...prev, geminiModel: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-sm outline-none font-medium"
                >
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Standard)</option>
                  <option value="gemini-1.5-pro">gemini-1.5-pro (High Reasoning)</option>
                </select>
              </div>
            </div>
          )}

          {/* Offline Notice */}
          {config.provider === 'offline' && (
            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-purple-900 text-xs leading-relaxed">
              <span className="font-bold block mb-1">Local Smart Simulator Mode</span>
              Uses built-in clinical rule trees and conversational Hindi/Punjabi/English logic. No API keys or network connection to AI providers required.
            </div>
          )}

          {/* Test Status Banner */}
          {testStatus === 'SUCCESS' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>{testMessage}</div>
            </div>
          )}

          {testStatus === 'ERROR' && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <div>{testMessage}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={testStatus === 'TESTING'}
              onClick={handleTestConnection}
              className="flex-1 py-3 border border-slate-300 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-700 flex items-center justify-center gap-2 transition"
            >
              {testStatus === 'TESTING' ? (
                <Loader2 size={16} className="animate-spin text-slate-600" />
              ) : (
                <RefreshCw size={14} />
              )}
              Test Connection
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <CheckCircle size={14} />
              Save & Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
