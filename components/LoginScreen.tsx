import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { loginDoctor, loginPatient } from '../services/authService';
import { Stethoscope, User as UserIcon, Lock, ArrowRight, Loader2, ShieldCheck, Phone, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import Logo from './Logo';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onIVRSelect: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onIVRSelect }) => {
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
        <div className={`hidden md:flex w-1/2 p-10 flex-col justify-between text-white transition-colors duration-500 ${activeRole === UserRole.DOCTOR ? 'bg-slate-900' : 'bg-emerald-600'}`}>
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg">
                <Logo className="w-8 h-8" />
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold tracking-tight">AI Upchaar</span>
                <span className="text-xs font-medium text-white/70 tracking-widest uppercase">Rural Healthcare Access</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-6 leading-tight">
              {activeRole === UserRole.DOCTOR ? 'Doctor Portal' : 'Healthcare for Every Village'}
            </h1>
            <p className="text-white/80 text-lg leading-relaxed">
              {activeRole === UserRole.DOCTOR 
                ? 'Access patient records, review AI triage reports, and manage prescriptions securely. Your expertise, amplified by AI.'
                : 'Connect with a digital health assistant instantly. No appointments needed. Consult in Hindi, Punjabi, or English.'}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 text-sm text-white/70">
              <ShieldCheck size={20} />
              <span className="font-medium">{activeRole === UserRole.DOCTOR ? 'HIPAA Compliant & Secure' : 'Private & Confidential'}</span>
            </div>
            
            {activeRole === UserRole.DOCTOR && (
               <div className="bg-white/10 p-4 rounded-xl text-sm text-white/80 backdrop-blur-sm border border-white/10">
                 <span className="font-bold block mb-1 text-white">Demo Credentials:</span>
                 <div className="flex justify-between font-mono text-xs opacity-80">
                    <span>ID: DR101</span>
                    <span>Pass: password123</span>
                 </div>
               </div>
            )}
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative">
          
          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-3 mb-8 text-slate-800">
             <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md">
                 <Logo className="w-6 h-6" />
             </div>
             <span className="font-bold text-xl tracking-tight">AI Upchaar</span>
          </div>

          <div className="flex justify-center mb-10 bg-slate-100 p-1.5 rounded-full w-full max-w-xs mx-auto">
            <button
              onClick={() => setActiveRole(UserRole.PATIENT)}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeRole === UserRole.PATIENT ? 'bg-white text-emerald-600 shadow-sm scale-105' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Patient Login
            </button>
            <button
              onClick={() => setActiveRole(UserRole.DOCTOR)}
              className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeRole === UserRole.DOCTOR ? 'bg-white text-slate-900 shadow-sm scale-105' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Doctor Login
            </button>
          </div>

          <div className="mb-8 text-center">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">
                {activeRole === UserRole.DOCTOR ? 'Welcome Back, Doctor' : 'Start Your Consultation'}
            </h3>
            <p className="text-slate-500 text-sm">
                {activeRole === UserRole.DOCTOR ? 'Enter your credentials to access dashboard' : 'Enter your details to generate a session'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
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
                          className={`flex-1 rounded-lg text-xs font-medium border transition-all ${
                            patientGender === g
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
              className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-70 disabled:scale-100 ${
                activeRole === UserRole.DOCTOR 
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
          
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <button 
                onClick={onIVRSelect}
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition group"
             >
                <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition">
                    <Phone className="w-4 h-4" />
                </div>
                Simulate Offline IVR Call (Demo)
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;