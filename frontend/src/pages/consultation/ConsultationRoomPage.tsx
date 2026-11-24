import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC, WebRTCEventConfig } from '../../hooks/useWebRTC';
import { Consultation, ConsultationMessage } from '../../types';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Send,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  PhoneOff,
  Sparkles,
  ShieldCheck,
  Monitor,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const CONSULTATION_WEBRTC_EVENTS: WebRTCEventConfig = {
  idKey: 'consultationId',
  readyEvent: 'video_peer_ready',
  peerReadyEvent: 'video_peer_ready',
  offerEvent: 'signal_offer',
  answerEvent: 'signal_answer',
  iceEvent: 'signal_ice_candidate',
};

export const ConsultationRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [completing, setCompleting] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    micActive,
    cameraActive: videoActive,
    screenSharing,
    hasCameraPermission,
    mediaErrorReason,
    hasRemoteVideo,
    hasRemoteAudio,
    peerConnected,
    connectionStatusText,
    toggleMic,
    toggleCamera: toggleVideo,
    toggleScreenShare,
  } = useWebRTC({
    socket,
    roomId: consultation?.id,
    isPolite: user?.role !== 'DOCTOR',
    events: CONSULTATION_WEBRTC_EVENTS,
    enabled: Boolean(consultation?.id && user),
    localVideoRef,
    remoteVideoRef,
    roleLabel: user?.role || 'PATIENT',
  });

  useEffect(() => {
    if (id) fetchConsultation(id);
  }, [id]);

  useEffect(() => {
    if (!socket || !consultation || !user) return;

    // Join room
    socket.emit('join_room', {
      consultationId: consultation.id,
      userId: user.id,
      role: user.role,
      fullName: user.fullName,
    });

    // Listen for incoming messages
    socket.on('new_message', (msg: ConsultationMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('consultation_ended', () => {
      setConsultation((prev) => (prev ? { ...prev, status: 'COMPLETED' } : prev));
    });

    return () => {
      socket.off('new_message');
      socket.off('consultation_ended');
    };
  }, [socket, consultation?.id, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConsultation = async (consultId: string) => {
    setLoading(true);
    try {
      const res: any = await api.get(`/consultations/${consultId}`);
      if (res.data) {
        setConsultation(res.data);
        setMessages(res.data.messages || []);
        setDoctorNotes(res.data.doctorNotes || '');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load consultation room.');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !socket || !consultation || !user) return;

    socket.emit('send_message', {
      consultationId: consultation.id,
      senderId: user.id,
      senderRole: user.role,
      senderName: user.fullName,
      message: inputMessage.trim(),
    });

    setInputMessage('');
  };

  const handleCompleteConsultation = async () => {
    if (!consultation || user?.role !== 'DOCTOR') return;
    setCompleting(true);
    try {
      await api.patch(`/consultations/${consultation.id}/complete`, { doctorNotes });
      if (socket) {
        socket.emit('end_consultation', { consultationId: consultation.id });
      }
      setConsultation({ ...consultation, status: 'COMPLETED' });
      navigate(`/doctor/ai-prescription?patientId=${consultation.appointment.patientId}&appointmentId=${consultation.appointmentId}`);
    } catch (err: any) {
      alert(err.message || 'Failed to complete consultation');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Connecting to secure consultation room..." />;
  if (!consultation) return <div>Consultation not found.</div>;

  const isDoctor = user?.role === 'DOCTOR';
  const partnerName = isDoctor
    ? consultation.appointment.patient.user.fullName
    : consultation.appointment.doctor.user.fullName;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Consultation Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">
                Consultation with {partnerName}
              </h2>
              <Badge variant={consultation.status === 'COMPLETED' ? 'info' : 'success'}>
                {consultation.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Room ID: {consultation.meetingRoomId} • Socket: {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDoctor && consultation.status !== 'COMPLETED' && (
            <Button
              variant="teal"
              size="sm"
              onClick={handleCompleteConsultation}
              isLoading={completing}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Complete & Prescribe
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Leave Room
          </Button>
        </div>
      </div>

      {/* Main Grid: Video Area + Chat Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[680px]">
        {/* Left Col: Video Screen Simulation & Doctor Notes */}
        <div className="lg:col-span-7 flex flex-col gap-4 h-full">
          {/* Video Container */}
          <div className="flex-1 bg-slate-900 rounded-3xl p-4 sm:p-6 text-white flex flex-col justify-between relative overflow-hidden shadow-xl border border-slate-800">
            {/* Top Bar inside Video */}
            <div className="flex items-center justify-between relative z-10 text-xs">
              <span className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700">
                <span className={`w-2 h-2 rounded-full ${peerConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'}`}></span>
                {connectionStatusText}
              </span>
              <span className="bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-full text-slate-300">
                {consultation.appointment.consultationType} Consultation
              </span>
            </div>

            {/* Video Canvas Area */}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`w-full h-full object-cover sm:object-contain transition-opacity duration-300 ${
                  hasRemoteVideo ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {!hasRemoteVideo && (
                <div className="text-center space-y-3 z-10 px-4">
                  <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center mx-auto text-white font-extrabold text-3xl shadow-2xl">
                    {partnerName.charAt(0)}
                  </div>
                  <h3 className="text-lg font-bold">{partnerName}</h3>
                  <p className="text-xs text-slate-400">
                    {peerConnected || hasRemoteAudio
                      ? 'Connected — Encrypted audio active (waiting for partner video)'
                      : connectionStatusText}
                  </p>
                </div>
              )}

              {/* Picture-in-Picture Local Feed */}
              <div className="absolute bottom-20 right-4 w-32 h-24 sm:w-44 sm:h-32 bg-slate-900 border-2 border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${videoActive || screenSharing ? 'opacity-100' : 'opacity-20'}`}
                />
                {!videoActive && !screenSharing && (
                  <div className="absolute inset-0 flex items-center justify-center text-center px-1 text-[10px] text-slate-300">
                    {hasCameraPermission === false
                      ? mediaErrorReason === 'device_busy'
                        ? 'Camera busy in other tab'
                        : mediaErrorReason === 'insecure_context'
                        ? 'Use HTTPS/localhost'
                        : 'Camera Off'
                      : 'Camera Off'}
                  </div>
                )}
                <div className="absolute bottom-1 left-2 bg-slate-950/80 text-[9px] text-white px-1.5 py-0.5 rounded font-mono">
                  {screenSharing ? 'Screen' : 'You'}
                </div>
              </div>

              {screenSharing && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/90 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg border border-indigo-400/30 flex items-center gap-1.5 z-20">
                  <Monitor className="w-3.5 h-3.5 animate-pulse" />
                  Screen Sharing Active
                </div>
              )}
            </div>

            {/* In-Call Controls Bar */}
            <div className="flex items-center justify-center gap-3 relative z-20 pt-4 mt-auto">
              <button
                onClick={toggleMic}
                className={`p-3.5 rounded-full transition shadow-md ${
                  micActive ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
                }`}
                title={micActive ? 'Mute Mic' : 'Unmute Mic'}
              >
                {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3.5 rounded-full transition shadow-md ${
                  videoActive ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
                }`}
                title={videoActive ? 'Stop Video' : 'Start Video'}
              >
                {videoActive ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-3.5 rounded-full transition shadow-md ${
                  screenSharing ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                }`}
                title={screenSharing ? 'Stop Screen Sharing' : 'Share Screen / Medical Reports'}
              >
                <Monitor className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate(-1)}
                className="p-3.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition shadow-md"
                title="Disconnect"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Doctor Consultation Notes (Only editable by Doctor) */}
          {isDoctor && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Doctor's Clinical Notes (Saved with consultation):
              </h4>
              <textarea
                rows={2}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Key examination findings, patient symptoms, blood pressure..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          )}
        </div>

        {/* Right Col: Real-Time Socket.IO Chat */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Real-Time Consultation Chat
            </h3>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> HIPAA/DPDP Compliant Room
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                No chat messages yet. Send a message to start conversation.
              </div>
            ) : (
              messages.map((m, idx) => {
                const isMe = m.senderId === user?.id;
                return (
                  <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-semibold">
                      {isMe ? 'You' : m.senderRole}
                    </span>
                    <div
                      className={`p-3 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                        isMe
                          ? 'bg-primary-600 text-white rounded-tr-none'
                          : 'bg-slate-100 text-slate-800 rounded-tl-none'
                      }`}
                    >
                      {m.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 flex gap-2 bg-white">
            <input
              type="text"
              placeholder="Type message to doctor/patient..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <Button type="submit" variant="primary" size="sm" disabled={!inputMessage.trim()}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
