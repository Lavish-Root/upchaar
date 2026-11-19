import { Request, Response, NextFunction } from 'express';
import { Role, VerificationStatus } from '@prisma/client';
import { sendError } from '../utils/response';

export function requireRole(allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
}

export function requireVerifiedDoctor(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== Role.DOCTOR) {
    return sendError(res, 'Only doctors can access this feature', 403, 'FORBIDDEN');
  }

  const doctor = req.user.dbUser?.doctor;
  if (!doctor || doctor.verificationStatus !== VerificationStatus.APPROVED) {
    return sendError(
      res,
      'Your medical credentials are currently pending administrative verification or have been rejected. You cannot perform this clinical action until approved.',
      403,
      'DOCTOR_NOT_VERIFIED'
    );
  }

  next();
}
