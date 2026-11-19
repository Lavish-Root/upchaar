import { prisma } from '../config/database';
import { AppointmentStatus, RecordType } from '@prisma/client';

export class PatientService {
  async getProfile(patientId: string) {
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

    if (!patient) {
      throw new Error('Patient record not found.');
    }
    return patient;
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
    });
  }

  async getAppointments(patientId: string, type?: 'upcoming' | 'past' | 'all') {
    const now = new Date();
    const whereClause: any = { patientId };

    if (type === 'upcoming') {
      whereClause.appointmentDate = { gte: now };
      whereClause.status = { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS] };
    } else if (type === 'past') {
      whereClause.OR = [
        { appointmentDate: { lt: now } },
        { status: { in: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED] } },
      ];
    }

    return prisma.appointment.findMany({
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
  }

  async getMedicalRecords(patientId: string) {
    return prisma.medicalRecord.findMany({
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
    return prisma.medicalRecord.create({
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
  }

  async getPrescriptions(patientId: string) {
    return prisma.prescription.findMany({
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
  }

  async getHealthOverview(patientId: string) {
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
  }
}

export const patientService = new PatientService();
