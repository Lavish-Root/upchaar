import React, { useState, useEffect } from 'react';
import { Phone, Stethoscope, User as UserIcon, LayoutGrid, LogOut, Loader2, Key, Zap, Sparkles, Shield } from 'lucide-react';
import PatientPortal from './components/PatientPortal';
import DoctorDashboard from './components/DoctorDashboard';
import IVRSimulator from './components/IVRSimulator';
import LoginScreen from './components/LoginScreen';
import ApiKeyModal from './components/ApiKeyModal';
import Logo from './components/Logo';
import { MOCK_CASES, MOCK_STATS, MOCK_PATIENTS } from './services/mockData';
import { MedicalCase, CaseStatus, User, UserRole, Appointment, OfflineSession } from './types';
import { logout, getSession } from './services/authService';
import { getAIConfig } from './services/aiService';

function App() {
  const [currentView, setCurrentView] = useState<'LOGIN' | 'PATIENT' | 'IVR' | 'DOCTOR'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState(getAIConfig());

  // Helper to ensure default / emergency cases and user-submitted cases are merged
  const mergeCasesWithMocks = (savedCases: MedicalCase[]): MedicalCase[] => {
    const existingIds = new Set(savedCases.map(c => c.id));
    const result = [...savedCases];
    for (const mc of MOCK_CASES) {
      if (!existingIds.has(mc.id)) {
        result.unshift(mc);
        existingIds.add(mc.id);
      }
    }
    return result;
  };

  // Persistent States across sessions & tabs
  const [cases, setCases] = useState<MedicalCase[]>(() => {
    try {
      const saved = localStorage.getItem('ai_upchaar_cases');
      if (saved) {
        const parsed = JSON.parse(saved);
        return mergeCasesWithMocks(parsed);
      }
      return MOCK_CASES;
    } catch (e) {
      return MOCK_CASES;
    }
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem('ai_upchaar_appointments');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [stats, setStats] = useState(MOCK_STATS);

  const [offlineSessions, setOfflineSessions] = useState<OfflineSession[]>(() => {
    try {
      const saved = localStorage.getItem('ai_upchaar_offline_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ai_upchaar_cases', JSON.stringify(cases));
    } catch (e) {}
  }, [cases]);

  useEffect(() => {
    try {
      localStorage.setItem('ai_upchaar_appointments', JSON.stringify(appointments));
    } catch (e) {}
  }, [appointments]);

  useEffect(() => {
    try {
      localStorage.setItem('ai_upchaar_offline_sessions', JSON.stringify(offlineSessions));
    } catch (e) {}
  }, [offlineSessions]);

  // Check for existing session on app start
  useEffect(() => {
    const checkSession = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const session = getSession();
      if (session) {
        setCurrentUser(session);
        if (session.role === UserRole.DOCTOR) {
          setCurrentView('DOCTOR');
        } else {
          setCurrentView('PATIENT');
        }
      } else {
        setCurrentView('LOGIN');
      }
      setIsAppLoading(false);
    };
    checkSession();
  }, []);

  const handleNewCase = (newCase: MedicalCase) => {
    setCases(prev => [newCase, ...prev]);
    setStats(prev => ({
      ...prev,
      totalCases: prev.totalCases + 1,
      criticalPending: newCase.severity === 'CRITICAL' ? prev.criticalPending + 1 : prev.criticalPending
    }));
  };

  /**
   * 📞 NEW OFFLINE SESSION HANDLER
   * Stores data in the isolated offlineSessions collection.
   * Fixed parameter typing with OfflineSession.
   */
  const handleSaveOfflineSession = (sessionData: OfflineSession) => {
    setOfflineSessions(prev => [sessionData, ...prev]);
    console.log("Offline Storage: New IVR Session Recorded.", sessionData);
  };

  const handleBookAppointment = (newAppt: Appointment) => {
    setAppointments(prev => [newAppt, ...prev]);
  };

  const handleUpdateStatus = (caseId: string, status: CaseStatus, prescription?: string, notes?: string) => {
    setCases(prev => prev.map(c => {
      if (c.id === caseId) {
        return {
          ...c,
          status,
          prescription: prescription || c.prescription,
          doctorNotes: notes || c.doctorNotes,
          approvalTimestamp: status === 'APPROVED' ? new Date().toISOString() : c.approvalTimestamp,
          deliveryEta: status === 'APPROVED' ? 'Dispatched (20 min)' : c.deliveryEta
        };
      }
      return c;
    }));

    if (status === 'APPROVED') {
      setStats(prev => ({ ...prev, deliveriesInProgress: prev.deliveriesInProgress + 1 }));
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === UserRole.DOCTOR) {
      setCurrentView('DOCTOR');
    } else {
      setCurrentView('PATIENT');
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setCurrentView('LOGIN');
  };

  const refreshAIConfig = () => {
    setAiConfig(getAIConfig());
  };

  if (isAppLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl animate-pulse ring-4 ring-emerald-100">
          <Logo className="w-12 h-12" />
        </div>
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
        <p className="text-slate-500 mt-4 text-sm font-medium tracking-wide uppercase">Initializing AI Upchaar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => {
          setIsKeyModalOpen(false);
          refreshAIConfig();
        }}
      />

      {(currentView !== 'LOGIN') && (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <button onClick={() => { }} className="flex items-center gap-2 sm:gap-3 focus:outline-none">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center text-white shadow-md">
                  <Logo className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-800 leading-none">AI Upchaar</span>
                  <span className="text-[9px] sm:text-[10px] font-medium text-emerald-600 tracking-wider uppercase">Healthcare Access</span>
                </div>
              </button>

              <div className="flex items-center space-x-3 sm:space-x-4">
                {/* AI Key & Model Trigger */}
                <button
                  onClick={() => setIsKeyModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
                  title="Configure Groq or Gemini API Key"
                >
                  {aiConfig.provider === 'groq' ? (
                    <Zap size={14} className="text-emerald-600 fill-emerald-600" />
                  ) : aiConfig.provider === 'gemini' ? (
                    <Sparkles size={14} className="text-blue-600" />
                  ) : (
                    <Shield size={14} className="text-purple-600" />
                  )}
                  <span className="capitalize">{aiConfig.provider === 'groq' ? 'Groq Llama 3.3' : aiConfig.provider === 'gemini' ? 'Gemini AI' : 'Local AI'}</span>
                </button>

                {currentUser && (
                  <div className="flex items-center gap-2 sm:gap-4">
                    <span className="text-sm font-medium text-slate-700 hidden sm:block">
                      {currentUser.role === UserRole.DOCTOR ? `Dr. ${currentUser.name}` : currentUser.name}
                    </span>
                    <button onClick={handleLogout} className="flex items-center gap-1 px-2 sm:px-3 py-2 rounded-full text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition">
                      <LogOut size={16} /> <span className="hidden sm:inline">Logout</span>
                    </button>
                  </div>
                )}
                {!currentUser && currentView === 'IVR' && (
                  <button onClick={() => setCurrentView('LOGIN')} className="text-sm font-medium text-slate-500 hover:text-emerald-600">
                    Back to Login
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={currentView === 'LOGIN' ? 'min-h-screen' : 'h-[calc(100vh-64px)]'}>
        {currentView === 'LOGIN' && (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onIVRSelect={() => setCurrentView('IVR')}
            onOpenKeyModal={() => setIsKeyModalOpen(true)}
          />
        )}
        {currentView === 'PATIENT' && currentUser && (
          <PatientPortal
            user={currentUser}
            patientHistory={cases.filter(c => c.patientId === currentUser.id)}
            appointments={appointments.filter(a => a.patientId === currentUser.id)}
            onSubmitCase={handleNewCase}
            onBookAppointment={handleBookAppointment}
            onLogout={handleLogout}
          />
        )}
        {currentView === 'IVR' && <IVRSimulator onSaveOfflineSession={handleSaveOfflineSession} />}
        {currentView === 'DOCTOR' && currentUser && (
          <DoctorDashboard
            user={currentUser}
            cases={cases}
            patients={MOCK_PATIENTS}
            stats={stats}
            offlineSessions={offlineSessions}
            onUpdateStatus={handleUpdateStatus}
            onLogout={handleLogout}
          />
        )}
      </main>
    </div>
  );
}

export default App;
