import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ShieldCheck,
  User,
  HeartPulse,
} from 'lucide-react';
import { Button } from '../common/Button';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC, WebRTCEventConfig } from '../../hooks/useWebRTC';

interface EmergencyVideoCallProps {
  callId: string;
  partnerName: string;
  partnerRole: 'DOCTOR' | 'PATIENT';
  emergencyReason: string;
  patientPhone?: string;
  onEndCall: () => void;
}

const EMERGENCY_WEBRTC_EVENTS: WebRTCEventConfig = {
  idKey: 'callId',
  readyEvent: 'emergency_video_ready',
  peerReadyEvent: 'emergency_peer_ready',
  offerEvent: 'emergency_signal_offer',
  answerEvent: 'emergency_signal_answer',
  iceEvent: 'emergency_signal_ice',
};

export const EmergencyVideoCallModal: React.FC<EmergencyVideoCallProps> = ({
  callId,
  partnerName,
  partnerRole,
  emergencyReason,
  patientPhone,
  onEndCall,
}) => {
  const { socket } = useSocket();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDoctorSelf = partnerRole === 'PATIENT';

  const {
    micActive,
    cameraActive,
    screenSharing,
    hasCameraPermission,
    mediaErrorReason,
    hasRemoteVideo,
    hasRemoteAudio,
    peerConnected,
    connectionStatusText,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  } = useWebRTC({
    socket,
    roomId: callId,
    isPolite: !isDoctorSelf,
    events: EMERGENCY_WEBRTC_EVENTS,
    enabled: Boolean(callId),
    localVideoRef,
    remoteVideoRef,
    roleLabel: isDoctorSelf ? 'DOCTOR' : 'PATIENT',
  });

  // Call duration stopwatch
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-6 animate-in fade-in">
      <div
        ref={containerRef}
        className="w-full max-w-6xl h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
      >
        {/* Top Header Overlay */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-950/90 via-slate-900/60 to-transparent flex items-center justify-between text-white z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-400 animate-pulse">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-rose-600 text-white text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                  LIVE EMERGENCY VIDEO
                </span>
                <span className="text-slate-400 text-xs font-mono">
                  Call ID: {callId.slice(0, 10)}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white mt-0.5">
                {partnerRole === 'DOCTOR' ? 'Dr. ' + partnerName : partnerName}{' '}
                <span className="text-xs font-normal text-slate-300">
                  ({partnerRole === 'DOCTOR' ? 'Govt. Medical Officer' : 'Emergency Patient'})
                </span>
              </h2>
            </div>
          </div>

          {/* Emergency Reason HUD & Duration */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end text-xs">
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Reason: {emergencyReason}
              </span>
              {patientPhone && (
                <span className="text-slate-400 font-mono">Contact: {patientPhone}</span>
              )}
            </div>

            <div className="bg-slate-800/90 border border-slate-700 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold text-emerald-400 shadow-inner">
              ⏱️ {formatDuration(callDuration)}
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Primary Main Video Area */}
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center overflow-hidden">
          {/* WebRTC Peer Connection Status HUD */}
          <div
            className={`absolute top-3 left-3 z-20 px-3 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md border flex items-center gap-1.5 ${
              peerConnected
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900/80 border-slate-700 text-amber-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                peerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-ping'
              }`}
            ></span>
            <span>{connectionStatusText}</span>
          </div>

          {/* Main Video Element (Remote Peer Feed) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover sm:object-contain transition-opacity duration-300 ${
              hasRemoteVideo ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Waiting / Audio-Only Overlay while Remote Video is absent */}
          {!hasRemoteVideo && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-white text-3xl font-extrabold shadow-2xl">
                {partnerName.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{partnerName}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {peerConnected || hasRemoteAudio
                    ? 'Connected — Audio active (waiting for partner camera)'
                    : connectionStatusText}
                </p>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {peerConnected ? 'Encrypted P2P Session Active' : 'Waiting for Partner Media Stream'}
                </div>
              </div>
            </div>
          )}

          {/* Picture-in-Picture Local Camera Feed */}
          <div className="absolute bottom-20 right-4 sm:bottom-24 sm:right-6 w-36 h-48 sm:w-52 sm:h-36 bg-slate-900 border-2 border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl z-20 group">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform ${
                cameraActive || screenSharing ? 'opacity-100' : 'opacity-20'
              }`}
            />
            {!cameraActive && !screenSharing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 text-[11px] text-slate-300 font-medium">
                <span>
                  {hasCameraPermission === false
                    ? mediaErrorReason === 'insecure_context'
                      ? 'Camera requires HTTPS or localhost'
                      : mediaErrorReason === 'device_busy'
                      ? 'Camera in use by another tab'
                      : 'Local Camera Off'
                    : 'Camera Off'}
                </span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 bg-slate-950/80 text-[10px] text-white px-2 py-0.5 rounded font-mono">
              {screenSharing ? 'Your Screen' : 'You (Local)'}
            </div>
          </div>

          {/* Screen Share Active Banner */}
          {screenSharing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg border border-indigo-400/30 flex items-center gap-2 z-20">
              <Monitor className="w-4 h-4 animate-pulse" />
              Screen Sharing Active • Displaying Live Screen to Peer
            </div>
          )}
        </div>

        {/* Bottom Call Controls Dock */}
        <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800/80 flex items-center justify-center gap-3 sm:gap-6 z-20">
          {/* Mute Mic */}
          <button
            onClick={toggleMic}
            className={`p-4 rounded-2xl font-semibold flex items-center gap-2 transition shadow-lg ${
              micActive
                ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                : 'bg-rose-600 text-white hover:bg-rose-700'
            }`}
            title={micActive ? 'Mute Microphone' : 'Unmute Microphone'}
          >
            {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span className="hidden sm:inline text-xs">{micActive ? 'Mute' : 'Unmuted'}</span>
          </button>

          {/* Toggle Camera */}
          <button
            onClick={toggleCamera}
            className={`p-4 rounded-2xl font-semibold flex items-center gap-2 transition shadow-lg ${
              cameraActive
                ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
            title={cameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {cameraActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            <span className="hidden sm:inline text-xs">{cameraActive ? 'Camera' : 'Cam Off'}</span>
          </button>

          {/* Share Screen */}
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-2xl font-semibold flex items-center gap-2 transition shadow-lg ${
              screenSharing
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-2 ring-indigo-400'
                : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
            }`}
            title={screenSharing ? 'Stop Screen Share' : 'Share Screen / Medical Reports'}
          >
            <Monitor className="w-5 h-5" />
            <span className="hidden sm:inline text-xs">
              {screenSharing ? 'Stop Screen' : 'Share Screen'}
            </span>
          </button>

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            className="px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 shadow-xl shadow-rose-950/50 transition active:scale-95"
            title="End Emergency Consultation"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
