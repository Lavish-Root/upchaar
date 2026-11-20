import { Request, Response, NextFunction } from 'express';
import { doctorService } from '../services/doctorService';
import { sendSuccess, sendError } from '../utils/response';
import { doctorAvailabilitySchema } from '../validators';
import { AppointmentStatus } from '@prisma/client';

export class DoctorController {
  async discoverDoctors(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        search: req.query.search as string,
        specialtySlug: req.query.specialty as string,
        dayOfWeek: req.query.dayOfWeek !== undefined ? Number(req.query.dayOfWeek) : undefined,
        minRating: req.query.minRating !== undefined ? Number(req.query.minRating) : undefined,
      };
      const doctors = await doctorService.discoverDoctors(filters);
      return sendSuccess(res, doctors);
    } catch (err) {
      next(err);
    }
  }

  async getDoctorById(req: Request, res: Response, next: NextFunction) {
    try {
      const doctor = await doctorService.getDoctorById(req.params.id);
      return sendSuccess(res, doctor);
    } catch (err) {
      next(err);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.doctorId;
      if (!doctorId) return sendError(res, 'Doctor account not found', 404);

      const stats = await doctorService.getDashboardStats(doctorId);
      return sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  }

  async getAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.doctorId;
      if (!doctorId) return sendError(res, 'Doctor account not found', 404);

      const status = req.query.status as AppointmentStatus | undefined;
      const appointments = await doctorService.getAppointments(doctorId, status);
      return sendSuccess(res, appointments);
    } catch (err) {
      next(err);
    }
  }

  async updateAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.doctorId;
      if (!doctorId) return sendError(res, 'Doctor account not found', 404);

      const validated = doctorAvailabilitySchema.parse(req.body);
      const updated = await doctorService.updateAvailability(doctorId, validated.availabilities);
      return sendSuccess(res, updated, 'Availability schedule updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getAssignedPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.doctorId;
      if (!doctorId) return sendError(res, 'Doctor account not found', 404);

      const patients = await doctorService.getAssignedPatients(doctorId);
      return sendSuccess(res, patients);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const doctorId = req.user?.doctorId;
      if (!doctorId || !req.user?.userId) return sendError(res, 'Doctor account not found', 404);

      const updated = await doctorService.updateDoctorProfile(doctorId, req.user.userId, req.body);
      return sendSuccess(res, updated, 'Doctor profile updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const doctorController = new DoctorController();
