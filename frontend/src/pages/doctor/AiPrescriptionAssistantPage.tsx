import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Patient, PrescriptionItem } from '../../types';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Pill,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Plus,
  Trash2,
  Save,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const AiPrescriptionAssistantPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(searchParams.get('patientId') || '');
  const [appointmentId, setAppointmentId] = useState<string>(searchParams.get('appointmentId') || '');

  // Clinical input
  const [symptoms, setSymptoms] = useState('');
  const [clinicalObservations, setClinicalObservations] = useState('');
  const [bloodPressure, setBloodPressure] = useState('120/80');
  const [heartRate, setHeartRate] = useState('72');
  const [temperature, setTemperature] = useState('98.6');

  // AI Output state
  const [generating, setGenerating] = useState(false);
  const [draftResult, setDraftResult] = useState<any>(null);

  // Doctor editing draft
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [finalAdvice, setFinalAdvice] = useState('');
  const [finalMedications, setFinalMedications] = useState<PrescriptionItem[]>([]);
  const [doctorSignatureConfirmation, setDoctorSignatureConfirmation] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res: any = await api.get('/doctors/patients');
      if (res.data) {
        setPatients(res.data);
        if (!selectedPatientId && res.data.length > 0) {
          setSelectedPatientId(res.data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !symptoms.trim()) {
      setErrorMessage('Please select a patient and enter clinical symptoms.');
      return;
    }

    setGenerating(true);
    setErrorMessage('');
    setDraftResult(null);

    try {
      const payload = {
        patientId: selectedPatientId,
        symptoms,
        clinicalObservations,
        vitalSigns: {
          bloodPressure,
          heartRate,
          temperature,
        },
      };

      const res: any = await api.post('/prescriptions/ai-draft', payload);
      if (res.data) {
        setDraftResult(res.data);
        setFinalDiagnosis(symptoms.split(',')[0] || 'Clinical Evaluation');
        setFinalAdvice('Adequate hydration, warm fluids, metabolic rest. Report any worsening symptoms.');

        // Initialize doctor-editable medication list from AI suggestions
        const initialMeds: PrescriptionItem[] = res.data.suggestedMedications?.map((item: any) => ({
          medicationName: item.medicationName,
          dosage: item.dosageSuggestion,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.rationale,
        })) || [];

        setFinalMedications(initialMeds);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'AI Drafting failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddMedication = () => {
    setFinalMedications((prev) => [
      ...prev,
      { medicationName: '', dosage: '500mg', frequency: 'Twice daily', duration: '5 days', instructions: 'After meals' },
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    setFinalMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: keyof PrescriptionItem, value: string) => {
    setFinalMedications((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleApprovePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorSignatureConfirmation) {
      setErrorMessage('You must review the draft and tick the clinical authorization confirmation before issuing.');
      return;
    }

    if (finalMedications.length === 0) {
      setErrorMessage('At least one medication is required in the prescription.');
      return;
    }

    setApproving(true);
    setErrorMessage('');

    try {
      const payload = {
        draftId: draftResult.draftId,
        patientId: selectedPatientId,
        appointmentId: appointmentId || undefined,
        diagnosis: finalDiagnosis,
        clinicalNotes: draftResult.clinicalSummary,
        advice: finalAdvice,
        finalMedications,
        doctorSignatureConfirmation: true,
      };

      const res: any = await api.post('/prescriptions/approve-draft', payload);
      if (res.success) {
        setApprovalSuccess(true);
        setTimeout(() => {
          navigate('/doctor/prescriptions');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to approve and sign prescription.');
    } finally {
      setApproving(false);
    }
  };

  const selectedPatientObj = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Safety Notice Banner */}
      <div className="p-4 bg-teal-50 border border-teal-200 rounded-3xl flex items-start gap-3 text-xs text-teal-900">
        <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Doctor-In-The-Loop Safety Guardrail:</strong> AI suggestions are strictly advisory and assist with drug allergy cross-checks and dosage reference. AI never approves prescriptions independently. Only your explicit signature authorizes issuance to the patient.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Patient & Clinical Intake */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <User className="w-4 h-4 text-teal-600" />
              1. Patient Clinical Intake
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.user?.fullName} ({p.allergies ? `Allergic: ${p.allergies}` : 'No known allergies'})
                  </option>
                ))}
              </select>
            </div>

            {selectedPatientObj && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><strong>Known Allergies:</strong> <span className="text-rose-600 font-bold">{selectedPatientObj.allergies || 'None'}</span></p>
                <p><strong>Conditions:</strong> {selectedPatientObj.chronicConditions || 'None'}</p>
                <p><strong>Blood Group:</strong> {selectedPatientObj.bloodGroup || 'N/A'}</p>
              </div>
            )}

            <form onSubmit={handleGenerateDraft} className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Symptoms & Complaints *
                </label>
                <textarea
                  rows={3}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Acute sore throat, difficulty swallowing, fever 101°F for 2 days..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Physical Examination Findings
                </label>
                <textarea
                  rows={2}
                  value={clinicalObservations}
                  onChange={(e) => setClinicalObservations(e.target.value)}
                  placeholder="e.g. Pharyngeal erythema, tonsillar exudates, clear lungs..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>

              {/* Vitals */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Patient Vitals
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">BP (mmHg)</span>
                    <input
                      type="text"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">HR (bpm)</span>
                    <input
                      type="text"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Temp (°F)</span>
                    <input
                      type="text"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="teal"
                className="w-full py-2.5 mt-2"
                isLoading={generating}
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Generate AI Draft & Safety Check
              </Button>
            </form>
          </div>
        </div>

        {/* Right Col: AI Summary & Doctor Review Workspace */}
        <div className="lg:col-span-7 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {approvalSuccess && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-900">Prescription Authorized & Signed!</h4>
              <p className="text-xs text-emerald-700">Digital signature logged to audit trail. Patient notified.</p>
            </div>
          )}

          {!draftResult && !approvalSuccess && (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
              <Sparkles className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Prescription Drafting Workspace</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Fill the clinical intake details on the left and click "Generate AI Draft" to run allergy checks and receive candidate protocols.
              </p>
            </div>
          )}

          {draftResult && !approvalSuccess && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-md space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  2. Doctor Review & Clinical Authorization
                </h3>
                <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                  DRAFT • Doctor Signature Required
                </span>
              </div>

              {/* Safety Flags & Allergy Alerts Box */}
              {draftResult.safetyFlags?.length > 0 && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1.5">
                  <strong className="text-amber-900 flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Clinical Safety & Allergy Alerts:
                  </strong>
                  <ul className="list-disc list-inside text-amber-800 space-y-0.5">
                    {draftResult.safetyFlags.map((flag: string, idx: number) => (
                      <li key={idx} className="font-medium">{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clinical Considerations */}
              {draftResult.clinicalConsiderations?.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <strong className="text-slate-800 block">Clinical Considerations:</strong>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                    {draftResult.clinicalConsiderations.map((c: string, idx: number) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form to Edit Diagnosis, Advice, and Medications */}
              <form onSubmit={handleApprovePrescription} className="space-y-4">
                <Input
                  label="Official Clinical Diagnosis *"
                  value={finalDiagnosis}
                  onChange={(e) => setFinalDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Streptococcal Pharyngitis"
                  required
                />

                {/* Editable Medications List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Prescribed Medications (Edit or Add) *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Drug
                    </button>
                  </div>

                  <div className="space-y-3">
                    {finalMedications.map((med, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500">Medication #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedication(idx)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <input
                            type="text"
                            placeholder="Drug name"
                            value={med.medicationName}
                            onChange={(e) => handleMedChange(idx, 'medicationName', e.target.value)}
                            className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-bold"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Dosage (e.g. 500mg)"
                            value={med.dosage}
                            onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                            className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Frequency (e.g. BD)"
                            value={med.frequency}
                            onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                            className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg"
                            required
                          />
                          <input
                            type="text"
                            placeholder="Duration (e.g. 5 days)"
                            value={med.duration}
                            onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                            className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Lifestyle & Diet Advice
                  </label>
                  <textarea
                    rows={2}
                    value={finalAdvice}
                    onChange={(e) => setFinalAdvice(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>

                {/* Mandatory Doctor Confirmation Checkbox */}
                <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="doc_confirm"
                    checked={doctorSignatureConfirmation}
                    onChange={(e) => setDoctorSignatureConfirmation(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-teal-300 focus:ring-teal-500 mt-0.5"
                    required
                  />
                  <label htmlFor="doc_confirm" className="text-xs text-teal-950 cursor-pointer leading-relaxed">
                    <strong>Doctor Clinical Attestation:</strong> I hereby certify that I have reviewed the clinical details, verified potential allergies and drug-drug interactions, and formally authorize this electronic prescription under my medical registration license.
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="teal"
                    size="lg"
                    isLoading={approving}
                    disabled={!doctorSignatureConfirmation}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Approve & Issue Prescription
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
