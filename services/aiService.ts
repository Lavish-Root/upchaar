/**
 * AI Upchaar - Universal AI Provider Service
 * Supports: Groq (GPT-OSS 120B / 20B, Qwen 27B, Llama 3.3 70B), Google Gemini, and Intelligent Local Fallback
 */

import { GoogleGenAI } from "@google/genai";
import { CaseSeverity, PatientProfile, RiskPrediction, ModelHistoryEntry } from "../types";

export interface TriageResult {
  severity: CaseSeverity;
  diagnosis: string;
  suggestedPrescription: string;
  summary: string;
  homeRemedies: string[];
  careSuggestions: string;
}

export type AIProvider = 'groq' | 'gemini' | 'offline';

export interface AIConfig {
  provider: AIProvider;
  groqApiKey?: string;
  geminiApiKey?: string;
  groqModel: string;
  geminiModel: string;
}

const STORAGE_KEY_CONFIG = 'ai_upchaar_ai_config';

// Active Groq Key provided by user
export const DEFAULT_GROQ_KEY = process.env.GROQ_API_KEY || '';
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

// Load initial config from LocalStorage, environment, or default verified key
export const getAIConfig = (): AIConfig => {
  const envGroq = (import.meta as any).env?.VITE_GROQ_API_KEY || (typeof process !== 'undefined' && (process.env as any)?.GROQ_API_KEY) || DEFAULT_GROQ_KEY;
  const envGemini = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && (process.env as any)?.API_KEY) || '';

  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        provider: parsed.provider || 'groq',
        groqApiKey: parsed.groqApiKey || envGroq,
        geminiApiKey: parsed.geminiApiKey || envGemini,
        groqModel: parsed.groqModel || DEFAULT_GROQ_MODEL,
        geminiModel: parsed.geminiModel || 'gemini-1.5-flash',
      };
    }
  } catch (e) {
    // fallback
  }

  return {
    provider: 'groq',
    groqApiKey: envGroq,
    geminiApiKey: envGemini,
    groqModel: DEFAULT_GROQ_MODEL,
    geminiModel: 'gemini-1.5-flash',
  };
};

export const saveAIConfig = (config: AIConfig) => {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
};

export const sanitizeJsonResponse = (text: string): string => {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  const startArrIdx = cleaned.indexOf('[');
  const endArrIdx = cleaned.lastIndexOf(']');

  if (startArrIdx !== -1 && (startIdx === -1 || startArrIdx < startIdx)) {
    return cleaned.substring(startArrIdx, endArrIdx + 1).trim();
  }
  if (startIdx !== -1 && endIdx !== -1) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }
  return cleaned.trim();
};

export const DOCTOR_SYSTEM_INSTRUCTION = `
You are PraanSewa, a compassionate, professional, and highly knowledgeable digital healthcare doctor assistant for rural and semi-urban India.

DYNAMIC MULTILINGUAL & CODE-SWITCHING RULE:
- Detect the patient's language dynamically on EVERY single user message.
- Supported Indian Languages: Hindi (हिन्दी & Hinglish), Punjabi (ਪੰਜਾਬੀ), English, Gujarati (ગુજરાતી), Marathi (मराठी), Bengali (বাংলা), Tamil (தமிழ்), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Urdu (اردو), Odia.
- Mid-Conversation Language Switching: If the patient starts in Hindi and then switches to English, Punjabi, or any other language (or speaks mixed words), IMMEDIATELY adapt and reply in their latest language with zero delay.
- Always maintain clear, caring medical advice in the patient's chosen tongue.

CONCISE & NON-REPETITIVE DELIVERY:
- Keep your answers clear, concise (2 to 3 sentences maximum), and empathetic.
- NEVER repeat or duplicate sentences within the same response.
- Ask only ONE single question at a time to keep it easy for rural patients.

STRICT MEDICAL STATE MACHINE FLOW:
1. [GREETING]: Welcome warmly.
2. [SYMPTOM_COLLECTION]: Ask short, empathetic medical questions (duration of illness, fever reading, pain severity, red flag symptoms).
3. [RISK_ASSESSMENT]: Internally classify condition as [NORMAL, MILD, SEVERE, CRITICAL].
4. [TREATMENT_CHOICE]:
   - [NORMAL/MILD]: Offer choice between Medicine vs. Home Remedies.
   - [SEVERE]: Recommend booking a doctor clinic appointment.
   - [CRITICAL]: State that immediate medical emergency care is needed and connect to a doctor video/audio call immediately.
5. [ADDRESS_COLLECTION]: If medicine is requested, ask for Village/Colony name, House/Plot number, and landmark.
6. [ADDRESS_CONFIRMATION]: Repeat the full address and confirm.
7. [MOBILE_NUMBER_COLLECTION]: Request a 10-digit mobile number for dispatch OTP.
8. [OTP_VERIFICATION]: Say an OTP has been sent and ask them to verify.
9. [DELIVERY_CONFIRMATION]: Confirm free medication delivery within 20-30 minutes with nominal delivery charge (₹20-30).

TONE AND SAFETY:
- Clear, respectful, and comforting.
- Never give definitive diagnoses without disclaimer; mention likely possibilities ("sambhavit lakshan").
- If emergency symptoms appear (fever >104°F/40°C, chest pain, severe breathing trouble, unconsciousness), mark CRITICAL immediately.
`;

const CANDIDATE_GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
  'qwen/qwen3.6-27b',
  'groq/compound',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant'
];

/**
 * Call Groq Cloud API with automatic model candidate fallback
 */
async function callGroqAPI(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string,
  temperature = 0.2,
  responseFormatJson = false
): Promise<string> {
  const config = getAIConfig();
  const apiKey = config.groqApiKey?.trim() || DEFAULT_GROQ_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY_MISSING");
  }

  const modelList = [
    model,
    config.groqModel,
    DEFAULT_GROQ_MODEL,
    ...CANDIDATE_GROQ_MODELS
  ].filter(Boolean);

  // De-duplicate model candidates
  const uniqueModels = Array.from(new Set(modelList));

  let lastError: any = null;

  for (const candidateModel of uniqueModels) {
    try {
      const payload: any = {
        model: candidateModel,
        messages,
        temperature,
        max_tokens: 1500,
      };

      if (responseFormatJson) {
        payload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }

      const errorBody = await res.text();
      // If model not found or forbidden, try next candidate model
      if (res.status === 404 || errorBody.includes("does not exist") || errorBody.includes("access")) {
        console.warn(`Groq model ${candidateModel} unavailable, trying next candidate...`);
        lastError = new Error(errorBody);
        continue;
      }

      throw new Error(`Groq API Error (${res.status}): ${errorBody}`);
    } catch (err: any) {
      lastError = err;
      if (err?.message?.includes("Groq API Error")) {
        throw err;
      }
    }
  }

  throw lastError || new Error("Failed to connect to any Groq models");
}

/**
 * Call Google Gemini API
 */
async function callGeminiAPI(prompt: string, systemInstruction = DOCTOR_SYSTEM_INSTRUCTION, jsonMode = false): Promise<string> {
  const config = getAIConfig();
  const apiKey = config.geminiApiKey?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: config.geminiModel || 'gemini-1.5-flash',
    contents: prompt,
    config: {
      temperature: 0.1,
      systemInstruction,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {})
    }
  });

  return response.text || "";
}

/**
 * Robust Chat Session for Interactive Consultation
 */
export class UniversalChatSession {
  private history: Array<{ role: 'user' | 'assistant' | 'model'; text: string }> = [];

  constructor() {
    this.history = [];
  }

  async sendMessage(input: { message: string | any[] }): Promise<{ text: string }> {
    const config = getAIConfig();
    let userText = '';

    if (typeof input.message === 'string') {
      userText = input.message;
    } else if (Array.isArray(input.message)) {
      const textItem = input.message.find(i => i.text);
      userText = textItem ? textItem.text : 'Patient shared an image for medical review.';
    }

    this.history.push({ role: 'user', text: userText });

    // 1. Try Groq if configured or key available
    if (config.provider === 'groq' || (config.groqApiKey && config.provider !== 'gemini')) {
      try {
        const groqMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: DOCTOR_SYSTEM_INSTRUCTION }
        ];

        for (const item of this.history) {
          groqMessages.push({
            role: item.role === 'user' ? 'user' : 'assistant',
            content: item.text
          });
        }

        const reply = await callGroqAPI(groqMessages, config.groqModel || DEFAULT_GROQ_MODEL, 0.2);
        this.history.push({ role: 'assistant', text: reply });
        return { text: reply };
      } catch (err: any) {
        console.warn("Groq chat failed, checking secondary providers...", err?.message);
        if (err?.message === 'GROQ_API_KEY_MISSING' && !config.geminiApiKey) {
          return { text: getFallbackDoctorResponse(userText, this.history) };
        }
      }
    }

    // 2. Try Gemini
    if (config.geminiApiKey) {
      try {
        const prompt = `CONVERSATION HISTORY:\n${this.history.map(h => `${h.role}: ${h.text}`).join('\n')}\n\nPATIENT: ${userText}\n\nDOCTOR RESPONSE:`;
        const reply = await callGeminiAPI(prompt, DOCTOR_SYSTEM_INSTRUCTION, false);
        this.history.push({ role: 'assistant', text: reply });
        return { text: reply };
      } catch (err) {
        console.warn("Gemini chat failed, switching to local medical intelligence...", err);
      }
    }

    // 3. Fallback to Local Medical Intelligence
    const fallbackReply = getFallbackDoctorResponse(userText, this.history);
    this.history.push({ role: 'assistant', text: fallbackReply });
    return { text: fallbackReply };
  }
}

export const startUniversalChat = (): UniversalChatSession => {
  return new UniversalChatSession();
};

/**
 * Analyze full transcript for clinical triage report
 */
export const analyzeUniversalCase = async (transcript: string): Promise<TriageResult> => {
  const config = getAIConfig();
  const prompt = `You are a Senior Chief Medical Officer. Perform medical triage on this consultation transcript.
TRANSCRIPT:
${transcript}

Return a STRICT JSON object matching this schema:
{
  "severity": "NORMAL" | "MILD" | "MODERATE" | "CRITICAL",
  "diagnosis": "Short diagnostic evaluation",
  "suggestedPrescription": "Medicine name, dosage, frequency, duration (in Hindi/English)",
  "summary": "Brief clinical summary of patient condition",
  "homeRemedies": ["Remedy 1 with simple ingredients", "Remedy 2 with instructions"],
  "careSuggestions": "Practical care and hygiene instructions"
}`;

  // Try Groq
  if (config.groqApiKey || DEFAULT_GROQ_KEY) {
    try {
      const messages = [
        { role: 'system' as const, content: 'You are an AI Clinical Triage System. Return JSON only.' },
        { role: 'user' as const, content: prompt }
      ];
      const raw = await callGroqAPI(messages, config.groqModel || DEFAULT_GROQ_MODEL, 0.1, true);
      const parsed = JSON.parse(sanitizeJsonResponse(raw));
      return normalizeTriageResult(parsed);
    } catch (e) {
      console.warn("Groq triage analysis fallback...", e);
    }
  }

  // Try Gemini
  if (config.geminiApiKey) {
    try {
      const raw = await callGeminiAPI(prompt, 'You are an AI Clinical Triage System. Return JSON only.', true);
      const parsed = JSON.parse(sanitizeJsonResponse(raw));
      return normalizeTriageResult(parsed);
    } catch (e) {
      console.warn("Gemini triage analysis fallback...", e);
    }
  }

  // Local Intelligent Medical Triage Fallback
  return generateLocalTriage(transcript);
};

/**
 * Controller for IVR Call Simulation Flow
 */
export const getUniversalCallingAIResponse = async (
  history: { role: string; text: string }[],
  input: string,
  currentState: string
): Promise<{
  responseText: string;
  nextState: string;
  riskLevel?: CaseSeverity;
  medicineRequested?: boolean;
  addressData?: any;
  mobileNumber?: string;
  otpTrigger?: boolean;
}> => {
  const config = getAIConfig();
  const prompt = `
Act as PraanSewa Medical Call Controller for Rural Helpline (IVR).
CURRENT STATE: ${currentState}
PATIENT INPUT: "${input}"
CONVERSATION HISTORY: ${JSON.stringify(history)}

TASK:
1. Detect patient language (Hindi / Punjabi / English).
2. Determine next IVR State from: [GREETING, SYMPTOM_COLLECTION, RISK_ASSESSMENT, TREATMENT_CHOICE, ADDRESS_COLLECTION, ADDRESS_CONFIRMATION, MOBILE_NUMBER_COLLECTION, OTP_VERIFICATION, DELIVERY_CONFIRMATION, DOCTOR_CONNECTED, END].
3. Determine if medicine was requested, address details, mobile number, or if severe condition requires doctor connection.
4. Provide immediate spoken response in patient's language.

Return JSON ONLY:
{
  "responseText": "Spoken text to patient",
  "nextState": "Next state string",
  "riskLevel": "NORMAL" | "MILD" | "MODERATE" | "CRITICAL",
  "medicineRequested": true | false,
  "addressData": null | { "village": "...", "house": "...", "landmark": "..." },
  "mobileNumber": null | "10 digit number",
  "otpTrigger": true | false
}
`;

  if (config.groqApiKey || DEFAULT_GROQ_KEY) {
    try {
      const messages = [
        { role: 'system' as const, content: DOCTOR_SYSTEM_INSTRUCTION },
        { role: 'user' as const, content: prompt }
      ];
      const raw = await callGroqAPI(messages, 'openai/gpt-oss-20b', 0.1, true);
      return JSON.parse(sanitizeJsonResponse(raw));
    } catch (e) {
      console.warn("Groq IVR fallback...", e);
    }
  }

  if (config.geminiApiKey) {
    try {
      const raw = await callGeminiAPI(prompt, DOCTOR_SYSTEM_INSTRUCTION, true);
      return JSON.parse(sanitizeJsonResponse(raw));
    } catch (e) {
      console.warn("Gemini IVR fallback...", e);
    }
  }

  // Local IVR Fallback State Machine
  return handleLocalIVRFlow(input, currentState);
};

/**
 * OTP Spoken Generator
 */
export const getUniversalOTPResponse = async (): Promise<{ otp: string; spokenText: string }> => {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const digitsSpoken = otp.split('').join(' . ');
  return {
    otp,
    spokenText: `Aapka 4-digit verification code hai: ${digitsSpoken}. Kripya is code ko dohraiye.`
  };
};

/**
 * Predictive Health Risk Generator (LPHIM)
 */
export const generateUniversalHealthRisks = async (patients: PatientProfile[]): Promise<RiskPrediction[]> => {
  const config = getAIConfig();
  const prompt = `Analyze these rural patient health profiles and predict risk levels (HIGH, MEDIUM, LOW) for seasonal diseases (Monsoon/Winter flu, dengue, heatstroke, diabetes exacerbation):
PATIENTS: ${JSON.stringify(patients)}

Return a JSON array of objects:
[
  {
    "patientId": "P-101",
    "patientName": "Name",
    "riskLevel": "HIGH" | "MEDIUM" | "LOW",
    "predictedCondition": "Condition name",
    "reasoning": "Clinical reasoning based on age/history/season",
    "suggestedAction": "Action for ASHA worker or doctor",
    "draftMessage": "Friendly SMS/WhatsApp alert in Hindi/English to send to patient"
  }
]`;

  if (config.groqApiKey || DEFAULT_GROQ_KEY) {
    try {
      const messages = [
        { role: 'system' as const, content: 'You are an AI Epidemiologist and Public Health Analyst. Return JSON array.' },
        { role: 'user' as const, content: prompt }
      ];
      const raw = await callGroqAPI(messages, config.groqModel || DEFAULT_GROQ_MODEL, 0.2, true);
      return JSON.parse(sanitizeJsonResponse(raw));
    } catch (e) {
      console.warn("Groq predictive health risk fallback...", e);
    }
  }

  if (config.geminiApiKey) {
    try {
      const raw = await callGeminiAPI(prompt, 'You are an AI Epidemiologist. Return JSON array.', true);
      return JSON.parse(sanitizeJsonResponse(raw));
    } catch (e) {
      console.warn("Gemini predictive health risk fallback...", e);
    }
  }

  // Local Rule-Based Risk Engine
  return patients.map(p => {
    const isElderly = p.age > 60;
    const hasCardiacOrDiabetes = p.medicalHistory.some(m => /hypertension|cardiac|heart|cholesterol|diabetes/i.test(m));
    const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' = (isElderly && hasCardiacOrDiabetes) ? 'HIGH' : (hasCardiacOrDiabetes || p.age > 50 ? 'MEDIUM' : 'LOW');

    return {
      patientId: p.id,
      patientName: p.name,
      riskLevel,
      predictedCondition: riskLevel === 'HIGH' ? 'Cardiovascular & Seasonal Flu Complication' : 'Seasonal Upper Respiratory Infection',
      reasoning: `Patient is ${p.age} years old with history of ${p.medicalHistory.join(', ') || 'seasonal vulnerability'}. Approaching weather changes pose heightened risk.`,
      suggestedAction: riskLevel === 'HIGH' ? 'Immediate home visit by ASHA worker and BP/Glucose check' : 'Preventive dietary advisory & telemedicine follow-up',
      draftMessage: `Namaste ${p.name} ji, mausam badal raha hai. Kripya apni niyamit dawa samay par lein aur thand se bachein. Kisi takleef par 1800-AI-CARE par call karein.`
    };
  });
};

/**
 * Local Public Health Intelligence Model (LPHIM) Training Simulation
 */
export const trainUniversalAiModel = async (cumulativeDataset: any[], modelConfig: any): Promise<ModelHistoryEntry> => {
  const config = getAIConfig();
  const prompt = `Simulate statistical machine learning training metrics for a rural clinical dataset (Version: ${modelConfig.version}, Algorithm: ${modelConfig.algorithm}).
Dataset size: ${cumulativeDataset.length} records.

Return JSON ONLY:
{
  "version": "${modelConfig.version}",
  "timestamp": "${new Date().toISOString()}",
  "metrics": {
    "accuracy": 0.94,
    "precision": 0.92,
    "recall": 0.95,
    "f1Score": 0.93,
    "recordsAnalyzed": ${Math.max(cumulativeDataset.length * 10, 150)},
    "lastTrained": "${new Date().toLocaleDateString()}",
    "version": "${modelConfig.version}",
    "algorithmUsed": "${modelConfig.algorithm || 'Random Forest Classifier'}"
  },
  "trends": [
    { "category": "Viral Fever", "count": 64, "growth": 18, "description": "Increasing with post-monsoon water logging" },
    { "category": "Hypertension", "count": 42, "growth": 5, "description": "Elderly population monitoring required" },
    { "category": "Dust Allergy", "count": 29, "growth": -8, "description": "Harvest season receding" }
  ],
  "confusionMatrix": [
    [45, 3],
    [4, 48]
  ]
}`;

  if (config.groqApiKey || DEFAULT_GROQ_KEY) {
    try {
      const messages = [
        { role: 'system' as const, content: 'You are an AI ML Training Evaluator. Return JSON.' },
        { role: 'user' as const, content: prompt }
      ];
      const raw = await callGroqAPI(messages, config.groqModel || DEFAULT_GROQ_MODEL, 0.1, true);
      return JSON.parse(sanitizeJsonResponse(raw));
    } catch (e) {
      console.warn("Groq model training metrics fallback...", e);
    }
  }

  // Local fallback metrics calculation
  const total = Math.max(cumulativeDataset.length, 10);
  const baseAcc = 0.91 + (Math.min(total, 500) / 10000);
  return {
    version: modelConfig.version || '2.0.1',
    timestamp: new Date().toISOString(),
    metrics: {
      accuracy: Math.min(0.985, Number(baseAcc.toFixed(3))),
      precision: Math.min(0.97, Number((baseAcc - 0.02).toFixed(3))),
      recall: Math.min(0.99, Number((baseAcc + 0.01).toFixed(3))),
      f1Score: Math.min(0.98, Number((baseAcc - 0.005).toFixed(3))),
      recordsAnalyzed: cumulativeDataset.length,
      lastTrained: new Date().toLocaleDateString(),
      version: modelConfig.version || '2.0.1',
      algorithmUsed: modelConfig.algorithm || 'Random Forest'
    },
    trends: [
      { category: "Viral Fevers", count: 48 + Math.floor(Math.random() * 20), growth: 14, description: "Seasonal temperature shift spikes viral infections" },
      { category: "Gastrointestinal", count: 28 + Math.floor(Math.random() * 10), growth: -4, description: "Water purification campaigns showing positive effect" },
      { category: "Respiratory Cases", count: 35 + Math.floor(Math.random() * 15), growth: 9, description: "Air quality index fluctuations in rural belts" }
    ],
    confusionMatrix: [
      [52, 4],
      [3, 49]
    ]
  };
};

/**
 * Normalization helper for triage results
 */
function normalizeTriageResult(data: any): TriageResult {
  return {
    severity: (data.severity || CaseSeverity.MILD) as CaseSeverity,
    diagnosis: data.diagnosis || 'Likely Seasonal Viral Infection',
    suggestedPrescription: data.suggestedPrescription || 'Paracetamol 500mg (1 tablet TDS as needed)\nORS sachets in clean water\nRest for 2 days',
    summary: data.summary || 'Patient consulted for seasonal symptoms.',
    homeRemedies: Array.isArray(data.homeRemedies) ? data.homeRemedies : ['Ginger-Tulsi herbal decoction (kadha) twice daily', 'Warm saline gargles', 'Steam inhalation'],
    careSuggestions: data.careSuggestions || 'Drink plenty of boiled water and stay hydrated. Consult a doctor if fever exceeds 102°F.'
  };
}

/**
 * Intelligent Local Medical Engine when offline / no key
 */
function getFallbackDoctorResponse(input: string, history: Array<{ role: string; text: string }>): string {
  const lower = input.toLowerCase();

  if (/chest pain|chhati|heart|saans nahi|behosh|blood|khoon|attack/i.test(lower)) {
    return "Yeh gambhir (critical) lakshan lag rahe hain. Kripya bina deri kiye turant nazdeeki aspatal jayein ya hum aapki call doctor se abhi connect kar rahe hain.";
  }

  if (/bukhar|fever|taap|shivering|thand/i.test(lower)) {
    return "Bukhar kab se hai aur kya shareer mein dard ya ulti jaisa lag raha hai? Kripya apna tapmaan (temperature) batayein.";
  }

  if (/khansi|cough|khang|gala|throat/i.test(lower)) {
    return "Khansi sookhi hai ya balgam (phlegm) ke sath? Kya saans lene mein koi dikkat mehsoos ho rahi hai?";
  }

  if (/pet|stomach|dard|pain|loose motion|dast|vomit/i.test(lower)) {
    return "Pet dard kis hisse mein hai aur kya aapne ORS ya paani ka paryapt sewan kiya hai?";
  }

  if (/dawa|medicine|dawai|tablets/i.test(lower)) {
    return "Hum aapke lakshano ke hisab se safe prathmik dava suggest kar sakte hain. Kya aap dava ghar par mangwana chahenge? Apna gaon aur pata batayein.";
  }

  if (/gharelu|nuskhe|kadha|home remedy/i.test(lower)) {
    return "Aap Tulsi, adrak aur shahad ka kadha din mein do baar le sakte hain. Isse gale ki kharash aur bukhar mein aaram milega.";
  }

  if (/punjabi|kive|haanji|mainu/i.test(lower)) {
    return "Sat Sri Akal ji! Tuhadi ki takleef hai? Ki tuhanu bukhar, khang ya sar dard hai?";
  }

  return "Samajh gaya. Kripya batayein yeh takleef kitne dino se hai, aur kya aapko bukhar ya kamzori mehsoos ho rahi hai?";
}

function generateLocalTriage(transcript: string): TriageResult {
  const lower = transcript.toLowerCase();
  let severity = CaseSeverity.MILD;
  let diagnosis = 'Seasonal Viral Syndrome';

  if (/chest pain|cardiac|heart|breath|emergency|severe/i.test(lower)) {
    severity = CaseSeverity.CRITICAL;
    diagnosis = 'Acute Cardiac / Severe Respiratory Distress';
  } else if (/high fever|dengue|malaria|vomiting|continuous/i.test(lower)) {
    severity = CaseSeverity.MODERATE;
    diagnosis = 'Acute Febrile Illness / Viral Infection';
  }

  return {
    severity,
    diagnosis,
    suggestedPrescription: 'Paracetamol 500mg (1 tab TDS after food)\nCetirizine 10mg (1 tab at bedtime if allergic)\nORS Hydration solution',
    summary: 'Patient evaluated through AI triage protocol.',
    homeRemedies: [
      'Fresh Ginger & Honey paste with crushed black pepper',
      'Warm Tulsi & Giloy water twice daily',
      'Steam inhalation with a pinch of camphor/ajwain'
    ],
    careSuggestions: 'Adequate bed rest, light khichdi diet, avoid cold drinks, monitor body temperature twice daily.'
  };
}

function handleLocalIVRFlow(input: string, currentState: string) {
  const lower = input.toLowerCase();

  if (currentState === 'GREETING' || currentState === 'IDLE') {
    return {
      responseText: "Namaste! Main PraanSewa bol raha hoon. Bataiye aapko kya takleef hai? Bukhar, khansi ya koi aur samasya?",
      nextState: 'SYMPTOM_COLLECTION',
      riskLevel: CaseSeverity.NORMAL
    };
  }

  if (currentState === 'SYMPTOM_COLLECTION') {
    if (/chest pain|chhati|heart|saans|emergency/i.test(lower)) {
      return {
        responseText: "Aapke lakshan gambhir hain. Kripya ghabrayein nahi, main turant duty doctor ko call par connect kar raha hoon.",
        nextState: 'DOCTOR_CONNECTED',
        riskLevel: CaseSeverity.CRITICAL
      };
    }
    return {
      responseText: "Samajh gaya. Aapke lakshano ke liye kya aap dawa ghar mangwana chahenge ya gharelu nuskhe prefer karenge?",
      nextState: 'TREATMENT_CHOICE',
      riskLevel: CaseSeverity.MILD
    };
  }

  if (currentState === 'TREATMENT_CHOICE') {
    if (/dawa|medicine|dawai|1/i.test(lower)) {
      return {
        responseText: "Dawa delivery ke liye kripya apna gaon, plot number ya landmark batayein.",
        nextState: 'ADDRESS_COLLECTION',
        medicineRequested: true
      };
    }
    return {
      responseText: "Aap adrak-tulsi ka kadha din mein 2 baar lein aur aaram karein. Dawa mangwane ke liye kabhi bhi call karein. Dhanyawad.",
      nextState: 'END',
      medicineRequested: false
    };
  }

  if (currentState === 'ADDRESS_COLLECTION') {
    return {
      responseText: `Aapka address note ho gaya hai: ${input}. Kripya apna 10-digit mobile number batayein, isi par OTP aayega.`,
      nextState: 'MOBILE_NUMBER_COLLECTION',
      addressData: { fullAddress: input }
    };
  }

  if (currentState === 'MOBILE_NUMBER_COLLECTION') {
    return {
      responseText: "OTP generate kiya ja raha hai...",
      nextState: 'OTP_VERIFICATION',
      mobileNumber: input,
      otpTrigger: true
    };
  }

  return {
    responseText: "Dhanyawad. Aapka case confirm ho gaya hai.",
    nextState: 'END'
  };
}
