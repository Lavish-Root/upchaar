import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Prescription } from '../../types';
import { Pill, Plus, Printer, ShieldCheck, Sparkles, User, Calendar } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/cn';

export const DoctorPrescriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      // Fetch directly from prescriptions endpoint
      const res: any = await api.get('/prescriptions');
      if (res.data && res.data.length > 0) {
        const mapped = res.data.map((rx: any) => ({
          ...rx,
          patientName: rx.patient?.user?.fullName || rx.patientName || 'Assigned Patient',
        }));
        setPrescriptions(mapped);
      } else {
        // Fallback to doctors/patients
        const patRes: any = await api.get('/doctors/patients');
        if (patRes.data) {
          const allRx: any[] = [];
          patRes.data.forEach((p: any) => {
            if (p.prescriptions) {
              p.prescriptions.forEach((rx: any) => {
                allRx.push({ ...rx, patientName: p.user?.fullName });
              });
            }
          });
          setPrescriptions(allRx);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Digital Prescriptions Archive</h1>
          <p className="text-xs text-slate-500 mt-0.5">Authorized clinical prescriptions signed and issued under your medical council license.</p>
        </div>
        <Button variant="teal" size="sm" onClick={() => navigate('/doctor/ai-prescription')}>
          <Sparkles className="w-4 h-4 mr-1.5" />
          New AI Assisted Prescription
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading prescriptions..." />
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Pill className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No prescriptions issued yet</h3>
          <p className="text-xs text-slate-500">Use the AI Prescription Assistant to draft and approve electronic prescriptions.</p>
          <Button size="sm" variant="teal" onClick={() => navigate('/doctor/ai-prescription')}>
            Draft First Prescription
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">{rx.diagnosis}</h3>
                  <Badge variant="success">Approved & Signed</Badge>
                </div>
                <p className="text-xs text-slate-600">
                  Patient: <strong>{rx.patientName || 'Assigned Patient'}</strong> • {formatDate(rx.createdAt)}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {rx.items?.map((item: any, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-medium text-slate-700">
                      💊 {item.medicationName} ({item.dosage}) - {item.frequency}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
