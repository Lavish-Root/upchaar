export interface ClinicalTriageResult {
  isEmergency: boolean;
  emergencyCategory?: string;
  recommendedAction: string;
  urgencyLevel: 'EMERGENCY' | 'SERIOUS' | 'URGENT' | 'ROUTINE' | 'SELF_CARE';
  disclaimer: string;
}

const EMERGENCY_PATTERNS = [
  {
    regex: /(chest pain|crushing pain|heart attack|radiating to (arm|jaw)|pressure in chest|seene.*dard|chhati.*dard|dil.*dard|dil ka daura|छाती.*दर्द|सीने.*दर्द|दिल का दौरा)/i,
    category: 'Acute Coronary Syndrome / Suspected Cardiac Event (हृदय आपातकाल)',
    action: 'IMMEDIATELY call 112 / 102 or proceed to the nearest emergency casualty. Do not exert or drive yourself.',
  },
  {
    regex: /(cannot breathe|severe shortness of breath|gasping for air|turning blue|choking|stridor|saans.*(takleef|fulna|nahi|ruk|dikkat|ghutna)|साँ?स.*(तकलीफ|फूल|नहीं|दिक्कत|रुक|घुट))/i,
    category: 'Severe Respiratory Distress (गंभीर श्वसन संकट)',
    action: 'Seek emergency medical attention immediately. Sit upright, loosen tight clothes and call emergency services (112 / 102).',
  },
  {
    regex: /(facial drooping|arm weakness|slurred speech|sudden vision loss|stroke|paralysis|lakwa|falij|लकवा|फालिज|चेहरा लटकना)/i,
    category: 'Suspected Acute Stroke / Neurological Emergency (लकवा / आघात)',
    action: 'Time is critical (Golden Hour). Call 112 / 102 immediately. Note the exact time symptoms started.',
  },
  {
    regex: /(suicide|kill myself|end my life|want to die|self-harm|aatmhatya|jaan dena|आत्महत्या|जान देना)/i,
    category: 'Psychiatric Emergency / Crisis Support (मानसिक स्वास्थ्य आपातकाल)',
    action: 'Please reach out immediately: Tele-MANAS (14416 / 1800-891-4416) or National Mental Health Helpline (1075) for 24/7 free, confidential crisis support.',
  },
  {
    regex: /(uncontrolled bleeding|coughing blood|vomiting blood|black tarry stools|severe trauma|head injury.*unconscious|khoon ki ulti|khoon beh raha|behosh|खून की उल्टी|बेहोश|खून बहना)/i,
    category: 'Acute Hemorrhage / Unconscious Trauma (तीव्र रक्तस्राव / अचेतन अवस्था)',
    action: 'Apply firm direct pressure to external bleeding and call emergency services (112 / 102) immediately.',
  },
  {
    regex: /(anaphylaxis|throat closing|lip.*tongue swelling|hives.*difficulty breathing|gale me sujan.*saans)/i,
    category: 'Anaphylaxis / Severe Allergic Reaction (तीव्र एलर्जी प्रतिक्रिया)',
    action: 'Use epinephrine auto-injector (EpiPen) if prescribed and available. Call 112 / 102 immediately.',
  },
];

const SERIOUS_PATTERNS = [
  {
    regex: /(fever.*(4 days|5 days|week|103|104)|tez bukhar.*din|तेज बुखार.*दिन|persistent vomiting|severe abdominal pain|pet me tez dard|पेट में तेज दर्द|blood in urine|peshab me khoon)/i,
    category: 'Serious Medical Condition Requiring Physician Review (चिकित्सक से तत्काल परामर्श आवश्यक)',
    action: 'Please connect with a verified doctor on PraanSewa immediately for clinical examination and lab tests.',
  },
];

export const STANDARD_MEDICAL_DISCLAIMER =
  'Notice: Upchaar AI (PraanSewa) is an informational clinical triage support assistant, NOT a substitute for licensed physician consultation. It cannot provide definitive medical diagnoses or prescribe scheduled medications. In any life-threatening situation, immediately call 112 or visit your nearest hospital emergency casualty.';

export function evaluateClinicalEmergency(text: string): ClinicalTriageResult {
  // Check critical emergencies
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

  // Check serious conditions that require immediate doctor consultation
  for (const item of SERIOUS_PATTERNS) {
    if (item.regex.test(text)) {
      return {
        isEmergency: true,
        emergencyCategory: item.category,
        recommendedAction: item.action,
        urgencyLevel: 'SERIOUS',
        disclaimer: STANDARD_MEDICAL_DISCLAIMER,
      };
    }
  }

  return {
    isEmergency: false,
    recommendedAction: 'Consult with a verified doctor on Upchaar for a comprehensive personalized clinical assessment.',
    urgencyLevel: 'ROUTINE',
    disclaimer: STANDARD_MEDICAL_DISCLAIMER,
  };
}
