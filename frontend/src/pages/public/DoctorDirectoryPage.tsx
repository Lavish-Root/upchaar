import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Doctor, Specialty } from '../../types';
import { Search, Star, Stethoscope, MapPin, Calendar, Clock, Filter, ArrowRight } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { formatCurrency } from '../../utils/cn';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  useEffect(() => {
    fetchSpecialties();
    fetchDoctors();
  }, []);

  const fetchSpecialties = async () => {
    try {
      const res: any = await api.get('/home-remedies/categories'); // or specialties
      // also fetch specialties
      const specRes: any = await api.get('/admin/specialties').catch(() => null);
      if (specRes?.data) {
        setSpecialties(specRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDoctors = async (search?: string, specialtySlug?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (specialtySlug) params.specialty = specialtySlug;

      const res: any = await api.get('/doctors', { params });
      if (res.data) {
        setDoctors(res.data);
      }
    } catch (err) {
      console.error('Failed to load doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors(searchTerm, selectedSpecialty);
  };

  const handleSpecialtyClick = (slug: string) => {
    const newSlug = selectedSpecialty === slug ? '' : slug;
    setSelectedSpecialty(newSlug);
    fetchDoctors(searchTerm, newSlug);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
          🏛️ National Public Health Mission • 100% Free Consultations
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Find Government Medical Specialists
        </h1>
        <p className="text-slate-600 text-sm">
          Consult directly with verified Government Medical Officers and AIIMS specialists across India. All consultations and tele-triage are 100% free of charge.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearch} className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by doctor name, condition, or hospital..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 shadow-sm"
          />
        </div>
        <Button type="submit" variant="primary" size="lg">
          Search Doctors
        </Button>
      </form>

      {/* Specialty Filter Pills */}
      {specialties.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 justify-center flex-wrap">
          <button
            onClick={() => handleSpecialtyClick('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
              selectedSpecialty === ''
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Specialties
          </button>
          {specialties.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSpecialtyClick(s.slug)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${
                selectedSpecialty === s.slug
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Doctors Grid */}
      {loading ? (
        <LoadingSpinner text="Loading verified medical specialists..." />
      ) : doctors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">No doctors match your criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try broadening your search term or selecting another specialty.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => {
            const primarySpecialty = doc.specialties?.[0]?.specialty?.name || 'General Physician';
            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={doc.user.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80'}
                      alt={doc.user.fullName}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">
                          {primarySpecialty}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{doc.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 truncate mt-0.5 flex items-center gap-1.5">
                        {doc.user.fullName}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{doc.qualifications}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                        🏛️ Govt. Medical Officer
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {doc.bio || 'Government Medical Officer dedicated to free public patient care and clinical excellence.'}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.experienceYears} Years Clinical Experience</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{doc.clinicAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Govt. Scheme Fee</span>
                    <span className="text-base font-black text-emerald-700">
                      {doc.consultationFee === 0 ? 'FREE (₹0)' : formatCurrency(doc.consultationFee)}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/doctors/${doc.id}`)}
                    className="bg-emerald-600 hover:bg-emerald-700 border-none"
                  >
                    Free Consult
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
