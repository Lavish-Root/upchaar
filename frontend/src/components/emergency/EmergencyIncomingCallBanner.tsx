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
  const incomingCallRef = useRef<IncomingEmergencyCallData | null>(null);
  const activeVideoCallRef = useRef<IncomingEmergencyCallData | null>(null);

  incomingCallRef.current = incomingCall;
  activeVideoCallRef.current = activeVideoCall;

  // Register doctor presence on duty for emergency calls (persists across reconnects)
  useEffect(() => {
    if (!socket || !user || user.role !== 'DOCTOR') return;

    const registerDuty = () => {
      socket.emit('doctor_duty_online', {
        doctorId: user.id,
        doctorName: user.fullName,
      });
    };

    if (socket.connected) {
      registerDuty();
    }

    const handleIncomingCall = (data: IncomingEmergencyCallData) => {
      console.log('🚨 Emergency call received on Doctor Portal:', data);
      setIncomingCall(data);
      setRingSeconds(0);
      playSirenAudio();
    };

    const handleCallClaimed = ({ callId }: { callId: string; claimedBy: string }) => {
      if (incomingCallRef.current && incomingCallRef.current.callId === callId) {
        stopSirenAudio();
        setIncomingCall(null);
      }
    };

    const handleCallCancelled = ({ callId }: { callId: string }) => {
      if (incomingCallRef.current && incomingCallRef.current.callId === callId) {
        stopSirenAudio();
        setIncomingCall(null);
      }
    };

    const handleCallEnded = ({ callId }: { callId: string }) => {
      if (incomingCallRef.current && incomingCallRef.current.callId === callId) {
        stopSirenAudio();
        setIncomingCall(null);
      }
      if (activeVideoCallRef.current && activeVideoCallRef.current.callId === callId) {
        setActiveVideoCall(null);
      }
    };

    socket.on('connect', registerDuty);
    socket.on('incoming_emergency_call', handleIncomingCall);
    socket.on('emergency_call_claimed', handleCallClaimed);
    socket.on('emergency_call_cancelled', handleCallCancelled);
    socket.on('emergency_call_ended', handleCallEnded);

    return () => {
      socket.off('connect', registerDuty);
      socket.off('incoming_emergency_call', handleIncomingCall);
      socket.off('emergency_call_claimed', handleCallClaimed);
      socket.off('emergency_call_cancelled', handleCallCancelled);
      socket.off('emergency_call_ended', handleCallEnded);
      stopSirenAudio();
    };
  }, [socket, user?.id, user?.role, user?.fullName]);

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
        <div className="fixed top-4 inset-x-0 mx-auto z-50 w-[95%] max-w-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border-4 border-red-400">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0 w-full md:w-auto">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white text-rose-600 flex items-center justify-center font-bold shadow-lg shrink-0 animate-pulse">
                <HeartPulse className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-white/20 text-white text-[10px] font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-white/30 animate-pulse">
                    🚨 CRITICAL EMERGENCY SOS
                  </span>
                  <span className="text-white/90 text-xs font-mono">
                    Ringing for {ringSeconds}s
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-1 truncate">
                  Incoming Patient Call: {incomingCall.patientName}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-rose-100 mt-1">
                  <span className="font-semibold bg-red-900/50 px-2 py-0.5 rounded-lg border border-red-400/40 truncate max-w-xs">
                    ⚠️ {incomingCall.emergencyReason}
                  </span>
                  <span className="font-medium whitespace-nowrap">📞 {incomingCall.patientPhone}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
              <button
                onClick={handleAcceptCall}
                className="flex-1 md:flex-none px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 transition active:scale-95 text-sm whitespace-nowrap"
              >
                <Video className="w-5 h-5 animate-pulse shrink-0" />
                <span>ACCEPT VIDEO CALL</span>
              </button>

              <button
                onClick={handleDeclineCall}
                className="px-4 py-3 bg-slate-900/80 hover:bg-slate-900 text-white font-semibold rounded-2xl border border-white/20 flex items-center justify-center transition text-sm shrink-0"
                title="Decline / Pass to ER"
              >
                <PhoneOff className="w-4 h-4 shrink-0" />
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
