import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Users, Search, ShieldCheck, ShieldAlert, CheckCircle2, UserX } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/cn';

export const AdminPatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async (query?: string) => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/patients', { params: { search: query || undefined } });
      if (res.data) setPatients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(searchTerm);
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-status`);
      fetchPatients(searchTerm);
    } catch (err: any) {
      alert(err.message || 'Status toggle failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Patient Directory & Accounts</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage patient accounts, audit health record activity, and control platform access.</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <input
            type="text"
            placeholder="Search patient name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
          <Button type="submit" variant="primary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching patient directory..." />
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No patients found</h3>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-4">Patient Name</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4">Blood Group</th>
                  <th className="p-4">Allergies</th>
                  <th className="p-4">Consultations</th>
                  <th className="p-4">Account Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {p.user.fullName?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{p.user.fullName}</p>
                          <p className="text-[11px] text-slate-400">{p.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{p.user.phone}</td>
                    <td className="p-4 font-bold text-slate-800">{p.bloodGroup || 'N/A'}</td>
                    <td className="p-4">
                      {p.allergies && p.allergies !== 'None' ? (
                        <span className="text-rose-600 font-bold">{p.allergies}</span>
                      ) : (
                        <span className="text-slate-400 italic">None reported</span>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{p._count?.appointments || 0} visits</td>
                    <td className="p-4">
                      <Badge variant={p.user.isActive ? 'success' : 'danger'}>
                        {p.user.isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant={p.user.isActive ? 'ghost' : 'outline'}
                        className={p.user.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600'}
                        onClick={() => handleToggleStatus(p.user.id)}
                      >
                        {p.user.isActive ? 'Suspend' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
