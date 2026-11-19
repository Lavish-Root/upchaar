import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  PhoneOff,
  Video,
  User,
  HeartPulse,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { EmergencyVideoCallModal } from './EmergencyVideoCallModal';

interface IncomingEmergencyCallData {
  callId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  emergencyReason: string;
  meetingRoomId: string;
  timestamp: string;
}

export const EmergencyIncomingCallBanner: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [incomingCall, setIncomingCall] = useState<IncomingEmergencyCallData | null>(null);
  const [activeVideoCall, setActiveVideoCall] = useState<IncomingEmergencyCallData | null>(null);
  const [ringSeconds, setRingSeconds] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  // Register doctor presence on duty for emergency calls
  useEffect(() => {
    if (!socket || !user || user.role !== 'DOCTOR') return;

    socket.emit('doctor_duty_online', {
      doctorId: user.id,
      doctorName: user.fullName,
    });

    // Listen for incoming patient emergency calls
    socket.on('incoming_emergency_call', (data: IncomingEmergencyCallData) => {
      console.log('🚨 Emergency call received on Doctor Portal:', data);
      setIncomingCall(data);
      setRingSeconds(0);
      playSirenAudio();
    });

    // If another doctor accepted the call or patient cancelled
    socket.on('emergency_call_claimed', ({ callId, claimedBy }: { callId: string; claimedBy: string }) => {
      if (incomingCall && incomingCall.callId === callId) {
        stopSirenAudio();
        setIncomingCall(null);
      }
    });

    socket.on('emergency_call_cancelled', ({ callId }: { callId: string }) => {
      if (incomingCall && incomingCall.callId === callId) {
        stopSirenAudio();
        setIncomingCall(null);
      }
    });

    return () => {
      socket.off('incoming_emergency_call');
      socket.off('emergency_call_claimed');
      socket.off('emergency_call_cancelled');
      stopSirenAudio();
    };
  }, [socket, user?.id, incomingCall?.callId]);

  // Ring timer
  useEffect(() => {
    if (!incomingCall) return;
    const interval = setInterval(() => {
      setRingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [incomingCall]);

  // Urgent Emergency Chime / Siren using Web Audio API
  const playSirenAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const playChime = () => {
        if (!audioContextRef.current) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        // Alternating medical pager frequencies (880Hz / 660Hz)
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.25);
        osc.frequency.setValueAtTime(880, now + 0.5);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.75);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);
      };

      playChime();
      ringIntervalRef.current = setInterval(playChime, 2000);
    } catch (e) {
      console.warn('Emergency chime generation failed:', e);
    }
  };

  const stopSirenAudio = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // Doctor clicks "Accept"
  const handleAcceptCall = () => {
    if (!incomingCall || !socket || !user) return;
    stopSirenAudio();

    socket.emit('accept_emergency_call', {
      callId: incomingCall.callId,
      doctorId: user.id,
      doctorName: user.fullName,
      patientId: incomingCall.patientId,
    });

    setActiveVideoCall(incomingCall);
    setIncomingCall(null);
  };

  // Doctor clicks "Decline"
  const handleDeclineCall = () => {
    stopSirenAudio();
    setIncomingCall(null);
  };

  const handleEndActiveVideoCall = () => {
    if (socket && activeVideoCall) {
      socket.emit('end_emergency_call', { callId: activeVideoCall.callId });
    }
    setActiveVideoCall(null);
  };

  return (
    <>
      {/* Top Persistent Floating Alert Banner when call is ringing */}
      {incomingCall && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border-4 border-red-400 animate-bounce duration-1000">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white text-rose-600 flex items-center justify-center font-bold shadow-lg shrink-0 animate-pulse">
                <HeartPulse className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 text-white text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-white/30 animate-pulse">
                    🚨 CRITICAL EMERGENCY SOS
                  </span>
                  <span className="text-white/80 text-xs font-mono">
                    Ringing for {ringSeconds}s
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                  Incoming Patient Call: {incomingCall.patientName}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-rose-100 mt-1">
                  <span className="font-semibold bg-red-900/40 px-2 py-0.5 rounded-lg border border-red-400/40">
                    ⚠️ {incomingCall.emergencyReason}
                  </span>
                  <span>📞 Phone: {incomingCall.patientPhone}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={handleAcceptCall}
                className="flex-1 sm:flex-none px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 transition active:scale-95 text-sm"
              >
                <Video className="w-5 h-5 animate-pulse" />
                ACCEPT VIDEO CALL
              </button>

              <button
                onClick={handleDeclineCall}
                className="px-4 py-3.5 bg-slate-900/70 hover:bg-slate-900 text-white font-semibold rounded-2xl border border-white/20 flex items-center justify-center transition text-sm"
                title="Decline / Pass to ER"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* If Video Call is accepted and active */}
      {activeVideoCall && (
        <EmergencyVideoCallModal
          callId={activeVideoCall.callId}
          partnerName={activeVideoCall.patientName}
          partnerRole="PATIENT"
          emergencyReason={activeVideoCall.emergencyReason}
          patientPhone={activeVideoCall.patientPhone}
          onEndCall={handleEndActiveVideoCall}
        />
      )}
    </>
  );
};
