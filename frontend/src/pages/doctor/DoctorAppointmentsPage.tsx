import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Appointment } from '../../types';
import {
  Calendar,
  Clock,
  Video,
  UserCheck,
  CheckCircle2,
  XCircle,
  FileCheck2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../utils/cn';

export const DoctorAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Cancel / Reject state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [filterStatus]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus !== 'ALL') params.status = filterStatus;

      const res: any = await api.get('/doctors/appointments', { params });
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setAppointments(data);
    } catch (err) {
      console.error(err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, status: string, reason?: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/appointments/${appointmentId}/status`, {
        status,
        cancellationReason: reason,
      });
      await fetchAppointments();
      setRejectModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
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
      case 'PENDING':
        return <Badge variant="warning">Pending Request</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Appointment Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage consultation requests, confirm slots, and mark completed consultations.</p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          {['ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                filterStatus === st
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading appointment requests..." />
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No appointments found</h3>
          <p className="text-xs text-slate-500">Appointments matching this filter will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {appt.patient?.user?.fullName || 'Patient'}
                  </h3>
                  {getStatusBadge(appt.status)}
                </div>
                <p className="text-xs text-slate-600">
                  <strong>Clinical Reason:</strong> {appt.reasonForVisit}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatDate(appt.appointmentDate)}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {appt.startTime} - {appt.endTime}
                  </span>
                  <span className="text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                    {appt.consultationType}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 justify-end w-full sm:w-auto">
                {appt.consultation && appt.status !== 'CANCELLED' && (
                  <Button
                    size="sm"
                    variant="teal"
                    onClick={() => navigate(`/consultations/${appt.consultation?.id}`)}
                  >
                    <Video className="w-3.5 h-3.5 mr-1" />
                    Consultation Room
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/doctor/ai-prescription?patientId=${appt.patientId}&appointmentId=${appt.id}`)}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-teal-600" />
                  Prescribe
                </Button>

                {appt.status === 'PENDING' && (
                  <>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleStatusChange(appt.id, 'CONFIRMED')}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        setSelectedAppt(appt);
                        setRejectionReason('');
                        setRejectModalOpen(true);
                      }}
                    >
                      Reject
                    </Button>
                  </>
                )}

                {(appt.status === 'CONFIRMED' || appt.status === 'IN_PROGRESS') && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                    onClick={() => handleStatusChange(appt.id, 'COMPLETED')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Mark Completed
                  </Button>
                )}

                {appt.status === 'COMPLETED' && (
                  <span className="inline-flex items-center text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Completed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Appointment Request"
        description="Provide a reason for declining this consultation."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedAppt) {
              handleStatusChange(selectedAppt.id, 'CANCELLED', rejectionReason || 'Doctor unavailable at requested time');
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Rejection</label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. In emergency surgery, please rebook for afternoon slot..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setRejectModalOpen(false)}>
              Back
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={actionLoading}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
