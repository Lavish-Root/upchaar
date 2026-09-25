import { User, UserRole } from '../types';

const SESSION_KEY = 'praanseva_session';

// Mock database of doctors
const MOCK_DOCTORS = [
  {
    doctorId: 'DR101',
    name: 'Dr. A. Sharma',
    password: 'password123', // In real app, this would be hashed
    specialization: 'General Physician',
    hospital: 'Civil Hospital, Punjab Zone 4',
    mobileNumber: '+91-98765-12345',
    profilePhotoUrl: '' // Empty by default
  },
  {
    doctorId: 'DR102',
    name: 'Dr. P. Kaur',
    password: 'password123',
    specialization: 'Cardiologist',
    hospital: 'District Hospital, Amritsar',
    mobileNumber: '+91-98765-67890',
    profilePhotoUrl: ''
  }
];

export const loginDoctor = async (id: string, password: string): Promise<User> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  const doctor = MOCK_DOCTORS.find(d => d.doctorId === id && d.password === password);

  if (!doctor) {
    throw new Error('Invalid Doctor ID or Password');
  }

  const user: User = {
    id: doctor.doctorId,
    name: doctor.name,
    role: UserRole.DOCTOR,
    token: `mock-jwt-token-${Date.now()}`,
    specialization: doctor.specialization,
    hospital: doctor.hospital,
    mobileNumber: doctor.mobileNumber,
    profilePhotoUrl: doctor.profilePhotoUrl
  };

  saveSession(user);
  return user;
};

export const loginPatient = async (name: string, age: string, gender?: string): Promise<User> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!name || !age) {
    throw new Error('Name and Age are required');
  }

  const user: User = {
    id: `P-${Date.now()}`, // Auto-generate ID
    name: name,
    role: UserRole.PATIENT,
    token: `mock-session-token-${Date.now()}`,
    age: age,
    gender: gender
  };

  saveSession(user);
  return user;
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const saveSession = (user: User) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const getSession = (): User | null => {
  try {
    const session = localStorage.getItem(SESSION_KEY) || localStorage.getItem('ai_upchaar_session');
    if (!session) return null;
    return JSON.parse(session);
  } catch (e) {
    return null;
  }
};