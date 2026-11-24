import { prisma } from '../config/database';
import { ConsultationStatus, Role } from '@prisma/client';

export class ConsultationService {
  async getConsultationById(id: string, userId: string, userRole: Role) {
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            patient: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
            doctor: { include: { user: { select: { id: true, fullName: true, avatarUrl: true } } } },
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!consultation) throw new Error('Consultation not found.');

    // Authorization check: Only participant patient, participant doctor, or admin can access
    const isPatient = consultation.appointment.patient.user.id === userId;
    const isDoctor = consultation.appointment.doctor.user.id === userId;
    const isAdmin = userRole === Role.ADMIN;

    if (!isPatient && !isDoctor && !isAdmin) {
      throw new Error('You do not have authorization to access this consultation room.');
    }

    return consultation;
  }

  async addMessage(data: {
    consultationId: string;
    senderId: string;
    senderRole: Role;
    message: string;
    attachmentUrl?: string;
  }) {
    return prisma.consultationMessage.create({
      data: {
        consultationId: data.consultationId,
        senderId: data.senderId,
        senderRole: data.senderRole,
        message: data.message,
        attachmentUrl: data.attachmentUrl,
      },
    });
  }

  async completeConsultation(id: string, doctorId: string, doctorNotes?: string) {
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: { appointment: true },
    });

    if (!consultation) throw new Error('Consultation not found.');
    if (consultation.appointment.doctorId !== doctorId) {
      throw new Error('Only the assigned consulting physician can mark this consultation as completed.');
    }

    return prisma.$transaction(
      async (tx) => {
        const updatedConsultation = await tx.consultation.update({
          where: { id },
          data: {
            status: ConsultationStatus.COMPLETED,
            endedAt: new Date(),
            doctorNotes: doctorNotes || consultation.doctorNotes,
          },
        });

        await tx.appointment.update({
          where: { id: consultation.appointmentId },
          data: { status: 'COMPLETED' },
        });

        return updatedConsultation;
      },
      {
        maxWait: 10000,
        timeout: 25000,
      }
    );
  }
}

export const consultationService = new ConsultationService();
