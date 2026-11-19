import { prisma } from '../config/database';
import { AppointmentStatus, ConsultationStatus, ConsultationType, NotificationType, PaymentStatus } from '@prisma/client';
import { emailService } from '../integrations/emailService';

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

    return prisma.$transaction(async (tx) => {
      // 1. Fetch doctor and verify approved status
      const doctor = await tx.doctor.findUnique({
        where: { id: data.doctorId },
        include: { user: { select: { fullName: true, email: true } } },
      });

      if (!doctor || doctor.verificationStatus !== 'APPROVED') {
        throw new Error('This doctor is not currently available for appointments or pending verification.');
      }

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

      // 3. Create appointment
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
        },
        include: {
          patient: {
            include: { user: { select: { id: true, fullName: true, email: true } } },
          },
          doctor: {
            include: { user: { select: { id: true, fullName: true, email: true } } },
          },
        },
      });

      // 4. Create consultation room automatically
      const meetingRoomId = `praan_room_${appointment.id.replace(/-/g, '').slice(0, 12)}`;
      await tx.consultation.create({
        data: {
          appointmentId: appointment.id,
          meetingRoomId,
          status: ConsultationStatus.SCHEDULED,
        },
      });

      // 5. Create notifications for both doctor and patient
      await tx.notification.create({
        data: {
          userId: appointment.patient.user.id,
          title: 'Appointment Confirmed',
          message: `Your appointment with ${appointment.doctor.user.fullName} is booked for ${data.appointmentDate} at ${data.startTime}.`,
          type: NotificationType.APPOINTMENT,
          linkUrl: `/patient/appointments`,
        },
      });

      await tx.notification.create({
        data: {
          userId: appointment.doctor.user.id,
          title: 'New Appointment Booked',
          message: `${appointment.patient.user.fullName} booked a consultation for ${data.appointmentDate} at ${data.startTime}.`,
          type: NotificationType.APPOINTMENT,
          linkUrl: `/doctor/appointments`,
        },
      });

      // 6. Asynchronous email notification dispatch
      emailService.sendAppointmentConfirmation(
        appointment.patient.user.email,
        appointment.patient.user.fullName,
        appointment.doctor.user.fullName,
        `${data.appointmentDate} from ${data.startTime} to ${data.endTime}`
      ).catch(console.error);

      return appointment;
    });
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

    return prisma.$transaction(async (tx) => {
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
    });
  }
}

export const appointmentService = new AppointmentService();
