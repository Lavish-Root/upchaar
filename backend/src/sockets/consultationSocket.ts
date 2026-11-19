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

export function setupConsultationSockets(io: SocketIOServer) {
  const consultationNamespace = io.of('/consultations');

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
    });

    // Patient registers presence
    socket.on('patient_presence', ({ patientId }: { patientId: string }) => {
      socket.join(`patient_${patientId}`);
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
      const emergencyRoom = `emergency_room_${data.callId}`;
      socket.join(emergencyRoom);

      console.log(`🚨 [EMERGENCY CALL] Initiated by ${data.patientName} (${data.patientId}) - Reason: ${data.emergencyReason}`);

      const alertPayload = {
        callId: data.callId,
        patientId: data.patientId,
        patientName: data.patientName,
        patientPhone: data.patientPhone || 'Not provided',
        emergencyReason: data.emergencyReason,
        meetingRoomId: data.callId,
        timestamp: new Date().toISOString(),
      };

      if (data.targetDoctorId) {
        consultationNamespace.to(`doctor_${data.targetDoctorId}`).emit('incoming_emergency_call', alertPayload);
      }
      // Broadcast to all on-duty government doctors
      consultationNamespace.to('emergency_doctors_duty').emit('incoming_emergency_call', alertPayload);
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

      console.log(`✅ [EMERGENCY ACCEPTED] Dr. ${data.doctorName} accepted emergency call ${data.callId}`);

      const connectPayload = {
        callId: data.callId,
        doctorId: data.doctorId,
        doctorName: data.doctorName,
        meetingRoomId: data.callId,
        connectedAt: new Date().toISOString(),
      };

      // Notify the patient in their dedicated room and in the emergency room
      consultationNamespace.to(`patient_${data.patientId}`).emit('emergency_call_connected', connectPayload);
      consultationNamespace.to(emergencyRoom).emit('emergency_call_connected', connectPayload);

      // Notify other doctors that call is handled
      consultationNamespace.to('emergency_doctors_duty').emit('emergency_call_claimed', {
        callId: data.callId,
        claimedBy: data.doctorName,
      });
    });

    // Patient or Doctor cancels / declines emergency call
    socket.on('cancel_emergency_call', ({ callId, patientId }: { callId: string; patientId: string }) => {
      consultationNamespace.to('emergency_doctors_duty').emit('emergency_call_cancelled', { callId });
      consultationNamespace.to(`patient_${patientId}`).emit('emergency_call_cancelled', { callId });
    });

    // WebRTC Signaling specifically for Emergency Video Session
    socket.on('emergency_signal_offer', ({ callId, sdp }: { callId: string; sdp: any }) => {
      socket.to(`emergency_room_${callId}`).emit('emergency_signal_offer', { sdp });
    });

    socket.on('emergency_signal_answer', ({ callId, sdp }: { callId: string; sdp: any }) => {
      socket.to(`emergency_room_${callId}`).emit('emergency_signal_answer', { sdp });
    });

    socket.on('emergency_signal_ice', ({ callId, candidate }: { callId: string; candidate: any }) => {
      socket.to(`emergency_room_${callId}`).emit('emergency_signal_ice', { candidate });
    });

    socket.on('end_emergency_call', ({ callId }: { callId: string }) => {
      consultationNamespace.to(`emergency_room_${callId}`).emit('emergency_call_ended', { callId });
    });

    // End / Complete Consultation Signal
    socket.on('end_consultation', async ({ consultationId }: { consultationId: string }) => {
      try {
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
      console.log(`🔌 Consultation socket disconnected: ${socket.id}`);
    });
  });
}
