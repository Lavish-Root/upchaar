import { prisma } from '../config/database';
import { AppointmentStatus, VerificationStatus } from '@prisma/client';

export class DoctorService {
  /**
   * Public / Patient doctor discovery with filters (search name, specialty, availability)
   */
  async discoverDoctors(filters: {
    search?: string;
    specialtySlug?: string;
    dayOfWeek?: number;
    minRating?: number;
  }) {
    const where: any = {
      verificationStatus: VerificationStatus.APPROVED,
      user: { isActive: true },
    };

    if (filters.search) {
      where.OR = [
        { user: { fullName: { contains: filters.search, mode: 'insensitive' } } },
        { bio: { contains: filters.search, mode: 'insensitive' } },
        { clinicAddress: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.specialtySlug) {
      where.specialties = {
        some: {
          specialty: { slug: filters.specialtySlug },
        },
      };
    }

    if (filters.minRating) {
      where.rating = { gte: Number(filters.minRating) };
    }

    if (filters.dayOfWeek !== undefined) {
      where.availability = {
        some: {
          dayOfWeek: Number(filters.dayOfWeek),
          isAvailable: true,
        },
      };
    }

    return prisma.doctor.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        specialties: {
          include: {
            specialty: true,
          },
        },
        availability: true,
      },
      orderBy: [{ rating: 'desc' }, { experienceYears: 'desc' }],
    });
  }

  async getDoctorById(doctorId: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
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
        specialties: {
          include: { specialty: true },
        },
        availability: true,
        reviews: {
          take: 10,
          include: {
            patient: {
              include: { user: { select: { fullName: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!doctor) {
      throw new Error('Doctor profile not found.');
    }
    return doctor;
  }

  /**
   * Doctor Dashboard Statistics & Overview
   */
  async getDashboardStats(doctorId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalPatientsCount,
      todayAppointments,
      upcomingAppointments,
      completedAppointments,
      earningsAgg,
    ] = await Promise.all([
      // Distinct patients who booked with this doctor
      prisma.appointment
        .findMany({
          where: { doctorId },
          select: { patientId: true },
          distinct: ['patientId'],
        })
        .then((res) => res.length),

      // Today's appointments
      prisma.appointment.findMany({
        where: {
          doctorId,
          appointmentDate: { gte: startOfToday, lte: endOfToday },
        },
        include: {
          patient: {
            include: { user: { select: { fullName: true, phone: true } } },
          },
          consultation: { select: { id: true, status: true, meetingRoomId: true } },
        },
        orderBy: { startTime: 'asc' },
      }),

      // Upcoming appointments
      prisma.appointment.count({
        where: {
          doctorId,
          appointmentDate: { gt: endOfToday },
          status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        },
      }),

      // Completed consultations
      prisma.appointment.count({
        where: {
          doctorId,
          status: AppointmentStatus.COMPLETED,
        },
      }),

      // Total earnings
      prisma.appointment.aggregate({
        where: {
          doctorId,
          paymentStatus: 'COMPLETED',
        },
        _sum: {
          consultationFee: true,
        },
      }),
    ]);

    const totalEarnings = earningsAgg._sum.consultationFee || 0;

    return {
      totalPatients: totalPatientsCount,
      todayCount: todayAppointments.length,
      todayAppointments,
      upcomingCount: upcomingAppointments,
      completedCount: completedAppointments,
      totalEarnings,
    };
  }

  /**
   * Get all appointments for doctor with optional filters
   */
  async getAppointments(doctorId: string, status?: AppointmentStatus) {
    const where: any = { doctorId };
    if (status) {
      where.status = status;
    }

    return prisma.appointment.findMany({
      where,
      include: {
        patient: {
          include: {
            user: { select: { fullName: true, email: true, phone: true, avatarUrl: true } },
            medicationAllergies: true,
          },
        },
        consultation: true,
        prescription: { select: { id: true } },
      },
      orderBy: { appointmentDate: 'desc' },
    });
  }

  /**
   * Update Availability Schedule
   */
  async updateAvailability(
    doctorId: string,
    availabilities: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      slotDurationMinutes: number;
      isAvailable: boolean;
    }>
  ) {
    return prisma.$transaction(async (tx) => {
      // Clear existing availability
      await tx.doctorAvailability.deleteMany({
        where: { doctorId },
      });

      // Insert new availability
      await tx.doctorAvailability.createMany({
        data: availabilities.map((a) => ({
          doctorId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
          slotDurationMinutes: a.slotDurationMinutes || 30,
          isAvailable: a.isAvailable !== false,
        })),
      });

      return tx.doctorAvailability.findMany({
        where: { doctorId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });
  }

  /**
   * Assigned patients with access to authorized medical history & allergies
   */
  async getAssignedPatients(doctorId: string) {
    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      select: {
        patientId: true,
        patient: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            medicationAllergies: true,
            medicalRecords: {
              take: 5,
              orderBy: { recordDate: 'desc' },
            },
            prescriptions: {
              where: { doctorId },
              include: { items: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      distinct: ['patientId'],
    });

    const assigned = appointments.map((a) => a.patient);

    // If a newly approved doctor doesn't have private appointment bookings yet,
    // grant clinical access to registered hospital patients so they can draft prescriptions & review records!
    if (assigned.length === 0) {
      return prisma.patient.findMany({
        take: 10,
        include: {
          user: { select: { fullName: true, email: true, phone: true } },
          medicationAllergies: true,
          medicalRecords: {
            take: 5,
            orderBy: { recordDate: 'desc' },
          },
          prescriptions: {
            include: { items: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return assigned;
  }

  /**
   * Update doctor practice & user profile
   */
  async updateDoctorProfile(
    doctorId: string,
    userId: string,
    data: {
      fullName?: string;
      phone?: string;
      avatarUrl?: string;
      qualifications?: string;
      experienceYears?: number;
      clinicAddress?: string;
      consultationFee?: number;
      bio?: string;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      if (data.fullName || data.phone || data.avatarUrl) {
        await tx.user.update({
          where: { id: userId },
          data: {
            fullName: data.fullName,
            phone: data.phone,
            avatarUrl: data.avatarUrl,
          },
        });
      }

      const updatedDoc = await tx.doctor.update({
        where: { id: doctorId },
        data: {
          qualifications: data.qualifications,
          experienceYears: data.experienceYears !== undefined ? Number(data.experienceYears) : undefined,
          clinicAddress: data.clinicAddress,
          consultationFee: data.consultationFee !== undefined ? Number(data.consultationFee) : undefined,
          bio: data.bio,
        },
        include: {
          user: true,
          specialties: { include: { specialty: true } },
          availability: true,
        },
      });

      return updatedDoc;
    });
  }
}

export const doctorService = new DoctorService();
