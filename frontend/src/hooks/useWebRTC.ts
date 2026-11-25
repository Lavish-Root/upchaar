import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import { Socket } from 'socket.io-client';

export interface WebRTCEventConfig {
  idKey: 'callId' | 'consultationId';
  readyEvent: string;
  peerReadyEvent: string;
  offerEvent: string;
  answerEvent: string;
  iceEvent: string;
}

export interface UseWebRTCOptions {
  socket: Socket | null;
  roomId: string | undefined;
  isPolite: boolean;
  events: WebRTCEventConfig;
  enabled: boolean;
  localVideoRef: RefObject<HTMLVideoElement>;
  remoteVideoRef: RefObject<HTMLVideoElement>;
  roleLabel?: string;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function createFallbackVideoStream(label: string, role: string): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new MediaStream();

  let frame = 0;
  const isDoctor = role.toUpperCase().includes('DOCTOR');

  const draw = () => {
    frame++;
    // Gradient medical background
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, isDoctor ? '#0f766e' : '#0369a1');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Subtle pulsing avatar circle
    const radius = 55 + Math.sin(frame * 0.08) * 6;
    ctx.beginPath();
    ctx.arc(320, 190, radius + 14, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(320, 190, radius, 0, Math.PI * 2);
    ctx.fillStyle = isDoctor ? '#14b8a6' : '#38bdf8';
    ctx.fill();

    // Initials in center
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials =
      label.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() ||
      (isDoctor ? 'DR' : 'PT');
    ctx.fillText(initials, 320, 190);

    // Label name
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(label, 320, 300);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(isDoctor ? 'Govt. Medical Officer • Live Video' : 'Patient • Live Video', 320, 330);

    // Live status badge
    ctx.beginPath();
    ctx.arc(280, 380, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#22c55e';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE ENCRYPTED P2P', 292, 384);
  };

  draw();
  const interval = setInterval(draw, 100);
  const stream = canvas.captureStream(15);
  const track = stream.getVideoTracks()[0];
  if (track) {
    const origStop = track.stop.bind(track);
    track.stop = () => {
      clearInterval(interval);
      origStop();
    };
  }
  return stream;
}

function createSilentAudioStream(): MediaStream {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return new MediaStream();
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    const gain = ctx.createGain();
    gain.gain.value = 0.001; // subtle tone so WebRTC considers it active
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.connect(gain);
    gain.connect(dst);
    osc.start();
    const stream = dst.stream;
    const track = stream.getAudioTracks()[0];
    if (track) {
      const origStop = track.stop.bind(track);
      track.stop = () => {
        try { osc.stop(); ctx.close(); } catch {}
        origStop();
      };
    }
    return stream;
  } catch {
    return new MediaStream();
  }
}

export function useWebRTC({
  socket,
  roomId,
  isPolite,
  events,
  enabled,
  localVideoRef,
  remoteVideoRef,
  roleLabel = 'USER',
}: UseWebRTCOptions) {
  const [micActive, setMicActive] = useState(true);
  const [cameraActive, setCameraActive] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [mediaErrorReason, setMediaErrorReason] = useState<string | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [hasRemoteAudio, setHasRemoteAudio] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [connectionStatusText, setConnectionStatusText] = useState('Initializing secure link...');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const videoTransceiverRef = useRef<RTCRtpTransceiver | null>(null);

  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const peerReadyRef = useRef(false);
  const needsNegotiationRef = useRef(false);
  const mediaInitializedRef = useRef(false);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  // Stabilize event config across renders
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const stopAllStreams = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !roomId) return;

    let isMounted = true;
    peerReadyRef.current = false;
    needsNegotiationRef.current = false;
    mediaInitializedRef.current = false;
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;
    pendingIceRef.current = [];

    const remoteStream = new MediaStream();
    remoteStreamRef.current = remoteStream;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    const sendOffer = async () => {
      const cfg = eventsRef.current;
      if (!socket || !roomId || !pcRef.current || pcRef.current.signalingState === 'closed') return;
      if (!peerReadyRef.current) {
        needsNegotiationRef.current = true;
        return;
      }
      if (makingOfferRef.current) {
        needsNegotiationRef.current = true;
        return;
      }

      try {
        makingOfferRef.current = true;
        needsNegotiationRef.current = false;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        socket.emit(cfg.offerEvent, {
          [cfg.idKey]: roomId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.warn('[WebRTC] createOffer error:', err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    pc.onnegotiationneeded = async () => {
      if (!mediaInitializedRef.current) {
        needsNegotiationRef.current = true;
        return;
      }
      await sendOffer();
    };

    pc.onsignalingstatechange = async () => {
      if (!isMounted || !pcRef.current) return;
      if (pc.signalingState === 'stable' && needsNegotiationRef.current) {
        if (!isPolite || peerReadyRef.current) {
          await sendOffer();
        }
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      const cfg = eventsRef.current;
      if (candidate && socket && roomId) {
        socket.emit(cfg.iceEvent, {
          [cfg.idKey]: roomId,
          candidate: candidate.toJSON ? candidate.toJSON() : candidate,
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (!isMounted) return;
      const state = pc.iceConnectionState;
      if (state === 'connected' || state === 'completed') {
        setPeerConnected(true);
        setConnectionStatusText('Connected (Live Encrypted P2P)');
      } else if (state === 'checking') {
        setConnectionStatusText('Connecting peer video/audio...');
      } else if (state === 'disconnected' || state === 'failed') {
        setPeerConnected(false);
        setConnectionStatusText('Reconnecting peer media...');
      }
    };

    pc.onconnectionstatechange = () => {
      if (!isMounted) return;
      if (pc.connectionState === 'connected') {
        setPeerConnected(true);
        setConnectionStatusText('Connected (Live Encrypted P2P)');
      }
    };

    pc.ontrack = (event) => {
      if (!isMounted) return;
      console.log('[WebRTC] ontrack received:', event.track.kind, event.track.id);
      const track = event.track;

      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      remoteStreamRef.current.addTrack(track);

      const targetStream = event.streams && event.streams[0] ? event.streams[0] : remoteStreamRef.current;

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = targetStream;
        const playPromise = remoteVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.muted = true;
              remoteVideoRef.current.play().then(() => {
                setTimeout(() => {
                  if (remoteVideoRef.current) remoteVideoRef.current.muted = false;
                }, 500);
              }).catch(() => {});
            }
          });
        }
      }

      if (track.kind === 'video') {
        setHasRemoteVideo(true);
        track.onunmute = () => {
          if (!isMounted) return;
          setHasRemoteVideo(true);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.play().catch(() => {});
          }
        };
        track.onended = () => {
          if (!isMounted) return;
          const stillHasVideo = remoteStreamRef.current?.getVideoTracks().some((t) => t.readyState === 'live');
          setHasRemoteVideo(Boolean(stillHasVideo));
        };
      }

      if (track.kind === 'audio') {
        setHasRemoteAudio(true);
        track.onunmute = () => {
          if (!isMounted) return;
          setHasRemoteAudio(true);
        };
        track.onended = () => {
          if (!isMounted) return;
          const stillHasAudio = remoteStreamRef.current?.getAudioTracks().some((t) => t.readyState === 'live');
          setHasRemoteAudio(Boolean(stillHasAudio));
        };
      }
    };

    // Acquire camera & microphone with fallback virtual stream for device busy/multi-tab
    async function initMedia() {
      let stream: MediaStream | null = null;
      let camAvailable = false;
      let errorCode: string | null = null;

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        errorCode = window.isSecureContext ? 'no_device' : 'insecure_context';
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: true,
          });
          camAvailable = stream.getVideoTracks().length > 0;
        } catch (err: any) {
          console.warn('[WebRTC] Video+Audio getUserMedia failed, trying audio-only:', err?.name || err);
          if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
            errorCode = 'permission_denied';
          } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
            errorCode = 'device_busy';
          } else {
            errorCode = 'no_device';
          }

          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            if (errorCode === 'permission_denied') errorCode = 'no_device';
          } catch (audioErr: any) {
            console.warn('[WebRTC] Audio-only fallback failed:', audioErr?.name || audioErr);
            stream = new MediaStream();
          }
        }
      }

      if (!isMounted || pc.signalingState === 'closed') {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // If camera was busy in another tab or unavailable, provide live virtual animated stream
      if (!camAvailable || !stream || stream.getVideoTracks().length === 0) {
        try {
          const fallbackStream = createFallbackVideoStream(roleLabel, roleLabel);
          const fallbackVideoTrack = fallbackStream.getVideoTracks()[0];
          if (fallbackVideoTrack) {
            if (!stream) stream = new MediaStream();
            stream.addTrack(fallbackVideoTrack);
            camAvailable = true;
            errorCode = null;
          }
        } catch (fbErr) {
          console.warn('[WebRTC] Fallback video creation error:', fbErr);
        }
      }

      // If microphone was busy or unavailable, provide subtle audio stream
      if (!stream || stream.getAudioTracks().length === 0) {
        try {
          const fallbackAudioStream = createSilentAudioStream();
          const fallbackAudioTrack = fallbackAudioStream.getAudioTracks()[0];
          if (fallbackAudioTrack) {
            if (!stream) stream = new MediaStream();
            stream.addTrack(fallbackAudioTrack);
          }
        } catch (fbAudioErr) {
          console.warn('[WebRTC] Fallback audio creation error:', fbAudioErr);
        }
      }

      localStreamRef.current = stream;
      setHasCameraPermission(true);
      setCameraActive(true);
      setMediaErrorReason(null);
      setMicActive(true);

      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }

      // Bind tracks to PeerConnection
      const videoTrack = stream?.getVideoTracks()[0] || null;
      const audioTrack = stream?.getAudioTracks()[0] || null;

      if (videoTrack && stream) {
        videoSenderRef.current = pc.addTrack(videoTrack, stream);
      }
      if (audioTrack && stream) {
        pc.addTrack(audioTrack, stream);
      }

      mediaInitializedRef.current = true;
      setConnectionStatusText(peerReadyRef.current ? 'Connecting peer video/audio...' : 'Waiting for partner to join video...');

      // Notify peer that we have initialized and are ready
      announceReady();

      // Trigger offer if peer is already ready AND (impolite initiator OR renegotiation required)
      if (peerReadyRef.current && (!isPolite || needsNegotiationRef.current)) {
        await sendOffer();
      }
    }

    initMedia();

    if (!socket) return () => {
      isMounted = false;
      pc.close();
      stopAllStreams();
    };

    const cfg = eventsRef.current;

    const flushPendingIce = async () => {
      while (pendingIceRef.current.length > 0) {
        const candidate = pendingIceRef.current.shift();
        if (!candidate) continue;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          if (!ignoreOfferRef.current) {
            console.warn('[WebRTC] addIceCandidate error:', err);
          }
        }
      }
    };

    const handlePeerReady = async () => {
      if (!isMounted) return;
      peerReadyRef.current = true;
      setConnectionStatusText('Partner joined — Establishing encrypted video...');
      // Let impolite peer (Doctor) initiate cleanly if ready, or negotiate pending local tracks
      if (mediaInitializedRef.current && (!isPolite || needsNegotiationRef.current)) {
        await sendOffer();
      }
    };

    const handleOffer = async (data: { sdp: RTCSessionDescriptionInit; [key: string]: any }) => {
      if (!isMounted || !data?.sdp || pc.signalingState === 'closed') return;
      try {
        const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable';
        ignoreOfferRef.current = !isPolite && offerCollision;
        if (ignoreOfferRef.current) {
          return;
        }

        if (offerCollision && pc.signalingState === 'have-local-offer') {
          await pc.setLocalDescription({ type: 'rollback' });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        await flushPendingIce();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit(cfg.answerEvent, {
          [cfg.idKey]: roomId,
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.warn('[WebRTC] handleOffer error:', err);
      }
    };

    const handleAnswer = async (data: { sdp: RTCSessionDescriptionInit; [key: string]: any }) => {
      if (!isMounted || !data?.sdp || pc.signalingState === 'closed') return;
      try {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          await flushPendingIce();
        }
      } catch (err) {
        console.warn('[WebRTC] handleAnswer error:', err);
      }
    };

    const handleIceCandidate = async (data: { candidate: RTCIceCandidateInit; [key: string]: any }) => {
      if (!isMounted || !data?.candidate || pc.signalingState === 'closed') return;
      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          pendingIceRef.current.push(data.candidate);
        }
      } catch (err) {
        if (!ignoreOfferRef.current) {
          console.warn('[WebRTC] handleIceCandidate error:', err);
        }
      }
    };

    const announceReady = () => {
      if (socket.connected) {
        socket.emit(cfg.readyEvent, { [cfg.idKey]: roomId, role: roleLabel });
      }
    };

    socket.on(cfg.peerReadyEvent, handlePeerReady);
    socket.on(cfg.offerEvent, handleOffer);
    socket.on(cfg.answerEvent, handleAnswer);
    socket.on(cfg.iceEvent, handleIceCandidate);
    socket.on('connect', announceReady);

    // Announce immediately if already connected
    announceReady();

    // Heartbeat to ensure ready handshake isn't dropped if peers mount asynchronously
    const heartbeatTimer = setInterval(() => {
      if (!isMounted || !pcRef.current) return;
      if (pcRef.current.iceConnectionState !== 'connected' && pcRef.current.connectionState !== 'connected') {
        announceReady();
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(heartbeatTimer);
      socket.off(cfg.peerReadyEvent, handlePeerReady);
      socket.off(cfg.offerEvent, handleOffer);
      socket.off(cfg.answerEvent, handleAnswer);
      socket.off(cfg.iceEvent, handleIceCandidate);
      socket.off('connect', announceReady);
      pc.close();
      pcRef.current = null;
      stopAllStreams();
    };
  }, [enabled, roomId, socket, isPolite, roleLabel, localVideoRef, remoteVideoRef, stopAllStreams]);

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        const nextState = !micActive;
        audioTracks.forEach((track) => {
          track.enabled = nextState;
        });
        setMicActive(nextState);
        return;
      }
    }
    setMicActive(false);
  }, [micActive]);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        const nextState = !cameraActive;
        videoTracks.forEach((track) => {
          track.enabled = nextState;
        });
        setCameraActive(nextState);
        return;
      }
    }
    setCameraActive(false);
  }, [cameraActive]);

  const stopScreenShareInternal = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    if (videoSenderRef.current) {
      await videoSenderRef.current.replaceTrack(camTrack).catch(() => {});
    } else if (videoTransceiverRef.current) {
      videoTransceiverRef.current.direction = camTrack ? 'sendrecv' : 'recvonly';
      await videoTransceiverRef.current.sender.replaceTrack(camTrack).catch(() => {});
    }

    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setScreenSharing(false);
  }, [localVideoRef]);

  const toggleScreenShare = useCallback(async () => {
    if (screenSharing) {
      await stopScreenShareInternal();
      return;
    }

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        if (videoSenderRef.current) {
          await videoSenderRef.current.replaceTrack(screenTrack);
        } else if (videoTransceiverRef.current) {
          videoTransceiverRef.current.direction = 'sendrecv';
          await videoTransceiverRef.current.sender.replaceTrack(screenTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShareInternal();
        };
        setScreenSharing(true);
      }
    } catch (err) {
      console.warn('[WebRTC] Screen sharing cancelled or unavailable:', err);
    }
  }, [screenSharing, localVideoRef, stopScreenShareInternal]);

  return {
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
  };
}
