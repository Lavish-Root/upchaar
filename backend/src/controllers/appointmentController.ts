import { Request, Response, NextFunction } from 'express';
import { appointmentService } from '../services/appointmentService';
import { bookAppointmentSchema, rescheduleAppointmentSchema, updateAppointmentStatusSchema } from '../validators';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../config/database';
import { Role } from '@prisma/client';

export class AppointmentController {
  async book(req: Request, res: Response, next: NextFunction) {
    try {
      let patientId = req.user?.patientId;

      // Auto-provision patient record if user does not have one yet (e.g. Admin/Doctor booking or testing)
      if (!patientId && req.user?.userId) {
        let patient = await prisma.patient.findUnique({ where: { userId: req.user.userId } });
        if (!patient) {
          patient = await prisma.patient.create({
            data: { userId: req.user.userId },
          });
        }
        patientId = patient.id;
      }

      if (!patientId) {
        return sendError(res, 'Please log in to book an appointment', 401);
      }

      const validated = bookAppointmentSchema.parse(req.body);
      const appointment = await appointmentService.bookAppointment({
        ...validated,
        patientId,
      });

      return sendSuccess(res, appointment, 'Appointment booked successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const appointment = await appointmentService.getAppointmentById(req.params.id);

      // Verify authorization
      const userId = req.user?.userId;
      const isParticipant =
        appointment.patient.user.id === userId ||
        appointment.doctor.user.id === userId ||
        req.user?.role === Role.ADMIN;

      if (!isParticipant) {
        return sendError(res, 'Access to this appointment record is forbidden', 403);
      }

      return sendSuccess(res, appointment);
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, cancellationReason } = updateAppointmentStatusSchema.parse(req.body);
      const updated = await appointmentService.updateStatus(req.params.id, status, cancellationReason);
      return sendSuccess(res, updated, 'Appointment status updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async reschedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { appointmentDate, startTime, endTime, reason } = rescheduleAppointmentSchema.parse(req.body);
      const updated = await appointmentService.reschedule(req.params.id, appointmentDate, startTime, endTime, reason);
      return sendSuccess(res, updated, 'Appointment rescheduled successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const appointmentController = new AppointmentController();
