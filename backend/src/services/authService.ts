import { prisma } from '../config/database';
import { hashPassword, comparePassword } from '../utils/security';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { Role, VerificationStatus } from '@prisma/client';

export class AuthService {
  async registerPatient(data: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    dob?: string;
    gender?: any;
    address?: string;
    bloodGroup?: string;
    emergencyContact?: string;
    allergies?: string;
    chronicConditions?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: Role.PATIENT,
          fullName: data.fullName,
          phone: data.phone,
        },
      });

      const newPatient = await tx.patient.create({
        data: {
          userId: newUser.id,
          dob: data.dob ? new Date(data.dob) : null,
          gender: data.gender,
          address: data.address,
          bloodGroup: data.bloodGroup,
          emergencyContact: data.emergencyContact,
          allergies: data.allergies,
          chronicConditions: data.chronicConditions,
        },
      });

      if (data.allergies) {
        const allergenNames = data.allergies.split(',').map((s) => s.trim());
        for (const allergen of allergenNames) {
          if (allergen) {
            await tx.medicationAllergy.create({
              data: {
                patientId: newPatient.id,
                allergenName: allergen,
                reactionSeverity: 'MODERATE',
                reactionDetails: 'Patient self-reported allergy during registration',
              },
            });
          }
        }
      }

      return { ...newUser, patient: newPatient };
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      patientId: user.patient.id,
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      patientId: user.patient.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        patientId: user.patient.id,
      },
      accessToken,
      refreshToken,
    };
  }

  async registerAdmin(data: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    adminSecretKey?: string;
  }) {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: Role.ADMIN,
        fullName: data.fullName,
        phone: data.phone,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      },
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Record Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'ADMIN_SIGNUP',
        entityType: 'USER',
        entityId: user.id,
        details: `Superadmin account registered via pran_admin portal: ${user.email}`,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  }

  async registerDoctor(data: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    registrationNumber: string;
    qualifications: string;
    experienceYears: number;
    clinicAddress: string;
    consultationFee: number;
    specialtyId: string;
    bio?: string;
    documentUrl?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const existingReg = await prisma.doctor.findUnique({
      where: { registrationNumber: data.registrationNumber },
    });
    if (existingReg) {
      throw new Error('A doctor with this medical council registration number is already registered.');
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: Role.DOCTOR,
          fullName: data.fullName,
          phone: data.phone,
        },
      });

      const newDoctor = await tx.doctor.create({
        data: {
          userId: newUser.id,
          registrationNumber: data.registrationNumber,
          qualifications: data.qualifications,
          experienceYears: data.experienceYears,
          clinicAddress: data.clinicAddress,
          consultationFee: data.consultationFee,
          bio: data.bio,
          verificationStatus: VerificationStatus.PENDING, // Strictly pending until admin approval
        },
      });

      // Resolve specialty by ID or slug, or fallback to first available
      let targetSpecialtyId = data.specialtyId;
      const foundSpecialty = await tx.specialty.findFirst({
        where: {
          OR: [
            { id: data.specialtyId },
            { slug: data.specialtyId },
            { name: { equals: data.specialtyId, mode: 'insensitive' } },
          ],
        },
      }) || await tx.specialty.findFirst();

      if (foundSpecialty) {
        targetSpecialtyId = foundSpecialty.id;
      }

      await tx.doctorSpecialty.create({
        data: {
          doctorId: newDoctor.id,
          specialtyId: targetSpecialtyId,
          isPrimary: true,
        },
      });

      if (data.documentUrl) {
        await tx.doctorDocument.create({
          data: {
            doctorId: newDoctor.id,
            documentType: 'STATE_REGISTRATION_CERTIFICATE',
            documentUrl: data.documentUrl,
            verificationStatus: VerificationStatus.PENDING,
          },
        });
      }

      // Default availability Monday - Friday 09:00 - 17:00
      for (let day = 1; day <= 5; day++) {
        await tx.doctorAvailability.create({
          data: {
            doctorId: newDoctor.id,
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '17:00',
            slotDurationMinutes: 30,
            isAvailable: true,
          },
        });
      }

      return { ...newUser, doctor: newDoctor };
    });

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      doctorId: user.doctor.id,
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      doctorId: user.doctor.id,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        doctorId: user.doctor.id,
        verificationStatus: user.doctor.verificationStatus,
      },
      accessToken,
      refreshToken,
      message: 'Doctor account registered. Credentials are submitted for administrative verification.',
    };
  }

  async login(email: string, password: string, expectedRole?: Role) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        doctor: {
          include: {
            specialties: { include: { specialty: true } },
          },
        },
        patient: true,
      },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid email or password.');
    }

    if (expectedRole && user.role !== expectedRole) {
      throw new Error(`This login portal is for ${expectedRole.toLowerCase()}s. Your account is registered as ${user.role.toLowerCase()}.`);
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      doctorId: user.doctor?.id,
      patientId: user.patient?.id,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        doctorId: user.doctor?.id,
        doctorVerificationStatus: user.doctor?.verificationStatus,
        patientId: user.patient?.id,
        specialties: user.doctor?.specialties?.map((s) => s.specialty.name),
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string) {
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { doctor: true, patient: true },
    });

    if (!user || !user.isActive) {
      throw new Error('Account is inactive or does not exist.');
    }

    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      doctorId: user.doctor?.id,
      patientId: user.patient?.id,
    });

    return { accessToken: newAccessToken };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        patient: true,
        doctor: {
          include: {
            specialties: { include: { specialty: true } },
            documents: true,
            availability: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    return user;
  }
}

export const authService = new AuthService();
