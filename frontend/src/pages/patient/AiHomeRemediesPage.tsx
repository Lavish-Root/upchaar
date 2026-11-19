import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { HomeRemedy, HomeRemedyCategory } from '../../types';
import {
  Sparkles,
  Search,
  Bookmark,
  BookmarkCheck,
  AlertTriangle,
  Heart,
  Droplets,
  ShieldCheck,
  Info,
  Clock,
  ArrowRight,
  Send,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AiHomeRemediesPage: React.FC = () => {
  const [categories, setCategories] = useState<HomeRemedyCategory[]>([]);
  const [remedies, setRemedies] = useState<HomeRemedy[]>([]);
  const [savedRecommendations, setSavedRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'ask_ai' | 'saved'>('browse');

  // AI Ask state
  const [symptomQuery, setSymptomQuery] = useState('');
  const [aiGuidance, setAiGuidance] = useState<any>(null);
  const [askingAi, setAskingAi] = useState(false);

  // Modal detailed remedy
  const [activeRemedy, setActiveRemedy] = useState<HomeRemedy | null>(null);

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const [catsRes, remRes, savedRes]: any = await Promise.all([
        api.get('/home-remedies/categories'),
        api.get('/home-remedies'),
        api.get('/home-remedies/bookmarks/saved').catch(() => ({ data: [] })),
      ]);
      if (catsRes.data) setCategories(catsRes.data);
      if (remRes.data) setRemedies(remRes.data);
      if (savedRes.data) setSavedRecommendations(savedRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConsultAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomQuery.trim()) return;

    setAskingAi(true);
    setAiGuidance(null);

    try {
      const res: any = await api.post('/home-remedies/consult', { query: symptomQuery });
      if (res.data) {
        setAiGuidance(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to consult AI Home Remedies engine.');
    } finally {
      setAskingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">AI Home Remedies & Self-Care</h1>
          <p className="text-xs text-slate-500 mt-0.5">Evidence-grounded household remedies, natural preparation, and clinical safety cautions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('browse')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'browse'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Browse All Remedies ({remedies.length})
        </button>
        <button
          onClick={() => setActiveTab('ask_ai')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'ask_ai'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-500" />
          Ask AI by Symptom
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'saved'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Saved Bookmarks ({savedRecommendations.length})
        </button>
      </div>

      {/* Tab 1: Browse Remedies */}
      {activeTab === 'browse' && (
        <div className="space-y-6">
          {loading ? (
            <LoadingSpinner text="Loading remedies..." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {remedies.map((remedy) => (
                <div
                  key={remedy.id}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200 uppercase tracking-wider">
                      {remedy.category?.name || 'Home Care'}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {remedy.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {remedy.summary}
                    </p>
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{remedy.ageWarnings || remedy.safetyPrecautions}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setActiveRemedy(remedy)}
                    >
                      View Recipe & Warnings
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Ask AI by Symptom */}
      {activeTab === 'ask_ai' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-5">
            <div>
              <h3 className="text-lg font-black text-slate-900">Conversational AI Home Remedies</h3>
              <p className="text-xs text-slate-500 mt-1">
                Describe your mild symptoms (e.g., mild bloating after meals, throat scratchiness, lack of sleep).
              </p>
            </div>

            <form onSubmit={handleConsultAI} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Describe your symptom in natural words..."
                  value={symptomQuery}
                  onChange={(e) => setSymptomQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
                <Button type="submit" variant="teal" isLoading={askingAi}>
                  <Send className="w-4 h-4 mr-1" />
                  Analyze
                </Button>
              </div>
            </form>

            {aiGuidance && (
              <div className="p-6 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-4">
                {aiGuidance.isEmergency && (
                  <div className="p-3 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    EMERGENCY ALERT: Immediate Hospital Care Required!
                  </div>
                )}

                <div className="whitespace-pre-line text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                  {aiGuidance.guidance}
                </div>

                {aiGuidance.relevantRemedies?.length > 0 && (
                  <div className="pt-3 border-t border-teal-200">
                    <h5 className="text-xs font-bold text-teal-900 uppercase tracking-wider mb-2">
                      Matching Clinically Formulated Remedies:
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {aiGuidance.relevantRemedies.map((r: any) => (
                        <div
                          key={r.id}
                          onClick={() => setActiveRemedy(r)}
                          className="p-3 bg-white rounded-xl border border-teal-200 cursor-pointer hover:shadow-sm"
                        >
                          <p className="text-xs font-bold text-slate-900">{r.title}</p>
                          <p className="text-[11px] text-teal-700 mt-0.5">Click to view preparation instructions</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Saved Bookmarks */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {savedRecommendations.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-xs text-slate-500">
              No saved remedies yet. Bookmark any natural remedy to quickly access it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedRecommendations.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
                  <h4 className="text-sm font-bold text-slate-900">{item.remedy?.title || 'Saved Remedy'}</h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{item.aiGuidanceText}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {activeRemedy && (
        <Modal
          isOpen={!!activeRemedy}
          onClose={() => setActiveRemedy(null)}
          title={activeRemedy.title}
          description={`Category: ${activeRemedy.category?.name || 'Home Care'}`}
          maxWidth="lg"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
            <p className="text-slate-600 leading-relaxed">{activeRemedy.summary}</p>
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
              <strong className="text-teal-900 block mb-1">Household Ingredients:</strong>
              <p className="text-teal-800">{activeRemedy.naturalIngredients}</p>
            </div>
            <div>
              <strong className="text-slate-900 block mb-1">Preparation & Administration:</strong>
              <div className="whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 font-mono text-[11px]">
                {activeRemedy.preparationInstructions}
              </div>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
              <strong className="text-rose-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Emergency Warning Signs:
              </strong>
              <p className="text-rose-800">{activeRemedy.whenToSeekDoctor}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
