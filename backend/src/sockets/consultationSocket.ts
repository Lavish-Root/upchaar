import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '../config/database';
import { Role } from '@prisma/client';

interface JoinRoomData {
  consultationId: string;
  userId: string;
  role: Role;
  fullName: string;
}

interface SendMessageData {
  consultationId: string;
  senderId: string;
  senderRole: Role;
  senderName: string;
  message: string;
  attachmentUrl?: string;
}

interface PendingEmergencyCall {
  callId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  emergencyReason: string;
  meetingRoomId: string;
  targetDoctorId?: string;
  status: 'RINGING' | 'CONNECTED' | 'ENDED';
  createdAt: number;
  timestamp: string;
}

export function setupConsultationSockets(io: SocketIOServer) {
  const consultationNamespace = io.of('/consultations');
  const activeEmergencyCalls = new Map<string, PendingEmergencyCall>();
  const videoReadyPeers = new Map<string, Set<string>>();

  const getOnDutyDoctorsCount = (): number => {
    const dutyRoom = consultationNamespace.adapter.rooms.get('emergency_doctors_duty');
    return dutyRoom ? dutyRoom.size : 0;
  };

  const pruneStaleEmergencyCalls = () => {
    const cutoff = Date.now() - 10 * 60 * 1000; // 10 minutes
    for (const [id, call] of activeEmergencyCalls.entries()) {
      if (call.createdAt < cutoff || call.status === 'ENDED') {
        activeEmergencyCalls.delete(id);
        videoReadyPeers.delete(`emg:${id}`);
      }
    }
  };

  const markPeerReady = (channelKey: string, roomName: string, socket: Socket, readyEvent: string, payload: Record<string, any>) => {
    socket.join(roomName);
    let peers = videoReadyPeers.get(channelKey);
    if (!peers) {
      peers = new Set<string>();
      videoReadyPeers.set(channelKey, peers);
    }
    peers.add(socket.id);

    // Filter out disconnected sockets just in case
    for (const peerSocketId of Array.from(peers)) {
      if (!consultationNamespace.sockets.has(peerSocketId)) {
        peers.delete(peerSocketId);
      }
    }

    // Notify other peers already in the room that this peer is ready
    socket.to(roomName).emit(readyEvent, payload);

    // If at least one other peer is already ready, notify this socket immediately too
    if (peers.size >= 2) {
      socket.emit(readyEvent, payload);
    }
  };

  consultationNamespace.on('connection', (socket: Socket) => {
    console.log(`🔌 Consultation socket connected: ${socket.id}`);

    // Join Consultation Room
    socket.on('join_room', async (data: JoinRoomData) => {
      try {
        const { consultationId, userId, role, fullName } = data;
        const roomName = `room_${consultationId}`;
        socket.join(roomName);

        console.log(`User ${fullName} (${role}) joined room: ${roomName}`);

        // Notify room members
        socket.to(roomName).emit('user_joined', {
          userId,
          role,
          fullName,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error in join_room socket handler:', err);
      }
    });

    // Scheduled Consultation WebRTC Readiness
    socket.on('video_peer_ready', ({ consultationId, role }: { consultationId: string; role?: string }) => {
      if (!consultationId) return;
      markPeerReady(`consult:${consultationId}`, `room_${consultationId}`, socket, 'video_peer_ready', {
        consultationId,
        peerRole: role,
      });
    });

    // Real-time Chat Message in Room
    socket.on('send_message', async (data: SendMessageData) => {
      try {
        const { consultationId, senderId, senderRole, senderName, message, attachmentUrl } = data;
        const roomName = `room_${consultationId}`;

        // Save message to database
        const savedMessage = await prisma.consultationMessage.create({
          data: {
            consultationId,
            senderId,
            senderRole,
            message,
            attachmentUrl,
          },
        });

        // Broadcast to everyone in room including sender
        consultationNamespace.to(roomName).emit('new_message', {
          id: savedMessage.id,
          consultationId,
          senderId,
          senderRole,
          senderName,
          message,
          attachmentUrl,
          createdAt: savedMessage.createdAt.toISOString(),
        });
      } catch (err) {
        console.error('Error saving or broadcasting consultation message:', err);
      }
    });

    // Typing Indicators
    socket.on('typing_start', ({ consultationId, fullName }: { consultationId: string; fullName: string }) => {
      socket.to(`room_${consultationId}`).emit('user_typing', { fullName, isTyping: true });
    });

    socket.on('typing_stop', ({ consultationId }: { consultationId: string }) => {
      socket.to(`room_${consultationId}`).emit('user_typing', { isTyping: false });
    });

    // WebRTC Signaling for Video/Audio (Modular signaling)
    socket.on('signal_offer', ({ consultationId, sdp }: { consultationId: string; sdp: any }) => {
      socket.to(`room_${consultationId}`).emit('signal_offer', { sdp });
    });

    socket.on('signal_answer', ({ consultationId, sdp }: { consultationId: string; sdp: any }) => {
      socket.to(`room_${consultationId}`).emit('signal_answer', { sdp });
    });

    socket.on('signal_ice_candidate', ({ consultationId, candidate }: { consultationId: string; candidate: any }) => {
      socket.to(`room_${consultationId}`).emit('signal_ice_candidate', { candidate });
    });

    // ==========================================
    // EMERGENCY TELE-TRIAGE & INSTANT SOS CALLING
    // ==========================================

    // Doctor registers online presence for emergency duty
    socket.on('doctor_duty_online', ({ doctorId, doctorName }: { doctorId: string; doctorName: string }) => {
      socket.join('emergency_doctors_duty');
      socket.join(`doctor_${doctorId}`);
      console.log(`👨‍⚕️ Emergency Duty: Dr. ${doctorName} (${doctorId}) is online & ready for emergency calls.`);

      pruneStaleEmergencyCalls();
      const dutyCount = getOnDutyDoctorsCount();

      // Deliver any currently ringing emergency calls to this newly connected/reconnected doctor
      for (const call of activeEmergencyCalls.values()) {
        if (call.status === 'RINGING') {
          if (!call.targetDoctorId || call.targetDoctorId === doctorId) {
            socket.emit('incoming_emergency_call', {
              callId: call.callId,
              patientId: call.patientId,
              patientName: call.patientName,
              patientPhone: call.patientPhone,
              emergencyReason: call.emergencyReason,
              meetingRoomId: call.meetingRoomId,
              timestamp: call.timestamp,
            });
          }
          consultationNamespace.to(`emergency_room_${call.callId}`).emit('emergency_call_status', {
            callId: call.callId,
            status: 'RINGING',
            onDutyDoctorsCount: dutyCount,
          });
        }
      }
    });

    // Patient registers presence
    socket.on('patient_presence', ({ patientId }: { patientId: string }) => {
      if (!patientId) return;
      socket.join(`patient_${patientId}`);
      // Re-attach to any active emergency room belonging to this patient
      for (const call of activeEmergencyCalls.values()) {
        if (call.patientId === patientId && call.status !== 'ENDED') {
          socket.join(`emergency_room_${call.callId}`);
        }
      }
    });

    // Patient initiates emergency SOS call
    socket.on('initiate_emergency_call', (data: {
      callId: string;
      patientId: string;
      patientName: string;
      patientPhone: string;
      emergencyReason: string;
      targetDoctorId?: string;
    }) => {
      pruneStaleEmergencyCalls();
      const emergencyRoom = `emergency_room_${data.callId}`;
      socket.join(emergencyRoom);
      socket.join(`patient_${data.patientId}`);

      console.log(`🚨 [EMERGENCY CALL] Initiated by ${data.patientName} (${data.patientId}) - Reason: ${data.emergencyReason}`);

      const timestamp = new Date().toISOString();
      const alertPayload = {
        callId: data.callId,
        patientId: data.patientId,
        patientName: data.patientName,
        patientPhone: data.patientPhone || 'Not provided',
        emergencyReason: data.emergencyReason,
        meetingRoomId: data.callId,
        timestamp,
      };

      activeEmergencyCalls.set(data.callId, {
        ...alertPayload,
        targetDoctorId: data.targetDoctorId,
        status: 'RINGING',
        createdAt: Date.now(),
      });

      if (data.targetDoctorId) {
        consultationNamespace.to(`doctor_${data.targetDoctorId}`).emit('incoming_emergency_call', alertPayload);
      }
      // Broadcast to all on-duty government doctors
      consultationNamespace.to('emergency_doctors_duty').emit('incoming_emergency_call', alertPayload);

      // Acknowledge to patient with live on-duty doctor count
      socket.emit('emergency_call_status', {
        callId: data.callId,
        status: 'RINGING',
        onDutyDoctorsCount: getOnDutyDoctorsCount(),
      });
    });

    // Doctor accepts emergency call
    socket.on('accept_emergency_call', (data: {
      callId: string;
      doctorId: string;
      doctorName: string;
      patientId: string;
    }) => {
      const emergencyRoom = `emergency_room_${data.callId}`;
      socket.join(emergencyRoom);

      const existingCall = activeEmergencyCalls.get(data.callId);
      if (existingCall) {
        existingCall.status = 'CONNECTED';
      }

      console.log(`✅ [EMERGENCY ACCEPTED] Dr. ${data.doctorName} accepted emergency call ${data.callId}`);

      const connectPayload = {
        callId: data.callId,
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        meetingRoomId: data.callId,
        connectedAt: new Date().toISOString(),
      };

      // Notify the patient in the emergency room (and patient room if not in emergencyRoom yet)
      consultationNamespace.to(emergencyRoom).emit('emergency_call_connected', connectPayload);
      consultationNamespace.to(`patient_${data.patientId}`).except(emergencyRoom).emit('emergency_call_connected', connectPayload);

      // Notify other doctors that call is handled
      consultationNamespace.to('emergency_doctors_duty').emit('emergency_call_claimed', {
        callId: data.callId,
        claimedBy: data.doctorName,
      });
    });

    // Patient or Doctor cancels / declines emergency call before video starts
    socket.on('cancel_emergency_call', ({ callId, patientId }: { callId: string; patientId: string }) => {
      activeEmergencyCalls.delete(callId);
      videoReadyPeers.delete(`emg:${callId}`);
      consultationNamespace.to('emergency_doctors_duty').emit('emergency_call_cancelled', { callId });
      consultationNamespace.to(`patient_${patientId}`).emit('emergency_call_cancelled', { callId });
      consultationNamespace.to(`emergency_room_${callId}`).emit('emergency_call_cancelled', { callId });
    });

    // Emergency Video Call WebRTC Peer Readiness
    socket.on('emergency_video_ready', ({ callId, role }: { callId: string; role?: string }) => {
      if (!callId) return;
      markPeerReady(`emg:${callId}`, `emergency_room_${callId}`, socket, 'emergency_peer_ready', {
        callId,
        peerRole: role,
      });
    });

    // WebRTC Signaling specifically for Emergency Video Session
    socket.on('emergency_signal_offer', ({ callId, sdp }: { callId: string; sdp: any }) => {
      socket.to(`emergency_room_${callId}`).emit('emergency_signal_offer', { callId, sdp });
    });

    socket.on('emergency_signal_answer', ({ callId, sdp }: { callId: string; sdp: any }) => {
      socket.to(`emergency_room_${callId}`).emit('emergency_signal_answer', { callId, sdp });
    });

    socket.on('emergency_signal_ice', ({ callId, candidate }: { callId: string; candidate: any }) => {
      socket.to(`emergency_room_${callId}`).emit('emergency_signal_ice', { callId, candidate });
    });

    socket.on('end_emergency_call', ({ callId }: { callId: string }) => {
      const existingCall = activeEmergencyCalls.get(callId);
      const patientRoom = existingCall ? `patient_${existingCall.patientId}` : null;
      activeEmergencyCalls.delete(callId);
      videoReadyPeers.delete(`emg:${callId}`);

      consultationNamespace.to(`emergency_room_${callId}`).emit('emergency_call_ended', { callId });
      consultationNamespace.to('emergency_doctors_duty').emit('emergency_call_ended', { callId });
      if (patientRoom) {
        consultationNamespace.to(patientRoom).emit('emergency_call_ended', { callId });
      }
    });

    // End / Complete Consultation Signal
    socket.on('end_consultation', async ({ consultationId }: { consultationId: string }) => {
      try {
        videoReadyPeers.delete(`consult:${consultationId}`);
        await prisma.consultation.update({
          where: { id: consultationId },
          data: { status: 'COMPLETED', endedAt: new Date() },
        });

        consultationNamespace.to(`room_${consultationId}`).emit('consultation_ended', {
          consultationId,
          endedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error completing consultation via socket:', err);
      }
    });

    socket.on('disconnect', () => {
      for (const peers of videoReadyPeers.values()) {
        peers.delete(socket.id);
      }
      console.log(`🔌 Consultation socket disconnected: ${socket.id}`);
    });
  });
}
