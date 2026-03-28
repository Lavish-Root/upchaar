
import { GoogleGenAI, Type } from "@google/genai";
import { CaseSeverity, PatientProfile, RiskPrediction, ModelMetrics, HealthTrend, ModelHistoryEntry, Hospital } from "../types";

export interface TriageResult {
  severity: CaseSeverity;
  diagnosis: string;
  suggestedPrescription: string;
  summary: string;
  homeRemedies: string[];
  careSuggestions: string;
}

const sanitizeJsonResponse = (text: string): string => {
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

/**
 * Utility for exponential backoff retries on transient API errors (429, 503)
 */
const withRetry = async <T>(fn: () => Promise<T>, retries = 5, delay = 4000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = (error?.message || '') + JSON.stringify(error || '').toLowerCase();
    const isQuotaError = errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('exhausted') || errorStr.includes('resource');
    const isServiceError = errorStr.includes('503') || errorStr.includes('overloaded') || errorStr.includes('unavailable') || errorStr.includes('deadline');

    if (retries > 0 && (isQuotaError || isServiceError)) {
      const jitter = Math.random() * 1000;
      const finalDelay = delay + jitter;
      console.warn(`Gemini API Busy/Quota hit. Retrying in ${Math.round(finalDelay)}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, finalDelay));
      // Increase delay for next attempt
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
};

const DOCTOR_SYSTEM_INSTRUCTION = `
You are AI Upchaar, a professional, calm, and medical digital doctor assistant for rural India.

CRITICAL LANGUAGE RULE:
- Detect the patient's language (Hindi, English, or Punjabi) on EVERY message.
- You MUST reply in the EXACT SAME language used by the patient in their last message.
- If the patient switches language mid-conversation, you switch immediately.
- The ONLY exception is the first message, which is always in Hindi.

STRICT STATE MACHINE FLOW (ORDER IS NON-NEGOTIABLE):
1. [GREETING]: (Completed).
2. [SYMPTOM_COLLECTION]: Ask short, relevant medical questions (duration, fever, pain, red flags). One question at a time.
3. [RISK_ASSESSMENT]: Internally classify as [NORMAL, MILD, SEVERE, CRITICAL].
4. [TREATMENT_CHOICE]:
   - [NORMAL/MILD]: Ask "Aap kya prefer karenge? 1. Dawa (Medicine) 2. Gharelu nuskhe (Home Remedies)".
   - [SEVERE]: Recommend a doctor appointment. Ask if you should book it.
   - [CRITICAL]: State condition is serious. Ask permission to connect to a doctor call immediately.
5. [ADDRESS_COLLECTION]: If "Dawa" chosen, ask for Ghar/Plot number, Area/Colony/Village, and Landmark.
6. [ADDRESS_CONFIRMATION]: Repeat the full address and ask "Kya yeh address sahi hai?". If NO, re-ask address.
7. [MOBILE_NUMBER_COLLECTION]: You MUST ask explicitly: "Kripya apna mobile number bataiye, isi number par OTP bheja jayega."
8. [OTP_VERIFICATION]: Say you are sending an OTP and ask the user to repeat the 4-digit code.
9. [DELIVERY_CONFIRMATION]: Say: "Aapki dawa confirm ho gayi hai. 20-30 minute mein pahunch jayegi. Dawa muft hai, sirf ₹20-30 delivery charge dena hoga."

PROFESSIONALISM:
- No emotional essays.
- No definitive diagnosis names (use "lakshan").
- Never skip the mobile number step.
`;

export const startNewChat = () => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  return ai.chats.create({
    model: 'gemini-1.5-flash',
    config: {
      temperature: 0.1,
      systemInstruction: DOCTOR_SYSTEM_INSTRUCTION,
    }
  });
};

export const getCallingAIResponse = async (
  history: { role: string; text: string }[],
  input: string,
  currentState: string
) => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `
      Act as AI Upchaar Medical Controller.
      CURRENT STATE: ${currentState}
      PATIENT INPUT: "${input}"
      CONVERSATION HISTORY: ${JSON.stringify(history)}
      TASK: 1. Detect language. 2. Next step. 3. Return JSON ONLY.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
        systemInstruction: DOCTOR_SYSTEM_INSTRUCTION
      }
    });
    return JSON.parse(sanitizeJsonResponse(response.text));
  });
};

export const getOTPAIResponse = async () => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const prompt = `You are a secure OTP Generator. Speak code clearly in patient language. Code: ${otp}`;

    await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: { temperature: 0.1 }
    });
    return { otp, spokenText: `Aapka verification code hai: ${otp.split('').join(' ')}. Kripya ise dohraiye.` };
  });
};

export const analyzeCase = async (transcript: string): Promise<TriageResult> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Perform medical triage on this transcript. Return strict JSON. TRANSCRIPT: ${transcript}`;
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: { temperature: 0.1, responseMimeType: 'application/json' }
    });
    return JSON.parse(sanitizeJsonResponse(response.text));
  });
};

export const getRealNearbyHospitals = async (lat: number, lng: number): Promise<Hospital[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Identify exactly 5 real, currently operational hospitals or clinics within a 10km radius of Latitude ${lat}, Longitude ${lng} in India. Search for their names, addresses, exact coordinates, and typical consultation fees in INR. Return a JSON array.`;
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              address: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ['HOSPITAL', 'CLINIC'] },
              consultationFee: { type: Type.NUMBER },
              url: { type: Type.STRING }
            },
            required: ['id', 'name', 'address', 'lat', 'lng', 'consultationFee']
          }
        }
      }
    });
    return JSON.parse(sanitizeJsonResponse(response.text));
  });
};

export const generateHealthRisks = async (patients: PatientProfile[]): Promise<RiskPrediction[]> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Predict risks for patients: ${JSON.stringify(patients)}. JSON format.`;
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: prompt,
      config: { temperature: 0.1, responseMimeType: 'application/json' }
    });
    return JSON.parse(sanitizeJsonResponse(response.text));
  });
};

export const trainAiModel = async (cumulativeDataset: any[], config: any): Promise<ModelHistoryEntry> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Train model v${config.version}. JSON result.`;
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: prompt,
      config: { temperature: 0.1, responseMimeType: 'application/json' }
    });
    return JSON.parse(sanitizeJsonResponse(response.text));
  });
};
