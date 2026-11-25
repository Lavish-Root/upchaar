import { z } from 'zod';

// ================= AUTH VALIDATORS =================
export const registerPatientSchema = z.object({
  fullName: z.string().min(2, 'Full name must have at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Phone number must have at least 10 digits'),
  dob: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  bloodGroup: z.string().optional(),
  emergencyContact: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
});

export const registerDoctorSchema = z.object({
  fullName: z.string().min(2, 'Full name must have at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Phone number must have at least 10 digits'),
  registrationNumber: z.string().min(4, 'Registration number is required'),
  qualifications: z.string().min(2, 'Qualifications are required'),
  experienceYears: z.number().min(0, 'Experience years must be positive').or(z.string().transform((v) => parseInt(v, 10))),
  clinicAddress: z.string().min(5, 'Clinic address is required'),
  consultationFee: z.number().min(0, 'Consultation fee must be non-negative').or(z.string().transform((v) => parseFloat(v))),
  specialtyId: z.string().min(1, 'Primary specialty is required'),
  bio: z.string().optional(),
  documentUrl: z.string().url().optional(),
});

export const registerAdminSchema = z.object({
  fullName: z.string().min(2, 'Full name must have at least 2 characters'),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Phone number must have at least 10 digits'),
  adminSecretKey: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  expectedRole: z.enum(['PATIENT', 'DOCTOR', 'ADMIN']).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ================= APPOINTMENT VALIDATORS =================
export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid('Doctor ID is required'),
  appointmentDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid appointment date (YYYY-MM-DD) is required',
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be HH:MM format'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be HH:MM format'),
  consultationType: z.enum(['IN_PERSON', 'VIDEO', 'AUDIO']).default('IN_PERSON'),
  reasonForVisit: z
    .string()
    .optional()
    .transform((val) => (val && val.trim().length >= 2 ? val.trim() : 'General consultation')),
});

export const rescheduleAppointmentSchema = z.object({
  appointmentDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid appointment date is required',
  }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be HH:MM'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be HH:MM'),
  reason: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'IN_PROGRESS']),
  cancellationReason: z.string().optional(),
});

// ================= DOCTOR AVAILABILITY VALIDATORS =================
export const doctorAvailabilitySchema = z.object({
  availabilities: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      slotDurationMinutes: z.number().int().min(10).max(120).default(30),
      isAvailable: z.boolean().default(true),
    })
  ),
});

// ================= PRESCRIPTION VALIDATORS =================
export const prescriptionItemSchema = z.object({
  medicationName: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
  instructions: z.string().optional(),
});

export const createPrescriptionSchema = z.object({
  appointmentId: z.string().uuid().optional(),
  patientId: z.string().uuid('Patient ID is required'),
  diagnosis: z.string().min(2, 'Diagnosis is required'),
  clinicalNotes: z.string().optional(),
  advice: z.string().optional(),
  followUpDate: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1, 'At least one medication is required'),
});

// ================= AI DRAFT PRESCRIPTION VALIDATORS =================
export const aiPrescriptionDraftSchema = z.object({
  patientId: z.string().uuid('Patient ID is required'),
  consultationId: z.string().uuid().optional(),
  symptoms: z.string().min(3, 'Symptoms are required'),
  clinicalObservations: z.string().optional(),
  allergies: z.string().optional(),
  vitalSigns: z.object({
    bloodPressure: z.string().optional(),
    heartRate: z.string().optional(),
    temperature: z.string().optional(),
    spo2: z.string().optional(),
  }).optional(),
});

export const approvePrescriptionDraftSchema = z.object({
  draftId: z.string().uuid('Draft ID is required'),
  patientId: z.string().uuid('Patient ID is required'),
  appointmentId: z.string().uuid().optional(),
  diagnosis: z.string().min(2, 'Diagnosis is required'),
  clinicalNotes: z.string().optional(),
  advice: z.string().optional(),
  followUpDate: z.string().optional(),
  finalMedications: z.array(prescriptionItemSchema).min(1, 'At least one medication required'),
  doctorSignatureConfirmation: z.literal(true, {
    errorMap: () => ({ message: 'Doctor must explicitly confirm clinical review and authorization' }),
  }),
});

// ================= AI CHAT & VOICE VALIDATORS =================
export const aiChatSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1, 'Message cannot be empty'),
  conversationType: z.enum(['HEALTH_ASSISTANT', 'VOICE_ASSISTANT', 'HOME_REMEDIES']).default('HEALTH_ASSISTANT'),
  language: z.string().optional(),
});

export const aiVoiceTranscribeSchema = z.object({
  audioBase64: z.string().optional(),
  mimeType: z.string().default('audio/wav'),
});

export const aiVoiceSynthesizeSchema = z.object({
  text: z.string().min(1, 'Text to synthesize is required'),
});

// ================= HOME REMEDIES VALIDATORS =================
export const searchHomeRemediesSchema = z.object({
  symptom: z.string().min(1, 'Symptom or query is required'),
  categoryId: z.string().uuid().optional(),
});

export const createHomeRemedySchema = z.object({
  categoryId: z.string().uuid('Category ID is required'),
  title: z.string().min(3, 'Title is required'),
  summary: z.string().min(10, 'Summary is required'),
  symptomsTargeted: z.string().min(3, 'Symptoms targeted is required'),
  naturalIngredients: z.string().min(3, 'Natural ingredients are required'),
  preparationInstructions: z.string().min(10, 'Preparation instructions are required'),
  safetyPrecautions: z.string().min(10, 'Safety precautions are required'),
  contraindications: z.string().min(3, 'Contraindications are required'),
  ageWarnings: z.string().min(3, 'Age warnings are required'),
  pregnancyWarnings: z.string().min(3, 'Pregnancy warnings are required'),
  allergyWarnings: z.string().min(3, 'Allergy warnings are required'),
  whenToSeekDoctor: z.string().min(10, 'When to seek doctor is required'),
  isClinicallyReviewed: z.boolean().default(true),
});

export const homeRemedyFeedbackSchema = z.object({
  remedyId: z.string().uuid('Remedy ID is required'),
  rating: z.number().int().min(1).max(5),
  isHelpful: z.boolean().default(true),
  comments: z.string().optional(),
});

// ================= ADMIN VALIDATORS =================
export const verifyDoctorSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

export const specialtySchema = z.object({
  name: z.string().min(2, 'Specialty name is required'),
  slug: z.string().min(2, 'Slug is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
});
