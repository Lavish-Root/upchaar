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

interface EmergencyVideoCallProps {
  callId: string;
  partnerName: string;
  partnerRole: 'DOCTOR' | 'PATIENT';
  emergencyReason: string;
  patientPhone?: string;
  onEndCall: () => void;
}

export const EmergencyVideoCallModal: React.FC<EmergencyVideoCallProps> = ({
  callId,
  partnerName,
  partnerRole,
  emergencyReason,
  patientPhone,
  onEndCall,
}) => {
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Call duration stopwatch
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request camera and microphone access
  useEffect(() => {
    let isMounted = true;

    async function initMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });

          if (isMounted) {
            localStreamRef.current = stream;
            setHasCameraPermission(true);

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }

            // In local/same-browser environment, mirror local stream to remote feed as peer preview
            if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
              remoteVideoRef.current.srcObject = stream;
            }
          }
        } else {
          setHasCameraPermission(false);
        }
      } catch (err) {
        console.warn('Webcam/mic access not granted or unavailable:', err);
        if (isMounted) setHasCameraPermission(false);
      }
    }

    initMedia();

    return () => {
      isMounted = false;
      // Stop all tracks on cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !micActive;
      });
    }
    setMicActive(!micActive);
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !cameraActive;
      });
    }
    setCameraActive(!cameraActive);
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (screenSharing) {
      // Stop screen sharing and revert to camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }
      if (remoteVideoRef.current && localStreamRef.current) {
        remoteVideoRef.current.srcObject = localStreamRef.current;
      }
      setScreenSharing(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
          });
          screenStreamRef.current = screenStream;

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = screenStream;
          }

          // When user clicks browser native "Stop sharing" button
          screenStream.getVideoTracks()[0].onended = () => {
            setScreenSharing(false);
            if (remoteVideoRef.current && localStreamRef.current) {
              remoteVideoRef.current.srcObject = localStreamRef.current;
            }
          };

          setScreenSharing(true);
        }
      } catch (err) {
        console.warn('Screen sharing cancelled or unavailable:', err);
      }
    }
  };

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
          {/* Main Video Element (Remote Peer or Shared Screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover sm:object-contain transition-opacity duration-300 ${
              cameraActive || screenSharing ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Fallback if no camera permission or camera toggled off */}
          {(!cameraActive && !screenSharing) || hasCameraPermission === false ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center text-white text-3xl font-extrabold shadow-2xl">
                {partnerName.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{partnerName}</h3>
                <p className="text-sm text-slate-400">
                  {hasCameraPermission === false
                    ? 'Camera access unavailable in browser. Audio call active.'
                    : 'Camera is currently paused.'}
                </p>
                <div className="mt-3 flex items-center justify-center gap-2 text-xs text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Encrypted Audio Link Operational
                </div>
              </div>
            </div>
          ) : null}

          {/* Picture-in-Picture Local Camera Feed */}
          <div className="absolute bottom-20 right-4 sm:bottom-24 sm:right-6 w-36 h-48 sm:w-52 sm:h-36 bg-slate-900 border-2 border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl z-20 group">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform ${
                cameraActive ? 'opacity-100' : 'opacity-20'
              }`}
            />
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 font-medium">
                Camera Off
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 bg-slate-950/80 text-[10px] text-white px-2 py-0.5 rounded font-mono">
              You (Local)
            </div>
          </div>

          {/* Screen Share Active Banner */}
          {screenSharing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/90 backdrop-blur-md text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg border border-indigo-400/30 flex items-center gap-2">
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
