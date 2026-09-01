
import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Mic, MapPin, Loader2, Camera, ShieldCheck, LogOut,
  MessageSquare, Video, Phone, Star, Activity, ArrowLeft, History,
  Home, Volume2, Calendar, Truck, UserPlus, Image as ImageIcon,
  CreditCard, Banknote, Navigation, Smartphone, CheckCircle,
  Leaf, Sun, Snowflake, CloudRain, Zap, Heart, Info, ThumbsUp,
  ExternalLink, Smile
} from 'lucide-react';
import { Message, CaseSeverity, MedicalCase, CaseStatus, User, Appointment, Hospital, Season, HomeRemedy, HealthTip, WellnessActivity } from '../types';
import { startNewChat, analyzeCase, TriageResult, getRealNearbyHospitals } from '../services/geminiService';
import { UniversalChatSession } from '../services/aiService';
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

const FULL_EMOJI_LIST = [
  '❤️', '😘', '👍', '😂', '😑', '🔥', '😍', '🙃', '🤣',
  '🙄', '😐', '😞', '😅', '😶', '✨', '🫠', '😶', '😮',
  '🤤', '🫣', '🥹', '😁', '❣️', '😔', '😬', '🎉', '🌦️',
  '💯', '👎', '😠', '🙏', '🤯', '😓', '🎊', '😰', '🙌'
];

type ViewState = 'HOME' | 'CONSULT_CHAT' | 'CONSULT_VOICE' | 'TRIAGE_RESULT' | 'FEEDBACK' | 'HISTORY' | 'BOOK_APPOINTMENT' | 'LOCATE_NEARBY' | 'DOCTOR_CONNECT' | 'HOME_REMEDIES' | 'WELLNESS_HUB' | 'DOCTOR_TIPS';

const PatientPortal: React.FC<PatientPortalProps> = ({ user, patientHistory = [], appointments = [], onSubmitCase, onBookAppointment, onLogout }) => {
  const [currentView, setCurrentView] = useState<ViewState>('HOME');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<UniversalChatSession | null>(null);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  // Doctor Tips Interaction State
  const [tipReactions, setTipReactions] = useState<Record<string, string>>({});
  const [tipComments, setTipComments] = useState<Record<string, Array<{ id: string, text: string, author: string, time: string }>>>({
    'T-001': [
      { id: 'c1', text: 'This is very helpful! I will try to get some sun tomorrow morning.', author: 'Ramesh Kumar', time: '2 hours ago' },
      { id: 'c2', text: 'Does it have to be direct sunlight or works through a window?', author: 'Sunita Devi', time: '1 hour ago' },
      { id: 'c3', text: 'Dr. Sharma, can I get sunlight in the evening instead?', author: 'Vikram Singh', time: '45 mins ago' },
      { id: 'c4', text: 'I started doing this and my energy levels are much better.', author: 'Anita Kaur', time: '15 mins ago' }
    ],
    'T-002': [
      { id: 'c5', text: 'I started doing this last week and my acidity is completely gone. Thank you doctor!', author: 'Gurpreet Singh', time: '5 hours ago' },
      { id: 'c6', text: 'Is 7 PM a good time for dinner?', author: 'Balwinder Singh', time: '3 hours ago' },
      { id: 'c7', text: 'Tried it yesterday, definitely slept better!', author: 'Priya Sharma', time: 'Just now' }
    ],
    'T-003': [
      { id: 'c8', text: 'I always forget to drink water, keeping a pot nearby is a great idea.', author: 'Ramesh Kumar', time: '1 day ago' },
      { id: 'c9', text: 'Should the water be cold or room temperature?', author: 'Sunita Devi', time: '12 hours ago' }
    ]
  });
  const [activeTipComments, setActiveTipComments] = useState<string | null>(null);
  const [activeReactionDrawer, setActiveReactionDrawer] = useState<string | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [activeExpandedEmojiPicker, setActiveExpandedEmojiPicker] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [showCommentEmojiPicker, setShowCommentEmojiPicker] = useState(false);

  const [selectedRemedy, setSelectedRemedy] = useState<HomeRemedy | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<WellnessActivity | null>(null);

  // Remedy UI interactions state
  const [likedRemedies, setLikedRemedies] = useState<Record<string, boolean>>({});
  const [remedyLikeCounts, setRemedyLikeCounts] = useState<Record<string, number>>({});
  const [ratingInputFor, setRatingInputFor] = useState<string | null>(null);
  const [ratedRemedies, setRatedRemedies] = useState<Record<string, number>>({});

  const getInitialLikes = (id: string) => {
    return 100 + (id.length * 7);
  };

  const handleLikeRemedy = (id: string) => {
    if (likedRemedies[id]) return;
    setLikedRemedies(prev => ({ ...prev, [id]: true }));
    setRemedyLikeCounts(prev => ({
      ...prev,
      [id]: (prev[id] !== undefined ? prev[id] : getInitialLikes(id)) + 1
    }));
  };

  const handleSubmitRating = (id: string, rating: number) => {
    setRatedRemedies(prev => ({ ...prev, [id]: rating }));
    setRatingInputFor(id);

    // Auto-hide the success message after 2.5 seconds
    setTimeout(() => {
      setRatingInputFor(prev => prev === id ? null : prev);
    }, 2500);
  };
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

    const exitPhrases = ['thank you', 'thanks', 'shukriya', 'dhanyavaad', 'dhanyavad', 'ji haa', 'ji haan', 'haan ji', 'theek hai', 'thik hai', 'confirm'];
    const lowerText = text.toLowerCase().trim();
    const isExitPhrase = exitPhrases.some(phrase => lowerText === phrase || lowerText.includes(phrase)) && messages.length >= 3;

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
    const fullText = msgs.map(m => m.text).join('\n');

    // Extract phone number from transcript if patient mentioned it
    const phoneMatch = fullText.match(/\b[6-9]\d{9}\b/);
    const phone = phoneMatch ? phoneMatch[0] : (user.mobileNumber || '');

    // Extract address from transcript if patient mentioned it
    let detectedAddress = 'Current Location';
    const lines = fullText.split('\n');
    for (const line of lines) {
      if (/kishangarh|ajmer|village|colony|mohalla|plot|ward|gali|house|nagar|pur/i.test(line) && !line.startsWith('model:')) {
        detectedAddress = line.replace(/user:\s*/i, '').trim();
        break;
      }
    }

    const userMsgs = msgs.filter(m => m.role === 'user').map(m => m.text);
    const symptomsList = userMsgs.length > 0 ? userMsgs.slice(0, 3) : ['High Fever', 'Cough'];

    const newCase: MedicalCase = {
      id: `CS-${Date.now()}`,
      patientId: user.id,
      patientName: user.name + (phone ? ` (${phone})` : ''),
      timestamp: new Date().toISOString(),
      mode: 'ONLINE',
      symptoms: symptomsList,
      aiDiagnosis: triageResult.diagnosis || 'Acute High Fever & Respiratory Symptoms',
      severity: triageResult.severity || CaseSeverity.CRITICAL,
      careSuggestions: triageResult.careSuggestions,
      status: (triageResult.severity === CaseSeverity.CRITICAL || escalatedMode) ? CaseStatus.OPEN : (needsMedicine ? CaseStatus.PENDING_APPROVAL : CaseStatus.COMPLETED),
      transcript: msgs,
      prescription: triageResult.suggestedPrescription,
      homeRemedies: triageResult.homeRemedies,
      doctorNotes: (escalatedMode ? `Patient requested immediate ${escalatedMode} escalation.` : '') + (phone ? ` Contact: ${phone}.` : '') + (detectedAddress !== 'Current Location' ? ` Village/Address: ${detectedAddress}` : ''),
      deliveryEta: needsMedicine ? 'Pending Dispatch (20 min)' : undefined,
      images: images,
      patientLocation: userLocation 
        ? { ...userLocation, address: detectedAddress } 
        : { lat: 26.5786, lng: 74.8698, address: detectedAddress }
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
    <div className="flex flex-col h-full bg-slate-50 p-3 sm:p-6 overflow-y-auto overflow-x-hidden">
      <div className="mb-6 text-center flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
        <Logo className="w-12 h-12 text-emerald-600 mb-3" />
        <h1 className="text-2xl font-bold text-slate-800">Namaste, {user.name}</h1>
        <p className="text-slate-500 font-medium">Healthcare for Every Village</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
        <button
          onClick={() => { initChat(false); setCurrentView('CONSULT_CHAT'); }}
          className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-1.5 sm:gap-2 hover:border-emerald-500 hover:shadow-md transition group animate-in zoom-in-95 fade-in duration-300"
          style={{ animationDelay: '75ms', animationFillMode: 'both' }}
        >
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 group-hover:scale-110 transition">
            <MessageSquare size={24} />
          </div>
          <span className="font-semibold text-slate-800 text-[11.5px] sm:text-sm">Chat AI</span>
        </button>
        <button
          onClick={() => { initChat(true); setCurrentView('CONSULT_VOICE'); }}
          className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-1.5 sm:gap-2 hover:border-blue-500 hover:shadow-md transition group animate-in zoom-in-95 fade-in duration-300"
          style={{ animationDelay: '150ms', animationFillMode: 'both' }}
        >
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition">
            <Mic size={24} />
          </div>
          <span className="font-semibold text-slate-800 text-[11.5px] sm:text-sm">Voice AI</span>
        </button>
        <button
          onClick={() => setCurrentView('LOCATE_NEARBY')}
          className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-1.5 sm:gap-2 hover:border-amber-500 hover:shadow-md transition group animate-in zoom-in-95 fade-in duration-300"
          style={{ animationDelay: '225ms', animationFillMode: 'both' }}
        >
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 group-hover:scale-110 transition">
            <MapPin size={24} />
          </div>
          <span className="font-semibold text-slate-800 text-[11.5px] sm:text-sm">Nearby Help</span>
        </button>
        <button
          onClick={() => {
            setSelectedHospital(null);
            setCurrentView('BOOK_APPOINTMENT');
          }}
          className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center gap-1.5 sm:gap-2 hover:border-purple-500 hover:shadow-md transition group animate-in zoom-in-95 fade-in duration-300"
          style={{ animationDelay: '300ms', animationFillMode: 'both' }}
        >
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 group-hover:scale-110 transition">
            <Calendar size={24} />
          </div>
          <span className="font-semibold text-slate-800 text-[11.5px] sm:text-sm">Book Appt</span>
        </button>
      </div>

      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1 animate-in fade-in duration-300" style={{ animationDelay: '375ms', animationFillMode: 'both' }}>Wellness & Support</h3>
        <div className="space-y-3">
          <button
            onClick={() => setCurrentView('HOME_REMEDIES')}
            className="w-full bg-amber-50 border border-amber-100 p-3 sm:p-4 rounded-2xl flex items-center gap-3 sm:gap-4 hover:bg-amber-100 transition group text-left animate-in slide-in-from-right-4 fade-in duration-500"
            style={{ animationDelay: '450ms', animationFillMode: 'both' }}
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition shrink-0">
              <Leaf size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-[11px] sm:text-sm leading-tight">Seasonal Home Remedies</h4>
              <p className="text-[9px] sm:text-xs text-slate-500 truncate leading-tight mt-0.5">Doctor-verified natural care</p>
            </div>
            <div className="p-1 bg-white rounded-full shadow-sm shrink-0">
              {getSeasonIcon(currentSeason)}
            </div>
          </button>

          <button
            onClick={() => setCurrentView('WELLNESS_HUB')}
            className="w-full bg-emerald-50 border border-emerald-100 p-3 sm:p-4 rounded-2xl flex items-center gap-3 sm:gap-4 hover:bg-emerald-100 transition group text-left animate-in slide-in-from-right-4 fade-in duration-500"
            style={{ animationDelay: '525ms', animationFillMode: 'both' }}
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition shrink-0">
              <Zap size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-[11px] sm:text-sm leading-tight">Yoga & Immunity</h4>
              <p className="text-[9px] sm:text-xs text-slate-500 truncate leading-tight mt-0.5">Guided exercises for strength</p>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('DOCTOR_TIPS')}
            className="w-full bg-blue-50 border border-blue-100 p-3 sm:p-4 rounded-2xl flex items-center gap-3 sm:gap-4 hover:bg-blue-100 transition group text-left animate-in slide-in-from-right-4 fade-in duration-500"
            style={{ animationDelay: '600ms', animationFillMode: 'both' }}
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition shrink-0">
              <Heart size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-800 text-[11px] sm:text-sm leading-tight">Doctor's Daily Tips</h4>
              <p className="text-[9px] sm:text-xs text-slate-500 truncate leading-tight mt-0.5">Professional lifestyle advice</p>
            </div>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '675ms', animationFillMode: 'both' }}>
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
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">Home Remedies</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
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

        {MOCK_REMEDIES.filter(r => r.season === currentSeason || r.season === Season.ALL).map((remedy, index) => (
          <div
            key={remedy.id}
            onClick={() => setSelectedRemedy(remedy)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-amber-400 cursor-pointer transition group animate-in zoom-in-95 fade-in duration-300"
            style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
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
          <div className="p-4 border-b flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
            <button onClick={() => setSelectedRemedy(null)}><ArrowLeft size={24} className="text-slate-500" /></button>
            <h2 className="font-bold text-slate-800">Preparation Guide</h2>
            <div className="w-6"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
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
                    <li
                      key={idx}
                      className="bg-slate-50 p-3 rounded-xl text-sm text-slate-700 border border-slate-100 flex items-center gap-3 animate-in zoom-in-95 fade-in duration-300"
                      style={{ animationDelay: `${(idx + 1) * 75}ms`, animationFillMode: 'both' }}
                    >
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
                    <div
                      key={idx}
                      className="flex gap-4 animate-in zoom-in-95 fade-in duration-300"
                      style={{ animationDelay: `${(idx + selectedRemedy.ingredients.length + 1) * 75}ms`, animationFillMode: 'both' }}
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-slate-600 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="pt-8 border-t border-slate-100 pb-8 animate-in zoom-in-95 fade-in duration-300"
                style={{ animationDelay: `${(selectedRemedy.ingredients.length + selectedRemedy.steps.length + 1) * 75}ms`, animationFillMode: 'both' }}
              >
                <p className="text-center text-xs text-slate-400 mb-4 font-bold uppercase tracking-widest">Was this helpful?</p>
                <div className="flex flex-col items-center gap-4">
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => handleLikeRemedy(selectedRemedy.id)}
                      className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${likedRemedies[selectedRemedy.id]
                        ? 'bg-emerald-100 text-emerald-700 scale-105'
                        : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95'
                        }`}
                    >
                      <ThumbsUp size={16} className={likedRemedies[selectedRemedy.id] ? "fill-emerald-700 animate-bounce" : ""} />
                      {likedRemedies[selectedRemedy.id] ? 'Liked!' : 'Yes'}
                      <span className="ml-1 text-xs opacity-80">
                        ({remedyLikeCounts[selectedRemedy.id] !== undefined ? remedyLikeCounts[selectedRemedy.id] : getInitialLikes(selectedRemedy.id)})
                      </span>
                    </button>
                    <button
                      onClick={() => setRatingInputFor(ratingInputFor === selectedRemedy.id ? null : selectedRemedy.id)}
                      className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all duration-300 ${ratedRemedies[selectedRemedy.id]
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700 active:scale-95'
                        }`}
                    >
                      <Star size={16} className={ratedRemedies[selectedRemedy.id] ? "fill-amber-500" : ""} />
                      {ratedRemedies[selectedRemedy.id] ? `Rated ${ratedRemedies[selectedRemedy.id]}` : 'Rate'}
                    </button>
                  </div>

                  {/* Rating Input Area */}
                  {ratingInputFor === selectedRemedy.id && !ratedRemedies[selectedRemedy.id] && (
                    <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl shadow-lg border border-slate-100 animate-in slide-in-from-bottom-2 fade-in duration-300 w-full max-w-[240px]">
                      <p className="text-sm font-bold text-slate-700">How would you rate this?</p>
                      <div className="flex gap-2" onMouseLeave={() => setHoverRating(null)}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            onClick={() => handleSubmitRating(selectedRemedy.id, star)}
                            onMouseEnter={() => setHoverRating(star)}
                            className={`transition-all duration-200 focus:outline-none ${star <= (hoverRating || 0) ? 'text-amber-400 scale-125' : 'text-slate-300 hover:text-amber-400 border-none'}`}
                          >
                            <Star size={28} className={star <= (hoverRating || 0) ? "fill-amber-400" : ""} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {ratedRemedies[selectedRemedy.id] && ratingInputFor === selectedRemedy.id && (
                    <div className="text-sm font-bold text-emerald-600 flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                      <CheckCircle size={16} className="text-emerald-500" /> Thank you for rating!
                    </div>
                  )}
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
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">Yoga & Strength</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
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

        {MOCK_WELLNESS_ACTIVITIES.map((activity, index) => (
          <div
            key={activity.id}
            onClick={() => setSelectedActivity(activity)}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-400 cursor-pointer transition flex items-center gap-4 animate-in zoom-in-95 fade-in duration-300"
            style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
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
          <div className="p-4 border-b flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
            <button onClick={() => setSelectedActivity(null)}><ArrowLeft size={24} className="text-slate-500" /></button>
            <h2 className="font-bold text-slate-800">Activity Guide</h2>
            <div className="w-6"></div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
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
                  <div
                    key={idx}
                    className="flex gap-4 relative animate-in zoom-in-95 fade-in duration-300"
                    style={{ animationDelay: `${idx * 75}ms`, animationFillMode: 'both' }}
                  >
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

              <div
                className="pt-10 animate-in zoom-in-95 fade-in duration-300"
                style={{ animationDelay: `${selectedActivity.steps.length * 75}ms`, animationFillMode: 'both' }}
              >
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

  // --- REACTION & COMMENTS HANDLERS ---
  const handleReaction = (tipId: string, emoji: string) => {
    setTipReactions(prev => ({ ...prev, [tipId]: emoji }));
    setActiveReactionDrawer(null);
  };

  const handleAddComment = (tipId: string) => {
    if (!commentInput.trim()) return;
    const newComment = {
      id: Math.random().toString(36).substring(7),
      text: commentInput.trim(),
      author: user.name,
      time: 'Just now'
    };
    setTipComments(prev => ({
      ...prev,
      [tipId]: [...(prev[tipId] || []), newComment]
    }));
    setCommentInput('');
  };

  const renderCommentsSheet = () => {
    if (!activeTipComments) return null;
    const tip = MOCK_HEALTH_TIPS.find(t => t.id === activeTipComments);
    if (!tip) return null;
    const comments = tipComments[activeTipComments] || [];

    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="absolute inset-0" onClick={() => setActiveTipComments(null)} />
        <div className="bg-white w-full max-h-[85vh] rounded-t-3xl shadow-2xl relative flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="flex justify-center p-3 border-b border-slate-100 shrink-0">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
          </div>
          <div className="p-4 border-b border-slate-100 shrink-0 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg">Comments</h3>
            <button onClick={() => setActiveTipComments(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
              <span className="sr-only">Close</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="flex items-start gap-3 pb-4 border-b border-slate-50">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                {tip.doctorName.charAt(4)}
              </div>
              <div>
                <span className="font-bold text-sm text-slate-800 mr-2">{tip.doctorName}</span>
                <p className="text-sm text-slate-700 leading-relaxed mt-0.5">{tip.content}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">{new Date(tip.timestamp).toLocaleDateString()}</span>
              </div>
            </div>

            {comments.length === 0 ? (
              <div className="text-center py-10">
                <MessageSquare className="mx-auto text-slate-200 mb-2 w-10 h-10" />
                <p className="text-slate-500 font-medium text-sm">No comments yet.</p>
                <p className="text-slate-400 text-xs">Be the first to share your thoughts!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((c, i) => (
                  <div key={c.id} className="flex gap-3 group animate-in slide-in-from-right-4 fade-in duration-300" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs shrink-0">
                      {c.author.charAt(0)}
                    </div>
                    <div className="flex-1 bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-bold text-xs text-slate-800">{c.author}</span>
                        <span className="text-[9px] text-slate-400">{c.time}</span>
                      </div>
                      <p className="text-sm text-slate-700">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-slate-100 bg-white shrink-0 mt-auto pb-safe flex flex-col gap-2">
            {/* Quick Emoji Bar for Comments */}
            {!showCommentEmojiPicker && (
              <div className="flex items-center gap-4 px-2 overflow-x-auto no-scrollbar justify-between">
                {['❤️', '🙌', '🔥', '👏', '😢', '😍', '😮', '😂'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.preventDefault();
                      setCommentInput(prev => prev + emoji);
                    }}
                    className="text-2xl hover:scale-125 transition-transform duration-200"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Full Emoji List for Comments */}
            {showCommentEmojiPicker && (
              <div className="grid grid-cols-8 gap-3 p-3 max-h-48 overflow-y-auto mb-1 bg-slate-50 rounded-xl border border-slate-200 shadow-sm animate-in zoom-in-95 duration-200 no-scrollbar">
                {FULL_EMOJI_LIST.map((emoji, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.preventDefault();
                      setCommentInput(prev => prev + emoji);
                    }}
                    className="text-2xl hover:scale-125 transition-transform duration-200"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-3xl p-1 pr-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 m-1">
                {user.name.charAt(0)}
              </div>
              <textarea
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm py-2.5 max-h-24 min-h-[40px] resize-none"
                rows={1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment(tip.id);
                  }
                }}
              />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowCommentEmojiPicker(!showCommentEmojiPicker);
                }}
                className={`p-2 rounded-full mb-0.5 transition-colors ${showCommentEmojiPicker ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                type="button"
              >
                <Smile size={18} />
              </button>
              <button
                onClick={() => handleAddComment(tip.id)}
                disabled={!commentInput.trim()}
                className={`p-2 rounded-full mb-0.5 transition-colors ${commentInput.trim() ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                <Send size={15} className={commentInput.trim() ? '-ml-0.5' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderExpandedEmojiSheet = () => {
    if (!activeExpandedEmojiPicker) return null;

    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="absolute inset-0" onClick={() => setActiveExpandedEmojiPicker(null)} />
        <div className="bg-slate-900 w-full max-h-[85vh] rounded-t-3xl shadow-2xl relative flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <div className="flex justify-center p-3 shrink-0">
            <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
          </div>
          <div className="px-4 pb-3 shrink-0">
            <div className="bg-slate-800 rounded-full py-2 px-4 flex items-center justify-center relative">
              <span className="text-white text-lg">😀</span>
            </div>
            <h3 className="font-bold text-slate-100 mt-4 px-1 text-sm">Frequently used</h3>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8">
            <div className="grid grid-cols-9 gap-y-6 gap-x-2 justify-items-center">
              {FULL_EMOJI_LIST.map((emoji, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReaction(activeExpandedEmojiPicker, emoji);
                    setActiveExpandedEmojiPicker(null);
                  }}
                  className="text-[26px] hover:scale-125 transition-transform duration-200"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDoctorTips = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">Doctor's Health Tips</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-4 mb-2">
          <Info className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
          <p className="text-xs text-blue-700 font-medium leading-relaxed">Trusted advice from our rural healthcare network. Tips are updated daily based on local health conditions.</p>
        </div>

        {MOCK_HEALTH_TIPS.map((tip, index) => (
          <div
            key={tip.id}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group animate-in zoom-in-95 fade-in duration-300"
            style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'both' }}
          >
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
            <div className="flex items-center justify-between pt-4 border-t border-slate-50 relative">

              {/* ANIMAITED REACTION BUTTON */}
              <div
                className="relative flex items-center"
                onMouseEnter={() => setActiveReactionDrawer(tip.id)}
                onMouseLeave={() => {
                  // Wait a short bit before closing to allow smooth movement
                  setTimeout(() => {
                    setActiveReactionDrawer(prev => prev === tip.id ? null : prev);
                  }, 150);
                }}
              >
                {activeReactionDrawer === tip.id && (
                  <div
                    className="absolute bottom-[calc(100%+8px)] left-0 bg-slate-800 border border-slate-700 shadow-xl rounded-full px-3 py-2 flex items-center gap-2 animate-in zoom-in-95 duration-200 origin-bottom-left z-20"
                    // Prevent closing when moving over the popover itself
                    onMouseEnter={() => setActiveReactionDrawer(tip.id)}
                  >
                    {['👍🏼', '❤️', '😄', '😲', '😟', '🙏🏼', '💯', '🙌🏼'].map((emoji, i) => (
                      <button
                        key={emoji}
                        onClick={(e) => { e.stopPropagation(); handleReaction(tip.id, emoji); }}
                        className="text-[28px] hover:scale-125 transition-transform duration-200 animate-in slide-in-from-bottom-2 fade-in leading-none"
                        style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                      >
                        {emoji}
                      </button>
                    ))}

                    <div className="w-4 h-4 bg-slate-800 absolute -bottom-1.5 left-6 rotate-45 rounded-sm" />
                    {/* Invisible bridge to prevent hover loss when moving mouse up */}
                    <div className="absolute -bottom-3 left-0 right-0 h-4 bg-transparent" />
                  </div>
                )}
                <button
                  className={`flex items-center gap-1.5 text-xs font-bold transition relative group py-1 ${tipReactions[tip.id] ? 'text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => {
                    // Specific logic for mobile taps: if no reaction and drawer closed, open drawer
                    // Otherwise, toggle the heart reaction (we'll just use the first default if not set, or clear if set)
                    if (!tipReactions[tip.id] && activeReactionDrawer !== tip.id) {
                      setActiveReactionDrawer(tip.id);
                    } else {
                      handleReaction(tip.id, tipReactions[tip.id] ? '' : '👍🏼');
                    }
                  }}
                >
                  {(() => {
                    const emojis = ['👍🏼', '❤️', '😄', '😲', '😟', '🙏🏼', '💯', '🙌🏼'];
                    const seed1 = tip.id.charCodeAt(0) || 0;
                    const seed2 = tip.id.charCodeAt(tip.id.length - 1) || 0;

                    const top1 = emojis[seed1 % emojis.length];
                    const top2 = emojis[(seed2 + 1) % emojis.length];
                    const top3 = emojis[(seed1 + seed2 + 2) % emojis.length];

                    const topSet = new Set([top1, top2, top3]);
                    const totalCount = tip.likes + (tipReactions[tip.id] ? 1 : 0);
                    const displayCount = Math.min(totalCount, 3);

                    let topArr = Array.from(topSet).slice(0, displayCount);

                    if (tipReactions[tip.id]) {
                      topArr = [tipReactions[tip.id], ...topArr.filter(e => e !== tipReactions[tip.id])].slice(0, displayCount);
                    }

                    const remaining = Math.max(0, totalCount - topArr.length);

                    if (totalCount === 0) {
                      return <Heart size={16} className="text-slate-400 group-hover:fill-rose-100 group-hover:text-rose-500 transition-colors" />;
                    }

                    return (
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1">
                          {topArr.map((emoji, idx) => (
                            <span key={idx} className="text-base relative z-10 bg-slate-50 rounded-full ring-2 ring-slate-50">{emoji}</span>
                          ))}
                        </div>
                        {remaining > 0 && <span className="text-slate-500">+{remaining}</span>}
                      </div>
                    );
                  })()}
                </button>
              </div>

              {/* COMMENT BUTTON */}
              <button
                onClick={() => setActiveTipComments(tip.id)}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 transition flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full"
              >
                <MessageSquare size={14} /> Comment {(tipComments[tip.id] && tipComments[tip.id].length > 0) ? `(${tipComments[tip.id].length})` : ''}
              </button>
            </div>
          </div>
        ))}
      </div>
      {renderCommentsSheet()}
    </div>
  );

  const renderConsultation = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-3 flex items-center justify-between shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
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
        {messages.length >= 2 && !isLoading && (
          <div className="flex justify-center my-3 animate-in fade-in zoom-in-95">
            <button
              onClick={() => analyzeAndTriage()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-full text-xs font-bold shadow-lg shadow-emerald-600/25 transition active:scale-95 border border-emerald-500/30"
            >
              <CheckCircle size={15} />
              Finish & Send Case to Doctor's Queue
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-200 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
      <div className="flex flex-col h-full bg-slate-50 overflow-y-auto animate-in slide-in-from-bottom-8 duration-700">
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
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">Nearby Healthcare</h2>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <div ref={mapContainerRef} className="absolute inset-0 z-0"></div>

        <div className="z-10 p-4 h-full flex flex-col pointer-events-none">
          <div
            className="bg-white p-2 rounded-xl shadow-lg flex items-center gap-2 pointer-events-auto mb-auto animate-in zoom-in-95 fade-in duration-500"
            style={{ animationDelay: '300ms', animationFillMode: 'both' }}
          >
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
            <div
              className="bg-white rounded-t-2xl shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] max-h-[60%] overflow-y-auto pointer-events-auto -mx-4 animate-in slide-in-from-bottom-8 fade-in duration-700"
              style={{ animationDelay: '500ms', animationFillMode: 'both' }}
            >
              <div className="p-4 border-b border-slate-100 sticky top-0 bg-white">
                <h3 className="font-bold text-slate-800">{nearbyHospitals.length} Centers Found</h3>
              </div>
              <div className="p-2 space-y-2">
                {nearbyHospitals.map((hospital, index) => (
                  <div
                    key={hospital.id}
                    className="p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition flex justify-between items-center animate-in zoom-in-95 fade-in duration-300"
                    style={{ animationDelay: `${600 + index * 75}ms`, animationFillMode: 'both' }}
                  >
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
            <div
              className="mt-auto bg-white p-6 rounded-t-2xl shadow-lg pointer-events-auto -mx-4 text-center animate-in slide-in-from-bottom-8 fade-in duration-500"
              style={{ animationDelay: '500ms', animationFillMode: 'both' }}
            >
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
      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
        <button onClick={() => setCurrentView('HOME')}><ArrowLeft size={24} className="text-slate-500" /></button>
        <h2 className="font-bold text-slate-800">Book Appointment</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in zoom-in-95 fade-in duration-300" style={{ animationDelay: '75ms', animationFillMode: 'both' }}>
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Hospital / Clinic</h3>
          <p className="text-lg font-bold text-slate-800">{selectedHospital ? selectedHospital.name : 'Online Consultation'}</p>
          <p className="text-sm text-slate-500">{selectedHospital ? selectedHospital.address : 'Video Call'}</p>
        </div>

        <div className="mb-6 animate-in zoom-in-95 fade-in duration-300" style={{ animationDelay: '150ms', animationFillMode: 'both' }}>
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
        <div className="mb-6 animate-in zoom-in-95 fade-in duration-300" style={{ animationDelay: '225ms', animationFillMode: 'both' }}>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Select Date</label>
          <input
            type="date"
            value={apptDate}
            onChange={(e) => setApptDate(e.target.value)}
            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="mb-8 animate-in zoom-in-95 fade-in duration-300" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
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

        <div className="flex flex-col animate-in zoom-in-95 fade-in duration-300" style={{ animationDelay: '375ms', animationFillMode: 'both' }}>
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

        <div className="flex justify-center gap-2 mb-6" onMouseLeave={() => setHoverRating(null)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setFeedbackRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              className={`p-1 transition-all hover:scale-110 ${feedbackRating >= star || (hoverRating !== null && hoverRating >= star) ? 'text-amber-400 fill-current' : 'text-slate-300'}`}
            >
              <Star size={32} fill={feedbackRating >= star || (hoverRating !== null && hoverRating >= star) ? "currentColor" : "none"} />
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
