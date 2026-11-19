import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Specialty } from '../../types';
import { Stethoscope, ArrowRight, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

const DEFAULT_SPECIALTIES: Specialty[] = [
  { id: 'cardiology', name: 'Cardiology (Heart & Vascular)', slug: 'cardiology', description: 'Cardiovascular care' },
  { id: 'dermatology', name: 'Dermatology (Skin & Hair)', slug: 'dermatology', description: 'Dermatological care' },
  { id: 'general-medicine', name: 'General Medicine (Internal Medicine)', slug: 'general-medicine', description: 'Internal care' },
  { id: 'pediatrics', name: 'Pediatrics (Child Healthcare)', slug: 'pediatrics', description: 'Child care' },
  { id: 'orthopedics', name: 'Orthopedics (Bone & Joint)', slug: 'orthopedics', description: 'Orthopedic care' },
  { id: 'neurology', name: 'Neurology (Brain & Nervous System)', slug: 'neurology', description: 'Neurological care' },
  { id: 'ent', name: 'ENT (Ear, Nose & Throat)', slug: 'ent', description: 'ENT care' },
  { id: 'gynecology', name: 'Gynecology & Obstetrics', slug: 'gynecology', description: 'Women healthcare' },
  { id: 'psychiatry', name: 'Psychiatry & Mental Health', slug: 'psychiatry', description: 'Mental health' },
  { id: 'pulmonology', name: 'Pulmonology (Respiratory & Chest)', slug: 'pulmonology', description: 'Lungs and breathing' },
  { id: 'ophthalmology', name: 'Ophthalmology (Eye Care)', slug: 'ophthalmology', description: 'Vision and eyes' },
];

export const RegisterDoctorPage: React.FC = () => {
  const navigate = useNavigate();
  const [specialties, setSpecialties] = useState<Specialty[]>(DEFAULT_SPECIALTIES);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    registrationNumber: '',
    qualifications: '',
    experienceYears: 5,
    clinicAddress: 'Government District Hospital / AIIMS',
    consultationFee: 0,
    specialtyId: DEFAULT_SPECIALTIES[0].id,
    bio: '',
    documentUrl: 'https://praansewa.health/sample-docs/medical-reg.pdf',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    try {
      // Fetch public specialties list from backend
      const res: any = await api.get('/specialties').catch(() => null);
      if (res?.data && res.data.length > 0) {
        setSpecialties(res.data);
        setFormData((prev) => {
          // If previous selection matches a fetched specialty, keep it; otherwise set first ID
          const match = res.data.find((s: any) => s.id === prev.specialtyId || s.slug === prev.specialtyId);
          return {
            ...prev,
            specialtyId: match ? match.id : res.data[0].id,
          };
        });
      }
    } catch (e) {
      console.warn('Could not fetch remote specialties, using default standard catalog:', e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'experienceYears' || name === 'consultationFee' ? Number(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res: any = await api.post('/auth/register/doctor', formData);
      if (res.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'Doctor registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Join as a Medical Professional</h2>
          <p className="text-xs text-slate-500">Provide verified clinical consultations and manage digital prescriptions</p>
        </div>

        {/* Verification Notice */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Credential Verification Policy:</p>
            <p className="mt-0.5 leading-relaxed">
              In compliance with healthcare regulations, your State Medical Council registration and certificates will be thoroughly reviewed by platform administrators before your account is authorized to accept appointments.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-7 sm:p-8 border border-slate-200 shadow-md space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle2 className="w-16 h-16 text-teal-600 mx-auto" />
              <h3 className="text-xl font-bold text-slate-900">Application Submitted Successfully</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your medical registration details have been submitted. The PraanSewa administrative board reviews doctor credentials within 24 hours. You can sign in to view your application status.
              </p>
              <Button variant="teal" onClick={() => navigate('/login?role=DOCTOR')}>
                Proceed to Doctor Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name (with Dr. prefix)"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="dr.sharma@hospital.org"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Phone Number"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98111 22334"
                  required
                />
                <Input
                  label="Password (min 8 characters)"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Medical Council Registration No."
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  placeholder="e.g. MC-DEL-2015-8842"
                  required
                />
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Primary Specialty <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="specialtyId"
                    value={formData.specialtyId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-slate-800 shadow-sm"
                    required
                  >
                    {specialties.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Degrees & Qualifications"
                name="qualifications"
                value={formData.qualifications}
                onChange={handleChange}
                placeholder="e.g. MBBS, MD (Cardiology) - AIIMS New Delhi"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Experience (in years)"
                  type="number"
                  name="experienceYears"
                  min={0}
                  value={formData.experienceYears}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Consultation Fee (₹0 - Govt. Free Healthcare)"
                  type="number"
                  name="consultationFee"
                  min={0}
                  value={formData.consultationFee}
                  onChange={handleChange}
                  required
                />
              </div>

              <Input
                label="Hospital / Medical College Affiliation"
                name="clinicAddress"
                value={formData.clinicAddress}
                onChange={handleChange}
                placeholder="e.g. Dept. of Medicine, AIIMS New Delhi / Govt. District Hospital"
                required
              />

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Short Professional Bio</label>
                <textarea
                  name="bio"
                  rows={2}
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Summary of clinical specializations and treatment approach..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <Button type="submit" variant="teal" className="w-full py-2.5 mt-2" isLoading={loading}>
                Submit Credentials for Verification
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Already registered? <Link to="/login?role=DOCTOR" className="font-semibold text-teal-600 hover:underline">Doctor Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};
