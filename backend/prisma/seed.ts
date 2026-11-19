import { PrismaClient, Role, Gender, VerificationStatus, ConsultationType, AppointmentStatus, PaymentStatus, RecordType, PrescriptionStatus, ConsultationStatus, AllergySeverity, InteractionSeverity, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PraanSewa database...');

  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // 1. Clean existing data in reverse order of dependencies
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aIMessage.deleteMany();
  await prisma.aIConversation.deleteMany();
  await prisma.homeRemedyFeedback.deleteMany();
  await prisma.homeRemedyRecommendation.deleteMany();
  await prisma.homeRemedy.deleteMany();
  await prisma.homeRemedyCategory.deleteMany();
  await prisma.medicationInteraction.deleteMany();
  await prisma.medicationAllergy.deleteMany();
  await prisma.medicationReference.deleteMany();
  await prisma.medication.deleteMany();
  await prisma.prescriptionApproval.deleteMany();
  await prisma.aIPrescriptionSuggestion.deleteMany();
  await prisma.aIPrescriptionDraft.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.consultationMessage.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.appointmentSlot.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.doctorSpecialty.deleteMany();
  await prisma.doctorDocument.deleteMany();
  await prisma.review.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.specialty.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Admin User
  const admin = await prisma.user.create({
    data: {
      email: 'admin@praansewa.health',
      passwordHash,
      role: Role.ADMIN,
      fullName: 'System Administrator',
      phone: '+91 98765 00000',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    },
  });

  // 3. Seed Medical Specialties
  const specialtiesData = [
    { name: 'Cardiology', slug: 'cardiology', description: 'Heart, blood vessels, and cardiovascular health', icon: 'HeartPulse' },
    { name: 'Dermatology', slug: 'dermatology', description: 'Skin, hair, nails, and cutaneous disorders', icon: 'Sparkles' },
    { name: 'General Medicine', slug: 'general-medicine', description: 'Comprehensive primary care, acute and chronic illness', icon: 'Stethoscope' },
    { name: 'Pediatrics', slug: 'pediatrics', description: 'Infant, child, and adolescent healthcare', icon: 'Baby' },
    { name: 'Orthopedics', slug: 'orthopedics', description: 'Bones, joints, ligaments, tendons, and muscles', icon: 'Activity' },
    { name: 'Neurology', slug: 'neurology', description: 'Brain, spinal cord, nerves, and neurological conditions', icon: 'Brain' },
    { name: 'ENT (Otolaryngology)', slug: 'ent', description: 'Ear, nose, throat, head and neck disorders', icon: 'Ear' },
  ];

  const specialtiesMap = new Map();
  for (const s of specialtiesData) {
    const created = await prisma.specialty.create({ data: s });
    specialtiesMap.set(s.slug, created);
  }

  // 4. Seed Doctors
  const doctorsData = [
    {
      email: 'dr.sharma@praansewa.health',
      fullName: 'Dr. Rajesh Sharma',
      phone: '+91 98111 22334',
      avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
      registrationNumber: 'MC-DEL-2010-4491',
      qualifications: 'MBBS, MD (Cardiology) - AIIMS New Delhi, FACC',
      experienceYears: 14,
      clinicAddress: 'Dept. of Cardiology, AIIMS New Delhi (Central Govt. Premier Hospital)',
      consultationFee: 0,
      bio: 'Senior Government Medical Officer & Consultant Cardiologist at AIIMS. Dedicated to free public healthcare, emergency cardiac triage, hypertension management, and preventative cardiology.',
      rating: 4.9,
      reviewCount: 128,
      specialtySlug: 'cardiology',
      verificationStatus: VerificationStatus.APPROVED,
    },
    {
      email: 'dr.patel@praansewa.health',
      fullName: 'Dr. Priya Patel',
      phone: '+91 98222 33445',
      avatarUrl: 'https://images.unsplash.com/photo-1594824813612-421736b0fa39?auto=format&fit=crop&w=300&q=80',
      registrationNumber: 'MC-GUJ-2015-8821',
      qualifications: 'MBBS, MD (Dermatology, Venereology & Leprosy) - CMC Vellore',
      experienceYears: 9,
      clinicAddress: 'Civil Hospital & Govt. Medical College, Asarwa, Ahmedabad',
      consultationFee: 0,
      bio: 'Government Hospital Specialist in clinical dermatology, infectious skin lesions, pediatric dermatology, and public skin health initiatives. 100% Free Consultations.',
      rating: 4.8,
      reviewCount: 94,
      specialtySlug: 'dermatology',
      verificationStatus: VerificationStatus.APPROVED,
    },
    {
      email: 'dr.reddy@praansewa.health',
      fullName: 'Dr. Vikram Reddy',
      phone: '+91 98333 44556',
      avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80',
      registrationNumber: 'MC-TEL-2012-3329',
      qualifications: 'MBBS, DNB (Internal Medicine), Fellowship in Diabetology',
      experienceYears: 12,
      clinicAddress: 'Osmania General Hospital (Government of Telangana), Afzal Gunj, Hyderabad',
      consultationFee: 0,
      bio: 'Chief Medical Officer (Internal Medicine) providing free diagnostic triage, diabetic care, vector-borne fever management, and chronic disease protocols.',
      rating: 4.9,
      reviewCount: 210,
      specialtySlug: 'general-medicine',
      verificationStatus: VerificationStatus.APPROVED,
    },
    {
      email: 'dr.mukherjee@praansewa.health',
      fullName: 'Dr. Ananya Mukherjee',
      phone: '+91 98444 55667',
      avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=300&q=80',
      registrationNumber: 'MC-WB-2016-1049',
      qualifications: 'MBBS, MD (Pediatrics) - Kolkata Medical College',
      experienceYears: 8,
      clinicAddress: 'Medical College & Hospital (Govt. of West Bengal), College Street, Kolkata',
      consultationFee: 0,
      bio: 'Pediatric Specialist at Kolkata Govt. Medical College focusing on neonatal wellbeing, child nutrition programs, seasonal infections, and developmental tracking for all children free of cost.',
      rating: 5.0,
      reviewCount: 86,
      specialtySlug: 'pediatrics',
      verificationStatus: VerificationStatus.APPROVED,
    },
    {
      email: 'dr.verma@praansewa.health',
      fullName: 'Dr. Amit Verma',
      phone: '+91 98555 66778',
      avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=300&q=80',
      registrationNumber: 'MC-MAH-2009-7712',
      qualifications: 'MBBS, MS (Orthopedics) - KEM Hospital Mumbai, MCh Ortho',
      experienceYears: 15,
      clinicAddress: 'Grant Govt. Medical College & Sir JJ Group of Hospitals, Byculla, Mumbai',
      consultationFee: 0,
      bio: 'Senior Orthopedic Surgeon & Trauma Specialist at Sir JJ Govt. Hospital. Expert in emergency trauma triage, joint care, and physical rehabilitation under Government Healthcare.',
      rating: 4.7,
      reviewCount: 142,
      specialtySlug: 'orthopedics',
      verificationStatus: VerificationStatus.APPROVED,
    },
    {
      email: 'dr.kulkarni@praansewa.health',
      fullName: 'Dr. Sunita Kulkarni',
      phone: '+91 98666 77889',
      avatarUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=300&q=80',
      registrationNumber: 'MC-KAR-2013-5590',
      qualifications: 'MBBS, DM (Neurology) - NIMHANS Bengaluru',
      experienceYears: 11,
      clinicAddress: 'National Institute of Mental Health & Neurosciences (NIMHANS, Govt. Institute), Bengaluru',
      consultationFee: 0,
      bio: 'Govt. Neurosciences Institute Specialist in migraine triage, stroke early warning signs, epilepsy, and neurological disorders. Providing free clinical consultations.',
      rating: 4.9,
      reviewCount: 115,
      specialtySlug: 'neurology',
      verificationStatus: VerificationStatus.APPROVED,
    },
    {
      email: 'dr.mehra@praansewa.health',
      fullName: 'Dr. Karan Mehra',
      phone: '+91 98777 88990',
      avatarUrl: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=300&q=80',
      registrationNumber: 'MC-UP-2022-9901',
      qualifications: 'MBBS, MS (ENT) - King George Medical University, Lucknow',
      experienceYears: 4,
      clinicAddress: 'King George Medical University (Govt. Medical Hospital), Chowk, Lucknow',
      consultationFee: 0,
      bio: 'Government Resident ENT Surgeon specializing in throat, nasal obstruction, and auditory infections. Free public clinical services.',
      rating: 5.0,
      reviewCount: 12,
      specialtySlug: 'ent',
      verificationStatus: VerificationStatus.PENDING, // For testing admin verification!
    },
  ];

  const createdDoctors = [];
  for (const d of doctorsData) {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        passwordHash,
        role: Role.DOCTOR,
        fullName: d.fullName,
        phone: d.phone,
        avatarUrl: d.avatarUrl,
      },
    });

    const doc = await prisma.doctor.create({
      data: {
        userId: user.id,
        registrationNumber: d.registrationNumber,
        qualifications: d.qualifications,
        experienceYears: d.experienceYears,
        clinicAddress: d.clinicAddress,
        consultationFee: d.consultationFee,
        bio: d.bio,
        rating: d.rating,
        reviewCount: d.reviewCount,
        verificationStatus: d.verificationStatus,
      },
    });

    const specialty = specialtiesMap.get(d.specialtySlug);
    if (specialty) {
      await prisma.doctorSpecialty.create({
        data: {
          doctorId: doc.id,
          specialtyId: specialty.id,
          isPrimary: true,
        },
      });
    }

    // Add verification documents
    await prisma.doctorDocument.create({
      data: {
        doctorId: doc.id,
        documentType: 'STATE_MEDICAL_COUNCIL_REGISTRATION',
        documentUrl: 'https://praansewa.health/sample-docs/medical-reg.pdf',
        verificationStatus: d.verificationStatus,
      },
    });

    // Add availability (Mon - Fri, 09:00 - 17:00)
    for (let day = 1; day <= 5; day++) {
      await prisma.doctorAvailability.create({
        data: {
          doctorId: doc.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMinutes: 30,
          isAvailable: true,
        },
      });
    }

    createdDoctors.push({ ...doc, user });
  }

  // 5. Seed Patients
  const patientsData = [
    {
      email: 'aarav.kumar@example.com',
      fullName: 'Aarav Kumar',
      phone: '+91 99001 11223',
      dob: new Date('1990-05-14'),
      gender: Gender.MALE,
      bloodGroup: 'O+',
      address: 'B-402 Green Park, New Delhi',
      emergencyContact: '+91 99001 11224 (Wife - Sunita)',
      allergies: 'Penicillin',
      chronicConditions: 'Mild Hypertension',
    },
    {
      email: 'sneha.nair@example.com',
      fullName: 'Sneha Nair',
      phone: '+91 99002 22334',
      dob: new Date('1995-08-22'),
      gender: Gender.FEMALE,
      bloodGroup: 'A+',
      address: 'Panampilly Nagar, Kochi, Kerala',
      emergencyContact: '+91 99002 22335 (Brother - Rahul)',
      allergies: 'Amoxicillin, Sulfa drugs',
      chronicConditions: 'Bronchial Asthma',
    },
    {
      email: 'rohan.joshi@example.com',
      fullName: 'Rohan Joshi',
      phone: '+91 99003 33445',
      dob: new Date('1988-12-03'),
      gender: Gender.MALE,
      bloodGroup: 'B+',
      address: 'Kothrud, Pune, Maharashtra',
      emergencyContact: '+91 99003 33446 (Father - Prakash)',
      allergies: 'None',
      chronicConditions: 'Type 2 Diabetes Mellitus',
    },
    {
      email: 'pooja.singh@example.com',
      fullName: 'Pooja Singh',
      phone: '+91 99004 44556',
      dob: new Date('1997-03-19'),
      gender: Gender.FEMALE,
      bloodGroup: 'AB+',
      address: 'Hazratganj, Lucknow, Uttar Pradesh',
      emergencyContact: '+91 99004 44557 (Mother - Sunita)',
      allergies: 'Dust mites, Pollen',
      chronicConditions: 'Migraine',
    },
    {
      email: 'rahul.verma@example.com',
      fullName: 'Rahul Verma',
      phone: '+91 99005 55667',
      dob: new Date('1984-11-28'),
      gender: Gender.MALE,
      bloodGroup: 'O-',
      address: 'Vaishali Nagar, Jaipur, Rajasthan',
      emergencyContact: '+91 99005 55668 (Spouse - Anita)',
      allergies: 'NSAIDs (Aspirin)',
      chronicConditions: 'Acid Reflux / GERD',
    },
    {
      email: 'meera.iyer@example.com',
      fullName: 'Meera Iyer',
      phone: '+91 99006 66778',
      dob: new Date('1992-07-09'),
      gender: Gender.FEMALE,
      bloodGroup: 'B-',
      address: 'Mylapore, Chennai, Tamil Nadu',
      emergencyContact: '+91 99006 66779 (Husband - Karthik)',
      allergies: 'Peanuts',
      chronicConditions: 'Hypothyroidism',
    },
    {
      email: 'arjun.kapoor@example.com',
      fullName: 'Arjun Kapoor',
      phone: '+91 99007 77889',
      dob: new Date('1986-04-15'),
      gender: Gender.MALE,
      bloodGroup: 'A-',
      address: 'HSR Layout Sector 1, Bengaluru, Karnataka',
      emergencyContact: '+91 99007 77890 (Sister - Riya)',
      allergies: 'None',
      chronicConditions: 'Dyslipidemia',
    },
    {
      email: 'neha.gupta@example.com',
      fullName: 'Neha Gupta',
      phone: '+91 99008 88990',
      dob: new Date('1999-01-30'),
      gender: Gender.FEMALE,
      bloodGroup: 'O+',
      address: 'New Town, Kolkata, West Bengal',
      emergencyContact: '+91 99008 88991 (Mother - Rashmi)',
      allergies: 'None',
      chronicConditions: 'None',
    },
    {
      email: 'aditya.rao@example.com',
      fullName: 'Aditya Rao',
      phone: '+91 99009 99001',
      dob: new Date('1993-09-17'),
      gender: Gender.MALE,
      bloodGroup: 'AB-',
      address: 'Gachibowli, Hyderabad, Telangana',
      emergencyContact: '+91 99009 99002 (Brother - Vivek)',
      allergies: 'Ciprofloxacin',
      chronicConditions: 'None',
    },
    {
      email: 'kavita.sharma@example.com',
      fullName: 'Kavita Sharma',
      phone: '+91 99010 00112',
      dob: new Date('1975-06-25'),
      gender: Gender.FEMALE,
      bloodGroup: 'A+',
      address: 'Sector 35-C, Chandigarh',
      emergencyContact: '+91 99010 00113 (Son - Aman)',
      allergies: 'Codeine',
      chronicConditions: 'Osteoarthritis, Hypertension',
    },
  ];

  const createdPatients = [];
  for (const p of patientsData) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash,
        role: Role.PATIENT,
        fullName: p.fullName,
        phone: p.phone,
      },
    });

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        dob: p.dob,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        address: p.address,
        emergencyContact: p.emergencyContact,
        allergies: p.allergies,
        chronicConditions: p.chronicConditions,
      },
    });

    if (p.allergies && p.allergies !== 'None') {
      const allergyList = p.allergies.split(',').map((s) => s.trim());
      for (const allergen of allergyList) {
        await prisma.medicationAllergy.create({
          data: {
            patientId: patient.id,
            allergenName: allergen,
            reactionSeverity: AllergySeverity.SEVERE,
            reactionDetails: `Documented clinical allergy to ${allergen}`,
          },
        });
      }
    }

    createdPatients.push({ ...patient, user });
  }

  // 6. Seed Medication References & Interactions
  const meds = [
    {
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      drugClass: 'Antipyretic / Analgesic',
      standardDosages: '500mg - 650mg every 4 to 6 hours as needed. Maximum 4000mg/24hr.',
      contraindications: 'Severe active liver disease, acute hepatic failure.',
      commonInteractions: 'Warfarin (prolonged high doses may increase INR), Isoniazid.',
      sideEffects: 'Nausea, allergic skin reaction, elevated liver enzymes in overdose.',
      pregnancyCategory: 'Category B (Generally considered safe when used as directed)',
    },
    {
      name: 'Amoxicillin',
      genericName: 'Amoxicillin Trihydrate',
      drugClass: 'Beta-lactam Antibiotic (Penicillin class)',
      standardDosages: '500mg orally every 8 hours, or 875mg every 12 hours for 5 to 7 days.',
      contraindications: 'History of severe penicillin allergy, infectious mononucleosis.',
      commonInteractions: 'Methotrexate, Oral Contraceptives, Allopurinol (rash risk).',
      sideEffects: 'Diarrhea, nausea, cutaneous maculopapular rash.',
      pregnancyCategory: 'Category B',
    },
    {
      name: 'Atorvastatin',
      genericName: 'Atorvastatin Calcium',
      drugClass: 'HMG-CoA Reductase Inhibitor (Statin)',
      standardDosages: '10mg - 40mg once daily at bedtime.',
      contraindications: 'Active liver disease, pregnancy, breastfeeding.',
      commonInteractions: 'Clarithromycin, Ketoconazole, Grapefruit juice, Gemfibrozil.',
      sideEffects: 'Myalgia, headache, mild elevation in transaminases.',
      pregnancyCategory: 'Category X (Contraindicated in pregnancy)',
    },
    {
      name: 'Metformin',
      genericName: 'Metformin Hydrochloride',
      drugClass: 'Biguanide Antidiabetic',
      standardDosages: '500mg twice daily with meals, titrating up to 2000mg daily.',
      contraindications: 'Severe renal impairment (eGFR < 30 mL/min), metabolic acidosis.',
      commonInteractions: 'Iodinated radiocontrast agents, Cimetidine, excessive alcohol.',
      sideEffects: 'Abdominal bloating, loose stools, metallic taste.',
      pregnancyCategory: 'Category B',
    },
    {
      name: 'Lisinopril',
      genericName: 'Lisinopril',
      drugClass: 'ACE Inhibitor (Antihypertensive)',
      standardDosages: '10mg - 40mg once daily in the morning.',
      contraindications: 'History of ACEI-induced angioedema, pregnancy.',
      commonInteractions: 'Potassium supplements, Spironolactone, NSAIDs (Ibuprofen).',
      sideEffects: 'Dry persistent cough, hyperkalemia, dizziness.',
      pregnancyCategory: 'Category D (Boxed warning for fetal toxicity)',
    },
    {
      name: 'Ibuprofen',
      genericName: 'Ibuprofen',
      drugClass: 'NSAID (Non-steroidal Anti-inflammatory)',
      standardDosages: '400mg every 6 to 8 hours with food. Max 2400mg/day.',
      contraindications: 'Active peptic ulcer, third trimester of pregnancy, severe heart failure.',
      commonInteractions: 'Lisinopril (reduces antihypertensive effect, worsens renal function), Warfarin, Aspirin.',
      sideEffects: 'Dyspepsia, gastric ulceration, edema, renal impairment.',
      pregnancyCategory: 'Category C (Avoid in 3rd trimester - Category D)',
    },
    {
      name: 'Cetirizine',
      genericName: 'Cetirizine Hydrochloride',
      drugClass: 'Second-generation Antihistamine',
      standardDosages: '10mg orally once daily at bedtime.',
      contraindications: 'Hypersensitivity to hydroxyzine/cetirizine, end-stage renal disease.',
      commonInteractions: 'Alcohol and CNS depressants (additive sedation).',
      sideEffects: 'Mild drowsiness, dry mouth, fatigue.',
      pregnancyCategory: 'Category B',
    },
    {
      name: 'Omeprazole',
      genericName: 'Omeprazole',
      drugClass: 'Proton Pump Inhibitor (PPI)',
      standardDosages: '20mg - 40mg once daily before breakfast.',
      contraindications: 'Hypersensitivity to substituted benzimidazoles.',
      commonInteractions: 'Clopidogrel (decreases active metabolite), Clarithromycin, Digoxin.',
      sideEffects: 'Headache, diarrhea, abdominal pain, vitamin B12 deficiency on long-term use.',
      pregnancyCategory: 'Category C',
    },
  ];

  const createdMedsMap = new Map();
  for (const m of meds) {
    const created = await prisma.medicationReference.create({ data: m });
    createdMedsMap.set(m.name, created);
  }

  // Create Drug-Drug interaction: Lisinopril + Ibuprofen
  const lisinopril = createdMedsMap.get('Lisinopril');
  const ibuprofen = createdMedsMap.get('Ibuprofen');
  if (lisinopril && ibuprofen) {
    await prisma.medicationInteraction.create({
      data: {
        drugAId: lisinopril.id,
        drugBId: ibuprofen.id,
        severity: InteractionSeverity.MAJOR,
        description: 'Concurrent NSAID use attenuates antihypertensive effect of Lisinopril and increases acute renal impairment risk.',
        clinicalAction: 'Avoid combination. Consider Paracetamol as safer analgesic alternative, or monitor serum creatinine and BP closely.',
      },
    });
  }

  // 7. Seed Home Remedy Categories & Clinically Reviewed Home Remedies
  const categoriesData = [
    { name: 'Cough and Cold', slug: 'cough-and-cold', description: 'Upper respiratory relief, congestion, and mild cough care', icon: 'Thermometer' },
    { name: 'Mild Sore Throat', slug: 'mild-sore-throat', description: 'Pharyngeal irritation, scratchiness, and swallowing comfort', icon: 'Activity' },
    { name: 'Digestive Discomfort', slug: 'digestive-discomfort', description: 'Bloating, gas, mild indigestion, and stomach soothing', icon: 'Heart' },
    { name: 'Mild Headache', slug: 'mild-headache', description: 'Tension headache, stress reduction, and acupressure relief', icon: 'Brain' },
    { name: 'General Hydration', slug: 'general-hydration', description: 'Electrolyte balance, fluid intake, and dehydration recovery', icon: 'Droplets' },
    { name: 'Minor Skin Irritation', slug: 'minor-skin-irritation', description: 'Dryness, mild eczema flare-ups, sunburn, and itching', icon: 'ShieldCheck' },
    { name: 'Sleep Hygiene', slug: 'sleep-hygiene', description: 'Circadian rhythm support, bedtime relaxation, and sleep quality', icon: 'Moon' },
    { name: 'General Wellness', slug: 'general-wellness', description: 'Holistic vitality, immunity support, and restorative nutrition', icon: 'Sun' },
  ];

  const remedyCatMap = new Map();
  for (const c of categoriesData) {
    const cat = await prisma.homeRemedyCategory.create({ data: c });
    remedyCatMap.set(c.slug, cat);
  }

  const remediesData = [
    {
      categorySlug: 'cough-and-cold',
      title: 'Warm Honey Ginger Lemon Decoction',
      summary: 'Soothing natural concoction backed by clinical trials to calm nocturnal cough reflex and reduce upper airway irritation.',
      symptomsTargeted: 'Dry irritating cough, throat tickle, mild chest tightness from common cold',
      naturalIngredients: 'Fresh grated ginger (1 teaspoon), pure organic honey (1 tablespoon), fresh lemon juice (1 teaspoon), warm water (250ml)',
      preparationInstructions: '1. Simmer grated ginger in 250ml water for 5 minutes.\n2. Strain into a cup and let it cool until warm (not boiling).\n3. Stir in honey and fresh lemon juice.\n4. Sip slowly 2 to 3 times daily, especially before bedtime.',
      safetyPrecautions: 'Never administer honey to infants under 12 months due to infant botulism risk. Do not consume boiling liquid to avoid mucosal burns.',
      contraindications: 'Infants < 1 year old, uncontrolled severe diabetes (count carbohydrate load).',
      ageWarnings: 'STRICT WARNING: Do not give honey to infants under 1 year of age.',
      pregnancyWarnings: 'Safe in standard dietary amounts during pregnancy. Avoid mega-doses of concentrated ginger extracts.',
      allergyWarnings: 'Contraindicated in individuals with known bee pollen or honey hypersensitivity.',
      whenToSeekDoctor: 'EMERGENCY FLAGS: Seek immediate medical attention if you experience shortness of breath, coughing up blood, high fever (>102°F) lasting > 3 days, or stridor.',
    },
    {
      categorySlug: 'cough-and-cold',
      title: 'Saline Steam Inhalation with Tulsi',
      summary: 'Gentle humidification of the nasal mucosa to loosen thick mucus secretions and relieve sinus pressure.',
      symptomsTargeted: 'Nasal congestion, blocked sinuses, dry nasal passages',
      naturalIngredients: 'Boiling water (1 liter), 4-5 fresh holy basil (Tulsi) leaves, pinch of salt',
      preparationInstructions: '1. Bring water to a gentle boil in a broad basin.\n2. Add clean Tulsi leaves.\n3. Drape a clean towel over head, keep face 12 inches away from water surface.\n4. Breathe deeply through nose for 7-10 minutes twice daily.',
      safetyPrecautions: 'Keep basin on a stable table. Beware of hot water splash or steam burns, especially around children.',
      contraindications: 'Severe active facial burns, uncooperative young toddlers.',
      ageWarnings: 'Not recommended unattended for children under 8 years due to scalding burn risk.',
      pregnancyWarnings: 'Safe during pregnancy.',
      allergyWarnings: 'None known for pure steam; avoid essential oils if sensitive.',
      whenToSeekDoctor: 'Consult doctor if severe facial swelling, vision changes, or high fever accompanies sinus pain.',
    },
    {
      categorySlug: 'mild-sore-throat',
      title: 'Warm Saline Gargle Protocol',
      summary: 'Hypertonic saline gargle draws out inflammatory edema from the pharyngeal mucosa and washes away irritants.',
      symptomsTargeted: 'Scratchy throat, painful swallowing from pharyngitis, voice hoarseness',
      naturalIngredients: '1/2 teaspoon pure table salt or rock salt, 1 glass warm drinking water (200ml)',
      preparationInstructions: '1. Dissolve 1/2 teaspoon salt completely into comfortably warm water.\n2. Take a mouthful, tilt head back, and gargle for 20-30 seconds.\n3. Spit out completely; do not swallow.\n4. Repeat 3-4 times throughout the day.',
      safetyPrecautions: 'Spit out the solution completely to prevent excess sodium intake. Water must be lukewarm, never hot.',
      contraindications: 'Children unable to spit reliably.',
      ageWarnings: 'Only for individuals capable of gargling and spitting without aspiration (generally age 6+).',
      pregnancyWarnings: 'Completely safe during pregnancy.',
      allergyWarnings: 'No common allergens.',
      whenToSeekDoctor: 'EMERGENCY: Seek prompt medical care if you have difficulty opening your mouth (trismus), drooling, inability to swallow liquids, or severe unilateral throat swelling.',
    },
    {
      categorySlug: 'digestive-discomfort',
      title: 'Ajwain (Carom) & Cumin Warm Water Infusion',
      summary: 'Thymol and volatile oils in ajwain stimulate digestive enzyme secretion and relieve spasmodic intestinal gas.',
      symptomsTargeted: 'Abdominal bloating, post-meal heaviness, flatulence, mild non-ulcer dyspepsia',
      naturalIngredients: '1/2 teaspoon carom seeds (ajwain), 1/2 teaspoon cumin seeds (jeera), 1 glass water (250ml), pinch of black salt (kala namak)',
      preparationInstructions: '1. Lightly crush ajwain and cumin seeds.\n2. Boil in 250ml water for 3 to 4 minutes until water turns light golden.\n3. Strain into a cup, add a pinch of black salt, and drink warm 15 minutes after meals.',
      safetyPrecautions: 'Drink warm, not scalding. Do not exceed 1 teaspoon of carom seeds per day.',
      contraindications: 'Active bleeding peptic ulcer, acute appendicitis symptoms.',
      ageWarnings: 'Safe for children age 4+ in half dosage.',
      pregnancyWarnings: 'Moderate culinary intake is safe. Avoid large concentrated medicinal doses in first trimester.',
      allergyWarnings: 'Avoid if allergic to Apiaceae family plants.',
      whenToSeekDoctor: 'SEEK IMMEDIATE CARE if abdominal pain is acute, sharp, localized to the right lower abdomen, accompanied by recurrent vomiting, black tarry stools, or fever.',
    },
    {
      categorySlug: 'mild-headache',
      title: 'Acupressure & Peppermint Cold Compress',
      summary: 'Topical cooling sensation paired with suboccipital relaxation relieves tension headache muscular constriction.',
      symptomsTargeted: 'Tension headache, forehead tight band sensation, eye fatigue from screens',
      naturalIngredients: 'Cool damp cotton washcloth, 1 drop diluted peppermint oil in carrier oil (optional)',
      preparationInstructions: '1. Dampen a clean washcloth with cold water and wring thoroughly.\n2. Apply across forehead and temples while lying in a dark, quiet room.\n3. Apply gentle circular finger pressure to the LI4 acupressure point (between thumb and index finger) for 2 minutes on each hand.\n4. Practice slow diaphragmatic breathing.',
      safetyPrecautions: 'Keep essential oils strictly away from the eyes.',
      contraindications: 'Open facial wounds or rashes.',
      ageWarnings: 'Do not use peppermint essential oils directly on infants or young children.',
      pregnancyWarnings: 'Avoid deep LI4 acupressure during pregnancy as tradition advises caution; stick to cool compress and rest.',
      allergyWarnings: 'Check skin patch test before applying essential oils.',
      whenToSeekDoctor: 'RED FLAG: Seek emergency care immediately if you experience "worst headache of your life" (thunderclap onset), headache with neck stiffness, numbness, slurred speech, or high fever.',
    },
    {
      categorySlug: 'general-hydration',
      title: 'Homemade Electrolyte Rehydration Solution (WHO formulation)',
      summary: 'Osmolality-balanced glucose-sodium solution to optimize intestinal sodium-glucose cotransport during fluid loss.',
      symptomsTargeted: 'Mild dehydration, fluid loss from warm weather, recovery after mild diarrhea',
      naturalIngredients: '1 liter boiled and cooled clean water, 6 level teaspoons sugar, 1/2 level teaspoon table salt',
      preparationInstructions: '1. Measure exactly 1 liter of safe drinking water.\n2. Dissolve 6 level teaspoons sugar and 1/2 level teaspoon salt completely.\n3. Taste test: it should taste no saltier than tears.\n4. Sip small quantities frequently throughout the day.',
      safetyPrecautions: 'Ensure accurate measurements: excess salt can cause hypernatremia. Use within 24 hours of preparation.',
      contraindications: 'Unconscious patient, persistent intractable vomiting requiring IV fluids.',
      ageWarnings: 'Suitable for all ages under adult supervision.',
      pregnancyWarnings: 'Safe and recommended for mild dehydration during pregnancy.',
      allergyWarnings: 'None.',
      whenToSeekDoctor: 'SEEK URGENT CARE if the patient exhibits sunken eyes, inability to retain liquids for > 12 hours, extreme lethargy, confusion, or absence of urination for 8+ hours.',
    },
    {
      categorySlug: 'minor-skin-irritation',
      title: 'Colloidal Oatmeal & Pure Aloe Vera Soothe',
      summary: 'Avenanthramides in oats provide potent anti-inflammatory, anti-pruritic protection to irritated cutaneous barriers.',
      symptomsTargeted: 'Mild dry eczema itching, mild sunburn, prickly heat, non-infectious hives',
      naturalIngredients: '2 tablespoons finely ground colloidal oat powder, 1 tablespoon pure aloe vera inner leaf gel, cool water',
      preparationInstructions: '1. Mix colloidal oat powder with enough cool water to form a smooth paste.\n2. Gently apply a thin layer over clean, irritated skin.\n3. Leave on for 15 minutes without rubbing.\n4. Rinse gently with cool water and pat dry with a soft cotton towel. Follow with pure aloe vera gel.',
      safetyPrecautions: 'Never apply to open, infected, or weeping wounds.',
      contraindications: 'Known oat or aloe vera allergy, infected cellulitis.',
      ageWarnings: 'Safe for infants and children; conduct patch test first.',
      pregnancyWarnings: 'Topically safe during pregnancy.',
      allergyWarnings: 'Conduct a 15-minute patch test on the inner forearm first.',
      whenToSeekDoctor: 'Seek prompt medical evaluation if skin is warm, spreading red, oozing pus, or accompanied by fever or severe facial swelling.',
    },
    {
      categorySlug: 'sleep-hygiene',
      title: 'Warm Spiced Nutmeg Milk & Circadian Wind-down',
      summary: 'Tryptophan in milk combined with trace myristicin supports melatonin pathway synthesis and nervous system calming.',
      symptomsTargeted: 'Difficulty initiating sleep, mild anxiety at bedtime, restless tossing',
      naturalIngredients: '1 cup warm milk (cow milk or fortified oat/almond milk) (200ml), small pinch of freshly grated nutmeg (less than 1/8 tsp), 1/4 tsp cinnamon',
      preparationInstructions: '1. Warm milk gently in a pan; do not boil aggressively.\n2. Add a tiny pinch of nutmeg and cinnamon.\n3. Turn off screens (phones, TV, laptops) 60 minutes prior.\n4. Sip 30-45 minutes before sleep in a dimly lit, cool room.',
      safetyPrecautions: 'Nutmeg must be used strictly in minuscule pinch amounts. High doses of nutmeg are toxic.',
      contraindications: 'Lactose intolerance (use plant-based milk), active reflux before lying down.',
      ageWarnings: 'Not suitable for infants. For adults and teens.',
      pregnancyWarnings: 'Use plain warm milk during pregnancy; avoid medicinal amounts of nutmeg.',
      allergyWarnings: 'Dairy / nut allergy caution depending on milk choice.',
      whenToSeekDoctor: 'Consult a physician or sleep specialist if chronic insomnia lasts more than 4 weeks or if snoring is accompanied by daytime apnea.',
    },
  ];

  for (const r of remediesData) {
    const cat = remedyCatMap.get(r.categorySlug);
    if (cat) {
      await prisma.homeRemedy.create({
        data: {
          categoryId: cat.id,
          title: r.title,
          summary: r.summary,
          symptomsTargeted: r.symptomsTargeted,
          naturalIngredients: r.naturalIngredients,
          preparationInstructions: r.preparationInstructions,
          safetyPrecautions: r.safetyPrecautions,
          contraindications: r.contraindications,
          ageWarnings: r.ageWarnings,
          pregnancyWarnings: r.pregnancyWarnings,
          allergyWarnings: r.allergyWarnings,
          whenToSeekDoctor: r.whenToSeekDoctor,
          isClinicallyReviewed: true,
          reviewedByDoctorId: createdDoctors[0]?.id,
        },
      });
    }
  }

  // 8. Seed Sample Appointments, Consultations, and Prescriptions
  const doctor1 = createdDoctors[0]; // Dr. Rajesh Sharma (Cardiology)
  const doctor2 = createdDoctors[1]; // Dr. Priya Patel (Dermatology)
  const doctor3 = createdDoctors[2]; // Dr. Vikram Reddy (General Medicine)
  const patient1 = createdPatients[0]; // Aarav Kumar
  const patient2 = createdPatients[1]; // Sneha Nair
  const patient3 = createdPatients[2]; // Rohan Joshi

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Appointment 1: Completed consultation with Dr. Sharma & Aarav Kumar
  const appt1 = await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor1.id,
      appointmentDate: yesterday,
      startTime: '10:00',
      endTime: '10:30',
      consultationType: ConsultationType.VIDEO,
      status: AppointmentStatus.COMPLETED,
      reasonForVisit: 'Routine cardiac follow-up, mild palpitation episodes after exercise',
      paymentStatus: PaymentStatus.COMPLETED,
      consultationFee: doctor1.consultationFee,
    },
  });

  await prisma.payment.create({
    data: {
      appointmentId: appt1.id,
      patientId: patient1.id,
      amount: doctor1.consultationFee,
      currency: 'INR',
      transactionId: 'TXN_DEMO_' + Date.now() + '_1',
      paymentGateway: 'RAZORPAY',
      status: PaymentStatus.COMPLETED,
    },
  });

  const consult1 = await prisma.consultation.create({
    data: {
      appointmentId: appt1.id,
      status: ConsultationStatus.COMPLETED,
      startedAt: yesterday,
      endedAt: new Date(yesterday.getTime() + 25 * 60 * 1000),
      doctorNotes: 'Patient BP is 128/84 mmHg. ECG reveals normal sinus rhythm. Advised to reduce caffeine and continue moderate walking.',
      meetingRoomId: 'room_cardiac_' + appt1.id.slice(0, 8),
    },
  });

  await prisma.consultationMessage.create({
    data: {
      consultationId: consult1.id,
      senderId: doctor1.user.id,
      senderRole: Role.DOCTOR,
      message: 'Hello Aarav, I reviewed your recent lipid profile and ECG. Everything looks stable.',
    },
  });

  await prisma.consultationMessage.create({
    data: {
      consultationId: consult1.id,
      senderId: patient1.user.id,
      senderRole: Role.PATIENT,
      message: 'Thank you Dr. Sharma. Should I continue the same Atorvastatin dose?',
    },
  });

  // Prescription for Appointment 1
  const rx1 = await prisma.prescription.create({
    data: {
      appointmentId: appt1.id,
      patientId: patient1.id,
      doctorId: doctor1.id,
      diagnosis: 'Essential Hypertension (Well Controlled) & Mild Hyperlipidemia',
      clinicalNotes: 'Cardiovascular exam normal. Heart sounds S1, S2 audible, no murmurs.',
      advice: 'Low sodium DASH diet, 30 minutes brisk walking 5 days a week, repeat lipid panel in 6 months.',
      followUpDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000),
      status: PrescriptionStatus.APPROVED,
      approvedAt: yesterday,
    },
  });

  await prisma.prescriptionItem.create({
    data: {
      prescriptionId: rx1.id,
      medicationName: 'Atorvastatin',
      dosage: '10mg',
      frequency: 'Once daily at bedtime',
      duration: '90 days',
      instructions: 'Take after dinner. Report any unusual muscle aches.',
    },
  });

  await prisma.prescriptionApproval.create({
    data: {
      prescriptionId: rx1.id,
      doctorId: doctor1.id,
      signatureVerification: 'VERIFIED_DIGITAL_SIGNATURE_DOC_' + doctor1.id,
      ipAddress: '127.0.0.1',
      auditNotes: 'Prescription reviewed and verified by Dr. Rajesh Sharma',
    },
  });

  // Appointment 2: Upcoming Confirmed Appointment
  const appt2 = await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      doctorId: doctor2.id,
      appointmentDate: tomorrow,
      startTime: '11:00',
      endTime: '11:30',
      consultationType: ConsultationType.VIDEO,
      status: AppointmentStatus.CONFIRMED,
      reasonForVisit: 'Persistent rash on inner forearms with itching for 2 weeks',
      paymentStatus: PaymentStatus.COMPLETED,
      consultationFee: doctor2.consultationFee,
    },
  });

  await prisma.consultation.create({
    data: {
      appointmentId: appt2.id,
      status: ConsultationStatus.SCHEDULED,
      meetingRoomId: 'room_derma_' + appt2.id.slice(0, 8),
    },
  });

  // Appointment 3: Pending Appointment Request for Dr. Reddy
  await prisma.appointment.create({
    data: {
      patientId: patient3.id,
      doctorId: doctor3.id,
      appointmentDate: tomorrow,
      startTime: '14:00',
      endTime: '14:30',
      consultationType: ConsultationType.IN_PERSON,
      status: AppointmentStatus.PENDING,
      reasonForVisit: 'Quarterly HbA1c review and diabetic management plan',
      paymentStatus: PaymentStatus.PENDING,
      consultationFee: doctor3.consultationFee,
    },
  });

  // 9. Seed Medical Records
  await prisma.medicalRecord.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor1.id,
      title: 'Comprehensive Lipid Profile & Liver Function Panel',
      recordType: RecordType.LAB_REPORT,
      fileUrl: 'https://praansewa.health/sample-records/lipid-panel.pdf',
      notes: 'Total Cholesterol 185 mg/dL, HDL 48 mg/dL, LDL 102 mg/dL, Triglycerides 140 mg/dL.',
      recordDate: yesterday,
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: patient2.id,
      title: 'Chest X-Ray PA View - Normal',
      recordType: RecordType.SCAN,
      fileUrl: 'https://praansewa.health/sample-records/chest-xray.pdf',
      notes: 'Lung fields clear, no focal consolidation, cardiothoracic ratio normal.',
      recordDate: new Date('2026-10-15'),
    },
  });

  // 10. Seed Notifications
  await prisma.notification.create({
    data: {
      userId: patient2.user.id,
      title: 'Appointment Confirmed',
      message: `Your video consultation with Dr. Priya Patel is confirmed for tomorrow at 11:00 AM.`,
      type: NotificationType.APPOINTMENT,
      linkUrl: `/patient/appointments`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: doctor3.user.id,
      title: 'New Appointment Request',
      message: `Rohan Joshi requested an in-person consultation for tomorrow at 02:00 PM.`,
      type: NotificationType.APPOINTMENT,
      linkUrl: `/doctor/appointments`,
    },
  });

  // 11. Seed Audit Log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'PLATFORM',
      details: 'PraanSewa database seeded with production baseline data',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('Seeding complete! 1 Admin, 7 Doctors (6 approved, 1 pending), 10 Patients, Specialties, Remedies, Medications, and Appointments created.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
