import React, { useEffect, useState } from 'react';
import {
  PhoneOff, Clock, FileText, CheckCircle, Stethoscope, AlertTriangle,
  Maximize2, Minimize2, ExternalLink, ShieldCheck, ChevronRight, ChevronLeft
} from 'lucide-react';
import { ActiveVideoSession, User, UserRole } from '../types';

interface VideoCallProps {
  session: ActiveVideoSession;
  currentUser: User;
  onEndCall: (doctorNotes?: string, prescription?: string) => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({ session, currentUser, onEndCall }) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Doctor clinical notes & prescription states
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescriptionText, setPrescriptionText] = useState(session.prescription || '');
  const [isRxSaved, setIsRxSaved] = useState(false);

  const isDoctor = currentUser.role === UserRole.DOCTOR;
  const otherRoleName = isDoctor
    ? (session.patientName || 'Patient')
    : (session.doctorName || 'Dr. A. Sharma');

  // Sanitize room ID for Jitsi Meet URL
  const cleanRoomCode = (session.roomId || 'upchaar-consultation').replace(/[^a-zA-Z0-9_-]/g, '');
  const displayName = encodeURIComponent(currentUser.name || (isDoctor ? 'Doctor' : 'Patient'));

  // Jitsi Meet HD Room URL with pre-configured audio/video and user identity
  const jitsiRoomUrl = `https://meet.jit.si/PraanSewa-${cleanRoomCode}#config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.prejoinPageEnabled=false&userInfo.displayName="${displayName}"`;

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleEndCall = () => {
    onEndCall(doctorNotes, prescriptionText);
  };

  // Quick Prescription Templates for Doctor
  const applyQuickRx = (template: string) => {
    if (template === 'FEVER') {
      setPrescriptionText(
        '1. Tab Paracetamol 650mg - 1 tab thrice daily after meals x 3 days\n' +
        '2. Tab Levocetirizine 5mg - 1 tab at bedtime x 5 days\n' +
        '3. ORS hydration solution - 500ml daily\n' +
        '4. Cold water sponge forehead if temp > 101°F'
      );
    } else if (template === 'GASTRO') {
      setPrescriptionText(
        '1. Tab Pantoprazole 40mg - 1 tab once daily empty stomach x 5 days\n' +
        '2. Cap Probiotics - 1 cap twice daily after food x 5 days\n' +
        '3. Electral ORS in 1 Liter boiled water sip throughout day\n' +
        '4. Soft diet: Khichdi, curd, banana'
      );
    } else if (template === 'INFECTION') {
      setPrescriptionText(
        '1. Tab Amoxicillin-Clav 625mg - 1 tab twice daily after meals x 5 days\n' +
        '2. Tab Paracetamol 650mg - SOS for pain or fever\n' +
        '3. Warm salt water gargle 3 times a day\n' +
        '4. Review after 3 days if symptoms persist'
      );
    }
    setIsRxSaved(false);
  };

  return (
    <div className={`flex flex-col h-full w-full bg-slate-950 text-white relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
      {/* ───────────────── TOP TELEHEALTH HEADER BAR ───────────────── */}
      <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950">
            <Stethoscope size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm sm:text-base text-white">
                Live Video Teleconsultation
              </h2>
              {session.isEmergency ? (
                <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                  <AlertTriangle size={10} /> Emergency SOS
                </span>
              ) : (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  HD Video Room Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>Patient: <strong className="text-slate-200">{session.patientName || 'Patient'}</strong></span>
              <span>•</span>
              <span>Doctor: <strong className="text-emerald-300">{isDoctor ? currentUser.name : (session.doctorName || 'Dr. A. Sharma')}</strong></span>
              <span>•</span>
              <span className="font-mono text-emerald-400 font-semibold">Room: {cleanRoomCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Duration Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-emerald-300">
            <Clock size={13} className="text-emerald-400" />
            <span>{formatDuration(callDuration)}</span>
          </div>

          {/* External Tab Opener */}
          <a
            href={jitsiRoomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Open Video Call in New Window"
          >
            <ExternalLink size={16} />
          </a>

          {/* Toggle Clinical Sidebar */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-bold ${
              isSidebarOpen ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Clinical Notes Sidebar"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">EHR Notes</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* End Call Button in Header */}
          <button
            onClick={handleEndCall}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition cursor-pointer"
            title="End Consultation"
          >
            <PhoneOff size={15} />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </div>

      {/* ───────────────── MAIN TELEHEALTH WORKSPACE ───────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Full-Screen Jitsi Meet HD Telehealth Video Room */}
        <div className="flex-1 w-full h-full relative bg-black">
          <iframe
            src={jitsiRoomUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            className="w-full h-full border-0"
            title="Live Telehealth Video Call"
          />
        </div>

        {/* ───────────────── CLINICAL EHR SIDE PANEL ───────────────── */}
        {isSidebarOpen && (
          <div className="w-full lg:w-96 bg-slate-900/98 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col max-h-80 lg:max-h-full overflow-y-auto shrink-0 shadow-2xl z-20">
            <div className="border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                  <FileText size={16} className="text-emerald-400" />
                  Telehealth Clinical EHR
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consultation: <strong className="text-white">{session.appointmentId || 'Walk-in / Teleconsultation'}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg"
                title="Collapse Sidebar"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Reported Symptoms */}
            {session.symptoms && session.symptoms.length > 0 && (
              <div className="mb-4 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Reported Symptoms
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {session.symptoms.map((sym, idx) => (
                    <span key={idx} className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs px-2 py-0.5 rounded-md">
                      {sym}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {session.diagnosis && (
              <div className="mb-4 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                  AI Differential Assessment
                </label>
                <p className="text-xs text-slate-300">{session.diagnosis}</p>
              </div>
            )}

            {/* Doctor Controls: Live Prescriptions & Clinical Notes */}
            {isDoctor ? (
              <div className="flex-1 flex flex-col space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Quick Clinical Prescriptions
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => applyQuickRx('FEVER')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] text-emerald-300 font-semibold cursor-pointer"
                    >
                      + Fever & Cold
                    </button>
                    <button
                      onClick={() => applyQuickRx('GASTRO')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] text-teal-300 font-semibold cursor-pointer"
                    >
                      + Gastro / ORS
                    </button>
                    <button
                      onClick={() => applyQuickRx('INFECTION')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[11px] text-purple-300 font-semibold cursor-pointer"
                    >
                      + Antibiotic Course
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Live Digital Prescription
                  </label>
                  <textarea
                    value={prescriptionText}
                    onChange={(e) => {
                      setPrescriptionText(e.target.value);
                      setIsRxSaved(false);
                    }}
                    placeholder="e.g. Tab Paracetamol 650mg TDS x 3 days&#10;Tab Levocetirizine 5mg OD HS x 5 days"
                    rows={4}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Doctor Clinical Notes
                  </label>
                  <textarea
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Patient examined via HD teleconsultation. Stable vitals, alert and oriented. Advised rest."
                    rows={2}
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  onClick={() => setIsRxSaved(true)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isRxSaved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/30'
                  }`}
                >
                  <CheckCircle size={15} />
                  <span>{isRxSaved ? 'Prescription Recorded to Patient EHR' : 'Save Prescription to Record'}</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 space-y-1.5">
                    <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Encrypted Telehealth Session
                    </h4>
                    <p className="text-xs text-slate-300">
                      You are in a confidential consultation with <strong>{otherRoleName}</strong>.
                      Your real-time camera and microphone allow the doctor to examine you and give instant prescriptions.
                    </p>
                  </div>

                  {prescriptionText && (
                    <div className="bg-emerald-950/40 border border-emerald-700/50 p-3 rounded-xl">
                      <label className="text-[10px] font-bold text-emerald-300 uppercase block mb-1">
                        Doctor's Live Prescription:
                      </label>
                      <pre className="text-xs font-mono text-white whitespace-pre-wrap">
                        {prescriptionText}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-red-400 shrink-0" />
                  <span>National Medical Emergency: Dial 108 or 112 immediately.</span>
                </div>
              </div>
            )}

            {/* Bottom End Call in Sidebar */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                onClick={handleEndCall}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-600/30 transition cursor-pointer"
              >
                <PhoneOff size={15} />
                <span>Complete & End Consultation</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
