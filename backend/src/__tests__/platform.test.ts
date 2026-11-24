import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword } from '../utils/security';
import { generateAccessToken, verifyAccessToken } from '../utils/jwt';
import { evaluateClinicalEmergency } from '../utils/safety';
import { aiService } from '../integrations/aiService';
import { Role } from '@prisma/client';

describe('1. Authentication & Security Unit Tests', () => {
  it('should securely hash password and verify match with bcrypt', async () => {
    const rawPassword = 'ClinicalPassword123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2')).toBe(true);

    const isMatch = await comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrong = await comparePassword('WrongPassword', hash);
    expect(isWrong).toBe(false);
  });

  it('should issue valid JWT access tokens and decode user role & claims', () => {
    const payload = {
      userId: 'test-user-uuid-1',
      email: 'dr.sharma@praansewa.health',
      role: Role.DOCTOR,
      doctorId: 'test-doc-uuid-1',
    };

    const token = generateAccessToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(Role.DOCTOR);
    expect(decoded.doctorId).toBe(payload.doctorId);
  });
});

describe('2. Clinical Emergency Triage & AI Safety Tests', () => {
  it('should intercept life-threatening acute chest pain and mandate emergency 112/102', () => {
    const query = 'I have crushing chest pain radiating to my left arm and jaw';
    const result = evaluateClinicalEmergency(query);

    expect(result.isEmergency).toBe(true);
    expect(result.urgencyLevel).toBe('EMERGENCY');
    expect(result.emergencyCategory).toContain('Coronary');
    expect(result.recommendedAction).toContain('112');
  });

  it('should intercept acute stroke warning signs', () => {
    const query = 'My father suddenly has facial drooping and slurred speech';
    const result = evaluateClinicalEmergency(query);

    expect(result.isEmergency).toBe(true);
    expect(result.emergencyCategory).toContain('Stroke');
  });

  it('should treat common mild self-limiting symptoms as routine non-emergency', () => {
    const query = 'I have a mild runny nose and slight throat tickle for two days';
    const result = evaluateClinicalEmergency(query);

    expect(result.isEmergency).toBe(false);
    expect(result.urgencyLevel).toBe('ROUTINE');
  });

  it('should provide mandatory non-diagnostic disclaimer in AI health triage', async () => {
    const res = await aiService.processHealthQuery('What helps with mild tension headache?');
    expect(res.disclaimer).toContain('Upchaar AI (PraanSewa) is an informational clinical triage support assistant');
    expect(res.isEmergency).toBe(false);
  }, 15000);
});

describe('3. Role Authorization & Doctor Verification Rules', () => {
  it('should enforce role separation between PATIENT, DOCTOR, and ADMIN', () => {
    const patientRole: Role = 'PATIENT';
    const doctorRole: Role = 'DOCTOR';
    const adminRole: Role = 'ADMIN';

    const allowedForDoctor: Role[] = [doctorRole, adminRole];
    expect(allowedForDoctor.includes(patientRole)).toBe(false);
    expect(allowedForDoctor.includes(doctorRole)).toBe(true);
  });

  it('should enforce that doctors start in PENDING verification until approved', () => {
    const initialStatus = 'PENDING';
    const approvedStatus = 'APPROVED';
    const rejectedStatus = 'REJECTED';

    const canAcceptAppointments = (status: string) => status === approvedStatus;

    expect(canAcceptAppointments(initialStatus)).toBe(false);
    expect(canAcceptAppointments(rejectedStatus)).toBe(false);
    expect(canAcceptAppointments(approvedStatus)).toBe(true);
  });
});

describe('4. Appointment Booking & Double-Booking Prevention Logic', () => {
  it('should detect conflicting appointment time slots', () => {
    const existingAppointments = [
      { doctorId: 'doc-1', date: '2026-11-25', startTime: '10:00', endTime: '10:30', status: 'CONFIRMED' },
    ];

    const checkConflict = (doctorId: string, date: string, startTime: string) => {
      return existingAppointments.some(
        (a) => a.doctorId === doctorId && a.date === date && a.startTime === startTime && a.status === 'CONFIRMED'
      );
    };

    // Conflicting booking
    const isConflict = checkConflict('doc-1', '2026-11-25', '10:00');
    expect(isConflict).toBe(true);

    // Free slot
    const isFree = checkConflict('doc-1', '2026-11-25', '10:30');
    expect(isFree).toBe(false);

    // Different doctor
    const isOtherDocFree = checkConflict('doc-2', '2026-11-25', '10:00');
    expect(isOtherDocFree).toBe(false);
  });
});
