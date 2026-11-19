import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  PhoneOff,
  HeartPulse,
  ShieldAlert,
  User,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { EmergencyVideoCallModal } from './EmergencyVideoCallModal';

interface EmergencyCallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMERGENCY_SYMPTOMS = [
  'Severe Chest Pain / Heart Pressure',
  'Acute Difficulty in Breathing / Asthma',
  'Severe Trauma / Heavy Bleeding / Wound',
  'Loss of Consciousness / Seizure / Stroke',
  'High Fever with Stiff Neck & Confusion',
  'Severe Allergic Reaction / Throat Swelling',
  'Acute Severe Abdominal Pain / Poisoning',
  'Other Critical Medical Emergency',
];

export const EmergencyCallModal: React.FC<EmergencyCallModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [emergencyReason, setEmergencyReason] = useState(EMERGENCY_SYMPTOMS[0]);
  const [patientPhone, setPatientPhone] = useState(user?.phone || '');
  const [callingState, setCallingState] = useState<'IDLE' | 'CALLING' | 'CONNECTED'>('IDLE');
  const [activeCallId, setActiveCallId] = useState<string>('');
  const [connectedDoctorName, setConnectedDoctorName] = useState<string>('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (user?.phone && !patientPhone) {
      setPatientPhone(user.phone);
    }
  }, [user]);

  // Listen for emergency call accepted from Doctor
  useEffect(() => {
    if (!socket) return;

    socket.on('emergency_call_connected', (data: {
      callId: string;
      doctorId: string;
      doctorName: string;
      meetingRoomId: string;
    }) => {
      console.log('🎉 Emergency call connected with doctor:', data.doctorName);
      stopRingAudio();
      setConnectedDoctorName(data.doctorName);
      setCallingState('CONNECTED');
    });

    socket.on('emergency_call_cancelled', () => {
      stopRingAudio();
      alert('The emergency call was declined or cancelled by the medical team. Please contact 112 / 102 immediately.');
      setCallingState('IDLE');
    });

    return () => {
      socket.off('emergency_call_connected');
      socket.off('emergency_call_cancelled');
    };
  }, [socket]);

  // Audio Ring Generator using Web Audio API
  const playRingAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playBeep = () => {
        if (!audioContextRef.current) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // Standard 440Hz phone ring
        osc.frequency.setValueAtTime(480, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      };

      playBeep();
      ringIntervalRef.current = setInterval(playBeep, 3000);
    } catch (e) {
      console.warn('Audio ring generation failed:', e);
    }
  };

  const stopRingAudio = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const handleStartEmergencyCall = () => {
    if (!user) return;
    const callId = `emg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveCallId(callId);
    setCallingState('CALLING');
    playRingAudio();

    if (socket) {
      socket.emit('initiate_emergency_call', {
        callId,
        patientId: user.id,
        patientName: user.fullName,
        patientPhone: patientPhone || user.phone || 'Emergency Helpline',
        emergencyReason,
      });
    }
  };

  const handleCancelCall = () => {
    stopRingAudio();
    if (socket && activeCallId && user) {
      socket.emit('cancel_emergency_call', {
        callId: activeCallId,
        patientId: user.id,
      });
    }
    setCallingState('IDLE');
    onClose();
  };

  if (!isOpen) return null;

  // If connected, render the full Emergency Video Call Screen
  if (callingState === 'CONNECTED') {
    return (
      <EmergencyVideoCallModal
        callId={activeCallId}
        partnerName={connectedDoctorName || 'Duty Govt. Medical Officer'}
        partnerRole="DOCTOR"
        emergencyReason={emergencyReason}
        patientPhone={patientPhone}
        onEndCall={handleCancelCall}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl border-2 border-rose-500 max-w-lg w-full overflow-hidden shadow-2xl relative">
        {/* Urgent Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 animate-pulse">
              <HeartPulse className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white text-rose-700 font-extrabold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full">
                  100% FREE GOVT. SOS
                </span>
                <span className="text-rose-100 text-xs">National Health Mission</span>
              </div>
              <h2 className="text-xl font-black mt-0.5 tracking-tight">
                Emergency Doctor SOS Call
              </h2>
            </div>
          </div>
          <button
            onClick={handleCancelCall}
            className="text-white/80 hover:text-white text-2xl font-bold p-1"
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {callingState === 'IDLE' ? (
            <>
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-xs">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-rose-900 mb-0.5">
                    Critical Emergency Tele-Triage
                  </strong>
                  This connects you directly via instant video call to on-duty Government Medical Officers at central district hospitals and AIIMS. Consultations are completely free of charge.
                </div>
              </div>

              {/* Emergency Symptom Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Acute Emergency Condition:
                </label>
                <select
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 p-3.5 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                >
                  {EMERGENCY_SYMPTOMS.map((sym, idx) => (
                    <option key={idx} value={sym}>
                      {sym}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient Phone Number */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Patient Contact Phone (for Emergency Dispatch):
                </label>
                <input
                  type="text"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-2xl border border-slate-300 p-3.5 text-sm font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleStartEmergencyCall}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-4 rounded-2xl shadow-lg shadow-rose-600/30 text-base flex items-center justify-center gap-2"
                >
                  <PhoneCall className="w-5 h-5 animate-bounce" />
                  START EMERGENCY VIDEO CALL NOW (FREE)
                </Button>

                <p className="text-center text-[11px] text-slate-500">
                  For immediate ambulance dispatch in India, you can also dial <strong>112</strong> or <strong>102</strong> directly.
                </p>
              </div>
            </>
          ) : (
            /* Calling Radar State */
            <div className="py-8 text-center space-y-6">
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"></div>
                <div className="absolute inset-2 rounded-full bg-rose-500/30 animate-pulse"></div>
                <div className="w-20 h-20 rounded-full bg-rose-600 text-white flex items-center justify-center text-3xl shadow-2xl relative z-10">
                  <PhoneCall className="w-9 h-9 animate-bounce" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Paging On-Duty Government Doctors...
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Broadcasting urgent SOS alert to Verified Medical Officers at Govt. District Hospitals. Please keep your camera and microphone enabled.
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold mt-2 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                  Reason: {emergencyReason}
                </div>
              </div>

              <div className="pt-4">
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleCancelCall}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  Cancel Call
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
