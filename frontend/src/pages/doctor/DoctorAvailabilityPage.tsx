import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Clock, CheckCircle2, AlertCircle, Save, Calendar } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DoctorAvailabilityPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [schedule, setSchedule] = useState(
    DAYS_OF_WEEK.map((_, index) => ({
      dayOfWeek: index,
      startTime: '09:00',
      endTime: '17:00',
      slotDurationMinutes: 30,
      isAvailable: index >= 1 && index <= 5, // Mon-Fri default available
    }))
  );

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/auth/me');
      if (res.data?.doctor?.availability?.length > 0) {
        const existing = res.data.doctor.availability;
        setSchedule(
          DAYS_OF_WEEK.map((_, index) => {
            const found = existing.find((a: any) => a.dayOfWeek === index);
            return {
              dayOfWeek: index,
              startTime: found?.startTime || '09:00',
              endTime: found?.endTime || '17:00',
              slotDurationMinutes: found?.slotDurationMinutes || 30,
              isAvailable: found ? found.isAvailable : index >= 1 && index <= 5,
            };
          })
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (index: number) => {
    setSchedule((prev) =>
      prev.map((day) => (day.dayOfWeek === index ? { ...day, isAvailable: !day.isAvailable } : day))
    );
  };

  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((prev) =>
      prev.map((day) => (day.dayOfWeek === index ? { ...day, [field]: value } : day))
    );
  };

  const handleSlotDurationChange = (index: number, duration: number) => {
    setSchedule((prev) =>
      prev.map((day) => (day.dayOfWeek === index ? { ...day, slotDurationMinutes: duration } : day))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res: any = await api.put('/doctors/availability', { availabilities: schedule });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update availability schedule.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading availability schedule..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Availability & Slot Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure consultation days, working hours, and slot intervals to prevent double-bookings.
          </p>
        </div>
        <Button variant="teal" size="sm" onClick={handleSave} isLoading={saving}>
          <Save className="w-4 h-4 mr-1.5" />
          Save Schedule
        </Button>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Availability schedule saved successfully. Real-time patient booking slots updated.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="divide-y divide-slate-100">
          {schedule.map((item, idx) => (
            <div key={item.dayOfWeek} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-40">
                <input
                  type="checkbox"
                  id={`day_${item.dayOfWeek}`}
                  checked={item.isAvailable}
                  onChange={() => handleDayToggle(item.dayOfWeek)}
                  className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                />
                <label
                  htmlFor={`day_${item.dayOfWeek}`}
                  className={`text-sm font-bold cursor-pointer ${
                    item.isAvailable ? 'text-slate-900' : 'text-slate-400 line-through'
                  }`}
                >
                  {DAYS_OF_WEEK[item.dayOfWeek]}
                </label>
              </div>

              {item.isAvailable ? (
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">From:</span>
                    <input
                      type="time"
                      value={item.startTime}
                      onChange={(e) => handleTimeChange(item.dayOfWeek, 'startTime', e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">To:</span>
                    <input
                      type="time"
                      value={item.endTime}
                      onChange={(e) => handleTimeChange(item.dayOfWeek, 'endTime', e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Slot:</span>
                    <select
                      value={item.slotDurationMinutes}
                      onChange={(e) => handleSlotDurationChange(item.dayOfWeek, Number(e.target.value))}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                    >
                      <option value={15}>15 mins</option>
                      <option value={30}>30 mins</option>
                      <option value={45}>45 mins</option>
                      <option value={60}>60 mins</option>
                    </select>
                  </div>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">Marked Unavailable / Closed</span>
              )}
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button type="submit" variant="teal" isLoading={saving}>
            <Save className="w-4 h-4 mr-1.5" />
            Save Schedule
          </Button>
        </div>
      </form>
    </div>
  );
};
