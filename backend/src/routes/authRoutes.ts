import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', (req, res, next) => {
  if (req.body.role === 'DOCTOR') {
    return authController.registerDoctor(req, res, next);
  }
  return authController.registerPatient(req, res, next);
});

router.post('/register/patient', (req, res, next) => authController.registerPatient(req, res, next));
router.post('/register/doctor', (req, res, next) => authController.registerDoctor(req, res, next));
router.post('/register/admin', (req, res, next) => authController.registerAdmin(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authenticateToken, (req, res, next) => authController.me(req, res, next));

export default router;
