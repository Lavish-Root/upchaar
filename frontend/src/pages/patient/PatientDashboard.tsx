import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Appointment, Prescription, MedicalRecord, Doctor } from '../../types';
import {
  Calendar,
  Clock,
  Pill,
  FileText,
  UserCheck,
  Video,
  Bot,
  Sparkles,
  ArrowRight,
  HeartPulse,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/cn';
import { EmergencyCallModal } from '../../components/emergency/EmergencyCallModal';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<Prescription[]>([]);
  const [featuredDoctors, setFeaturedDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [overviewRes, apptRes, rxRes, docsRes]: any = await Promise.all([
        api.get('/patients/health-overview').catch(() => ({ data: {} })),
        api.get('/patients/appointments', { params: { type: 'upcoming' } }),
        api.get('/patients/prescriptions'),
        api.get('/doctors'),
      ]);

      if (overviewRes.data) setStats(overviewRes.data);
      const appts = Array.isArray(apptRes?.data) ? apptRes.data : (Array.isArray(apptRes) ? apptRes : []);
      setUpcomingAppointments(appts);
      if (rxRes.data) setRecentPrescriptions(rxRes.data.slice(0, 3));
      if (docsRes.data) setFeaturedDoctors(docsRes.data.slice(0, 3));
    } catch (err) {
      console.error('Failed to load patient dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading patient health overview..." />;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="success">Confirmed</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge variant="info">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>PraanSewa Health Companion</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Hello, {user?.fullName || 'Patient'}!
          </h1>
          <p className="text-xs sm:text-sm text-primary-100 leading-relaxed">
            Your centralized health record and verified clinical consultations are up to date. How are you feeling today?
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => setEmergencyModalOpen(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-950/40 border border-rose-400 flex items-center gap-1.5 animate-pulse"
            >
              <HeartPulse className="w-4 h-4" />
              🚨 EMERGENCY SOS CALL (FREE)
            </button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white text-primary-700 hover:bg-primary-50 border-white shadow-none"
              onClick={() => navigate('/doctors')}
            >
              <Calendar className="w-4 h-4 mr-1.5" />
              Govt. Doctors (Free)
            </Button>
            <Button
              variant="teal"
              size="sm"
              className="bg-teal-700/60 hover:bg-teal-700 border border-teal-400 text-white shadow-none"
              onClick={() => navigate('/patient/ai-assistant')}
            >
              <Bot className="w-4 h-4 mr-1.5" />
              Ask Praan AI (Grok)
            </Button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Health Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Visits"
          value={stats?.upcomingCount ?? upcomingAppointments.length}
          icon={Calendar}
          color="primary"
          subtitle="Scheduled consultations"
        />
        <StatCard
          title="Completed"
          value={stats?.pastCount ?? 0}
          icon={Activity}
          color="teal"
          subtitle="Past doctor visits"
        />
        <StatCard
          title="Medical Records"
          value={stats?.recordsCount ?? 0}
          icon={FileText}
          color="indigo"
          subtitle="Diagnostic reports & scans"
        />
        <StatCard
          title="Prescriptions"
          value={stats?.prescriptionsCount ?? recentPrescriptions.length}
          icon={Pill}
          color="emerald"
          subtitle="Doctor-approved prescriptions"
        />
      </div>

      {/* Main Grid: Upcoming Appointments + Quick AI Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upcoming Appointments List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-600" />
              Upcoming Consultations
            </h3>
            <Link to="/patient/appointments" className="text-xs font-bold text-primary-600 hover:underline">
              View All ({upcomingAppointments.length})
            </Link>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No upcoming appointments scheduled</h4>
              <p className="text-xs text-slate-500">Book a consultation with verified doctors when you need care.</p>
              <Button size="sm" variant="primary" onClick={() => navigate('/doctors')}>
                Find Doctors Now
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={appt.doctor.user.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=120&q=80'}
                      alt={appt.doctor.user.fullName}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900">{appt.doctor.user.fullName}</h4>
                        {getStatusBadge(appt.status)}
                      </div>
                      <p className="text-xs text-primary-600 font-semibold">
                        {appt.doctor.specialties?.[0]?.specialty?.name || 'Medical Specialist'}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(appt.appointmentDate)}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {appt.startTime} - {appt.endTime}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          {appt.consultationType === 'VIDEO' ? <Video className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {appt.consultationType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {appt.consultation && (
                      <Button
                        size="sm"
                        variant="teal"
                        onClick={() => navigate(`/consultations/${appt.consultation?.id}`)}
                      >
                        <Video className="w-3.5 h-3.5 mr-1" />
                        Join Room
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/patient/appointments')}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Prescriptions */}
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                Active & Recent Prescriptions
              </h3>
              <Link to="/patient/prescriptions" className="text-xs font-bold text-primary-600 hover:underline">
                View All ({recentPrescriptions.length})
              </Link>
            </div>

            {recentPrescriptions.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center text-xs text-slate-500">
                No digital prescriptions issued yet. They will appear here once approved by your doctor.
              </div>
            ) : (
              <div className="space-y-3">
                {recentPrescriptions.map((rx) => (
                  <div key={rx.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{rx.diagnosis}</h4>
                        <Badge variant="success">Approved</Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Prescribed by {rx.doctor.user.fullName} • {formatDate(rx.createdAt)}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {rx.items?.map((item, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium">
                            💊 {item.medicationName} ({item.dosage}) - {item.frequency}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/patient/prescriptions')}>
                      View Rx
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: AI Assistant Shortcuts & Home Remedies */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Quick Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white space-y-4 shadow-lg border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>AI Health Assistant</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            <h4 className="text-lg font-bold">Have a symptom or medical inquiry?</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ask our evidence-based assistant for preliminary triage, warning sign identification, and self-care advice.
            </p>

            <div className="space-y-2 pt-2">
              <Button
                variant="teal"
                className="w-full text-xs"
                onClick={() => navigate('/patient/ai-assistant')}
              >
                <Bot className="w-4 h-4 mr-2" />
                Start Text Chat
              </Button>
              <Button
                variant="outline"
                className="w-full text-xs bg-transparent text-white border-slate-600 hover:bg-slate-800"
                onClick={() => navigate('/patient/voice-assistant')}
              >
                <Video className="w-4 h-4 mr-2" />
                Voice Health Assistant
              </Button>
            </div>
          </div>

          {/* Evidence-based Home Remedies Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                Home Care Protocols
              </h4>
              <Link to="/patient/home-remedies" className="text-xs text-teal-600 font-bold hover:underline">
                Explore
              </Link>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Explore 8 verified clinical categories including cold & cough, sore throat, hydration, and sleep hygiene.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => navigate('/patient/home-remedies?cat=cough-and-cold')}
                className="p-2.5 rounded-xl bg-teal-50 text-teal-800 font-semibold text-left hover:bg-teal-100 transition"
              >
                Cough & Cold
              </button>
              <button
                onClick={() => navigate('/patient/home-remedies?cat=mild-sore-throat')}
                className="p-2.5 rounded-xl bg-teal-50 text-teal-800 font-semibold text-left hover:bg-teal-100 transition"
              >
                Sore Throat
              </button>
              <button
                onClick={() => navigate('/patient/home-remedies?cat=digestive-discomfort')}
                className="p-2.5 rounded-xl bg-teal-50 text-teal-800 font-semibold text-left hover:bg-teal-100 transition"
              >
                Digestion
              </button>
              <button
                onClick={() => navigate('/patient/home-remedies?cat=sleep-hygiene')}
                className="p-2.5 rounded-xl bg-teal-50 text-teal-800 font-semibold text-left hover:bg-teal-100 transition"
              >
                Sleep Hygiene
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Call SOS Modal */}
      <EmergencyCallModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
      />
    </div>
  );
};
