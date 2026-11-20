import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Specialty } from '../../types';
import { Layers, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AdminSpecialtiesPage: React.FC = () => {
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'Stethoscope',
  });

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/specialties');
      if (res.data) setSpecialties(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setFormData({ ...formData, name, slug });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setError('');

    try {
      const res: any = await api.post('/admin/specialties', formData);
      if (res.success) {
        setAddModalOpen(false);
        setFormData({ name: '', slug: '', description: '', icon: 'Stethoscope' });
        fetchSpecialties();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create specialty.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Medical Specialties</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage clinical disciplines for doctor classification and search filtering.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Add Medical Specialty
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading specialties..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {specialties.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="p-2 rounded-xl bg-primary-50 text-primary-600 font-bold text-xs">
                  <Layers className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                  {s._count?.doctors || 0} Doctors
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900">{s.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-2">{s.description || 'Clinical specialty'}</p>
              <span className="font-mono text-[10px] text-slate-400 block pt-1">slug: {s.slug}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Medical Specialty"
        description="Create a new specialty category for doctor onboarding."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Specialty Name"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="e.g. Ophthalmology or Psychiatry"
            required
          />

          <Input
            label="URL Slug (auto-generated)"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="e.g. ophthalmology"
            required
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Clinical domain and condition overview..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={adding}>
              Save Specialty
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
