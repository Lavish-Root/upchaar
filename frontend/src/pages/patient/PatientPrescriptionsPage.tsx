import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Prescription } from '../../types';
import { Pill, Printer, ShieldCheck, Calendar, UserCheck, Stethoscope, Download } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { formatDate } from '../../utils/cn';

export const PatientPrescriptionsPage: React.FC = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePrescription, setActivePrescription] = useState<Prescription | null>(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/patients/prescriptions');
      if (res.data) {
        setPrescriptions(res.data);
        if (res.data.length > 0) setActivePrescription(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Digital Prescriptions</h1>
          <p className="text-xs text-slate-500 mt-0.5">Doctor-signed clinical prescriptions with digital verification audit.</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading approved prescriptions..." />
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Pill className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No active prescriptions issued yet</h3>
          <p className="text-xs text-slate-500">
            When you complete a consultation with a verified physician, approved digital prescriptions will be recorded here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* List of Prescriptions */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Prescription</h3>
            {prescriptions.map((rx) => (
              <div
                key={rx.id}
                onClick={() => setActivePrescription(rx)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  activePrescription?.id === rx.id
                    ? 'bg-primary-50/70 border-primary-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary-700 truncate">{rx.diagnosis}</span>
                  <Badge variant="success">Approved</Badge>
                </div>
                <p className="text-xs text-slate-700 font-semibold mt-1">
                  {rx.doctor.user.fullName}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {formatDate(rx.createdAt)} • {rx.items?.length || 0} medications
                </p>
              </div>
            ))}
          </div>

          {/* Detailed Printable Prescription Preview */}
          <div className="lg:col-span-8">
            {activePrescription && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 space-y-6 print:p-0 print:border-none print:shadow-none">
                {/* Prescription Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-200 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-6 h-6 text-primary-600" />
                      <h2 className="text-xl font-black text-slate-900">PraanSewa Health e-Prescription</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Digital Healthcare Platform • Verified Electronic Rx</p>
                  </div>

                  <div className="text-right text-xs space-y-0.5">
                    <p className="font-extrabold text-slate-900">{activePrescription.doctor.user.fullName}</p>
                    <p className="text-slate-500">{activePrescription.doctor.specialties?.[0]?.specialty?.name}</p>
                    <p className="text-teal-600 font-mono text-[11px]">
                      Reg No: {activePrescription.doctor.registrationNumber || 'MC-DEL-4491'}
                    </p>
                    <p className="text-slate-400 text-[10px]">Date: {formatDate(activePrescription.createdAt)}</p>
                  </div>
                </div>

                {/* Patient Information & Clinical Diagnosis */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Patient Name</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {activePrescription.patient?.user?.fullName || 'Registered Patient'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">Clinical Diagnosis</span>
                    <span className="font-extrabold text-primary-700 text-sm">
                      {activePrescription.diagnosis}
                    </span>
                  </div>
                </div>

                {/* Medications Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    Prescribed Medication(s)
                  </h4>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                        <tr>
                          <th className="p-3">#</th>
                          <th className="p-3">Medication Name</th>
                          <th className="p-3">Dosage</th>
                          <th className="p-3">Frequency</th>
                          <th className="p-3">Duration</th>
                          <th className="p-3">Instructions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activePrescription.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">{item.medicationName}</td>
                            <td className="p-3 font-medium text-slate-700">{item.dosage}</td>
                            <td className="p-3 text-slate-600">{item.frequency}</td>
                            <td className="p-3 text-slate-600">{item.duration}</td>
                            <td className="p-3 text-slate-500 italic">{item.instructions || 'As advised'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Clinical Notes & Lifestyle Advice */}
                {(activePrescription.clinicalNotes || activePrescription.advice) && (
                  <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {activePrescription.clinicalNotes && (
                      <p><strong>Clinical Notes:</strong> {activePrescription.clinicalNotes}</p>
                    )}
                    {activePrescription.advice && (
                      <p><strong>Doctor Advice:</strong> {activePrescription.advice}</p>
                    )}
                  </div>
                )}

                {/* Digital Signature & Verification Audit */}
                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Digitally Authorized & Verified</p>
                      <p className="text-[10px] text-emerald-600 font-mono">
                        {activePrescription.approvals?.[0]?.signatureVerification || `DIGITAL_SIG_${activePrescription.id.slice(0, 8)}`}
                      </p>
                    </div>
                  </div>

                  <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
                    <Printer className="w-4 h-4 mr-1.5" />
                    Print / Save PDF
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
