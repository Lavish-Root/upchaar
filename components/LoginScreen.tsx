import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { loginDoctor, loginPatient } from '../services/authService';
import { Stethoscope, User as UserIcon, Lock, ArrowRight, Loader2, ShieldCheck, Phone, Eye, EyeOff, AlertTriangle, Key, Cpu } from 'lucide-react';
import Logo from './Logo';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onIVRSelect: () => void;
  onOpenKeyModal?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onIVRSelect, onOpenKeyModal }) => {
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.PATIENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Doctor Form State
  const [docId, setDocId] = useState('');
  const [docPass, setDocPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Patient Form State
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientGender, setPatientGender] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user: User;
      if (activeRole === UserRole.DOCTOR) {
        user = await loginDoctor(docId, docPass);
      } else {
        user = await loginPatient(patientName, patientAge, patientGender);
      }
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex overflow-hidden border border-slate-200 min-h-[600px]">

        {/* Left Side - Visual & Info */}
        {/* Left Side - Visual & Info */}
        <div className={`hidden md:flex w-1/2 p-10 lg:p-12 flex-col justify-between text-white transition-colors duration-500 animate-in fade-in slide-in-from-bottom-8 ${activeRole === UserRole.DOCTOR ? 'bg-slate-900' : 'bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900'}`}>
          <div className="space-y-6">
            {/* Clean Brand Header */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-md p-1.5 shrink-0">
                <Logo className="w-full h-full" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl lg:text-3xl font-black tracking-tight text-white leading-none">
                  Praan<span className="text-emerald-300">Seva</span><span className="text-xs align-super text-emerald-200 font-bold ml-0.5">™</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-200/90 tracking-wider uppercase mt-1">
                  Care Today. Healthier Tomorrows.
                </span>
              </div>
            </div>

            {/* Mission Tagline Badge */}
            <div>
              <span className="inline-flex items-center px-3.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-100 tracking-wider border border-white/15">
                AI • ACCESS • AFFORDABLE • FOR EVERYONE
              </span>
            </div>

            {/* Heading & Description */}
            <div className="space-y-3 pt-1">
              <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight text-white">
                {activeRole === UserRole.DOCTOR ? 'Doctor Portal' : 'Healthcare for Every Village'}
              </h1>
              <p className="text-white/80 text-base leading-relaxed">
                {activeRole === UserRole.DOCTOR
                  ? 'Access patient records, review AI triage reports, and manage prescriptions securely. Your clinical expertise, amplified by PraanSeva AI.'
                  : 'Connect with a digital health assistant instantly. No appointments needed. Consult in Hindi, Punjabi, Bengali, Gujarati, Marathi, Tamil, Telugu, or English.'}
              </p>
            </div>

            {/* Key Benefits List */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-3 text-sm text-white/90">
                <span className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">✓</span>
                <span>Instant multilingual triage & symptom assessment</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/90">
                <span className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">✓</span>
                <span>Verified doctor-in-the-loop clinical escalation</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/90">
                <span className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">✓</span>
                <span>Nearby clinics, medicine support & hospital locator</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-8">
            <div className="flex items-center gap-2.5 text-xs text-white/70">
              <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
              <span className="font-medium">{activeRole === UserRole.DOCTOR ? 'HIPAA Compliant & Encrypted Records' : 'Private, Confidential & Secure'}</span>
            </div>

            {activeRole === UserRole.DOCTOR && (
              <div className="bg-white/10 p-3.5 rounded-xl text-xs text-white/80 backdrop-blur-sm border border-white/10">
                <span className="font-bold block mb-1 text-white">Demo Credentials:</span>
                <div className="flex justify-between font-mono opacity-90">
                  <span>ID: DR101</span>
                  <span>Pass: password123</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative">

          {/* Mobile Header (Only on small screens) */}
          <div className="md:hidden flex items-center gap-3 mb-6 text-slate-800 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md border border-slate-200 p-1.5 shrink-0">
              <Logo className="w-full h-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tight text-[#002D56] leading-none">
                Praan<span className="text-[#00875A]">Seva</span><span className="text-xs align-super text-emerald-600 font-bold ml-0.5">™</span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 tracking-wider uppercase mt-1">Care Today. Healthier Tomorrows.</span>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="flex justify-center mb-8 bg-slate-100 p-1.5 rounded-full w-full max-w-xs mx-auto animate-in fade-in slide-in-from-top-4 duration-500">
            <button
              onClick={() => setActiveRole(UserRole.PATIENT)}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeRole === UserRole.PATIENT ? 'bg-white text-emerald-700 shadow-sm scale-105' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Patient Login
            </button>
            <button
              onClick={() => setActiveRole(UserRole.DOCTOR)}
              className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeRole === UserRole.DOCTOR ? 'bg-white text-slate-900 shadow-sm scale-105' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              Doctor Login
            </button>
          </div>

          {/* Form Header */}
          <div key={activeRole} className="mb-6 text-center animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-2xl font-extrabold text-slate-800 mb-1.5">
              {activeRole === UserRole.DOCTOR ? 'Welcome Back, Doctor' : 'Start Your Consultation'}
            </h3>
            <p className="text-slate-500 text-sm">
              {activeRole === UserRole.DOCTOR ? 'Enter your credentials to access the clinical portal' : 'Enter your details to begin instant AI consultation'}
            </p>
          </div>

          <form key={`form-${activeRole}`} onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {activeRole === UserRole.DOCTOR ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Doctor ID</label>
                  <div className="relative group">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-slate-800 transition-colors" />
                    <input
                      type="text"
                      required
                      value={docId}
                      onChange={(e) => setDocId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                      placeholder="e.g. DR101"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-slate-800 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={docPass}
                      onChange={(e) => setDocPass(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Age</label>
                    <input
                      type="number"
                      required
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                      placeholder="e.g. 45"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender <span className="text-xs font-normal text-slate-400">(Optional)</span></label>
                    <div className="flex gap-2 h-[50px]">
                      {['Male', 'Female', 'Other'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setPatientGender(g)}
                          className={`flex-1 rounded-lg text-xs font-medium border transition-all ${patientGender === g
                              ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:scale-100 ${activeRole === UserRole.DOCTOR
                  ? 'bg-slate-900 shadow-slate-900/20 hover:bg-slate-800'
                  : 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700'
                }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {activeRole === UserRole.DOCTOR ? 'Secure Login' : 'Continue to Portal'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
            <button
              onClick={onIVRSelect}
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition group"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition">
                <Phone className="w-4 h-4" />
              </div>
              Simulate Offline IVR Call
            </button>

            {onOpenKeyModal && (
              <button
                type="button"
                onClick={onOpenKeyModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 text-xs font-semibold transition"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                Configure AI / Groq Key
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;