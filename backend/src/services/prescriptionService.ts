import { prisma } from '../config/database';
import { AIPrescriptionStatus, NotificationType, PrescriptionStatus } from '@prisma/client';
import { aiService } from '../integrations/aiService';

export class PrescriptionService {
  /**
   * AI-Assisted Prescription Draft Generator
   * Runs allergy check, drug interaction analysis, clinical considerations
   */
  async generateAiDraft(data: {
    doctorId: string;
    patientId: string;
    consultationId?: string;
    symptoms: string;
    clinicalObservations?: string;
    vitalSigns?: any;
  }) {
    // 1. Run AI Clinical Safety Engine
    const draftResult = await aiService.draftPrescription({
      patientId: data.patientId,
      doctorId: data.doctorId,
      symptoms: data.symptoms,
      clinicalObservations: data.clinicalObservations,
      vitalSigns: data.vitalSigns,
    });

    // 2. Persist draft into PostgreSQL AIPrescriptionDraft table
    const draft = await prisma.aIPrescriptionDraft.create({
      data: {
        doctorId: data.doctorId,
        patientId: data.patientId,
        consultationId: data.consultationId,
        clinicalSummary: draftResult.clinicalSummary,
        clinicalConsiderations: draftResult.clinicalConsiderations.join('\n'),
        draftDataJson: JSON.stringify(draftResult.suggestedMedications),
        flagsJson: JSON.stringify(draftResult.safetyFlags),
        status: AIPrescriptionStatus.DRAFT,
      },
    });

    // 3. Persist individual medication suggestions
    for (const item of draftResult.suggestedMedications) {
      await prisma.aIPrescriptionSuggestion.create({
        data: {
          draftId: draft.id,
          medicationName: item.medicationName,
          dosageSuggestion: item.dosageSuggestion,
          frequency: item.frequency,
          duration: item.duration,
          rationale: item.rationale,
          safetyAlertsJson: JSON.stringify(item.safetyAlerts),
        },
      });
    }

    return {
      draftId: draft.id,
      clinicalSummary: draftResult.clinicalSummary,
      clinicalConsiderations: draftResult.clinicalConsiderations,
      suggestedMedications: draftResult.suggestedMedications,
      safetyFlags: draftResult.safetyFlags,
      requiresDoctorApproval: true,
      message: 'AI Draft generated. Doctor clinical review and explicit approval required before issuance.',
    };
  }

  /**
   * Doctor approves & finalizes prescription (with digital signature & audit record)
   * STRICT SAFETY: Only a verified doctor can authorize this.
   */
  async approvePrescriptionDraft(data: {
    draftId: string;
    doctorId: string;
    patientId: string;
    appointmentId?: string;
    diagnosis: string;
    clinicalNotes?: string;
    advice?: string;
    followUpDate?: string;
    finalMedications: Array<{
      medicationName: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
    ipAddress?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Verify doctor status
      const doctor = await tx.doctor.findUnique({
        where: { id: data.doctorId },
        include: { user: { select: { fullName: true } } },
      });

      if (!doctor || doctor.verificationStatus !== 'APPROVED') {
        throw new Error('Only approved, authorized doctors can sign and issue prescriptions.');
      }

      // 2. Mark AI Draft as ACCEPTED
      await tx.aIPrescriptionDraft.update({
        where: { id: data.draftId },
        data: {
          status: AIPrescriptionStatus.ACCEPTED,
          doctorModificationsJson: JSON.stringify(data.finalMedications),
        },
      });

      // 3. Create approved official Prescription
      const prescription = await tx.prescription.create({
        data: {
          doctorId: data.doctorId,
          patientId: data.patientId,
          appointmentId: data.appointmentId,
          diagnosis: data.diagnosis,
          clinicalNotes: data.clinicalNotes,
          advice: data.advice,
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
          status: PrescriptionStatus.APPROVED,
          approvedAt: new Date(),
        },
      });

      // 4. Create prescription items
      for (const item of data.finalMedications) {
        await tx.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            medicationName: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
          },
        });
      }

      // 5. Create immutable digital approval audit record
      const digitalSignature = `SIG_${doctor.id}_${Date.now()}_APPROVED`;
      await tx.prescriptionApproval.create({
        data: {
          prescriptionId: prescription.id,
          doctorId: data.doctorId,
          approvedAt: new Date(),
          signatureVerification: digitalSignature,
          ipAddress: data.ipAddress || '127.0.0.1',
          auditNotes: `Digitally authorized and signed by ${doctor.user.fullName} (Reg: ${doctor.registrationNumber})`,
        },
      });

      // 6. Notify patient
      const patient = await tx.patient.findUnique({
        where: { id: data.patientId },
        select: { userId: true },
      });

      if (patient) {
        await tx.notification.create({
          data: {
            userId: patient.userId,
            title: 'New Prescription Issued',
            message: `Dr. ${doctor.user.fullName} has issued your official digital prescription.`,
            type: NotificationType.PRESCRIPTION,
            linkUrl: `/patient/prescriptions`,
          },
        });
      }

      return prescription;
    }, {
      maxWait: 10000,
      timeout: 25000,
    });
  }

  /**
   * Direct manual prescription creation by doctor
   */
  async createManualPrescription(data: {
    doctorId: string;
    patientId: string;
    appointmentId?: string;
    diagnosis: string;
    clinicalNotes?: string;
    advice?: string;
    followUpDate?: string;
    items: Array<{
      medicationName: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const doctor = await tx.doctor.findUnique({
        where: { id: data.doctorId },
        include: { user: true },
      });
      if (!doctor || doctor.verificationStatus !== 'APPROVED') {
        throw new Error('Only approved, authorized doctors can issue prescriptions.');
      }

      const prescription = await tx.prescription.create({
        data: {
          doctorId: data.doctorId,
          patientId: data.patientId,
          appointmentId: data.appointmentId,
          diagnosis: data.diagnosis,
          clinicalNotes: data.clinicalNotes,
          advice: data.advice,
          followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
          status: PrescriptionStatus.APPROVED,
          approvedAt: new Date(),
        },
      });

      for (const item of data.items) {
        await tx.prescriptionItem.create({
          data: {
            prescriptionId: prescription.id,
            medicationName: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
          },
        });
      }

      await tx.prescriptionApproval.create({
        data: {
          prescriptionId: prescription.id,
          doctorId: data.doctorId,
          signatureVerification: `MANUAL_SIG_${doctor.id}_${Date.now()}`,
          auditNotes: `Direct clinical prescription created and authorized by Dr. ${doctor.user.fullName}`,
        },
      });

      return prescription;
    }, {
      maxWait: 10000,
      timeout: 25000,
    });
  }

  async getPrescriptionById(id: string) {
    const rx = await prisma.prescription.findUnique({
      where: { id },
      include: {
        doctor: {
          include: {
            user: { select: { fullName: true, email: true } },
            specialties: { include: { specialty: true } },
          },
        },
        patient: {
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
          },
        },
        items: true,
        approvals: true,
      },
    });

    if (!rx) throw new Error('Prescription not found.');
    return rx;
  }
}

export const prescriptionService = new PrescriptionService();
