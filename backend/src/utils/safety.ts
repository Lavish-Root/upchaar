export interface ClinicalTriageResult {
  isEmergency: boolean;
  emergencyCategory?: string;
  recommendedAction: string;
  urgencyLevel: 'EMERGENCY' | 'URGENT' | 'ROUTINE' | 'SELF_CARE';
  disclaimer: string;
}

const EMERGENCY_PATTERNS = [
  {
    regex: /(chest pain|crushing pain|heart attack|radiating to (arm|jaw)|pressure in chest)/i,
    category: 'Acute Coronary Syndrome / Myocardial Infarction',
    action: 'IMMEDIATELY call 112 / 102 or proceed to the nearest emergency room (ER/ED). Do not drive yourself.',
  },
  {
    regex: /(cannot breathe|severe shortness of breath|gasping for air|turning blue|choking|stridor)/i,
    category: 'Severe Respiratory Distress',
    action: 'Seek emergency medical attention immediately. Sit upright and call emergency medical services (112 / 102).',
  },
  {
    regex: /(facial drooping|arm weakness|slurred speech|sudden vision loss|stroke|paralysis)/i,
    category: 'Suspected Acute Stroke (FAST)',
    action: 'Time is critical. Call 112 / 102 immediately. Note the exact time symptoms started.',
  },
  {
    regex: /(suicide|kill myself|end my life|want to die|self-harm)/i,
    category: 'Psychiatric Emergency / Self-Harm Risk',
    action: 'Please reach out immediately: Tele-MANAS (14416 / 1800-891-4416) or National Mental Health Helpline (1075) for 24/7 confidential crisis support.',
  },
  {
    regex: /(uncontrolled bleeding|coughing blood|vomiting blood|black tarry stools|severe trauma|head injury.*unconscious)/i,
    category: 'Acute Hemorrhage / Severe Trauma',
    action: 'Apply firm direct pressure to external bleeding and call emergency services (112) immediately.',
  },
  {
    regex: /(anaphylaxis|throat closing|lip.*tongue swelling|hives.*difficulty breathing)/i,
    category: 'Anaphylaxis / Severe Allergic Reaction',
    action: 'Use epinephrine auto-injector (EpiPen) if prescribed and available. Call 112 / 102 immediately.',
  },
];

export const STANDARD_MEDICAL_DISCLAIMER =
  'Notice: PraanSewa AI is an informational and triage support assistant, NOT a licensed medical doctor. It cannot provide definitive medical diagnoses, prescribe prescription medications, or replace direct clinical consultation. In any life-threatening situation, immediately call 112 or visit your nearest emergency department.';

export function evaluateClinicalEmergency(text: string): ClinicalTriageResult {
  for (const item of EMERGENCY_PATTERNS) {
    if (item.regex.test(text)) {
      return {
        isEmergency: true,
        emergencyCategory: item.category,
        recommendedAction: item.action,
        urgencyLevel: 'EMERGENCY',
        disclaimer: STANDARD_MEDICAL_DISCLAIMER,
      };
    }
  }

  return {
    isEmergency: false,
    recommendedAction: 'Consult with a verified doctor on PraanSewa for a comprehensive personalized clinical assessment.',
    urgencyLevel: 'ROUTINE',
    disclaimer: STANDARD_MEDICAL_DISCLAIMER,
  };
}
