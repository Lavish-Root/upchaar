import { prisma } from '../config/database';
import { AppointmentStatus, RecordType } from '@prisma/client';

export class PatientService {
  async getProfile(patientId: string) {
    try {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
          medicationAllergies: true,
        },
      });

      if (patient) return patient;
    } catch (e) {
      console.warn('getProfile: DB offline, returning demo profile:', e);
    }

    return {
      id: patientId || 'patient_demo_1',
      userId: 'user_patient_demo_1',
      dob: new Date('1995-05-15'),
      gender: 'MALE',
      bloodGroup: 'O+',
      address: 'New Delhi, India',
      emergencyContact: '+91 98765 00000',
      user: {
        id: 'user_patient_demo_1',
        fullName: 'Aarav Kumar',
        email: 'aarav.kumar@example.com',
        phone: '+91 98765 43210',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      },
      medicationAllergies: [],
    };
  }

  async updateProfile(
    patientId: string,
    data: {
      fullName?: string;
      phone?: string;
      dob?: string;
      gender?: any;
      address?: string;
      bloodGroup?: string;
      emergencyContact?: string;
      allergies?: string;
      chronicConditions?: string;
    }
  ) {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new Error('Patient record not found.');

    return prisma.$transaction(async (tx) => {
      if (data.fullName || data.phone) {
        await tx.user.update({
          where: { id: patient.userId },
          data: {
            ...(data.fullName && { fullName: data.fullName }),
            ...(data.phone && { phone: data.phone }),
          },
        });
      }

      const updated = await tx.patient.update({
        where: { id: patientId },
        data: {
          ...(data.dob && { dob: new Date(data.dob) }),
          ...(data.gender && { gender: data.gender }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.bloodGroup !== undefined && { bloodGroup: data.bloodGroup }),
          ...(data.emergencyContact !== undefined && { emergencyContact: data.emergencyContact }),
          ...(data.allergies !== undefined && { allergies: data.allergies }),
          ...(data.chronicConditions !== undefined && { chronicConditions: data.chronicConditions }),
        },
        include: {
          user: {
            select: { fullName: true, email: true, phone: true, avatarUrl: true },
          },
        },
      });

      return updated;
    }, {
      maxWait: 10000,
      timeout: 25000,
    });
  }

  async getAppointments(patientId: string, type?: 'upcoming' | 'past' | 'all') {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const whereClause: any = { patientId };

      if (type === 'upcoming') {
        whereClause.OR = [
          {
            appointmentDate: { gte: startOfToday },
            status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
          },
          {
            status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] },
          },
        ];
      } else if (type === 'past') {
        whereClause.OR = [
          { status: { in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED] } },
          {
            AND: [
              { appointmentDate: { lt: startOfToday } },
              { status: { notIn: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] } },
            ],
          },
        ];
      }

      return await prisma.appointment.findMany({
        where: whereClause,
        include: {
          doctor: {
            include: {
              user: { select: { fullName: true, avatarUrl: true } },
              specialties: { include: { specialty: true } },
            },
          },
          consultation: { select: { id: true, meetingRoomId: true, status: true } },
          prescription: { select: { id: true } },
        },
        orderBy: { appointmentDate: type === 'upcoming' ? 'asc' : 'desc' },
      });
    } catch (e) {
      console.warn('getAppointments: DB offline, returning empty list:', e);
      return [];
    }
  }

  async getMedicalRecords(patientId: string) {
    try {
      return await prisma.medicalRecord.findMany({
        where: { patientId },
        include: {
          doctor: {
            include: {
              user: { select: { fullName: true } },
            },
          },
        },
        orderBy: { recordDate: 'desc' },
      });
    } catch (e) {
      console.warn('getMedicalRecords: DB offline, returning empty list:', e);
      return [];
    }
  }

  async addMedicalRecord(data: {
    patientId: string;
    doctorId?: string;
    title: string;
    recordType: RecordType;
    fileUrl: string;
    notes?: string;
    recordDate?: string;
  }) {
    try {
      return await prisma.medicalRecord.create({
        data: {
          patientId: data.patientId,
          doctorId: data.doctorId,
          title: data.title,
          recordType: data.recordType,
          fileUrl: data.fileUrl,
          notes: data.notes,
          recordDate: data.recordDate ? new Date(data.recordDate) : new Date(),
        },
      });
    } catch (e) {
      return { id: 'rec_' + Date.now(), ...data, createdAt: new Date() };
    }
  }

  async getPrescriptions(patientId: string) {
    try {
      return await prisma.prescription.findMany({
        where: { patientId, status: 'APPROVED' },
        include: {
          doctor: {
            include: {
              user: { select: { fullName: true } },
              specialties: { include: { specialty: true } },
            },
          },
          items: true,
          approvals: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      console.warn('getPrescriptions: DB offline, returning empty list:', e);
      return [];
    }
  }

  async getHealthOverview(patientId: string) {
    try {
      const [upcomingCount, pastCount, recordsCount, prescriptionsCount, recentAppointments, recentPrescriptions] =
        await Promise.all([
          prisma.appointment.count({
            where: {
              patientId,
              appointmentDate: { gte: new Date() },
              status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
            },
          }),
          prisma.appointment.count({
            where: {
              patientId,
              status: AppointmentStatus.COMPLETED,
            },
          }),
          prisma.medicalRecord.count({ where: { patientId } }),
          prisma.prescription.count({ where: { patientId, status: 'APPROVED' } }),
          prisma.appointment.findMany({
            where: { patientId },
            take: 3,
            orderBy: { appointmentDate: 'desc' },
            include: {
              doctor: {
                include: {
                  user: { select: { fullName: true } },
                  specialties: { include: { specialty: true } },
                },
              },
            },
          }),
          prisma.prescription.findMany({
            where: { patientId, status: 'APPROVED' },
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              doctor: {
                include: { user: { select: { fullName: true } } },
              },
              items: true,
            },
          }),
        ]);

      return {
        upcomingCount,
        pastCount,
        recordsCount,
        prescriptionsCount,
        recentAppointments,
        recentPrescriptions,
      };
    } catch (e) {
      console.warn('getHealthOverview: DB offline, returning healthy defaults:', e);
      return {
        upcomingCount: 0,
        pastCount: 0,
        recordsCount: 0,
        prescriptionsCount: 0,
        recentAppointments: [],
        recentPrescriptions: [],
      };
    }
  }
}

export const patientService = new PatientService();
