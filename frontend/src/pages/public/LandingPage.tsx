import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Calendar,
  Sparkles,
  Bot,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Activity,
  Award,
} from 'lucide-react';
import { Button } from '../../components/common/Button';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-primary-600" />
                <span>Next-Generation Healthcare Management & AI Assistant</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Complete Healthcare, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-teal-500">
                  Verified Doctors & AI Safety.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Connect with verified medical specialists, access clinical AI assistance, manage consultations, and discover evidence-grounded home remedies — all in one unified, role-based platform.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Button size="lg" variant="primary" onClick={() => navigate('/doctors')}>
                  <Calendar className="w-5 h-5 mr-2" />
                  Find a Doctor & Book
                </Button>
                <Button size="lg" variant="teal" onClick={() => navigate('/patient/ai-assistant')}>
                  <Bot className="w-5 h-5 mr-2" />
                  Try AI Healthcare Assistant
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 grid grid-cols-3 gap-6 border-t border-slate-200">
                <div>
                  <h4 className="text-2xl font-black text-slate-900">100%</h4>
                  <p className="text-xs text-slate-500 font-medium">Verified Doctors</p>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-900">24/7</h4>
                  <p className="text-xs text-slate-500 font-medium">AI Triage Support</p>
                </div>
                <div>
                  <h4 className="text-2xl font-black text-slate-900">Safe</h4>
                  <p className="text-xs text-slate-500 font-medium">Doctor-In-The-Loop</p>
                </div>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Live Consultation Room</h4>
                      <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Available Online
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-md">Room #HD-89</span>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">
                      AI
                    </div>
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 text-xs text-slate-700 leading-relaxed shadow-sm">
                      <p className="font-semibold text-primary-700 mb-1">Clinical Safety Engine Active</p>
                      Symptoms parsed. No red-flag chest pain or neurological deficit detected. Recommended for Dr. Sharma (Cardiology).
                    </div>
                  </div>

                  <div className="flex items-start gap-3 justify-end">
                    <div className="bg-primary-600 text-white p-3 rounded-2xl rounded-tr-none text-xs leading-relaxed max-w-[80%] shadow-sm">
                      I'd like to consult on my blood pressure and exercise routine.
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-teal-900">Dr. Rajesh Sharma, MD</p>
                    <p className="text-[11px] text-teal-700">Senior Interventional Cardiologist</p>
                  </div>
                  <Button size="sm" variant="teal" onClick={() => navigate('/doctors')}>
                    Consult Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Portals Feature Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <h2 className="text-3xl font-extrabold text-slate-900">Three Dedicated Healthcare Portals</h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Every user group has its own tailored workflow designed for security, productivity, and privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Patient Portal Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Patient Portal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Discover accredited doctors, book in-person or video appointments, manage electronic medical records, and interact with the AI Health and Voice assistant.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Easy 1-click slot booking</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Verified digital prescriptions</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> AI voice & triage guidance</li>
              </ul>
            </div>
            <div className="pt-6">
              <Button variant="outline" className="w-full" onClick={() => navigate('/login?role=PATIENT')}>
                Enter Patient Portal <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Doctor Portal Card */}
          <div className="bg-white rounded-3xl p-8 border border-teal-100 shadow-sm hover:shadow-xl transition flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Doctor Portal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Review assigned appointments, manage schedule availability, access authorized patient histories, and utilize the AI Prescription Drafting Assistant.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> AI prescription drafting & interaction alerts</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Double-booking prevention slots</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-teal-600" /> Consultation room with chat</li>
              </ul>
            </div>
            <div className="pt-6">
              <Button variant="teal" className="w-full" onClick={() => navigate('/login?role=DOCTOR')}>
                Enter Doctor Portal <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Admin Portal Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Admin Portal</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Supervise verified physician registrations, review medical council documents, oversee appointment activity, and audit platform security logs.
              </p>
              <ul className="space-y-2 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Doctor credential verification workflow</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Platform revenue & activity charts</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600" /> Immutable audit logging</li>
              </ul>
            </div>
            <div className="pt-6">
              <Button variant="outline" className="w-full" onClick={() => navigate('/login?role=ADMIN')}>
                Enter Admin Portal <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features Highlight */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 rounded-3xl max-w-7xl mx-auto px-6 sm:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Safe AI Integration
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              AI Prescription Assistant & Home Remedies
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              We uphold strict medical safety guardrails. AI never approves prescriptions independently. Only verified doctors sign prescriptions after reviewing potential drug-drug interactions and patient allergies.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Button variant="teal" onClick={() => navigate('/remedies')}>
                Explore Home Remedies
              </Button>
              <Button variant="outline" className="bg-transparent text-white border-slate-700 hover:bg-slate-800" onClick={() => navigate('/patient/ai-assistant')}>
                Chat with Health AI
              </Button>
            </div>
          </div>

          <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700 space-y-4">
            <h4 className="text-sm font-bold text-teal-400 uppercase tracking-wider">Clinical Safety Protocol</h4>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700">
                <p className="font-bold text-white mb-0.5">1. Emergency Symptom Interceptor</p>
                Immediate referral to 112/102 for suspected heart attack, stroke, respiratory distress, or severe hemorrhage.
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700">
                <p className="font-bold text-white mb-0.5">2. Drug Interaction & Allergy Checker</p>
                Cross-references active prescriptions with known patient allergies before doctor sign-off.
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700">
                <p className="font-bold text-white mb-0.5">3. Medically Reviewed Natural Home Remedies</p>
                Precise preparation instructions with contraindications, age warnings, and pregnancy cautions.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
