
import { CaseSeverity, CaseStatus, MedicalCase, PatientProfile, Hospital, Season, HomeRemedy, HealthTip, WellnessActivity } from '../types';

export const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 'H-001',
    name: 'Civil Hospital Ludhiana',
    address: 'Near Old Courts, Ludhiana, Punjab',
    lat: 30.9010,
    lng: 75.8573,
    type: 'HOSPITAL',
    consultationFee: 100
  },
  {
    id: 'H-002',
    name: 'LifeCare Clinic',
    address: 'Model Town, Ludhiana',
    lat: 30.8900,
    lng: 75.8300,
    type: 'CLINIC',
    consultationFee: 500
  },
  {
    id: 'H-003',
    name: 'Guru Nanak Dev Hospital',
    address: 'Majitha Road, Amritsar',
    lat: 31.6340,
    lng: 74.8723,
    type: 'HOSPITAL',
    consultationFee: 150
  },
  {
    id: 'H-004',
    name: 'Patiala Heart Institute',
    address: 'Leela Bhawan, Patiala',
    lat: 30.3398,
    lng: 76.3869,
    type: 'HOSPITAL',
    consultationFee: 800
  },
  {
    id: 'H-005',
    name: 'Rural Health Center Manwal',
    address: 'Village Manwal, Punjab',
    lat: 30.9100,
    lng: 75.8600,
    type: 'CLINIC',
    consultationFee: 50
  }
];

export const MOCK_REMEDIES: HomeRemedy[] = [
  {
    id: 'R-001',
    title: 'Ginger & Honey Paste',
    ailment: 'Seasonal Cough & Cold',
    season: Season.WINTER,
    ingredients: ['Fresh Ginger (1 inch)', 'Raw Honey (1 tbsp)', 'Black Pepper (pinch)'],
    steps: [
      'Grate the ginger and extract its juice.',
      'Mix the ginger juice with honey and black pepper.',
      'Consume one teaspoon twice a day after meals.'
    ],
    doctorVerified: true,
    doctorName: 'Dr. A. Sharma',
    rating: 4.8,
    ratingCount: 124
  },
  {
    id: 'R-002',
    title: 'Natural ORS (Salt-Sugar-Lemon)',
    ailment: 'Dehydration & Heatstroke',
    season: Season.SUMMER,
    ingredients: ['Water (1 liter)', 'Sugar (6 tsp)', 'Salt (0.5 tsp)', 'Lemon (half)'],
    steps: [
      'Boil and cool the water.',
      'Dissolve sugar and salt thoroughly.',
      'Squeeze half a lemon for Vitamin C.',
      'Sip slowly throughout the day.'
    ],
    doctorVerified: true,
    doctorName: 'Dr. P. Kaur',
    rating: 4.9,
    ratingCount: 310
  },
  {
    id: 'R-003',
    title: 'Tulsi & Neem Decoction',
    ailment: 'Viral Fever & Flu',
    season: Season.MONSOON,
    ingredients: ['Tulsi Leaves (7-10)', 'Neem Leaves (3-4)', 'Water (2 cups)'],
    steps: [
      'Wash the leaves thoroughly.',
      'Boil leaves in water until reduced to half.',
      'Strain and drink warm twice a day.'
    ],
    doctorVerified: true,
    doctorName: 'Dr. A. Sharma',
    rating: 4.7,
    ratingCount: 89
  },
  {
    id: 'R-004',
    title: 'Buttermilk with Cumin',
    ailment: 'Digestion & Bloating',
    season: Season.SUMMER,
    ingredients: ['Fresh Curd (0.5 cup)', 'Water (1 cup)', 'Roasted Cumin Powder (0.5 tsp)'],
    steps: [
      'Whisk curd and water together.',
      'Add cumin powder and a pinch of black salt.',
      'Drink chilled after lunch to aid digestion.'
    ],
    doctorVerified: true,
    doctorName: 'Dr. R. Singh',
    rating: 4.6,
    ratingCount: 156
  }
];

export const MOCK_HEALTH_TIPS: HealthTip[] = [
  {
    id: 'T-001',
    doctorId: 'DR101',
    doctorName: 'Dr. A. Sharma',
    title: 'Morning Sunlight for Immunity',
    content: 'Try to get 10-15 minutes of direct morning sunlight. It boosts Vitamin D, which is essential for your immune system to fight infections.',
    category: 'IMMUNITY',
    timestamp: new Date().toISOString(),
    likes: 245
  },
  {
    id: 'T-002',
    doctorId: 'DR102',
    doctorName: 'Dr. P. Kaur',
    title: 'The "Early Dinner" Rule',
    content: 'Eating your last meal at least 3 hours before sleep significantly improves digestion and reduces acidity issues common in elderly patients.',
    category: 'DIET',
    timestamp: new Date().toISOString(),
    likes: 189
  },
  {
    id: 'T-003',
    doctorId: 'DR101',
    doctorName: 'Dr. A. Sharma',
    title: 'Proper Hydration Check',
    content: 'Don\'t wait until you feel thirsty to drink water. Keep a small pot of water nearby and take small sips every 30 minutes during the summer.',
    category: 'HYDRATION',
    timestamp: new Date().toISOString(),
    likes: 532
  }
];

export const MOCK_WELLNESS_ACTIVITIES: WellnessActivity[] = [
  {
    id: 'W-001',
    title: 'Anulom Vilom (Breathing)',
    type: 'BREATHING',
    benefit: 'Reduces stress and improves lung capacity',
    level: 'BEGINNER',
    ageGroup: 'ALL',
    // Fix: Added required concern property for WellnessActivity type
    concern: 'STRESS',
    duration: '5-10 mins',
    steps: [
      'Sit comfortably with your spine straight.',
      'Close your right nostril with your thumb.',
      'Inhale slowly through the left nostril.',
      'Close the left nostril and exhale through the right.',
      'Repeat by inhaling from the right and exhaling from the left.'
    ]
  },
  {
    id: 'W-002',
    title: 'Tadasana (Mountain Pose)',
    type: 'YOGA',
    benefit: 'Improves posture and body balance',
    level: 'BEGINNER',
    ageGroup: 'ALL',
    // Fix: Added required concern property for WellnessActivity type
    concern: 'ALL',
    duration: '2 mins',
    steps: [
      'Stand with feet slightly apart.',
      'Interlock fingers and turn palms upward.',
      'Inhale and stretch arms above your head.',
      'Lift your heels and stand on your toes.',
      'Hold for 20-30 seconds, then exhale and lower heels.'
    ]
  },
  {
    id: 'W-003',
    title: 'Chair Stretching for Seniors',
    type: 'EXERCISE',
    benefit: 'Reduces stiffness in neck and shoulders',
    level: 'BEGINNER',
    ageGroup: 'ELDERLY',
    // Fix: Added required concern property for WellnessActivity type
    concern: 'BACK_PAIN',
    duration: '5 mins',
    steps: [
      'Sit on a sturdy chair with feet flat.',
      'Slowly tilt your head towards your shoulder.',
      'Roll your shoulders forward and then backward.',
      'Gently twist your torso to the left and then right.'
    ]
  }
];

export const MOCK_CASES: MedicalCase[] = [
  {
    id: 'CS-2023-001',
    patientId: 'P-101',
    patientName: 'Ramesh Kumar',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    mode: 'IVR',
    symptoms: ['High Fever', 'Chills', 'Body Ache'],
    aiDiagnosis: 'Likely Viral Fever or Malaria',
    severity: CaseSeverity.MODERATE,
    status: CaseStatus.PENDING_APPROVAL,
    // Using MP3 for better compatibility across browsers (Safari, etc.)
    audioUrl: 'https://actions.google.com/sounds/v1/teleport/teleport_arrival.ogg',
    patientLocation: {
      lat: 30.9010,
      lng: 75.8573,
      address: 'Village Manwal, Ludhiana, Punjab'
    },
    transcript: [
      { id: '1', role: 'model', text: 'Namaste, tell me your symptoms.', timestamp: new Date() },
      { id: '2', role: 'user', text: 'I have high fever since last night and shivering.', timestamp: new Date() },
      { id: '3', role: 'model', text: 'Do you have body ache?', timestamp: new Date() },
      { id: '4', role: 'user', text: 'Yes, lots of pain in back and legs.', timestamp: new Date() }
    ],
    prescription: 'Paracetamol 500mg (1 tab TDS for 3 days)\nDrink plenty of fluids\nRest for 2 days',
    precautions: ['Isolate from family members', 'Monitor temperature every 4 hours', 'Use mosquito net'],
    deliveryEta: 'Pending Dispatch'
  },
  {
    id: 'CS-2023-002',
    patientId: 'P-102',
    patientName: 'Sunita Devi',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    mode: 'ONLINE',
    symptoms: ['Skin Rash', 'Itching', 'Redness'],
    aiDiagnosis: 'Allergic Dermatitis',
    severity: CaseSeverity.MILD,
    status: CaseStatus.APPROVED,
    approvalTimestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    patientLocation: {
      lat: 31.6340,
      lng: 74.8723,
      address: 'Sector 4, Amritsar, Punjab'
    },
    transcript: [
      { id: '1', role: 'user', text: 'I have a red rash on my arm.', timestamp: new Date() },
      { id: '2', role: 'model', text: 'Is it itchy or painful?', timestamp: new Date() },
      { id: '3', role: 'user', text: 'Very itchy, no pain.', timestamp: new Date() }
    ],
    prescription: 'Cetirizine 10mg (1 tab OD for 5 days)\nCalamine Lotion (Apply twice daily)',
    precautions: ['Avoid scratching', 'Keep area clean and dry', 'Wear loose cotton clothes'],
    deliveryEta: 'Today, 4:00 PM'
  },
  {
    id: 'CS-2023-003',
    patientId: 'P-103',
    patientName: 'Gurpreet Singh',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    mode: 'IVR',
    symptoms: ['Chest Pain', 'Shortness of Breath', 'Sweating'],
    aiDiagnosis: 'POSSIBLE CARDIAC EVENT',
    severity: CaseSeverity.CRITICAL,
    status: CaseStatus.OPEN,
    // Using MP3 for better compatibility
    audioUrl: 'https://actions.google.com/sounds/v1/teleport/teleport_arrival.ogg',
    patientLocation: {
      lat: 30.3398,
      lng: 76.3869,
      address: 'Near Bus Stand, Patiala, Punjab'
    },
    transcript: [
      { id: '1', role: 'user', text: 'Chest hurting... cannot breathe.', timestamp: new Date() },
      { id: '2', role: 'model', text: 'Is the pain spreading to your arm?', timestamp: new Date() },
      { id: '3', role: 'user', text: 'Yes, left arm paining. Sweating too much.', timestamp: new Date() }
    ],
    precautions: ['Do not walk or exert', 'Take Aspirin immediately if available', 'Wait for ambulance'],
    doctorNotes: 'Immediate ambulance dispatch requested via automated system.'
  }
];

export const MOCK_STATS = {
  totalCases: 142,
  criticalPending: 1,
  deliveriesInProgress: 12,
  activeDoctors: 4
};

export const MOCK_PATIENTS: PatientProfile[] = [
  {
    id: 'P-101',
    name: 'Ramesh Kumar',
    age: 55,
    gender: 'Male',
    location: 'Zone 4, Punjab',
    phone: '+91-98765-XXXXX',
    medicalHistory: ['Hypertension', 'Chronic Smoker'],
    lastVisitDate: '2023-08-15',
    lastDiagnosis: 'Viral Fever',
    riskFactors: ['High BP', 'Winter Season Approaching']
  },
  {
    id: 'P-102',
    name: 'Sunita Devi',
    age: 42,
    gender: 'Female',
    location: 'Sector 4, Amritsar',
    phone: '+91-98765-XXXXX',
    medicalHistory: ['Dust Allergy'],
    lastVisitDate: '2023-06-10',
    lastDiagnosis: 'Allergy',
    riskFactors: []
  },
  {
    id: 'P-103',
    name: 'Gurpreet Singh',
    age: 62,
    gender: 'Male',
    location: 'Patiala',
    phone: '+91-98765-XXXXX',
    medicalHistory: ['High Cholesterol'],
    lastVisitDate: '2022-12-01',
    lastDiagnosis: 'Routine Checkup',
    riskFactors: ['Cardiac History']
  },
  {
    id: 'P-104',
    name: 'Vikram Singh',
    age: 34,
    gender: 'Male',
    location: 'Zone 1, Punjab',
    phone: '+91-99887-XXXXX',
    medicalHistory: ['Asthma'],
    lastVisitDate: '2023-01-20',
    lastDiagnosis: 'Acute Bronchitis',
    riskFactors: ['Harvest Season (Dust/Pollen)', 'Missed Inhaler Refill']
  },
  {
    id: 'P-105',
    name: 'Anita Kaur',
    age: 28,
    gender: 'Female',
    location: 'Zone 4, Punjab',
    phone: '+91-91234-XXXXX',
    medicalHistory: ['Anemia', 'Pregnant (2nd Trimester)'],
    lastVisitDate: '2023-09-10',
    lastDiagnosis: 'Routine Checkup',
    riskFactors: ['Low Iron Levels', 'Due for Tetanus Shot']
  },
  {
    id: 'P-106',
    name: 'Balwinder Singh',
    age: 68,
    gender: 'Male',
    location: 'Zone 3, Punjab',
    phone: '+91-95678-XXXXX',
    medicalHistory: ['Diabetes Type 2', 'Neuropathy'],
    lastVisitDate: '2023-05-05',
    lastDiagnosis: 'Foot Ulcer (Healed)',
    riskFactors: ['High Glucose', 'Irregular Follow-up']
  }
];
