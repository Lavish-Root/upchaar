import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  KeyRound,
  Lock,
  User,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';

export const PranAdminAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login, registerAdmin, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'SIGNUP' | 'LOGIN'>('SIGNUP');

  // Sign up form state
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    adminSecretKey: 'PRAN_ADMIN_2026',
  });

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If already authenticated as ADMIN, redirect straight to admin dashboard
  useEffect(() => {
    if (isAuthenticated && user?.role === 'ADMIN') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignupForm({ ...signupForm, [e.target.name]: e.target.value });
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      await registerAdmin({
        fullName: signupForm.fullName,
        email: signupForm.email,
        phone: signupForm.phone,
        password: signupForm.password,
        adminSecretKey: signupForm.adminSecretKey,
      });

      setSuccessMsg('Superadmin account created successfully! Launching Admin Panel...');
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Superadmin registration failed. Please verify the entered details.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const loggedUser = await login({
        email: loginForm.email,
        password: loginForm.password,
        expectedRole: 'ADMIN',
      });

      if (loggedUser.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        setError('This account does not have Superadmin privileges.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid admin credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setActiveTab('LOGIN');
    setLoginForm({
      email: 'admin@praansewa.health',
      password: 'Password123!',
    });
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden text-slate-100">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-xl w-full space-y-6 relative z-10">
        {/* Terminal Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-semibold shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            URL: /pran_admin • Master Governance Node
          </div>

          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-indigo-900/50">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Praan<span className="text-indigo-400">Admin</span> Control Panel
            </h1>
          </div>

          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Authorized portal for platform governance, doctor credential verification, patient directories, and medical operations.
          </p>
        </div>

        {/* 1-Click Fill Demo Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Have existing demo admin credentials?</span>
          </div>
          <button
            type="button"
            onClick={handleFillDemoAdmin}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-sm text-xs shrink-0"
          >
            1-Click Demo Admin
          </button>
        </div>

        {/* Main Panel Box */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl p-7 sm:p-8 space-y-6">
          {/* Tab Selector: Sign Up vs Sign In */}
          <div className="bg-slate-950 p-1.5 rounded-2xl grid grid-cols-2 gap-1 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveTab('SIGNUP');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                activeTab === 'SIGNUP'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              Create Superadmin (Sign Up)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setError('');
                setSuccessMsg('');
              }}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
                activeTab === 'LOGIN'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Sign In (Existing Admin)
            </button>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800 rounded-2xl text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 rounded-2xl text-xs text-emerald-300 flex items-start gap-2.5 animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* FORM: Sign Up for Superadmin */}
          {activeTab === 'SIGNUP' ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Superadmin Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={signupForm.fullName}
                  onChange={handleSignupChange}
                  placeholder="e.g. Master Administrator"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Official Admin Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={signupForm.email}
                    onChange={handleSignupChange}
                    placeholder="admin@praansewa.health"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={signupForm.phone}
                    onChange={handleSignupChange}
                    placeholder="+91 99999 00000"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Master Password (min 8 chars)
                </label>
                <input
                  type="password"
                  name="password"
                  value={signupForm.password}
                  onChange={handleSignupChange}
                  placeholder="••••••••"
                  minLength={8}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Governance Passcode</span>
                  <span className="text-[10px] text-indigo-400 font-mono font-normal">Default: PRAN_ADMIN_2026</span>
                </label>
                <input
                  type="text"
                  name="adminSecretKey"
                  value={signupForm.adminSecretKey}
                  onChange={handleSignupChange}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-2xl shadow-xl shadow-indigo-950/60 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
                >
                  <ShieldAlert className="w-5 h-5" />
                  {loading ? 'Creating Superadmin...' : 'CREATE SUPERADMIN ACCOUNT & ENTER PANEL'}
                </button>
              </div>
            </form>
          ) : (
            /* FORM: Existing Admin Sign In */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Admin Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={loginForm.email}
                  onChange={handleLoginChange}
                  placeholder="admin@praansewa.health"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={loginForm.password}
                  onChange={handleLoginChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-2xl shadow-xl shadow-indigo-950/60 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
                >
                  <KeyRound className="w-5 h-5" />
                  {loading ? 'Authenticating...' : 'AUTHORIZE & ENTER ADMIN PANEL'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </form>
          )}

          {/* Security Notice Footer */}
          <div className="pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
            🔒 All administrative sessions are recorded into the PostgreSQL immutable audit trail.
          </div>
        </div>
      </div>
    </div>
  );
};
