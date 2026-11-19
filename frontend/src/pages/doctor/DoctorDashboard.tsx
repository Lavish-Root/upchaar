import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Appointment } from '../../types';
import {
  Users,
  Calendar,
  Clock,
  TrendingUp,
  Video,
  FileCheck2,
  Sparkles,
  ArrowRight,
  Stethoscope,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../../utils/cn';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/doctors/dashboard');
      if (res.data) setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading doctor clinical dashboard..." />;

  const isPending = user?.doctorVerificationStatus === 'PENDING';

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-teal-200 text-xs font-semibold">
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Govt. Medical Officer • Clinical Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome, {user?.fullName}!
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 max-w-lg">
            Manage your patient tele-triage, emergency video calls, and draft clinical prescriptions under the 100% Free National Healthcare Scheme.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white text-teal-800 hover:bg-teal-50 border-white shadow-none"
            onClick={() => navigate('/doctor/appointments')}
          >
            <Calendar className="w-4 h-4 mr-1.5" />
            View Schedule
          </Button>
          <Button
            variant="teal"
            size="sm"
            className="bg-teal-600 hover:bg-teal-500 text-white shadow-none"
            onClick={() => navigate('/doctor/ai-prescription')}
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            Draft AI Prescription
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Patients"
          value={stats?.totalPatients ?? 0}
          icon={Users}
          color="teal"
          subtitle="Distinct patient records"
        />
        <StatCard
          title="Today's Consultations"
          value={stats?.todayCount ?? 0}
          icon={Calendar}
          color="primary"
          subtitle="Scheduled for today"
        />
        <StatCard
          title="Completed"
          value={stats?.completedCount ?? 0}
          icon={CheckCircle2}
          color="emerald"
          subtitle="Consultations completed"
        />
        <StatCard
          title="Healthcare Scheme"
          value="100% Free"
          icon={TrendingUp}
          color="indigo"
          subtitle="Govt. consultations delivered"
        />
      </div>

      {/* Main Grid: Today's Appointments & AI Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Today's Appointments */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Today's Scheduled Consultations
            </h3>
            <Link to="/doctor/appointments" className="text-xs font-bold text-teal-700 hover:underline">
              All Appointments ({stats?.todayCount || 0})
            </Link>
          </div>

          {!stats?.todayAppointments || stats.todayAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No appointments scheduled for today</h4>
              <p className="text-xs text-slate-500">Upcoming appointments will appear as patients book slots.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.todayAppointments.map((appt: any) => (
                <div
                  key={appt.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{appt.patient?.user?.fullName}</h4>
                      <Badge variant={appt.status === 'COMPLETED' ? 'info' : 'success'}>
                        {appt.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      Reason: <strong>{appt.reasonForVisit}</strong>
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {appt.startTime} - {appt.endTime}
                      </span>
                      <span className="text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                        {appt.consultationType}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {appt.consultation && (
                      <Button
                        size="sm"
                        variant="teal"
                        onClick={() => navigate(`/consultations/${appt.consultation?.id}`)}
                      >
                        <Video className="w-3.5 h-3.5 mr-1" />
                        Start Consultation Room
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/doctor/ai-prescription?patientId=${appt.patientId}`)}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600" />
                      Prescribe
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Quick Clinical Actions & Safety Protocols */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-teal-900 to-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-lg border border-teal-800">
            <div className="flex items-center gap-2 text-teal-300 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>AI Prescription Assistant</span>
            </div>
            <h4 className="text-base font-bold">Draft Structured Prescriptions with Drug Safety Verification</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Generate clinical summaries, review potential contraindications and drug-drug interactions against verified medical references before signing.
            </p>
            <Button
              variant="teal"
              className="w-full text-xs"
              onClick={() => navigate('/doctor/ai-prescription')}
            >
              Open AI Prescription Assistant
            </Button>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 text-sm">Doctor Verification Status</h4>
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Credentials Approved by Admin</span>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Your State Medical Council registration and practice credentials have been verified for tele-consultation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
