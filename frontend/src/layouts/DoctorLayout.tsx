import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Users,
  FileCheck2,
  Sparkles,
  User,
  LogOut,
  Menu,
  X,
  Stethoscope,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { EmergencyIncomingCallBanner } from '../components/emergency/EmergencyIncomingCallBanner';

export const DoctorLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPending = user?.doctorVerificationStatus === 'PENDING';
  const isRejected = user?.doctorVerificationStatus === 'REJECTED';

  const navLinks = [
    { name: 'Dashboard', path: '/doctor/dashboard', icon: LayoutDashboard },
    { name: 'Appointments', path: '/doctor/appointments', icon: Calendar },
    { name: 'Availability & Slots', path: '/doctor/availability', icon: Clock },
    { name: 'My Patients', path: '/doctor/patients', icon: Users },
    { name: 'Digital Prescriptions', path: '/doctor/prescriptions', icon: FileCheck2 },
    { name: 'AI Prescription Assistant', path: '/doctor/ai-prescription', icon: Sparkles, badge: 'AI' },
    { name: 'Doctor Profile', path: '/doctor/profile', icon: User },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-primary-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Praan<span className="text-teal-600">Sewa</span></h1>
            <span className="text-[10px] font-semibold text-teal-600 uppercase tracking-wider">Doctor Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition',
                    isActive
                      ? 'bg-teal-50 text-teal-800 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-teal-100 text-teal-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
              Dr
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</p>
              <p className="text-[11px] text-teal-600 font-medium truncate">
                {user?.specialties?.[0] || 'Medical Specialist'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Real-Time Incoming Emergency Call Alert for Doctors */}
        <EmergencyIncomingCallBanner />

        {/* Verification Status Alert Banner */}
        {isPending && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span><strong>Verification Pending:</strong> Your medical credentials are being reviewed by administrators. You will be able to accept appointments once approved.</span>
            </div>
            <span className="text-[11px] bg-amber-600 px-2 py-0.5 rounded font-bold">STATUS: PENDING</span>
          </div>
        )}

        {isRejected && (
          <div className="bg-rose-600 text-white px-4 py-2 text-xs font-medium flex items-center gap-2 shadow-sm">
            <AlertTriangle className="w-4 h-4" />
            <span><strong>Application Rejected:</strong> Your medical registration could not be verified. Please contact support.</span>
          </div>
        )}

        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-sm font-semibold text-slate-600 hidden sm:inline">
              Welcome, <strong className="text-slate-900">{user?.fullName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/doctor/ai-prescription"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg text-xs font-semibold hover:bg-teal-100 transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>AI Prescription Assistant</span>
            </Link>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-1 shadow-lg">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg mt-2 pt-2 border-t border-slate-100"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
