import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { User, ShieldCheck, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const PatientProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    dob: '',
    gender: 'MALE',
    bloodGroup: 'O+',
    address: '',
    emergencyContact: '',
    allergies: '',
    chronicConditions: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/patients/profile');
      if (res.data) {
        const p = res.data;
        setFormData({
          fullName: p.user?.fullName || '',
          phone: p.user?.phone || '',
          dob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
          gender: p.gender || 'MALE',
          bloodGroup: p.bloodGroup || 'O+',
          address: p.address || '',
          emergencyContact: p.emergencyContact || '',
          allergies: p.allergies || '',
          chronicConditions: p.chronicConditions || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res: any = await api.put('/patients/profile', formData);
      if (res.success) {
        setSuccess(true);
        updateUser({ fullName: formData.fullName, phone: formData.phone });
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading patient profile..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Patient Profile & Health Details</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your personal details, emergency contact, and drug allergy records.</p>
      </div>

      <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-md space-y-5">
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile and health history updated successfully.</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <Input
              label="Email Address (Permanent)"
              value={user?.email || ''}
              disabled
              className="bg-slate-100 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
            />
            <Input
              label="Emergency Contact"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              placeholder="+91 ... (Spouse / Parent)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <Input
            label="Residential Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Address, City, State"
          />

          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Critical Clinical Safety Attributes
            </h4>

            <Input
              label="Recorded Drug Allergies (e.g. Penicillin, Sulfa, Aspirin)"
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              placeholder="e.g. Penicillin, Ibuprofen"
              helperText="Our AI Prescription Checker and doctors rely on this to prevent dangerous adverse drug interactions."
            />

            <Input
              label="Chronic Medical Conditions (e.g. Hypertension, Type 2 Diabetes, Asthma)"
              name="chronicConditions"
              value={formData.chronicConditions}
              onChange={handleChange}
              placeholder="e.g. Hypertension, Asthma"
            />
          </div>

          <div className="pt-2 text-right">
            <Button type="submit" variant="primary" isLoading={saving}>
              <Save className="w-4 h-4 mr-1.5" />
              Save Health Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
