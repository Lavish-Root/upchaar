import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Appointment } from '../../types';
import {
  Calendar,
  Clock,
  Video,
  UserCheck,
  XCircle,
  RefreshCw,
  AlertCircle,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/cn';

export const PatientAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Reschedule states
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('11:00');

  useEffect(() => {
    fetchAppointments(activeTab);
  }, [activeTab]);

  const fetchAppointments = async (type: 'upcoming' | 'past') => {
    setLoading(true);
    try {
      const res: any = await api.get('/patients/appointments', { params: { type } });
      const appts = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      setAppointments(appts);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setActionLoading(true);
    try {
      await api.patch(`/appointments/${selectedAppointment.id}/status`, {
        status: 'CANCELLED',
        cancellationReason: cancelReason || 'Cancelled by patient',
      });
      setCancelModalOpen(false);
      fetchAppointments(activeTab);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    setActionLoading(true);
    try {
      const [h, m] = rescheduleTime.split(':').map(Number);
      const endM = m + 30;
      const endH = endM >= 60 ? h + 1 : h;
      const finalM = endM >= 60 ? endM - 60 : endM;
      const endTime = `${String(endH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;

      await api.patch(`/appointments/${selectedAppointment.id}/reschedule`, {
        appointmentDate: rescheduleDate,
        startTime: rescheduleTime,
        endTime,
        reason: 'Patient requested reschedule',
      });
      setRescheduleModalOpen(false);
      fetchAppointments(activeTab);
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule appointment');
    } finally {
      setActionLoading(false);
    }
  };

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
      case 'RESCHEDULED':
        return <Badge variant="warning">Rescheduled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Appointments</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage upcoming visits, consultations, and reschedule if needed.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => navigate('/doctors')}>
          <Calendar className="w-4 h-4 mr-1.5" />
          Book New Consultation
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'upcoming'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Upcoming Appointments
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 ${
            activeTab === 'past'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Past & Completed
        </button>
      </div>

      {/* List */}
      {loading ? (
        <LoadingSpinner text="Fetching appointments..." />
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No {activeTab} appointments found</h3>
          <p className="text-xs text-slate-500">Need to consult with a specialist? Browse our verified physicians.</p>
          <Button size="sm" variant="primary" onClick={() => navigate('/doctors')}>
            Find a Doctor
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <img
                    src={appt.doctor.user.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80'}
                    alt={appt.doctor.user.fullName}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-slate-900">{appt.doctor.user.fullName}</h3>
                      {getStatusBadge(appt.status)}
                    </div>
                    <p className="text-xs text-primary-600 font-semibold">
                      {appt.doctor.specialties?.[0]?.specialty?.name || 'Medical Specialist'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      <strong>Reason:</strong> {appt.reasonForVisit}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end text-xs text-slate-600 gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Calendar className="w-4 h-4 text-primary-600" />
                    <span>{formatDate(appt.appointmentDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{appt.startTime} - {appt.endTime}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    {appt.consultationType}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {appt.cancellationReason && (
                    <span className="text-rose-600 font-medium">Note: {appt.cancellationReason}</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {appt.consultation && appt.status !== 'CANCELLED' && (
                    <Button
                      size="sm"
                      variant="teal"
                      onClick={() => navigate(`/consultations/${appt.consultation?.id}`)}
                    >
                      <Video className="w-4 h-4 mr-1.5" />
                      Consultation Room
                    </Button>
                  )}

                  {appt.prescription && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/patient/prescriptions')}
                    >
                      <FileCheck2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                      View Prescription
                    </Button>
                  )}

                  {appt.status === 'CONFIRMED' && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedAppointment(appt);
                          setRescheduleDate(new Date(appt.appointmentDate).toISOString().split('T')[0]);
                          setRescheduleModalOpen(true);
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Reschedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        onClick={() => {
                          setSelectedAppointment(appt);
                          setCancelReason('');
                          setCancelModalOpen(true);
                        }}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancellation Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment?"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Cancellation</label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a brief reason for cancellation..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setCancelModalOpen(false)}>
              Keep Appointment
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={actionLoading}>
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Appointment"
        description="Select a new date and time slot."
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Date</label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Time Slot</label>
            <select
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            >
              <option value="09:00">09:00 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="14:00">02:00 PM</option>
              <option value="15:00">03:00 PM</option>
              <option value="16:00">04:00 PM</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={actionLoading}>
              Confirm Reschedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
