import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Stethoscope, ShieldCheck, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    registrationNumber: '',
    qualifications: '',
    experienceYears: 5,
    clinicAddress: '',
    consultationFee: 500,
    bio: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/auth/me');
      if (res.data?.doctor) {
        const d = res.data.doctor;
        setFormData({
          fullName: res.data.fullName,
          phone: res.data.phone || '',
          registrationNumber: d.registrationNumber,
          qualifications: d.qualifications,
          experienceYears: d.experienceYears,
          clinicAddress: d.clinicAddress,
          consultationFee: d.consultationFee,
          bio: d.bio || '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'experienceYears' || name === 'consultationFee' ? Number(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res: any = await api.put('/doctors/profile', formData);
      if (res.success) {
        setSuccess(true);
        updateUser({ fullName: formData.fullName, phone: formData.phone });
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update doctor profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading doctor credentials..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Doctor Profile & Medical Practice</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your credentials, clinic location, and standard consultation fees.</p>
      </div>

      <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-md space-y-5">
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile and practice details updated.</span>
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
              label="Doctor Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
            <Input
              label="Account Email"
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
              label="State Medical Council Reg. No. (Verified)"
              value={formData.registrationNumber}
              disabled
              className="bg-slate-100 text-slate-700 font-mono cursor-not-allowed"
            />
          </div>

          <Input
            label="Degrees & Qualifications"
            name="qualifications"
            value={formData.qualifications}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Clinical Experience (Years)"
              type="number"
              name="experienceYears"
              value={formData.experienceYears}
              onChange={handleChange}
              min={0}
              required
            />
            <Input
              label="Consultation Fee (₹ INR)"
              type="number"
              name="consultationFee"
              value={formData.consultationFee}
              onChange={handleChange}
              min={0}
              step={50}
              required
            />
          </div>

          <Input
            label="Clinic / Hospital Address"
            name="clinicAddress"
            value={formData.clinicAddress}
            onChange={handleChange}
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Professional Bio</label>
            <textarea
              name="bio"
              rows={3}
              value={formData.bio}
              onChange={handleChange}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="pt-2 text-right">
            <Button type="submit" variant="teal" isLoading={saving}>
              <Save className="w-4 h-4 mr-1.5" />
              Save Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
