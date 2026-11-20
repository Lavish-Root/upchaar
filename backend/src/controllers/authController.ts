import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { registerPatientSchema, registerDoctorSchema, registerAdminSchema, loginSchema, refreshTokenSchema } from '../validators';
import { sendSuccess, sendError } from '../utils/response';

export class AuthController {
  async registerPatient(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerPatientSchema.parse(req.body);
      const result = await authService.registerPatient(validatedData);
      return sendSuccess(res, result, 'Patient account registered successfully', 201);
    } catch (err: any) {
      next(err);
    }
  }

  async registerDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerDoctorSchema.parse(req.body);
      const result = await authService.registerDoctor(validatedData);
      return sendSuccess(res, result, result.message, 201);
    } catch (err: any) {
      next(err);
    }
  }

  async registerAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerAdminSchema.parse(req.body);
      const result = await authService.registerAdmin(validatedData);
      return sendSuccess(res, result, 'Superadmin account created successfully', 201);
    } catch (err: any) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await authService.login(validatedData.email, validatedData.password, validatedData.expectedRole);
      return sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const result = await authService.refreshToken(refreshToken);
      return sendSuccess(res, result, 'Token refreshed successfully');
    } catch (err: any) {
      next(err);
    }
  }

  async logout(req: Request, res: Response) {
    return sendSuccess(res, null, 'Logged out successfully');
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return sendError(res, 'Unauthorized', 401);
      }
      const user = await authService.getCurrentUser(req.user.userId);
      return sendSuccess(res, user);
    } catch (err: any) {
      next(err);
    }
  }
}

export const authController = new AuthController();
