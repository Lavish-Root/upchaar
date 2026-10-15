import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, Activity, Volume2, ShieldAlert, User, Key, Truck, Home, Smartphone, VolumeX } from 'lucide-react';
import { getCallingAIResponse, getOTPAIResponse } from '../services/geminiService';
import { MedicalCase, CaseSeverity, CaseStatus, OfflineSession } from '../types';
import { playRealisticVoice, stopRealisticVoice } from '../services/voiceService';

interface IVRSimulatorProps {
  onSaveOfflineSession: (session: OfflineSession) => void;
}

type CallFlowState = 
  | 'IDLE' 
  | 'GREETING' 
  | 'SYMPTOM_COLLECTION' 
  | 'RISK_ASSESSMENT' 
  | 'TREATMENT_CHOICE' 
  | 'ADDRESS_COLLECTION' 
  | 'ADDRESS_CONFIRMATION' 
  | 'MOBILE_NUMBER_COLLECTION' 
  | 'OTP_VERIFICATION' 
  | 'DELIVERY_CONFIRMATION' 
  | 'DOCTOR_CONNECTED'
  | 'END';

const IVRSimulator: React.FC<IVRSimulatorProps> = ({ onSaveOfflineSession }) => {
  const [isActive, setIsActive] = useState(false);
  const [callState, setCallState] = useState<CallFlowState>('IDLE');
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Logic tracking
  const [riskLevel, setRiskLevel] = useState<CaseSeverity>(CaseSeverity.NORMAL);
  const [doctorJoined, setDoctorJoined] = useState(false);
  const [medicineRequested, setMedicineRequested] = useState(false);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [expectedOtp, setExpectedOtp] = useState<string | null>(null);
  const [mobileNumber, setMobileNumber] = useState<string | null>(null);
  const [address, setAddress] = useState<any>(null);

  const recognitionRef = useRef<any>(null);

  // Setup Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'hi-IN';

      recognitionRef.current.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setCurrentTranscript(text);
        handleInput(text);
      };

      recognitionRef.current.onend = () => {
         if (isActive && !isSpeaking && callState !== 'DELIVERY_CONFIRMATION' && callState !== 'END') {
            try { recognitionRef.current.start(); } catch(e) {}
         }
      };
    }
  }, [isActive, isSpeaking, callState]);

  const speak = async (text: string, onEnd?: () => void) => {
    setIsSpeaking(true);
    setTranscript(prev => [...prev, { role: 'ai', text }]);
    
    try {
      await playRealisticVoice(text);
    } catch (e) {
      console.warn("Speech error", e);
    } finally {
      setIsSpeaking(false);
      if (onEnd) onEnd();
      else if (isActive && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
    }
  };

  const startCall = () => {
    setIsActive(true);
    setCallState('GREETING');
    setTranscript([]);
    setDoctorJoined(false);
    setMedicineRequested(false);
    setDeliveryConfirmed(false);
    setMobileNumber(null);
    setExpectedOtp(null);
    speak("Namaste, main PraanSewa AI Doctor assistant hoon. Bataiye, aapko kya takleef hai? Aap kisi bhi bhasha mein bata sakte hain.");
  };

  const handleInput = async (input: string) => {
    setCurrentTranscript('');
    setTranscript(prev => [...prev, { role: 'user', text: input }]);
    
    if (recognitionRef.current) recognitionRef.current.stop();

    try {
        const response = await getCallingAIResponse(transcript, input, callState);
        
        if (response.riskLevel) setRiskLevel(response.riskLevel as CaseSeverity);
        if (response.medicineRequested) setMedicineRequested(true);
        if (response.addressData) setAddress(response.addressData);
        if (response.mobileNumber) setMobileNumber(response.mobileNumber);

        if (response.nextState === 'DOCTOR_CONNECTED' && !doctorJoined) {
            setDoctorJoined(true);
            setCallState('DOCTOR_CONNECTED');
            speak(response.responseText, () => {
                setTimeout(() => {
                    speak("Namaste, main Dr. Singh hoon. Pareshaan na ho, hum aapki madad kar rahe hain. Kya aapko saans lene mein takleef hai?");
                }, 1500);
            });
            return;
        }

        if (response.otpTrigger || (response.nextState === 'OTP_VERIFICATION' && callState !== 'OTP_VERIFICATION')) {
            setCallState('OTP_VERIFICATION');
            const otpData = await getOTPAIResponse();
            setExpectedOtp(otpData.otp);
            speak(otpData.spokenText);
            return;
        }

        if (callState === 'OTP_VERIFICATION') {
            if (input.includes(expectedOtp || '')) {
                setDeliveryConfirmed(true);
                setCallState('DELIVERY_CONFIRMATION');
                speak(response.responseText || "Aapka OTP verify ho gaya hai. Aapki dawa confirm ho gayi hai. 20-30 minute mein pahunch jayegi. Dhanyawad.");
                return;
            } else {
                speak("Kshama karein, OTP galat hai. Kripya phir se kahein.");
                return;
            }
        }

        setCallState(response.nextState as CallFlowState);
        speak(response.responseText);
    } catch (error) {
        console.error("IVR System Error:", error);
        speak("Kshama karein, hamare servers thode busy hain. Kripya line par bane rahein ya 1 minute baad call karein.");
    }
  };

  const endCall = () => {
    setIsActive(false);
    stopRealisticVoice();
    if (recognitionRef.current) recognitionRef.current.stop();

    const sessionData: OfflineSession = {
      session_type: "offline_call",
      transcript: transcript.map(t => `${t.role}: ${t.text}`).join('\n'),
      risk_level: riskLevel,
      doctor_joined: doctorJoined,
      medicine_requested: medicineRequested,
      delivery_confirmed: deliveryConfirmed,
      address: address,
      timestamp: new Date().toISOString()
    };
    
    onSaveOfflineSession(sessionData);
    setCallState('IDLE');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white p-6 relative overflow-hidden">
      {isActive && (
        <div className="absolute inset-0 pointer-events-none">
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse ${doctorJoined ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
        </div>
      )}

      {callState === 'IDLE' ? (
        <div className="z-10 text-center space-y-10">
            <div className="space-y-4">
                <h2 className="text-sm font-bold tracking-[0.4em] text-slate-500 uppercase">Rural Healthcare Gateway</h2>
                <h1 className="text-7xl font-black text-emerald-400">1800-AI-CARE</h1>
                <p className="text-slate-400 text-lg">No internet? Just call our toll-free AI helpline.</p>
            </div>
            
            <button 
                onClick={startCall}
                className="group relative flex items-center justify-center w-32 h-32 mx-auto bg-green-500 rounded-full hover:bg-green-400 transition-all shadow-2xl hover:scale-110 active:scale-95"
            >
                <Phone className="w-14 h-14 text-white fill-current" />
                <span className="absolute -inset-4 rounded-full border-4 border-green-500/20 animate-pulse"></span>
            </button>
        </div>
      ) : (
        <div className="z-10 w-full max-w-lg flex flex-col items-center justify-between h-[650px] bg-slate-800/50 backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 shadow-2xl">
            <div className="text-center w-full">
                <div className="flex items-center gap-2 justify-center mb-6">
                    <div className={`w-3 h-3 rounded-full animate-pulse ${doctorJoined ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-emerald-400 shadow-[0_0_10px_#10b981]'}`}></div>
                    <span className="text-xs font-black tracking-widest uppercase opacity-70">
                        {doctorJoined ? 'Live Doctor (Priority)' : 'AI Calling Agent'}
                    </span>
                </div>
                
                <div className="bg-black/40 rounded-3xl p-6 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${doctorJoined ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {doctorJoined ? <ShieldAlert size={32}/> : <User size={32}/>}
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-lg leading-none">{doctorJoined ? 'Dr. Singh' : 'PraanSewa AI'}</p>
                            <p className="text-xs opacity-40 mt-1 font-mono tracking-tighter">GSM Network • 12.2 kbps</p>
                        </div>
                    </div>
                    {(callState === 'MOBILE_NUMBER_COLLECTION' || callState === 'OTP_VERIFICATION') && (
                        <div className="flex items-center gap-2 bg-amber-500/20 text-amber-500 px-4 py-2 rounded-2xl border border-amber-500/30 animate-pulse">
                            {callState === 'OTP_VERIFICATION' ? <Key size={18} /> : <Smartphone size={18} />} 
                            <span className="text-xs font-black">{callState === 'OTP_VERIFICATION' ? 'OTP VERIFY' : 'SECURITY'}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full space-y-12">
                <div className="relative">
                    <div className={`absolute inset-0 rounded-full blur-3xl transition-colors duration-1000 ${isSpeaking ? 'bg-emerald-500/30 scale-150' : 'bg-blue-500/20 scale-110'}`}></div>
                    <div className="w-48 h-48 rounded-full border-[8px] border-slate-700 flex items-center justify-center bg-slate-900 relative z-10 shadow-2xl">
                        {isSpeaking ? (
                            <Volume2 size={64} className="text-emerald-400 animate-pulse" />
                        ) : (
                            <Mic size={64} className="text-blue-400 animate-bounce" />
                        )}
                    </div>
                </div>

                <div className="w-full bg-black/60 p-8 rounded-[2rem] min-h-[160px] flex flex-col justify-end border border-white/5 shadow-inner">
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] mb-4">Live Audio Input</p>
                    <p className="text-2xl font-medium leading-tight text-white/90">
                        {currentTranscript || (transcript.length > 0 ? transcript[transcript.length-1].text : "Listening...")}
                    </p>
                </div>
            </div>

            <div className="w-full space-y-8">
                <div className="flex justify-center gap-4">
                    {deliveryConfirmed && (
                        <div className="flex items-center gap-3 bg-emerald-500 text-white px-8 py-3 rounded-full font-bold shadow-2xl animate-bounce">
                             <Truck size={20} /> Order Confirmed
                        </div>
                    )}
                    {callState === 'ADDRESS_COLLECTION' && (
                         <div className="flex items-center gap-3 bg-blue-500 text-white px-8 py-3 rounded-full font-bold shadow-2xl">
                            <Home size={20} /> Collecting Address
                        </div>
                    )}
                </div>

                <div className="flex justify-center">
                    <button 
                        onClick={endCall}
                        className="group flex flex-col items-center gap-4"
                    >
                        <div className="p-8 rounded-[2.5rem] bg-red-500 text-white hover:bg-red-600 transition shadow-[0_20px_50px_rgba(239,68,68,0.4)] group-active:scale-95 group-hover:scale-105">
                            <PhoneOff size={40} className="fill-current" />
                        </div>
                        <span className="text-xs font-black text-red-500 uppercase tracking-widest">End Session</span>
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default IVRSimulator;
