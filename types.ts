
export enum UserRole {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
  IVR_SIMULATION = 'IVR_SIMULATION'
}

export enum CaseSeverity {
  NORMAL = 'NORMAL',
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  CRITICAL = 'CRITICAL'
}

export enum CaseStatus {
  OPEN = 'OPEN',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  image?: string;
}

export interface MedicalCase {
  id: string;
  patientId: string;
  patientName: string;
  timestamp: string;
  mode: 'IVR' | 'ONLINE';
  symptoms: string[];
  aiDiagnosis: string;
  severity: CaseSeverity;
  status: CaseStatus;
  audioUrl?: string;
  patientLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  transcript: Message[];
  prescription?: string;
  precautions?: string[];
  deliveryEta?: string;
  approvalTimestamp?: string;
  doctorNotes?: string;
  images?: string[];
  homeRemedies?: string[];
  careSuggestions?: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'HOSPITAL' | 'CLINIC';
  consultationFee: number;
  distance?: string;
  url?: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  hospitalName?: string;
  hospitalAddress?: string;
  date: string;
  reason: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PAID' | 'PENDING' | 'PAY_AT_CLINIC';
  amount: number;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  location: string;
  phone: string;
  medicalHistory: string[];
  lastVisitDate: string;
  lastDiagnosis?: string;
  riskFactors: string[];
}

export interface RiskPrediction {
  patientId: string;
  patientName: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  predictedCondition: string;
  reasoning: string;
  suggestedAction: string;
  draftMessage: string;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  recordsAnalyzed: number;
  lastTrained: string;
  version: string;
  algorithmUsed: string;
}

export interface HealthTrend {
  category: string;
  count: number;
  growth: number;
  description: string;
}

export interface ModelHistoryEntry {
  version: string;
  timestamp: string;
  metrics: ModelMetrics;
  trends: HealthTrend[];
  confusionMatrix: number[][];
}

export interface TrainedModelState {
  activeModel: ModelHistoryEntry | null;
  history: ModelHistoryEntry[];
  cumulativeDataset: any[];
}

export enum Season {
  SUMMER = 'SUMMER',
  WINTER = 'WINTER',
  MONSOON = 'MONSOON',
  ALL = 'ALL'
}

export interface HomeRemedy {
  id: string;
  title: string;
  ailment: string;
  season: Season;
  ingredients: string[];
  steps: string[];
  safetyNotes?: string;
  doctorVerified: boolean;
  doctorName: string;
  rating: number;
  ratingCount: number;
}

export interface HealthTip {
  id: string;
  doctorId: string;
  doctorName: string;
  title: string;
  content: string;
  category: 'IMMUNITY' | 'DIET' | 'HYGIENE' | 'SLEEP' | 'HYDRATION';
  timestamp: string;
  likes: number;
}

export interface WellnessActivity {
  id: string;
  title: string;
  type: 'YOGA' | 'EXERCISE' | 'BREATHING';
  benefit: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  ageGroup: 'KIDS' | 'ADULTS' | 'ELDERLY' | 'ALL';
  concern: 'STRESS' | 'WEAKNESS' | 'BACK_PAIN' | 'IMMUNITY' | 'ALL';
  duration: string;
  steps: string[];
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  token?: string;
  specialization?: string;
  hospital?: string;
  mobileNumber?: string;
  profilePhotoUrl?: string;
  age?: string;
  gender?: string;
}

export interface OfflineSession {
  session_type: string;
  transcript: string;
  risk_level: CaseSeverity;
  doctor_joined: boolean;
  medicine_requested: boolean;
  delivery_confirmed: boolean;
  address: any;
  timestamp: string;
}
