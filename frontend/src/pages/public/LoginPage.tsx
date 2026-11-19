import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { HeartPulse, Stethoscope, Shield, User, ArrowRight, AlertCircle, KeyRound, Sparkles } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const initialRole = (searchParams.get('role') as Role) || 'PATIENT';
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts = {
    PATIENT: { email: 'aarav.kumar@example.com', password: 'Password123!', label: 'Demo Patient (Aarav Kumar)' },
    DOCTOR: { email: 'dr.sharma@praansewa.health', password: 'Password123!', label: 'Demo Doctor (Dr. Rajesh Sharma, Cardiology)' },
    ADMIN: { email: 'admin@praansewa.health', password: 'Password123!', label: 'Demo Admin (Platform Superadmin)' },
  };

  const handleDemoFill = (role: Role) => {
    setSelectedRole(role);
    setEmail(demoAccounts[role].email);
    setPassword(demoAccounts[role].password);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login({
        email,
        password,
        expectedRole: selectedRole,
      });

      // Redirect to respective portal
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (user.role === 'DOCTOR') {
        navigate('/doctor/dashboard');
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-md shadow-primary-500/20">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign In to PraanSewa</h2>
          <p className="text-xs text-slate-500">Access your personalized healthcare management portal</p>
        </div>

        {/* 1-Click Demo Accounts Quick Bar */}
        <div className="p-4 bg-gradient-to-r from-primary-50 to-teal-50 rounded-2xl border border-primary-100 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary-800">
            <Sparkles className="w-3.5 h-3.5 text-primary-600" />
            <span>1-Click Demo Login (Instant Evaluation):</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoFill('PATIENT')}
              className="py-1.5 px-2 bg-white rounded-lg border border-primary-200 text-[11px] font-bold text-primary-700 hover:bg-primary-600 hover:text-white transition shadow-xs text-center"
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('DOCTOR')}
              className="py-1.5 px-2 bg-white rounded-lg border border-teal-200 text-[11px] font-bold text-teal-700 hover:bg-teal-600 hover:text-white transition shadow-xs text-center"
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('ADMIN')}
              className="py-1.5 px-2 bg-white rounded-lg border border-indigo-200 text-[11px] font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs text-center"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-slate-100 p-1.5 rounded-2xl grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => { setSelectedRole('PATIENT'); setError(''); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
              selectedRole === 'PATIENT'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Patient
          </button>
          <button
            type="button"
            onClick={() => { setSelectedRole('DOCTOR'); setError(''); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
              selectedRole === 'DOCTOR'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            Doctor
          </button>
          <button
            type="button"
            onClick={() => { setSelectedRole('ADMIN'); setError(''); }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition ${
              selectedRole === 'ADMIN'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Admin
          </button>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-md space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@praansewa.health"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              variant={selectedRole === 'DOCTOR' ? 'teal' : selectedRole === 'ADMIN' ? 'secondary' : 'primary'}
              className="w-full py-2.5 mt-2"
              isLoading={loading}
            >
              Sign In as {selectedRole.charAt(0) + selectedRole.slice(1).toLowerCase()}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500 space-y-1">
            <p>Don't have an account?</p>
            <div className="flex justify-center gap-3 font-semibold text-primary-600">
              <Link to="/register/patient" className="hover:underline">Register as Patient</Link>
              <span>•</span>
              <Link to="/register/doctor" className="hover:underline">Join as Doctor</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
