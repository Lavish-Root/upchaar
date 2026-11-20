import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import {
  Users,
  UserCheck,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/cn';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/admin/dashboard');
      if (res.data) setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Aggregating platform analytics..." />;

  const stats = data?.stats || {};
  const chartData = data?.specialtyDistribution || [];
  const auditLogs = data?.recentAuditLogs || [];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/20 text-primary-300 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5" />
            <span>PraanSewa Superadmin System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Platform Performance & Verification</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Live overview of registered users, credential verification queues, system transactions, and security audits.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/doctors?status=PENDING')}>
            Review Doctor Applications ({stats.pendingVerifications || 0})
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Patients"
          value={stats.totalPatients ?? 0}
          icon={Users}
          color="primary"
          subtitle="Registered accounts"
        />
        <StatCard
          title="Total Doctors"
          value={stats.totalDoctors ?? 0}
          icon={UserCheck}
          color="teal"
          subtitle={`${stats.pendingVerifications || 0} pending review`}
        />
        <StatCard
          title="Consultations"
          value={stats.totalAppointments ?? 0}
          icon={Calendar}
          color="indigo"
          subtitle={`${stats.completedAppointments || 0} completed`}
        />
        <StatCard
          title="Platform Revenue"
          value={formatCurrency(stats.totalRevenue ?? 0)}
          icon={TrendingUp}
          color="emerald"
          subtitle="Completed bookings"
        />
      </div>

      {/* Main Grid: Chart + Verification Alert Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Specialty Distribution Bar Chart */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-600" />
              Doctor Distribution by Specialty
            </h3>
            <Link to="/admin/specialties" className="text-xs text-primary-600 font-semibold hover:underline">
              Manage Specialties
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="doctorCount" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Verifications Queue */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                Doctor Verification Queue
              </h3>
              <Badge variant={stats.pendingVerifications > 0 ? 'warning' : 'success'}>
                {stats.pendingVerifications || 0} Pending
              </Badge>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Every newly registered doctor requires administrative verification of their State Medical Council registration and certificates before they can accept patient appointments.
            </p>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-1">
              <p className="font-bold">Pending Review Action Required</p>
              <p>Verify doctor medical degree, registration number, and clinic documents in the management panel.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate('/admin/doctors?status=PENDING')}
            >
              Open Verification Panel
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Audit Logs */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-600" />
            System Audit & Security Trail
          </h3>
          <Link to="/admin/audit-logs" className="text-xs text-primary-600 font-semibold hover:underline">
            View Complete Logs
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-600">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity Type</th>
                <th className="p-3">User</th>
                <th className="p-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="p-3 text-slate-400 font-mono text-[11px]">{formatDate(log.createdAt)}</td>
                  <td className="p-3 font-bold text-slate-800">{log.action}</td>
                  <td className="p-3 font-mono text-primary-700">{log.entityType}</td>
                  <td className="p-3 text-slate-600">{log.user?.fullName || 'System / Guest'}</td>
                  <td className="p-3 font-mono text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
