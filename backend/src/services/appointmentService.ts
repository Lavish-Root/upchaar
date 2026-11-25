import { prisma } from '../config/database';
import { AppointmentStatus, ConsultationStatus, ConsultationType, NotificationType, PaymentStatus } from '@prisma/client';
import { emailService } from '../integrations/emailService';
import { randomUUID } from 'crypto';

export class AppointmentService {
  /**
   * Transactional appointment booking with double-booking prevention
   */
  async bookAppointment(data: {
    patientId: string;
    doctorId: string;
    appointmentDate: string; // "YYYY-MM-DD"
    startTime: string;       // "HH:MM"
    endTime: string;         // "HH:MM"
    consultationType: ConsultationType;
    reasonForVisit: string;
  }) {
    const bookingDate = new Date(data.appointmentDate);
    bookingDate.setHours(0, 0, 0, 0);

    // 1. Fetch doctor and verify approved status outside transaction to reduce lock & transaction duration
    const doctor = await prisma.doctor.findUnique({
      where: { id: data.doctorId },
      include: { user: { select: { fullName: true, email: true } } },
    });

    if (!doctor || doctor.verificationStatus !== 'APPROVED') {
      throw new Error('This doctor is not currently available for appointments or pending verification.');
    }

    return prisma.$transaction(
      async (tx) => {
        // 2. Double booking check: Ensure doctor does not already have a confirmed or pending booking at this date & time
        const existingConflict = await tx.appointment.findFirst({
          where: {
            doctorId: data.doctorId,
            appointmentDate: bookingDate,
            startTime: data.startTime,
            status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
          },
        });

        if (existingConflict) {
          throw new Error('This time slot has already been booked. Please select an alternate available slot.');
        }

        // 3. Atomically create appointment and consultation room in a single nested query
        const meetingRoomId = `praan_room_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
        const appointment = await tx.appointment.create({
          data: {
            patientId: data.patientId,
            doctorId: data.doctorId,
            appointmentDate: bookingDate,
            startTime: data.startTime,
            endTime: data.endTime,
            consultationType: data.consultationType,
            status: AppointmentStatus.CONFIRMED,
            reasonForVisit: data.reasonForVisit,
            consultationFee: doctor.consultationFee,
            paymentStatus: PaymentStatus.COMPLETED, // Instant simulation confirmation
            consultation: {
              create: {
                meetingRoomId,
                status: ConsultationStatus.SCHEDULED,
              },
            },
          },
          include: {
            patient: {
              include: { user: { select: { id: true, fullName: true, email: true } } },
            },
            doctor: {
              include: { user: { select: { id: true, fullName: true, email: true } } },
            },
            consultation: true,
          },
        });

        // 4. Batch create notifications for both doctor and patient
        try {
          await tx.notification.createMany({
            data: [
              {
                id: randomUUID(),
                userId: appointment.patient.user.id,
                title: 'Appointment Confirmed',
                message: `Your appointment with ${appointment.doctor.user.fullName} is booked for ${data.appointmentDate} at ${data.startTime}.`,
                type: NotificationType.APPOINTMENT,
                linkUrl: `/patient/appointments`,
              },
              {
                id: randomUUID(),
                userId: appointment.doctor.user.id,
                title: 'New Appointment Booked',
                message: `${appointment.patient.user.fullName} booked a consultation for ${data.appointmentDate} at ${data.startTime}.`,
                type: NotificationType.APPOINTMENT,
                linkUrl: `/doctor/appointments`,
              },
            ],
          });
        } catch (notifErr) {
          console.warn('Failed to persist in-transaction notifications, continuing:', notifErr);
        }

        // 5. Asynchronous email notification dispatch
        emailService.sendAppointmentConfirmation(
          appointment.patient.user.email,
          appointment.patient.user.fullName,
          appointment.doctor.user.fullName,
          `${data.appointmentDate} from ${data.startTime} to ${data.endTime}`
        ).catch(console.error);

        return appointment;
      },
      {
        maxWait: 10000, // 10s wait for DB connection pool
        timeout: 25000, // 25s timeout for interactive transaction on remote databases
      }
    );
  }

  async getAppointmentById(id: string) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: { select: { id: true, fullName: true, email: true, phone: true } },
            medicationAllergies: true,
          },
        },
        doctor: {
          include: {
            user: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } },
            specialties: { include: { specialty: true } },
          },
        },
        consultation: true,
        prescription: {
          include: { items: true },
        },
        payment: true,
      },
    });

    if (!appointment) throw new Error('Appointment not found.');
    return appointment;
  }

  async updateStatus(id: string, status: AppointmentStatus, cancellationReason?: string) {
    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { include: { user: true } },
        doctor: { include: { user: true } },
      },
    });
    if (!existing) throw new Error('Appointment not found.');

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(cancellationReason && { cancellationReason }),
      },
    });

    // If marked completed, also update linked consultation record & create notification
    if (status === AppointmentStatus.COMPLETED) {
      try {
        await prisma.consultation.updateMany({
          where: { appointmentId: id },
          data: {
            status: ConsultationStatus.COMPLETED,
            endedAt: new Date(),
          },
        });
      } catch (err) {
        console.warn('Could not update linked consultation status:', err);
      }

      try {
        await prisma.notification.create({
          data: {
            userId: existing.patient.user.id,
            title: 'Consultation Completed',
            message: `Your consultation with ${existing.doctor.user.fullName} has been completed.`,
            type: NotificationType.APPOINTMENT,
          },
        });
      } catch (err) {
        console.warn('Could not create patient notification for completed consultation:', err);
      }
    }

    // Notify user of cancellation or status update
    if (status === AppointmentStatus.CANCELLED) {
      await prisma.notification.create({
        data: {
          userId: existing.patient.user.id,
          title: 'Appointment Cancelled',
          message: `Your appointment with ${existing.doctor.user.fullName} was cancelled. ${cancellationReason ? `Reason: ${cancellationReason}` : ''}`,
          type: NotificationType.APPOINTMENT,
        },
      });
    }

    return updated;
  }

  async reschedule(id: string, newDate: string, startTime: string, endTime: string, reason?: string) {
    const appointmentDate = new Date(newDate);
    appointmentDate.setHours(0, 0, 0, 0);

    return prisma.$transaction(
      async (tx) => {
        const appt = await tx.appointment.findUnique({ where: { id } });
        if (!appt) throw new Error('Appointment not found.');

        // Check conflict
        const conflict = await tx.appointment.findFirst({
          where: {
            id: { not: id },
            doctorId: appt.doctorId,
            appointmentDate,
            startTime,
            status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
          },
        });

        if (conflict) {
          throw new Error('Requested reschedule slot is already booked. Please choose a different time.');
        }

        const updated = await tx.appointment.update({
          where: { id },
          data: {
            appointmentDate,
            startTime,
            endTime,
            status: AppointmentStatus.RESCHEDULED,
            cancellationReason: reason ? `Rescheduled: ${reason}` : undefined,
          },
        });

        return updated;
      },
      {
        maxWait: 10000,
        timeout: 25000,
      }
    );
  }
}

export const appointmentService = new AppointmentService();
