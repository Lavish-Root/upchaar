import { Request, Response, NextFunction } from 'express';
import { patientService } from '../services/patientService';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../config/database';

export class PatientController {
  private async resolvePatientId(req: Request): Promise<string | null> {
    if (req.user?.patientId) return req.user.patientId;
    if (req.user?.userId) {
      const patient = await prisma.patient.upsert({
        where: { userId: req.user.userId },
        create: { userId: req.user.userId },
        update: {},
      });
      return patient.id;
    }
    return null;
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = await this.resolvePatientId(req);
      if (!patientId) return sendError(res, 'Patient profile not found', 404);

      const profile = await patientService.getProfile(patientId);
      return sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = await this.resolvePatientId(req);
      if (!patientId) return sendError(res, 'Patient profile not found', 404);

      const updated = await patientService.updateProfile(patientId, req.body);
      return sendSuccess(res, updated, 'Profile updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async getAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = await this.resolvePatientId(req);
      if (!patientId) return sendError(res, 'Patient profile not found', 404);

      const type = req.query.type as 'upcoming' | 'past' | 'all' | undefined;
      const appointments = await patientService.getAppointments(patientId, type);
      return sendSuccess(res, appointments);
    } catch (err) {
      next(err);
    }
  }

  async getMedicalRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = await this.resolvePatientId(req);
      if (!patientId) return sendError(res, 'Patient profile not found', 404);

      const records = await patientService.getMedicalRecords(patientId);
      return sendSuccess(res, records);
    } catch (err) {
      next(err);
    }
  }

  async addMedicalRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = await this.resolvePatientId(req);
      if (!patientId) return sendError(res, 'Patient profile not found', 404);

      const record = await patientService.addMedicalRecord({
        ...req.body,
        patientId,
      });
      return sendSuccess(res, record, 'Medical document recorded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getPrescriptions(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = await this.resolvePatientId(req);
      if (!patientId) return sendError(res, 'Patient profile not found', 404);

      const prescriptions = await patientService.getPrescriptions(patientId);
      return sendSuccess(res, prescriptions);
    } catch (err) {
      next(err);
    }
  }

  async getHealthOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const patientId = await this.resolvePatientId(req);
      if (!patientId) return sendError(res, 'Patient profile not found', 404);

      const overview = await patientService.getHealthOverview(patientId);
      return sendSuccess(res, overview);
    } catch (err) {
      next(err);
    }
  }
}

export const patientController = new PatientController();
