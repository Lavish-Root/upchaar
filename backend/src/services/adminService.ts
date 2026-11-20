import { prisma } from '../config/database';
import { AppointmentStatus, NotificationType, Role, VerificationStatus } from '@prisma/client';

export class AdminService {
  async getDashboardAnalytics() {
    const [
      totalPatients,
      totalDoctors,
      pendingVerifications,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      revenueResult,
      specialtyDistribution,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.patient.count(),
      prisma.doctor.count(),
      prisma.doctor.count({ where: { verificationStatus: VerificationStatus.PENDING } }),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: AppointmentStatus.COMPLETED } }),
      prisma.appointment.count({ where: { status: AppointmentStatus.CANCELLED } }),
      prisma.appointment.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { consultationFee: true },
      }),
      prisma.specialty.findMany({
        include: {
          _count: { select: { doctors: true } },
        },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, role: true, email: true } },
        },
      }),
    ]);

    const totalRevenue = revenueResult._sum.consultationFee || 0;

    return {
      stats: {
        totalPatients,
        totalDoctors,
        pendingVerifications,
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        totalRevenue,
      },
      specialtyDistribution: specialtyDistribution.map((s) => ({
        name: s.name,
        doctorCount: s._count.doctors,
      })),
      recentAuditLogs,
    };
  }

  async getDoctors(filters?: { status?: VerificationStatus; search?: string }) {
    const where: any = {};
    if (filters?.status) {
      where.verificationStatus = filters.status;
    }
    if (filters?.search) {
      where.OR = [
        { user: { fullName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { registrationNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.doctor.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true, createdAt: true } },
        specialties: { include: { specialty: true } },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDoctorVerification(doctorId: string, status: VerificationStatus, rejectionReason?: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctor) throw new Error('Doctor record not found.');

    const updated = await prisma.doctor.update({
      where: { id: doctorId },
      data: {
        verificationStatus: status,
        rejectionReason: status === VerificationStatus.REJECTED ? rejectionReason : null,
      },
    });

    // Notify doctor
    await prisma.notification.create({
      data: {
        userId: doctor.userId,
        title: status === VerificationStatus.APPROVED ? 'Credentials Verified & Approved' : 'Verification Status Update',
        message:
          status === VerificationStatus.APPROVED
            ? 'Congratulations! Your medical credentials have been verified by the administrator. You are now active and can accept patient appointments.'
            : `Your medical verification application was rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
        type: NotificationType.SYSTEM,
      },
    });

    return updated;
  }

  async getPatients(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    return prisma.patient.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true, createdAt: true } },
        _count: {
          select: {
            appointments: true,
            medicalRecords: true,
            prescriptions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleUserActiveStatus(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    if (user.role === Role.ADMIN) {
      throw new Error('Administrative accounts cannot be suspended directly.');
    }

    return prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });
  }

  async getAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, email: true, role: true } },
        },
      }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Specialty Management
  async createSpecialty(data: { name: string; slug: string; description?: string; icon?: string }) {
    return prisma.specialty.create({ data });
  }

  async getSpecialties() {
    return prisma.specialty.findMany({
      include: {
        _count: { select: { doctors: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}

export const adminService = new AdminService();
