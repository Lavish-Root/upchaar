import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Patient } from '../../types';
import { Users, AlertTriangle, FileText, Pill, Sparkles, ChevronRight, User } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Modal } from '../../components/common/Modal';

export const DoctorPatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/doctors/patients');
      if (res.data) setPatients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Assigned Patient Records</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Authorized access to patient clinical histories, drug allergies, and past prescriptions under your care.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading assigned patients..." />
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No patients assigned yet</h3>
          <p className="text-xs text-slate-500">Patients who book consultations with you will automatically appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {patients.map((patient) => {
            const hasAllergies = patient.allergies && patient.allergies !== 'None';
            return (
              <div
                key={patient.id}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-base">
                      {patient.user?.fullName?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-extrabold text-slate-900 truncate">
                        {patient.user?.fullName}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">{patient.user?.phone}</p>
                    </div>
                  </div>

                  {/* Allergy Alert Tag */}
                  {hasAllergies ? (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span><strong>Allergies:</strong> {patient.allergies}</span>
                    </div>
                  ) : (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                      No documented drug allergies
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-slate-600">
                    <p><strong>Blood Group:</strong> {patient.bloodGroup || 'N/A'}</p>
                    <p><strong>Conditions:</strong> {patient.chronicConditions || 'None reported'}</p>
                    <p className="truncate"><strong>Location:</strong> {patient.address || 'Not specified'}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPatient(patient)}
                  >
                    Clinical History
                  </Button>
                  <Button
                    size="sm"
                    variant="teal"
                    onClick={() => navigate(`/doctor/ai-prescription?patientId=${patient.id}`)}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    Prescribe
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <Modal
          isOpen={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          title={`Clinical History: ${selectedPatient.user?.fullName}`}
          description={`Blood Group: ${selectedPatient.bloodGroup || 'N/A'} • Emergency: ${selectedPatient.emergencyContact || 'N/A'}`}
          maxWidth="lg"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
            {/* Allergies banner */}
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
              <strong className="block mb-0.5">Documented Drug Allergies:</strong>
              <p>{selectedPatient.allergies || 'None reported'}</p>
            </div>

            <div>
              <strong className="text-slate-900 block mb-1">Chronic Medical Conditions:</strong>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {selectedPatient.chronicConditions || 'None reported'}
              </p>
            </div>

            {/* Uploaded records */}
            <div>
              <strong className="text-slate-900 block mb-2">Attached Diagnostic Records:</strong>
              {selectedPatient.medicalRecords?.length > 0 ? (
                <div className="space-y-2">
                  {selectedPatient.medicalRecords.map((r: any) => (
                    <div key={r.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{r.title}</p>
                        <p className="text-[10px] text-slate-400">{r.recordType}</p>
                      </div>
                      <a href={r.fileUrl} target="_blank" rel="noreferrer" className="text-primary-600 font-bold hover:underline">
                        View
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic">No diagnostic records uploaded yet.</p>
              )}
            </div>

            <div className="pt-2 text-right">
              <Button variant="teal" onClick={() => setSelectedPatient(null)}>
                Close Record
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
