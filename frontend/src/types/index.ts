export type Role = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ConsultationType = 'IN_PERSON' | 'VIDEO' | 'AUDIO';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type RecordType = 'LAB_REPORT' | 'PRESCRIPTION' | 'SCAN' | 'DISCHARGE_SUMMARY' | 'OTHER';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  doctorId?: string;
  doctorVerificationStatus?: VerificationStatus;
  patientId?: string;
  specialties?: string[];
}

export interface Patient {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
  dob?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
  allergies?: string;
  chronicConditions?: string;
  medicationAllergies?: Array<{
    id: string;
    allergenName: string;
    reactionSeverity: string;
    reactionDetails?: string;
  }>;
}

export interface Specialty {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface Doctor {
  id: string;
  userId: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
  registrationNumber: string;
  qualifications: string;
  experienceYears: number;
  clinicAddress: string;
  consultationFee: number;
  verificationStatus: VerificationStatus;
  rejectionReason?: string;
  bio?: string;
  rating: number;
  reviewCount: number;
  specialties?: Array<{
    isPrimary: boolean;
    specialty: Specialty;
  }>;
  availability?: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    isAvailable: boolean;
  }>;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  consultationType: ConsultationType;
  status: AppointmentStatus;
  cancellationReason?: string;
  reasonForVisit: string;
  consultationFee: number;
  paymentStatus: PaymentStatus;
  patient: {
    id: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      phone?: string;
      avatarUrl?: string;
    };
  };
  doctor: {
    id: string;
    consultationFee: number;
    clinicAddress: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      phone?: string;
      avatarUrl?: string;
    };
    specialties?: Array<{
      specialty: Specialty;
    }>;
  };
  consultation?: {
    id: string;
    meetingRoomId: string;
    status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
  };
  prescription?: {
    id: string;
  };
}

export interface PrescriptionItem {
  id?: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  clinicalNotes?: string;
  advice?: string;
  followUpDate?: string;
  status: 'DRAFT' | 'APPROVED' | 'CANCELLED';
  approvedAt?: string;
  createdAt: string;
  doctor: {
    registrationNumber?: string;
    user: {
      fullName: string;
      email: string;
    };
    specialties?: Array<{ specialty: Specialty }>;
  };
  patient?: {
    user: {
      fullName: string;
      email: string;
      phone?: string;
    };
  };
  items: PrescriptionItem[];
  approvals?: Array<{
    signatureVerification: string;
    approvedAt: string;
    auditNotes?: string;
  }>;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  title: string;
  recordType: RecordType;
  fileUrl: string;
  notes?: string;
  recordDate: string;
  doctor?: {
    user: {
      fullName: string;
    };
  };
}

export interface HomeRemedyCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  _count?: {
    remedies: number;
  };
}

export interface HomeRemedy {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  symptomsTargeted: string;
  naturalIngredients: string;
  preparationInstructions: string;
  safetyPrecautions: string;
  contraindications: string;
  ageWarnings: string;
  pregnancyWarnings: string;
  allergyWarnings: string;
  whenToSeekDoctor: string;
  isClinicallyReviewed: boolean;
  category?: HomeRemedyCategory;
}

export interface ConsultationMessage {
  id: string;
  consultationId: string;
  senderId: string;
  senderRole: Role;
  senderName?: string;
  message: string;
  attachmentUrl?: string;
  createdAt: string;
}

export interface Consultation {
  id: string;
  appointmentId: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED';
  startedAt?: string;
  endedAt?: string;
  doctorNotes?: string;
  meetingRoomId: string;
  appointment: Appointment;
  messages: ConsultationMessage[];
}
