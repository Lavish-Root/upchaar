import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HeartPulse, User, LogOut, ArrowRight, ShieldCheck, PhoneCall } from 'lucide-react';
import { Button } from '../components/common/Button';

export const PublicLayout: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'DOCTOR':
        return '/doctor/dashboard';
      case 'ADMIN':
        return '/admin/dashboard';
      case 'PATIENT':
      default:
        return '/patient/dashboard';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Emergency Notice Banner */}
      <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white text-xs py-1.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <PhoneCall className="w-3.5 h-3.5" />
        <span>Medical Emergency? Call National Emergency <strong>112 / 102</strong> or Tele-MANAS Mental Health Helpline <strong>14416</strong> immediately.</span>
      </div>

      {/* Main Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-slate-900">Praan<span className="text-primary-600">Sewa</span></span>
              <span className="block text-[10px] font-semibold text-teal-600 uppercase tracking-widest leading-none">Healthcare Platform</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <Link to="/doctors" className="hover:text-primary-600 transition">Find Doctors</Link>
            <Link to="/remedies" className="hover:text-primary-600 transition">Home Remedies</Link>
            <Link to="/patient/ai-assistant" className="hover:text-primary-600 transition flex items-center gap-1.5 text-primary-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              AI Assistant
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => navigate(getDashboardPath())}>
                  <User className="w-4 h-4 mr-1.5 text-primary-600" />
                  {user.fullName.split(' ')[0]}'s Portal
                </Button>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-slate-100"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register/patient')}>
                  Register
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Outlet */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 pt-12 pb-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white font-bold text-lg">
                <HeartPulse className="w-5 h-5 text-teal-400" />
                PraanSewa Health
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Reimagining accessible, verified, and AI-assisted healthcare management for patients, doctors, and hospitals across India.
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" /> Verified Clinical Verification
              </div>
            </div>

            <div>
              <h5 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Healthcare Portals</h5>
              <ul className="space-y-2 text-xs">
                <li><Link to="/patient/dashboard" className="hover:text-white transition">Patient Portal</Link></li>
                <li><Link to="/doctor/dashboard" className="hover:text-white transition">Doctor Portal</Link></li>
                <li><Link to="/admin/dashboard" className="hover:text-white transition">Admin Portal</Link></li>
                <li><Link to="/register/doctor" className="hover:text-white transition">Doctor Registration & Verification</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white text-xs font-bold uppercase tracking-wider mb-3">AI & Clinical Tools</h5>
              <ul className="space-y-2 text-xs">
                <li><Link to="/patient/ai-assistant" className="hover:text-white transition">AI Healthcare Assistant</Link></li>
                <li><Link to="/patient/voice-assistant" className="hover:text-white transition">Voice Health Triage</Link></li>
                <li><Link to="/remedies" className="hover:text-white transition">Clinically Reviewed Home Remedies</Link></li>
                <li><Link to="/doctors" className="hover:text-white transition">Doctor Directory</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Emergency Helplines</h5>
              <p className="text-xs text-slate-400 leading-relaxed mb-2">
                In acute life-threatening emergencies, do not delay care. Contact local emergency authorities immediately:
              </p>
              <div className="bg-slate-800 p-3 rounded-lg text-xs space-y-1">
                <p className="text-white font-bold">🚑 Ambulance / Police: 112 / 102</p>
                <p className="text-teal-300">🧠 Tele-MANAS: 14416 (24x7)</p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} PraanSewa Platform. Designed with India's Digital Personal Data Protection guidelines.</p>
            <p>Medical Disclaimer: AI services are supportive and do not replace certified physicians.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
