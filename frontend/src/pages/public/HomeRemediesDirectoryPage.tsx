import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { HomeRemedy, HomeRemedyCategory } from '../../types';
import {
  Search,
  Sparkles,
  AlertTriangle,
  Heart,
  Droplets,
  ShieldCheck,
  ChevronRight,
  Info,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';

export const HomeRemediesDirectoryPage: React.FC = () => {
  const [categories, setCategories] = useState<HomeRemedyCategory[]>([]);
  const [remedies, setRemedies] = useState<HomeRemedy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRemedy, setActiveRemedy] = useState<HomeRemedy | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [catRes, remRes]: any = await Promise.all([
        api.get('/home-remedies/categories'),
        api.get('/home-remedies'),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (remRes.data) setRemedies(remRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const params: any = {};
      if (searchQuery) params.symptom = searchQuery;
      if (selectedCategory) params.categorySlug = selectedCategory;

      const res: any = await api.get('/home-remedies', { params });
      if (res.data) setRemedies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilter = async (slug: string) => {
    const newSlug = selectedCategory === slug ? '' : slug;
    setSelectedCategory(newSlug);
    setLoading(true);
    try {
      const params: any = {};
      if (newSlug) params.categorySlug = newSlug;
      if (searchQuery) params.symptom = searchQuery;

      const res: any = await api.get('/home-remedies', { params });
      if (res.data) setRemedies(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Clinically Reviewed Traditional Home Care Protocols</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Evidence-Grounded Home Remedies
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          Search symptom-specific natural remedies, household ingredients, preparation protocols, and strict clinical safety warnings for children and pregnancy.
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search symptoms (e.g. sore throat, cough, bloating, headache)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm"
          />
        </div>
        <Button type="submit" variant="teal" size="lg">
          Search
        </Button>
      </form>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 justify-center flex-wrap">
          <button
            onClick={() => handleCategoryFilter('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
              selectedCategory === ''
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All 8 Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCategoryFilter(c.slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
                selectedCategory === c.slug
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Remedies Grid */}
      {loading ? (
        <LoadingSpinner text="Loading clinically reviewed home remedies..." />
      ) : remedies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No remedies found for your search</h3>
          <p className="text-xs text-slate-500 mt-1">Try another symptom term or select a category above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {remedies.map((remedy) => (
            <div
              key={remedy.id}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                    {remedy.category?.name || 'Home Care'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Clinically Reviewed
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {remedy.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {remedy.summary}
                </p>

                <div className="space-y-1 text-xs text-slate-500">
                  <p><strong>Targeted:</strong> {remedy.symptomsTargeted}</p>
                  <p className="line-clamp-1"><strong>Ingredients:</strong> {remedy.naturalIngredients}</p>
                </div>

                {/* Safety Warning Highlight */}
                <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{remedy.ageWarnings || remedy.safetyPrecautions}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActiveRemedy(remedy)}
                >
                  View Full Preparation & Safety
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Remedy Modal */}
      {activeRemedy && (
        <Modal
          isOpen={!!activeRemedy}
          onClose={() => setActiveRemedy(null)}
          title={activeRemedy.title}
          description={`Category: ${activeRemedy.category?.name || 'Home Care'} • Clinically Reviewed`}
          maxWidth="xl"
        >
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2 text-xs">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Clinical Summary</h4>
              <p className="text-slate-600 leading-relaxed">{activeRemedy.summary}</p>
            </div>

            <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
              <h5 className="font-bold text-teal-900 mb-1">Household Natural Ingredients:</h5>
              <p className="text-teal-800">{activeRemedy.naturalIngredients}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Preparation & Administration Steps:</h4>
              <div className="whitespace-pre-line text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed font-mono text-[11px]">
                {activeRemedy.preparationInstructions}
              </div>
            </div>

            {/* Strict Clinical Warning Box */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <h4 className="font-bold text-rose-900 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Clinical Safety & Warnings
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="font-bold text-amber-900 mb-0.5">👶 Pediatric / Age Precautions:</p>
                  <p className="text-amber-800">{activeRemedy.ageWarnings}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="font-bold text-amber-900 mb-0.5">🤰 Pregnancy / Lactation Caution:</p>
                  <p className="text-amber-800">{activeRemedy.pregnancyWarnings}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                <p className="font-bold text-rose-900 mb-0.5">🚨 When to Seek Emergency Medical Attention:</p>
                <p className="text-rose-800 font-medium leading-relaxed">{activeRemedy.whenToSeekDoctor}</p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <Button variant="teal" onClick={() => setActiveRemedy(null)}>
                Understood & Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
