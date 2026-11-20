import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Doctor } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  Star,
  Clock,
  MapPin,
  ShieldCheck,
  Calendar as CalendarIcon,
  Video,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { formatCurrency } from '../../utils/cn';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DoctorDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  // Booking Form State
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:30');
  const [consultationType, setConsultationType] = useState<'IN_PERSON' | 'VIDEO' | 'AUDIO'>('VIDEO');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    if (id) fetchDoctor(id);
  }, [id]);

  const fetchDoctor = async (doctorId: string) => {
    try {
      const res: any = await api.get(`/doctors/${doctorId}`);
      if (res.data) setDoctor(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeSlotSelect = (start: string) => {
    setStartTime(start);
    const [h, m] = start.split(':').map(Number);
    const endMinutes = m + 30;
    const endHour = endMinutes >= 60 ? h + 1 : h;
    const finalMin = endMinutes >= 60 ? endMinutes - 60 : endMinutes;
    const formattedEnd = `${String(endHour).padStart(2, '0')}:${String(finalMin).padStart(2, '0')}`;
    setEndTime(formattedEnd);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!reasonForVisit.trim()) {
      setBookingError('Please describe the reason for your consultation.');
      return;
    }

    setBookingLoading(true);
    setBookingError('');

    try {
      const payload = {
        doctorId: doctor?.id,
        appointmentDate,
        startTime,
        endTime,
        consultationType,
        reasonForVisit,
      };

      const res: any = await api.post('/appointments', payload);
      if (res.success) {
        setBookingSuccess(true);
        setTimeout(() => {
          navigate('/patient/appointments');
        }, 1800);
      }
    } catch (err: any) {
      setBookingError(err.message || 'Failed to book appointment. Slot may be unavailable.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading doctor profile and available slots..." />;
  if (!doctor) return <div className="text-center py-20 text-slate-500 font-semibold">Doctor not found.</div>;

  const standardSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Doctor Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6 items-start">
        <img
          src={doctor.user.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=250&q=80'}
          alt={doctor.user.fullName}
          className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl object-cover border border-slate-200 shadow-md shrink-0"
        />

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                {doctor.specialties?.[0]?.specialty?.name || 'Medical Specialist'}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                  {doctor.user.fullName}
                </h1>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-300">
                  🏛️ Govt. Medical Officer
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-sm font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>{doctor.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({doctor.reviewCount} reviews)</span>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-medium">{doctor.qualifications}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4 text-slate-400" />
              {doctor.experienceYears} Years Clinical Experience
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Reg: {doctor.registrationNumber}
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4 text-slate-400" />
              {doctor.clinicAddress}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-center shrink-0 w-full md:w-auto">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Consultation Fee</span>
          <span className="text-3xl font-black text-slate-900">{formatCurrency(doctor.consultationFee)}</span>
          <span className="block text-[11px] text-emerald-600 font-semibold mt-1">Instant Confirmation</span>
        </div>
      </div>

      {/* Main Grid: Details + Booking Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Bio & Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900">About the Doctor</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {doctor.bio || 'Consulting physician providing comprehensive clinical healthcare services.'}
            </p>

            <h4 className="text-sm font-bold text-slate-900 pt-2">Specializations</h4>
            <div className="flex flex-wrap gap-2">
              {doctor.specialties?.map((s) => (
                <span
                  key={s.specialty.id}
                  className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-lg border border-primary-100"
                >
                  {s.specialty.name}
                </span>
              ))}
            </div>

            <h4 className="text-sm font-bold text-slate-900 pt-2">Clinic Hours</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                <div key={day} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-bold text-slate-800">{day}</p>
                  <p className="text-slate-500">09:00 AM - 05:00 PM</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Appointment Booking Widget */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-lg space-y-5 sticky top-24">
            <div>
              <h3 className="text-xl font-black text-slate-900">Book Appointment</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select a date and available consultation time slot.</p>
            </div>

            {bookingSuccess ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-emerald-900">Appointment Booked!</h4>
                <p className="text-xs text-emerald-700">
                  Your appointment with {doctor.user.fullName} is confirmed. Redirecting to your appointments...
                </p>
              </div>
            ) : (
              <form onSubmit={handleBook} className="space-y-4">
                {bookingError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Consultation Type Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Consultation Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConsultationType('VIDEO')}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        consultationType === 'VIDEO'
                          ? 'bg-primary-50 border-primary-500 text-primary-700 ring-2 ring-primary-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Video className="w-4 h-4 text-primary-600" />
                      Video Call
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsultationType('IN_PERSON')}
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                        consultationType === 'IN_PERSON'
                          ? 'bg-teal-50 border-teal-500 text-teal-800 ring-2 ring-teal-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 text-teal-600" />
                      Clinic Visit
                    </button>
                  </div>
                </div>

                {/* Appointment Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Date
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    required
                  />
                </div>

                {/* Slot Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Available Time Slots (30 min)
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50">
                    {standardSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => handleTimeSlotSelect(slot)}
                        className={`py-2 px-2 text-xs font-semibold rounded-lg transition text-center ${
                          startTime === slot
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-primary-50 hover:text-primary-700 border border-slate-200'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  <span className="block text-[11px] text-slate-500 mt-1">
                    Selected: <strong>{startTime} - {endTime}</strong>
                  </span>
                </div>

                {/* Reason for visit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Reason for Consultation / Symptoms
                  </label>
                  <textarea
                    rows={2}
                    value={reasonForVisit}
                    onChange={(e) => setReasonForVisit(e.target.value)}
                    placeholder="Briefly describe your symptoms or medical concerns..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    required
                  />
                </div>

                {/* Price summary */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Govt. Public Health Scheme:</span>
                  <span className="text-base font-black text-emerald-700">100% FREE (₹0)</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 border-none font-bold"
                  isLoading={bookingLoading}
                >
                  Confirm Free Appointment
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
