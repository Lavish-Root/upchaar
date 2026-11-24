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
      if (!isMounted || !remoteStreamRef.current) return;
      const track = event.track;

      // Replace existing track of same kind cleanly
      remoteStreamRef.current.getTracks()
        .filter((t) => t.kind === track.kind)
        .forEach((t) => remoteStreamRef.current?.removeTrack(t));
      remoteStreamRef.current.addTrack(track);

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(() => {});
      }

      if (track.kind === 'video') {
        if (!track.muted) setHasRemoteVideo(true);
        track.onunmute = () => {
          if (!isMounted) return;
          setHasRemoteVideo(true);
          if (remoteVideoRef.current && remoteStreamRef.current) {
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            remoteVideoRef.current.play().catch(() => {});
          }
        };
        track.onended = () => {
          if (isMounted) setHasRemoteVideo(false);
        };
      }

      if (track.kind === 'audio') {
        if (!track.muted) setHasRemoteAudio(true);
        track.onunmute = () => {
          if (isMounted) setHasRemoteAudio(true);
        };
        track.onended = () => {
          if (isMounted) setHasRemoteAudio(false);
        };
      }
    };

    // Acquire camera & microphone with graceful audio-only and recvonly fallbacks
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
            // Audio worked! Clear permission error if only camera failed
            if (errorCode === 'permission_denied') errorCode = 'no_device';
          } catch (audioErr: any) {
            console.warn('[WebRTC] Audio-only fallback failed, continuing in receive-only mode:', audioErr?.name || audioErr);
          }
        }
      }

      if (!isMounted || pc.signalingState === 'closed') {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      setHasCameraPermission(camAvailable);
      setCameraActive(camAvailable);
      setMediaErrorReason(camAvailable ? null : errorCode);
      setMicActive(Boolean(stream && stream.getAudioTracks().length > 0));

      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Bind local tracks (reusing existing negotiated transceiver if offer arrived first)
      const videoTrack = stream?.getVideoTracks()[0] || null;
      const audioTrack = stream?.getAudioTracks()[0] || null;
      const transceivers = pc.getTransceivers();
      const existingVideoTransceiver = transceivers.find((t) => t.receiver?.track?.kind === 'video');
      const existingAudioTransceiver = transceivers.find((t) => t.receiver?.track?.kind === 'audio');

      if (videoTrack && stream) {
        if (existingVideoTransceiver) {
          existingVideoTransceiver.direction = 'sendrecv';
          await existingVideoTransceiver.sender.replaceTrack(videoTrack).catch(() => {});
          videoSenderRef.current = existingVideoTransceiver.sender;
          videoTransceiverRef.current = existingVideoTransceiver;
          needsNegotiationRef.current = true;
        } else {
          videoSenderRef.current = pc.addTrack(videoTrack, stream);
        }
      } else if (!existingVideoTransceiver) {
        videoTransceiverRef.current = pc.addTransceiver('video', { direction: 'recvonly' });
      } else {
        videoTransceiverRef.current = existingVideoTransceiver;
      }

      if (audioTrack && stream) {
        if (existingAudioTransceiver) {
          existingAudioTransceiver.direction = 'sendrecv';
          await existingAudioTransceiver.sender.replaceTrack(audioTrack).catch(() => {});
          needsNegotiationRef.current = true;
        } else {
          pc.addTrack(audioTrack, stream);
        }
      } else if (!existingAudioTransceiver) {
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }

      mediaInitializedRef.current = true;
      setConnectionStatusText(peerReadyRef.current ? 'Connecting peer video/audio...' : 'Waiting for partner to join video...');

      // Trigger offer if peer is ready AND (we are the impolite initiator OR we need to renegotiate updated local tracks)
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

    return () => {
      isMounted = false;
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
