
import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Mic, MapPin, Loader2, Camera, ShieldCheck, LogOut,
  MessageSquare, Video, Phone, Star, Activity, ArrowLeft, History,
  Home, Volume2, Calendar, Truck, UserPlus, Image as ImageIcon,
  CreditCard, Banknote, Navigation, Smartphone, CheckCircle,
  Leaf, Sun, Snowflake, CloudRain, Zap, Heart, Info, ThumbsUp,
  ExternalLink
} from 'lucide-react';
import { Message, CaseSeverity, MedicalCase, CaseStatus, User, Appointment, Hospital, Season, HomeRemedy, HealthTip, WellnessActivity } from '../types';
import { startNewChat, analyzeCase, TriageResult, getRealNearbyHospitals } from '../services/geminiService';
import { MOCK_HOSPITALS, MOCK_REMEDIES, MOCK_HEALTH_TIPS, MOCK_WELLNESS_ACTIVITIES } from '../services/mockData';
import { Chat } from '@google/genai';
import Logo from './Logo';

// Declare Leaflet global for TypeScript
declare const L: any;

interface PatientPortalProps {
  user: User;
  patientHistory?: MedicalCase[];
  appointments?: Appointment[];
  onSubmitCase: (newCase: MedicalCase) => void;
  onBookAppointment: (appt: Appointment) => void;
  onLogout: () => void;
}

type ViewState = 'HOME' | 'CONSULT_CHAT' | 'CONSULT_VOICE' | 'TRIAGE_RESULT' | 'FEEDBACK' | 'HISTORY' | 'BOOK_APPOINTMENT' | 'LOCATE_NEARBY' | 'DOCTOR_CONNECT' | 'HOME_REMEDIES' | 'WELLNESS_HUB' | 'DOCTOR_TIPS';

const PatientPortal: React.FC<PatientPortalProps> = ({ user, patientHistory = [], appointments = [], onSubmitCase, onBookAppointment, onLogout }) => {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  const [selectedRemedy, setSelectedRemedy] = useState<HomeRemedy | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<WellnessActivity | null>(null);

  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const [apptDate, setApptDate] = useState('');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [apptDoctor, setApptDoctor] = useState('Dr. A. Sharma (General Physician)');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH'>('UPI');
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<Hospital[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);

  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersGroupRef = useRef<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentView === 'LOCATE_NEARBY' && mapContainerRef.current && !mapRef.current) {
      const defaultPos = userLocation ? [userLocation.lat, userLocation.lng] : [30.9010, 75.8573];
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(defaultPos, 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
      markersGroupRef.current = L.layerGroup().addTo(mapRef.current);

      if (nearbyHospitals.length > 0) {
        updateMapMarkers(nearbyHospitals, userLocation || undefined);
      }
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [currentView]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const updateMapMarkers = (hospitals: Hospital[], userLoc?: { lat: number, lng: number }) => {
    if (!markersGroupRef.current || !mapRef.current) return;
    markersGroupRef.current.clearLayers();

    if (userLoc && !isNaN(userLoc.lat) && !isNaN(userLoc.lng)) {
      const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      L.marker([userLoc.lat, userLoc.lng], { icon: userIcon }).addTo(markersGroupRef.current);
    }

    hospitals.forEach(h => {
      const hLat = Number(h.lat);
      const hLng = Number(h.lng);

      if (!isNaN(hLat) && !isNaN(hLng)) {
        const hospitalIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div class="text-red-500"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="white" stroke-width="1.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 24]
        });

        L.marker([hLat, hLng], { icon: hospitalIcon })
          .bindPopup(`<b>${h.name}</b><br>${h.address}`)
          .addTo(markersGroupRef.current);
      }
    });
  };

  const getCurrentSeason = (): Season => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 5) return Season.SUMMER;
    if (month >= 6 && month <= 8) return Season.MONSOON;
    return Season.WINTER;
  };

  const currentSeason = getCurrentSeason();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isTimerActive && timeLeft === 0) {
      setIsTimerActive(false);
      alert('Activity Session Completed! Great Job!');
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft]);

  const startTimer = () => {
    if (!selectedActivity) return;
    const match = selectedActivity.duration.match(/\d+/);
    const minutes = match ? parseInt(match[0], 10) : 5;
    setTimeLeft(minutes * 60);
    setIsTimerActive(true);
  };

  const getSeasonIcon = (season: Season) => {
    switch (season) {
      case Season.SUMMER: return <Sun className="text-orange-500" />;
      case Season.WINTER: return <Snowflake className="text-blue-500" />;
      case Season.MONSOON: return <CloudRain className="text-emerald-500" />;
      default: return <Sun />;
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices();

      // Multilingual Detection for Speech Output
      const isHindi = /[\u0900-\u097F]/.test(text);
      const isPunjabi = /[\u0A00-\u0A7F]/.test(text);
      let targetLang = 'en-IN';
      if (isHindi) targetLang = 'hi-IN';
      if (isPunjabi) targetLang = 'pa-IN';

      const voice = voices.find(v => v.lang.includes(targetLang)) ||
        voices.find(v => v.lang.includes('IN')) ||
        voices[0];

      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    }
  };

  const initChat = (speak: boolean = false) => {
    setChatSession(startNewChat());
    const greetingText = "Namaste, main AI Upchaar hoon. Bataiye, aapko kya takleef hai? Aap kisi bhi bhasha mein bata sakte hain.";

    setMessages([{
      id: '1',
      role: 'model',
      text: greetingText,
      timestamp: new Date()
    }]);
    setTriageResult(null);

    if (speak) {
      speakResponse(greetingText);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'hi-IN';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        handleSend(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [chatSession]);

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      try {
        recognitionRef.current.start();
      } catch (e) { }
    } else {
      alert("Voice input is not supported in this browser.");
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await convertFileToBase64(file);
        handleSend('', base64);
      } catch (error) {
        console.error("Error converting file to base64", error);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (text: string, imageBase64?: string) => {
    if ((!text.trim() && !imageBase64) || !chatSession) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date(),
      image: imageBase64
    };

    const exitPhrases = ['thank you', 'thanks', 'shukriya', 'dhanyavaad', 'dhanyavad'];
    const lowerText = text.toLowerCase().trim();
    const isExitPhrase = exitPhrases.some(phrase => lowerText.includes(phrase));

    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    if (isExitPhrase) {
      analyzeAndTriage([...messages, userMsg]);
      return;
    }

    setIsLoading(true);

    try {
      const callWithRetry = async (retries = 4, delay = 4000): Promise<any> => {
        try {
          if (imageBase64) {
            const data = imageBase64.split(',')[1];
            const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));
            return await chatSession.sendMessage({
              message: [{ text: text }, { inlineData: { mimeType, data } }]
            });
          } else {
            return await chatSession.sendMessage({ message: text });
          }
        } catch (e: any) {
          const errStr = (e?.message || '') + JSON.stringify(e || '').toLowerCase();
          const isQuota = errStr.includes('429') || errStr.includes('quota') || errStr.includes('exhausted') || errStr.includes('resource');
          const isOverloaded = errStr.includes('503') || errStr.includes('overloaded') || errStr.includes('busy');

          if (retries > 0 && (isQuota || isOverloaded)) {
            const jitter = Math.random() * 1000;
            await new Promise(r => setTimeout(r, delay + jitter));
            return callWithRetry(retries - 1, delay * 1.5);
          }
          throw e;
        }
      };

      const result = await callWithRetry();
      const responseText = result.text || "Hum samajh nahi paaye, kripya phir se kahein.";

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);

      if (currentView === 'CONSULT_VOICE') {
        speakResponse(responseText);
      }
    } catch (error: any) {
      console.error(error);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Kshama karein, system thoda busy hai. Kripya 1 minute baad phir se koshish karein.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeAndTriage = async (customTranscript?: Message[]) => {
    setIsLoading(true);
    const transcriptToAnalyze = customTranscript || messages;
    const fullTranscript = transcriptToAnalyze.map(m => `${m.role}: ${m.text}`).join('\n');
    try {
      const result = await analyzeCase(fullTranscript);
      setTriageResult(result);
      if (result.severity === CaseSeverity.CRITICAL) {
        saveCase(true, 'VIDEO', transcriptToAnalyze);
        setCurrentView('DOCTOR_CONNECT');
        setTimeout(() => {
          setCurrentView('FEEDBACK');
        }, 4000);
      } else {
        setCurrentView('TRIAGE_RESULT');
      }
    } catch (e) {
      console.error("Triage error", e);
      alert("System busy. Kripya 'Finish' button phir se dabayein thodi der baad.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = (needsMedicine: boolean, escalatedMode?: 'VIDEO' | 'VOICE') => {
    if (!triageResult) return;
    if (escalatedMode) {
      setCurrentView('DOCTOR_CONNECT');
      setTimeout(() => {
        saveCase(needsMedicine, escalatedMode);
        setCurrentView('FEEDBACK');
      }, 3000);
    } else {
      saveCase(needsMedicine);
      setCurrentView('FEEDBACK');
    }
  };

  const saveCase = (needsMedicine: boolean, escalatedMode?: 'VIDEO' | 'VOICE', customMessages?: Message[]) => {
    if (!triageResult) return;
    const msgs = customMessages || messages;
    const images = msgs.filter(m => m.image).map(m => m.image!);

    const newCase: MedicalCase = {
      id: `CS-${Date.now()}`,
      patientId: user.id,
      patientName: user.name,
      timestamp: new Date().toISOString(),
      mode: 'ONLINE',
      symptoms: ['Extracted from chat'],
      aiDiagnosis: triageResult.diagnosis,
      severity: triageResult.severity,
      careSuggestions: triageResult.careSuggestions,
      status: (triageResult.severity === CaseSeverity.CRITICAL || escalatedMode) ? CaseStatus.OPEN : (needsMedicine ? CaseStatus.PENDING_APPROVAL : CaseStatus.COMPLETED),
      transcript: msgs,
      prescription: triageResult.suggestedPrescription,
      homeRemedies: triageResult.homeRemedies,
      doctorNotes: escalatedMode ? `Patient requested ${escalatedMode} escalation.` : undefined,
      deliveryEta: needsMedicine ? 'Calculating...' : undefined,
      images: images,
      patientLocation: userLocation ? { ...userLocation, address: 'Current Location' } : undefined
    };

    onSubmitCase(newCase);
  };

  const detectLocation = () => {
    setLocationLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          if (isNaN(lat) || isNaN(lng)) {
            alert("Unable to fetch accurate coordinates.");
            setLocationLoading(false);
            return;
          }

          const loc = { lat, lng };
          setUserLocation(loc);

          try {
            const realFacilities = await getRealNearbyHospitals(lat, lng);

            // Enforce correct data mapping and calculate real distances
            const withDistance = realFacilities.map(hospital => ({
              ...hospital,
              distance: `${calculateDistance(lat, lng, hospital.lat, hospital.lng).toFixed(1)} km`
            }));

            setNearbyHospitals(withDistance);

            if (mapRef.current) {
              mapRef.current.flyTo([lat, lng], 14);
              updateMapMarkers(withDistance, loc);
            }
          } catch (err) {
            console.error("Nearby Search Error:", err);
            setNearbyHospitals([]);
          }

          setLocationLoading(false);
        },
        (err) => {
          alert("Unable to retrieve location. GPS permission required.");
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation not supported by your device.");
      setLocationLoading(false);
    }
  };

  const openBookingForHospital = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setCurrentView('BOOK_APPOINTMENT');
  };

  const handleBookingSubmit = () => {
    setIsPaymentProcessing(true);
    setTimeout(() => {
      setIsPaymentProcessing(false);
      const newAppt: Appointment = {
        id: `APT-${Date.now()}`,
        patientId: user.id,
        patientName: user.name,
        doctorId: 'DR101',
        doctorName: apptDoctor,
        hospitalName: selectedHospital?.name || 'Online Consultation',
        hospitalAddress: selectedHospital?.address,
        date: apptDate || new Date(Date.now() + 86400000).toISOString(),
        reason: 'General Consultation',
        status: 'SCHEDULED',
        paymentStatus: paymentMethod === 'CASH' ? 'PAY_AT_CLINIC' : 'PAID',
        amount: selectedHospital?.consultationFee || 200
      };
      onBookAppointment(newAppt);
      setSelectedHospital(null);
      setApptDate('');
      setCurrentView('HOME');
      alert(paymentMethod === 'CASH' ? "Appointment Confirmed! Pay at clinic." : "Payment Successful! Appointment Confirmed.");
    }, 2000);
  };

  const submitFeedback = () => {
    setCurrentView('HOME');
    setFeedbackRating(0);
    setFeedbackComment('');
  };

  const renderHome = () => (
    <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto">
      <div className="mb-6 text-center flex flex-col items-center">
        <Logo className="w-12 h-12 text-emerald-600 mb-3" />
        <h1 className="text-2xl font-bold text-slate-800">Namaste, {user.name}</h1>
        <p className="text-slate-500 font-medium">Healthcare for Every Village</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => { initChat(false); setCurrentView('CONSULT_CHAT'); }}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-2 hover:border-emerald-500 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 group-hover:scale-110 transition">
            <MessageSquare size={24} />
          </div>
          <span className="font-semibold text-slate-800 text-sm">Chat AI</span>
        </button>
        <button
          onClick={() => { initChat(true); setCurrentView('CONSULT_VOICE'); }}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-2 hover:border-blue-500 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition">
            <Mic size={24} />
          </div>
          <span className="font-semibold text-slate-800 text-sm">Voice AI</span>
        </button>
        <button
          onClick={() => setCurrentView('LOCATE_NEARBY')}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-2 hover:border-amber-500 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 group-hover:scale-110 transition">
            <MapPin size={24} />
          </div>
          <span className="font-semibold text-slate-800 text-sm">Nearby Help</span>
        </button>
        <button
          onClick={() => {
            setSelectedHospital(null);
            setCurrentView('BOOK_APPOINTMENT');
          }}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-2 hover:border-purple-500 hover:shadow-md transition group"
        >
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 group-hover:scale-110 transition">
            <Calendar size={24} />
          </div>
          <span className="font-semibold text-slate-800 text-sm">Book Appt</span>
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">Wellness & Support</h3>
        <div className="space-y-3">
          <button
            onClick={() => setCurrentView('HOME_REMEDIES')}
            className="w-full bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center gap-4 hover:bg-amber-100 transition group text-left"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition">
              <Leaf size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-sm">Seasonal Home Remedies</h4>
              <p className="text-xs text-slate-500">Doctor-verified natural care</p>
            </div>
            <div className="p-1 bg-white rounded-full shadow-sm">
              {getSeasonIcon(currentSeason)}
            </div>
          </button>

          <button
            onClick={() => setCurrentView('WELLNESS_HUB')}
            className="w-full bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-4 hover:bg-emerald-100 transition group text-left"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition">
              <Zap size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-sm">Yoga & Immunity</h4>
              <p className="text-xs text-slate-500">Guided exercises for strength</p>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('DOCTOR_TIPS')}
            className="w-full bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-4 hover:bg-blue-100 transition group text-left"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition">
              <Heart size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800 text-sm">Doctor's Daily Tips</h4>
              <p className="text-xs text-slate-500">Professional lifestyle advice</p>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2 text-sm"><History size={16} /> Recent Activity</h3>
          <button onClick={() => setCurrentView('HISTORY')} className="text-xs text-emerald-600 font-medium">View All</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {appointments.slice(0, 1).map(apt => (
            <div key={apt.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-purple-700">UPCOMING APPOINTMENT</span>
                <span className="text-xs text-purple-600">{new Date(apt.date).toLocaleDateString()}</span>
              </div>
              <p className="text-sm font-medium text-slate-800">{apt.doctorName}</p>
            </div>
          ))}
          {patientHistory.slice(0, 2).map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-800">{c.aiDiagnosis || 'Symptom Check'}</p>
                <p className="text-xs text-slate-500">{new Date(c.timestamp).toLocaleDateString()}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${c.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                }`}>
                {c.status.replace('_', ' ')}
              </span>
            </div>
          ))}
          {patientHistory.length === 0 && appointments.length === 0 && <p className="text-center text-slate-400 text-sm py-4">No recent activity.</p>}
        </div>
      </div>
    </div>
  );

  const renderHomeRemedies = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">Home Remedies</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">Current Season</p>
            <p className="text-lg font-bold text-slate-800 capitalize">{currentSeason.toLowerCase()}</p>
          </div>
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center shadow-inner">
            {getSeasonIcon(currentSeason)}
          </div>
        </div>

        <p className="text-xs text-slate-500 px-1 font-medium">Recommended for common seasonal illnesses:</p>

        {MOCK_REMEDIES.filter(r => r.season === currentSeason || r.season === Season.ALL).map(remedy => (
          <div
            key={remedy.id}
            onClick={() => setSelectedRemedy(remedy)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-amber-400 cursor-pointer transition group"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-slate-800 group-hover:text-amber-700 transition">{remedy.title}</h4>
              <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                <Star size={12} fill="currentColor" /> {remedy.rating}
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-3">{remedy.ailment}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold flex items-center gap-1">
                <ShieldCheck size={10} className="text-emerald-500" /> Verified by {remedy.doctorName}
              </span>
              <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">View Recipe →</span>
            </div>
          </div>
        ))}
      </div>

      {selectedRemedy && (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b flex items-center justify-between">
            <button onClick={() => setSelectedRemedy(null)}><ArrowLeft size={24} className="text-slate-500" /></button>
            <h2 className="font-bold text-slate-800">Preparation Guide</h2>
            <div className="w-6"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-amber-50 rounded-3xl p-6 text-center mb-8">
              <Leaf className="w-12 h-12 text-amber-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-800 mb-1">{selectedRemedy.title}</h3>
              <p className="text-amber-700 text-sm font-medium">{selectedRemedy.ailment}</p>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span> Ingredients
                </h4>
                <ul className="grid grid-cols-1 gap-2">
                  {selectedRemedy.ingredients.map((item, idx) => (
                    <li key={idx} className="bg-slate-50 p-3 rounded-xl text-sm text-slate-700 border border-slate-100 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span> Steps to Prepare
                </h4>
                <div className="space-y-4">
                  {selectedRemedy.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4">
                      <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-slate-600 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <p className="text-center text-xs text-slate-400 mb-4 font-bold uppercase tracking-widest">Was this helpful?</p>
                <div className="flex justify-center gap-4">
                  <button className="flex items-center gap-2 px-6 py-2 bg-slate-100 rounded-full text-sm font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition">
                    <ThumbsUp size={16} /> Yes
                  </button>
                  <button className="flex items-center gap-2 px-6 py-2 bg-slate-100 rounded-full text-sm font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition">
                    <Star size={16} /> Rate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderWellnessHub = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">Yoga & Strength</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-bold text-lg mb-1">Morning Routine</h3>
            <p className="text-emerald-50 text-xs">Start your day with these doctor-recommended light activities to build immunity.</p>
          </div>
          <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-emerald-500 opacity-20" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-2">
          {['ALL', 'ELDERLY', 'ADULTS'].map(tag => (
            <button key={tag} className="px-3 py-2 bg-white rounded-xl text-[10px] font-bold text-slate-400 border border-slate-100 hover:border-emerald-400 hover:text-emerald-600 transition uppercase tracking-widest">
              {tag}
            </button>
          ))}
        </div>

        {MOCK_WELLNESS_ACTIVITIES.map(activity => (
          <div
            key={activity.id}
            onClick={() => setSelectedActivity(activity)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-400 cursor-pointer transition flex items-center gap-4"
          >
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-600 flex-shrink-0">
              {activity.type === 'BREATHING' ? <Volume2 className="rotate-90" /> : <Zap />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-slate-800 text-sm">{activity.title}</h4>
                <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">{activity.duration}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-1">{activity.benefit}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedActivity && (
        <div className="absolute inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b flex items-center justify-between">
            <button onClick={() => setSelectedActivity(null)}><ArrowLeft size={24} className="text-slate-500" /></button>
            <h2 className="font-bold text-slate-800">Activity Guide</h2>
            <div className="w-6"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-emerald-50 rounded-3xl p-6 text-center mb-8">
              <Zap className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-800 mb-1">{selectedActivity.title}</h3>
              <p className="text-emerald-700 text-sm font-medium">{selectedActivity.benefit}</p>
              <div className="mt-4 flex justify-center gap-2">
                <span className="px-2 py-1 bg-white rounded-lg text-[10px] font-bold text-emerald-600 border border-emerald-100">{selectedActivity.level}</span>
                <span className="px-2 py-1 bg-white rounded-lg text-[10px] font-bold text-emerald-600 border border-emerald-100">{selectedActivity.ageGroup}</span>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span> Step-by-Step
              </h4>
              <div className="space-y-8">
                {selectedActivity.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4 relative">
                    {idx < selectedActivity.steps.length - 1 && (
                      <div className="absolute top-8 left-3.5 w-0.5 h-full bg-slate-100"></div>
                    )}
                    <span className="flex-shrink-0 w-8 h-8 bg-white border-2 border-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xs font-bold z-10">
                      {idx + 1}
                    </span>
                    <p className="text-sm text-slate-600 leading-relaxed pt-1.5">{step}</p>
                  </div>
                ))}
              </div>

              <div className="pt-10">
                {!isTimerActive ? (
                  <button
                    onClick={startTimer}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100"
                  >
                    Start Session (Timer)
                  </button>
                ) : (
                  <div className="bg-emerald-50 rounded-2xl p-6 text-center shadow-inner border border-emerald-100">
                    <h3 className="text-4xl font-black text-emerald-600 mb-2 font-mono">
                      {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </h3>
                    <p className="text-emerald-700 text-sm font-medium mb-6 animate-pulse">Session in progress...</p>
                    <button
                      onClick={() => setIsTimerActive(false)}
                      className="w-full py-3 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition border border-red-200"
                    >
                      Stop / Pause Session
                    </button>
                  </div>
                )}
                <p className="text-center text-[10px] text-slate-400 mt-4 italic px-4">Stop immediately if you feel any pain or dizziness.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDoctorTips = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">Doctor's Health Tips</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-4 mb-2">
          <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-blue-700 font-medium leading-relaxed">Trusted advice from our rural healthcare network. Tips are updated daily based on local health conditions.</p>
        </div>

        {MOCK_HEALTH_TIPS.map(tip => (
          <div key={tip.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border-2 border-slate-50 group-hover:border-blue-200 transition">
                {tip.doctorName.charAt(4)}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm">{tip.doctorName}</h4>
                <p className="text-[10px] text-slate-400">{new Date(tip.timestamp).toLocaleDateString()}</p>
              </div>
              <span className="text-[9px] bg-blue-50 px-2 py-0.5 rounded text-blue-600 font-bold uppercase tracking-wider">{tip.category}</span>
            </div>
            <h5 className="font-bold text-slate-800 mb-2">{tip.title}</h5>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{tip.content}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <button className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-emerald-600 transition">
                <Heart size={14} className="hover:fill-current" /> {tip.likes} found this helpful
              </button>
              <button className="text-xs font-bold text-slate-400 hover:text-blue-600 transition flex items-center gap-1">
                Reply <Send size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConsultation = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between shrink-0">
        <button onClick={() => setCurrentView('HOME')} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <Logo className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-slate-800 text-sm">AI Upchaar Assistant</span>
          </div>
          <span className="text-[10px] text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Language Adaptive
          </span>
        </div>
        <button
          onClick={() => analyzeAndTriage()}
          disabled={messages.length < 2 || isLoading}
          className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-full hover:bg-emerald-700 disabled:opacity-50 transition"
        >
          Finish
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm whitespace-pre-line ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
              }`}>
              {msg.image && (
                <img src={msg.image} alt="uploaded" className="w-full h-auto rounded-lg mb-2 border border-white/20" />
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
              <span className="text-[10px] text-slate-400 font-medium">System Processing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        {currentView === 'CONSULT_VOICE' ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <button
              onClick={isListening ? () => recognitionRef.current?.stop() : startListening}
              disabled={isLoading}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg'
                } disabled:opacity-50`}
            >
              <Mic size={28} className="text-white" />
            </button>
            <p className="text-xs text-slate-500 font-medium">
              {isListening ? 'Listening (Hindi/Eng/Punjabi)...' : isLoading ? 'Processing response...' : 'Tap to Speak'}
            </p>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageSelect}
              disabled={isLoading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-3 text-slate-400 hover:bg-slate-100 rounded-full transition disabled:opacity-30"
            >
              <ImageIcon size={20} />
            </button>
            <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-emerald-500">
              <textarea
                value={inputText}
                disabled={isLoading}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(inputText);
                  }
                }}
                placeholder="Describe symptoms here..."
                className="w-full bg-transparent border-0 focus:ring-0 text-sm resize-none max-h-20"
                rows={1}
              />
            </div>
            <button
              onClick={() => handleSend(inputText)}
              disabled={!inputText.trim() || isLoading}
              className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderTriageResult = () => {
    if (!triageResult) return null;
    const isSerious = triageResult.severity === CaseSeverity.MODERATE || triageResult.severity === CaseSeverity.CRITICAL;

    return (
      <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
        <div className="p-6">
          <div className={`p-6 rounded-2xl shadow-sm border mb-6 text-center ${isSerious ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isSerious ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
              <Activity size={32} />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${isSerious ? 'text-red-800' : 'text-emerald-800'}`}>
              {isSerious ? 'Doctor Consultation Recommended' : 'Mild Condition Detected'}
            </h2>
            <p className="text-slate-600 text-sm">
              {triageResult.diagnosis}
            </p>
            <div className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Severity Level: {triageResult.severity}
            </div>
          </div>

          {!isSerious && triageResult.homeRemedies && triageResult.homeRemedies.length > 0 && (
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-6">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">🌿 Home Remedies</h3>
              <ul className="space-y-2">
                {triageResult.homeRemedies.map((remedy, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0"></span>
                    {remedy}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-3">
            {isSerious ? (
              <>
                <button
                  onClick={() => handleFinalSubmit(true, 'VIDEO')}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-3 hover:bg-emerald-700 transition"
                >
                  <Video size={20} /> Connect to Doctor (Video)
                </button>
                <button
                  onClick={() => handleFinalSubmit(true, 'VOICE')}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3 hover:bg-blue-700 transition"
                >
                  <Phone size={20} /> Voice Call Doctor
                </button>
                <button
                  onClick={() => setCurrentView('BOOK_APPOINTMENT')}
                  className="w-full py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-slate-50 transition"
                >
                  <Calendar size={20} /> Book Appointment
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleFinalSubmit(true)}
                  className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-3 hover:bg-emerald-700 transition"
                >
                  <Truck size={20} /> Request Medicine Delivery
                </button>
                <button
                  onClick={() => handleFinalSubmit(false)}
                  className="w-full py-4 bg-white text-slate-600 border border-slate-200 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-slate-50 transition"
                >
                  I'll use Home Remedies
                </button>
              </>
            )}
            {/* Back to Home Button triggers Feedback flow as per objective */}
            <button
              onClick={() => setCurrentView('FEEDBACK')}
              className="w-full py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-slate-50 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderLocateNearby = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">Nearby Healthcare</h2>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>

        <div className="z-10 p-4 h-full flex flex-col pointer-events-none">
          <div className="bg-white p-2 rounded-xl shadow-lg flex items-center gap-2 pointer-events-auto mb-auto">
            <button
              onClick={detectLocation}
              disabled={locationLoading}
              className="p-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex-shrink-0"
            >
              {locationLoading ? <Loader2 className="animate-spin" /> : <Navigation size={20} />}
            </button>
            <div className="flex-1 px-2">
              <p className="text-sm font-semibold text-slate-800">
                {userLocation ? "Location Detected" : "Find Nearby Hospitals"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : "Tap button to enable GPS"}
              </p>
            </div>
          </div>

          {nearbyHospitals.length > 0 && (
            <div className="bg-white rounded-t-2xl shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] max-h-[60%] overflow-y-auto pointer-events-auto -mx-4">
              <div className="p-4 border-b border-slate-100 sticky top-0 bg-white">
                <h3 className="font-bold text-slate-800">{nearbyHospitals.length} Centers Found</h3>
              </div>
              <div className="p-2 space-y-2">
                {nearbyHospitals.map(hospital => (
                  <div key={hospital.id} className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{hospital.name}</h4>
                      <p className="text-xs text-slate-500 mb-1">{hospital.address}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-mono font-medium">{hospital.distance || "0.0 km"} away</span>
                        <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold">₹{hospital.consultationFee}</span>
                        {hospital.url && (
                          <a href={hospital.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 flex items-center gap-0.5 font-bold hover:underline">
                            <ExternalLink size={10} /> Source
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openBookingForHospital(hospital)}
                      className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 shadow-sm"
                    >
                      Book
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {userLocation && nearbyHospitals.length === 0 && !locationLoading && (
            <div className="mt-auto bg-white p-6 rounded-t-2xl shadow-lg pointer-events-auto -mx-4 text-center">
              <MapPin className="mx-auto text-slate-300 mb-2" size={32} />
              <p className="text-sm font-bold text-slate-800">No facilities found within 10km.</p>
              <p className="text-xs text-slate-500">Try zooming out or moving to a different area.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderBooking = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">Book Appointment</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Hospital / Clinic</h3>
          <p className="text-lg font-bold text-slate-800">{selectedHospital ? selectedHospital.name : 'Online Consultation'}</p>
          <p className="text-sm text-slate-500">{selectedHospital ? selectedHospital.address : 'Video Call'}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Select Doctor</label>
          <select
            value={apptDoctor}
            onChange={(e) => setApptDoctor(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option>Dr. A. Sharma (General Physician)</option>
            <option>Dr. P. Kaur (Cardiologist)</option>
            <option>Dr. R. Singh (Pediatrician)</option>
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Select Date</label>
          <input
            type="date"
            value={apptDate}
            onChange={(e) => setApptDate(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-3">Payment Method</label>
          <div className="space-y-3">
            <button
              onClick={() => setPaymentMethod('UPI')}
              className={`w-full flex items-center p-3 border rounded-xl transition ${paymentMethod === 'UPI' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white'}`}
            >
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mr-3">
                <Smartphone size={20} className="text-slate-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm">UPI / GPay / PhonePe</p>
                <p className="text-xs text-slate-500">Fast & Secure</p>
              </div>
              <div className="text-right">
                {paymentMethod === 'UPI' && <CheckCircle size={20} className="text-emerald-600" />}
              </div>
            </button>
            <button
              onClick={() => setPaymentMethod('CARD')}
              className={`w-full flex items-center p-3 border rounded-xl transition ${paymentMethod === 'CARD' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white'}`}
            >
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mr-3">
                <CreditCard size={20} className="text-slate-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm">Debit / Credit Card</p>
                <p className="text-xs text-slate-500">Visa, MasterCard, RuPay</p>
              </div>
              <div className="text-right">
                {paymentMethod === 'CARD' && <CheckCircle size={20} className="text-emerald-600" />}
              </div>
            </button>
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`w-full flex items-center p-3 border rounded-xl transition ${paymentMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white'}`}
            >
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mr-3">
                <Banknote size={20} className="text-slate-600" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm">Pay at Clinic</p>
                <p className="text-xs text-slate-500">Cash counter payment</p>
              </div>
              <div className="text-right">
                {paymentMethod === 'CASH' && <CheckCircle size={20} className="text-emerald-600" />}
              </div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 px-2">
          <span className="text-sm font-medium text-slate-600">Total Fee</span>
          <span className="text-xl font-bold text-slate-900">₹{selectedHospital?.consultationFee || 200}</span>
        </div>

        <button
          onClick={handleBookingSubmit}
          disabled={!apptDate || isPaymentProcessing}
          className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPaymentProcessing ? (
            <>
              <Loader2 className="animate-spin" /> Processing...
            </>
          ) : (
            <>
              {paymentMethod === 'CASH' ? 'Confirm Booking' : `Pay ₹${selectedHospital?.consultationFee || 200} & Book`}
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">My Medical History</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {appointments.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 ml-1">Upcoming Appointments</h3>
            <div className="space-y-3">
              {appointments.map(apt => (
                <div key={apt.id} className="bg-white p-4 rounded-xl shadow-sm border border-l-4 border-purple-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800">{apt.doctorName}</h4>
                      <p className="text-sm text-slate-500">{new Date(apt.date).toLocaleDateString()} • {apt.hospitalName || 'Online'}</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full block mb-1">{apt.status}</span>
                      {apt.paymentStatus === 'PAID' && <span className="text-[10px] text-green-600 font-bold flex items-center justify-end gap-1"><CheckCircle size={10} /> Paid ₹{apt.amount}</span>}
                      {apt.paymentStatus === 'PAY_AT_CLINIC' && <span className="text-[10px] text-amber-600 font-bold">Pay at Clinic</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-3 ml-1">Past Consultations</h3>
          <div className="space-y-3">
            {patientHistory.map(c => (
              <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-slate-800">{c.aiDiagnosis}</h3>
                    <p className="text-xs text-slate-500">{new Date(c.timestamp).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-[10px] rounded-full font-bold uppercase ${c.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                    {c.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{c.transcript[0]?.text}</p>
                {c.prescription && (
                  <div className="bg-emerald-50 p-2 rounded border border-emerald-100 text-xs text-emerald-800 font-medium flex items-start gap-2">
                    <span>💊</span>
                    <span>{c.prescription}</span>
                  </div>
                )}
              </div>
            ))}
            {patientHistory.length === 0 && (
              <div className="text-center text-slate-400 py-8 italic bg-slate-100 rounded-xl border border-dashed border-slate-300">No past consultations found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderFeedback = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-50 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-100 max-w-sm w-full">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Case Recorded</h2>
        <p className="text-slate-500 mb-6 text-sm">
          Your interaction has been saved. Help us improve by rating your experience.
        </p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setFeedbackRating(star)}
              className={`p-1 transition-all hover:scale-110 ${feedbackRating >= star ? 'text-amber-400 fill-current' : 'text-slate-300'}`}
            >
              <Star size={32} fill={feedbackRating >= star ? "currentColor" : "none"} />
            </button>
          ))}
        </div>

        <textarea
          placeholder="Optional comments..."
          value={feedbackComment}
          onChange={(e) => setFeedbackComment(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          rows={3}
        />

        <button
          onClick={submitFeedback}
          className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition"
        >
          Submit Feedback
        </button>

        <button
          onClick={() => setCurrentView('HOME')}
          className="w-full py-3 mt-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold hover:bg-slate-50 transition"
        >
          Back to Home
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] md:h-[800px] max-w-md mx-auto bg-white shadow-2xl md:rounded-2xl md:my-4 overflow-hidden border border-slate-200 relative">
      <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-blue-500 w-full"></div>

      {currentView === 'HOME' && renderHome()}
      {(currentView === 'CONSULT_CHAT' || currentView === 'CONSULT_VOICE') && renderConsultation()}
      {currentView === 'TRIAGE_RESULT' && renderTriageResult()}
      {currentView === 'BOOK_APPOINTMENT' && renderBooking()}
      {currentView === 'LOCATE_NEARBY' && renderLocateNearby()}
      {currentView === 'DOCTOR_CONNECT' && (
        <div className="flex flex-col h-full bg-slate-900 items-center justify-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-900/20 animate-pulse"></div>
          <Video size={48} className="text-white z-10 animate-bounce" />
          <p className="mt-4 font-bold text-lg z-10">Connecting to Doctor...</p>
          <p className="text-xs text-white/60 uppercase tracking-widest mt-2">Critical Priority Escalation</p>
        </div>
      )}
      {currentView === 'HISTORY' && renderHistory()}
      {currentView === 'FEEDBACK' && renderFeedback()}

      {currentView === 'HOME_REMEDIES' && renderHomeRemedies()}
      {currentView === 'WELLNESS_HUB' && renderWellnessHub()}
      {currentView === 'DOCTOR_TIPS' && renderDoctorTips()}

      {currentView === 'HOME' && (
        <div className="absolute top-4 right-4">
          <button onClick={onLogout} className="p-2 bg-slate-100 rounded-full hover:bg-red-50 hover:text-red-600 transition">
            <LogOut size={18} />
          </button>
        </div>
      )}

      <div className="hidden"><Truck /><UserPlus /></div>
    </div>
  );
};

export default PatientPortal;
