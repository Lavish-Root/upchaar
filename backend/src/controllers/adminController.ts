import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService';
import { verifyDoctorSchema, specialtySchema } from '../validators';
import { sendSuccess } from '../utils/response';
import { VerificationStatus } from '@prisma/client';

export class AdminController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await adminService.getDashboardAnalytics();
      return sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async getDoctors(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as VerificationStatus | undefined;
      const search = req.query.search as string | undefined;
      const doctors = await adminService.getDoctors({ status, search });
      return sendSuccess(res, doctors);
    } catch (err) {
      next(err);
    }
  }

  async updateDoctorVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, rejectionReason } = verifyDoctorSchema.parse(req.body);
      const updated = await adminService.updateDoctorVerification(req.params.id, status, rejectionReason);
      return sendSuccess(res, updated, `Doctor status updated to ${status}`);
    } catch (err) {
      next(err);
    }
  }

  async getPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const patients = await adminService.getPatients(search);
      return sendSuccess(res, patients);
    } catch (err) {
      next(err);
    }
  }

  async toggleUserActive(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await adminService.toggleUserActiveStatus(req.params.userId);
      return sendSuccess(res, updated, `User account ${updated.isActive ? 'activated' : 'suspended'}`);
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const result = await adminService.getAuditLogs(page, limit);
      return sendSuccess(res, result.logs, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  async getSpecialties(req: Request, res: Response, next: NextFunction) {
    try {
      const specialties = await adminService.getSpecialties();
      return sendSuccess(res, specialties);
    } catch (err) {
      next(err);
    }
  }

  async createSpecialty(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = specialtySchema.parse(req.body);
      const created = await adminService.createSpecialty(validated);
      return sendSuccess(res, created, 'Specialty created successfully', 201);
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
