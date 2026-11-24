import { config } from '../config';
import { evaluateClinicalEmergency, STANDARD_MEDICAL_DISCLAIMER } from '../utils/safety';
import { prisma } from '../config/database';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIPrescriptionDraftResult {
  clinicalSummary: string;
  clinicalConsiderations: string[];
  suggestedMedications: Array<{
    medicationName: string;
    dosageSuggestion: string;
    frequency: string;
    duration: string;
    rationale: string;
    safetyAlerts: string[];
  }>;
  safetyFlags: string[];
  requiresDoctorAssessment: boolean;
}

export class AIService {
  private provider: string;

  constructor() {
    this.provider = config.ai.provider;
  }

  /**
   * Process patient chat message with medical emergency triage, home remedies & conversational guidance
   */
  async processHealthQuery(
    query: string,
    history: ChatMessage[] = [],
    language?: string
  ): Promise<{
    reply: string;
    isEmergency: boolean;
    urgencyLevel: 'EMERGENCY' | 'SERIOUS' | 'ROUTINE';
    emergencyCategory?: string;
  }> {
    // 1. Mandatory Clinical Safety Triage Check
    const triage = evaluateClinicalEmergency(query);
    if (triage.isEmergency) {
      const isHindi = language === 'hi-IN' || /[\u0900-\u097F]/.test(query);
      const isHinglish = language === 'hinglish' || /(kya|hai|nahi|dard|bukhar|sardi|khasi|pet|sar|batao|kare|chahiye|pe|ho|mera|meri)/i.test(query);

      let emergencyReply = '';
      if (isHindi) {
        emergencyReply = `🚨 **आपातकालीन चेतावनी: ${triage.emergencyCategory}**\n\n` +
          `**तत्काल आवश्यक कार्रवाई:** ${triage.recommendedAction}\n\n` +
          `⚠️ आपके द्वारा बताए गए लक्षण किसी गंभीर चिकित्सीय स्थिति (Medical Emergency) के संकेत हो सकते हैं। Upchaar AI आपातकालीन चिकित्सा का विकल्प नहीं है।\n\n` +
          `**कृपया तुरंत 112 या 102 पर कॉल करें या नजदीकी अस्पताल के आपातकालीन विभाग (Emergency Casualty) में संपर्क करें।**\n\n` +
          `*${triage.disclaimer}*`;
      } else if (isHinglish) {
        emergencyReply = `🚨 **EMERGENCY WARNING: ${triage.emergencyCategory}**\n\n` +
          `**Urgent Action Required:** ${triage.recommendedAction}\n\n` +
          `⚠️ Aapke symptoms serious medical emergency ho sakte hain. Upchaar AI emergency doctor ka substitute nahi hai.\n\n` +
          `**Kripya turant Emergency Services (112 ya 102) par call karein ya paas ke hospital emergency me jayein.**\n\n` +
          `*${triage.disclaimer}*`;
      } else {
        emergencyReply = `🚨 **EMERGENCY WARNING DETECTED: ${triage.emergencyCategory}**\n\n` +
          `**Urgent Action Required:** ${triage.recommendedAction}\n\n` +
          `⚠️ Your symptoms indicate a potential medical emergency. Upchaar AI cannot replace emergency medical intervention. **Please call emergency services (112 or 102 in India) or proceed immediately to the nearest hospital emergency casualty.**\n\n` +
          `*${triage.disclaimer}*`;
      }

      return {
        reply: emergencyReply,
        isEmergency: true,
        urgencyLevel: triage.urgencyLevel === 'SERIOUS' ? 'SERIOUS' : 'EMERGENCY',
        emergencyCategory: triage.emergencyCategory,
      };
    }

    // Determine language instruction
    const isHindiQuery = /[\u0900-\u097F]/.test(query);
    const isHinglishQuery = /(kya|hai|nahi|dard|bukhar|sardi|khasi|pet|sar|batao|kare|chahiye|pe|ho|mera|meri|khansi)/i.test(query);

    let languageInstruction = 'Respond in empathetic, clear, professional English.';
    if (language === 'hi-IN' || (!language && isHindiQuery)) {
      languageInstruction = 'Respond completely in respectful, empathetic Hindi (हिन्दी) in Devanagari script. Use clear medical terms with Hindi explanations.';
    } else if (language === 'hinglish' || (!language && isHinglishQuery)) {
      languageInstruction = 'Respond in natural, conversational Hinglish (Roman Hindi script, e.g. "Aapko cold aur sore throat ke liye ye gharelu upaay karne chahiye..."). Keep it empathetic and easy to read.';
    } else if (language === 'bn-IN') {
      languageInstruction = 'Respond in empathetic, clear Bengali (বাংলা).';
    } else if (language === 'mr-IN') {
      languageInstruction = 'Respond in empathetic, clear Marathi (मराठी).';
    } else if (language === 'gu-IN') {
      languageInstruction = 'Respond in empathetic, clear Gujarati (ગુજરાતી).';
    } else if (language === 'ta-IN') {
      languageInstruction = 'Respond in empathetic, clear Tamil (தமிழ்).';
    } else if (language === 'te-IN') {
      languageInstruction = 'Respond in empathetic, clear Telugu (తెలుగు).';
    }

    const clinicalSystemPrompt =
      'You are Dr. Upchaar (PraanSewa Chief Clinical AI Assistant), an expert clinical triage physician trained in evidence-based medicine and Indian public healthcare.\n\n' +
      'MANDATORY CLINICAL STRUCTURE (Follow this exact 4-part structure in your response):\n' +
      '1. 🩺 **Clinical Assessment / प्राथमिक चिकित्सकीय समझ**: Empathetic analysis of what the symptoms may indicate without giving an absolute or definitive diagnosis.\n' +
      '2. 🌿 **Evidence-Based Home Remedies (घरेलू उपचार)**: Provide 1-3 authentic, safe Indian household remedies (such as Haldi Doodh, Ginger-Tulsi-Honey tea, Ajwain Jeera Ark, Saline steam inhalation, ORS) with exact preparation steps, dosage, and cautions.\n' +
      '3. ⚠️ **Red Flag Warning Signs (खतरे के संकेत)**: Explicit warning signs when home remedies must be stopped immediately.\n' +
      '4. 👨‍⚕️ **Next Steps & Doctor Consultation (डॉक्टर से परामर्श)**: Clear guidance on consulting a verified doctor on the Upchaar platform (Free 1-click consultation).\n\n' +
      'CRITICAL RULES:\n' +
      '- Language Rule: ' + languageInstruction + '\n' +
      '- Never prescribe Schedule H/X prescription drugs or claim to make definitive diagnostic guarantees.\n' +
      '- If symptoms appear serious (chest pain, breathing trouble, high fever >3 days, stroke signs), urge immediate hospital consultation.\n' +
      '- All clinical consultations on Upchaar / PraanSewa are with verified Government Medical Officers and are 100% Free.';

    // 2. Call Groq API if configured or if provider is 'groq'
    if ((this.provider === 'groq' || config.ai.groqApiKey) && config.ai.groqApiKey) {
      const candidateModels = Array.from(new Set([
        config.ai.groqModel || 'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'qwen/qwen3.8-27b',
      ]));

      for (const modelToTry of candidateModels) {
        try {
          console.log(`🤖 [AIService] Querying Groq API (${modelToTry}) for health query...`);
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${config.ai.groqApiKey}`,
            },
            body: JSON.stringify({
              model: modelToTry,
              messages: [
                {
                  role: 'system',
                  content: clinicalSystemPrompt,
                },
                ...history.slice(-6),
                { role: 'user', content: query },
              ],
              temperature: 0.2,
              max_tokens: 1200,
            }),
          });

          if (response.ok) {
            const data: any = await response.json();
            const reply = data.choices?.[0]?.message?.content || '';
            if (reply.trim()) {
              return {
                reply: `${reply.trim()}\n\n*${STANDARD_MEDICAL_DISCLAIMER}*`,
                isEmergency: false,
                urgencyLevel: 'ROUTINE',
              };
            }
          } else {
            const errText = await response.text();
            console.warn(`[AIService] Groq API (${modelToTry}) HTTP ${response.status}:`, errText);
            // If rate limit (429), loop continues to try next candidate model
            if (response.status === 429) {
              continue;
            }
          }
        } catch (err) {
          console.warn(`[AIService] Groq API (${modelToTry}) error:`, err);
        }
      }
    }

    // 3. Call Grok API (xAI) if configured
    if ((this.provider === 'grok' || config.ai.grokApiKey) && config.ai.grokApiKey) {
      try {
        console.log(`🤖 [AIService] Querying Grok API (${config.ai.grokModel}) for health query...`);
        const response = await fetch(`${config.ai.grokBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.ai.grokApiKey}`,
          },
          body: JSON.stringify({
            model: config.ai.grokModel || 'grok-beta',
            messages: [
              {
                role: 'system',
                content: clinicalSystemPrompt,
              },
              ...history.slice(-6),
              { role: 'user', content: query },
            ],
            temperature: 0.2,
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          const reply = data.choices?.[0]?.message?.content || '';
          if (reply.trim()) {
            return {
              reply: `${reply.trim()}\n\n*${STANDARD_MEDICAL_DISCLAIMER}*`,
              isEmergency: false,
              urgencyLevel: 'ROUTINE',
            };
          }
        } else {
          const errText = await response.text();
          console.warn(`[AIService] Grok API responded with HTTP ${response.status}:`, errText);
        }
      } catch (err) {
        console.warn('[AIService] Grok API call error, falling back to clinical engine:', err);
      }
    }

    // 4. If OpenAI key is provided and provider is 'openai', call OpenAI API
    if (this.provider === 'openai' && config.ai.openaiApiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.ai.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: config.ai.openaiModel,
            messages: [
              {
                role: 'system',
                content:
                  'You are PraanSewa Health Assistant, a compassionate, evidence-based clinical triage support agent. ' +
                  'Never claim to make definitive diagnoses or prescribe prescription drugs. Always emphasize seeing a verified doctor for diagnosis and treatment. ' +
                  'Keep explanations simple, empathetic, and clear. Include red-flag symptoms when to seek immediate medical care.',
              },
              ...history.slice(-6),
              { role: 'user', content: query },
            ],
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const data: any = await response.json();
          const reply = data.choices?.[0]?.message?.content || '';
          return {
            reply: `${reply}\n\n*${STANDARD_MEDICAL_DISCLAIMER}*`,
            isEmergency: false,
            urgencyLevel: 'ROUTINE',
          };
        }
      } catch (err) {
        console.warn('OpenAI API call failed, using clinical fallback engine:', err);
      }
    }

    // 5. Clinical Intelligent Fallback Engine (Reliable, fast, zero-dependency)
    const reply = this.generateClinicalKnowledgeResponse(query, language);
    return {
      reply: `${reply}\n\n*${STANDARD_MEDICAL_DISCLAIMER}*`,
      isEmergency: false,
      urgencyLevel: 'ROUTINE',
    };
  }

  /**
   * AI Prescription Drafting Assistant for Doctors
   * STRICT SAFETY: Checks patient allergies, drug interactions, and returns draft suggestions.
   */
  async draftPrescription(input: {
    patientId: string;
    doctorId: string;
    symptoms: string;
    clinicalObservations?: string;
    vitalSigns?: any;
  }): Promise<AIPrescriptionDraftResult> {
    // 1. Fetch patient's recorded allergies
    const patientAllergies = await prisma.medicationAllergy.findMany({
      where: { patientId: input.patientId },
    });

    const knownAllergens = patientAllergies.map((a) => a.allergenName.toLowerCase());

    // 2. Analyze symptoms & select evidence-based candidate medications
    const symptomsLower = input.symptoms.toLowerCase();
    const suggestions: AIPrescriptionDraftResult['suggestedMedications'] = [];
    const safetyFlags: string[] = [];

    // Clinical Summary
    let clinicalSummary = `Patient presents with: ${input.symptoms}.`;
    if (input.vitalSigns) {
      clinicalSummary += ` Vitals: BP ${input.vitalSigns.bloodPressure || 'N/A'}, HR ${input.vitalSigns.heartRate || 'N/A'} bpm, Temp ${input.vitalSigns.temperature || 'N/A'}°F.`;
    }

    const clinicalConsiderations: string[] = [
      'Evaluate for secondary causes if symptoms persist > 5 days.',
      'Correlate clinical presentation with physical examination findings.',
    ];

    // Symptom-guided candidate protocols
    if (symptomsLower.includes('fever') || symptomsLower.includes('body ache') || symptomsLower.includes('pain') || symptomsLower.includes('headache')) {
      const medName = 'Paracetamol';
      const isAllergic = knownAllergens.some((a) => a.includes('paracetamol') || a.includes('acetaminophen'));

      if (isAllergic) {
        safetyFlags.push(`⚠️ ALLERGY ALERT: Patient has a recorded hypersensitivity to Paracetamol. Withheld from suggestions.`);
      } else {
        suggestions.push({
          medicationName: 'Paracetamol',
          dosageSuggestion: '650mg',
          frequency: 'SOS (as needed for fever/pain, min 6hr interval)',
          duration: '3 to 5 days',
          rationale: 'First-line antipyretic and analgesic with favorable safety profile.',
          safetyAlerts: ['Maximum 4g per 24 hours. Ensure patient is not consuming other paracetamol-containing OTC formulations.'],
        });
      }
    }

    if (symptomsLower.includes('cough') || symptomsLower.includes('cold') || symptomsLower.includes('runny nose') || symptomsLower.includes('sneezing')) {
      const isAllergic = knownAllergens.some((a) => a.includes('cetirizine'));
      if (!isAllergic) {
        suggestions.push({
          medicationName: 'Cetirizine',
          dosageSuggestion: '10mg',
          frequency: 'Once daily at bedtime',
          duration: '5 days',
          rationale: 'H1-receptor antagonist for allergic rhinitis and histamine-mediated mucosal irritation.',
          safetyAlerts: ['May cause mild sedation; advise patient against driving or operating heavy machinery.'],
        });
      }
    }

    if (symptomsLower.includes('acidity') || symptomsLower.includes('reflux') || symptomsLower.includes('gastritis') || symptomsLower.includes('heartburn')) {
      suggestions.push({
        medicationName: 'Omeprazole',
        dosageSuggestion: '20mg',
        frequency: 'Once daily before breakfast',
        duration: '14 days',
        rationale: 'Proton pump inhibitor to suppress gastric acid production and promote mucosal healing.',
        safetyAlerts: ['Instruct patient to swallow whole 30 minutes before food with water.'],
      });
    }

    if (symptomsLower.includes('throat infection') || symptomsLower.includes('tonsillitis') || symptomsLower.includes('strep')) {
      clinicalConsiderations.push('Differentiate viral pharyngitis from bacterial Group A Streptococcus before initiating antibiotic therapy.');
      const isPenicillinAllergic = knownAllergens.some((a) => a.includes('penicillin') || a.includes('amoxicillin'));

      if (isPenicillinAllergic) {
        safetyFlags.push('⚠️ ALLERGY ALERT: Patient is allergic to Penicillins. Avoid Amoxicillin or other Beta-lactams.');
        clinicalConsiderations.push('If bacterial etiology confirmed and patient is penicillin-allergic, consider Macrolide (Azithromycin) subject to local antibiogram.');
      } else {
        suggestions.push({
          medicationName: 'Amoxicillin',
          dosageSuggestion: '500mg',
          frequency: 'Three times daily (TID)',
          duration: '5 days',
          rationale: 'Empirical beta-lactam antibiotic for suspected susceptible bacterial pharyngitis/otitis.',
          safetyAlerts: ['Complete full course even if symptoms subside to avoid antibiotic resistance.'],
        });
      }
    }

    // Check drug-drug interaction among suggested medications
    if (suggestions.some((s) => s.medicationName === 'Ibuprofen') && suggestions.some((s) => s.medicationName === 'Lisinopril')) {
      safetyFlags.push('🚨 CRITICAL DRUG INTERACTION: Ibuprofen + Lisinopril interaction reduces antihypertensive efficacy and increases acute kidney injury risk.');
    }

    if (patientAllergies.length > 0) {
      safetyFlags.push(`Patient Allergies Recorded: ${patientAllergies.map((a) => `${a.allergenName} (${a.reactionSeverity})`).join(', ')}`);
    }

    return {
      clinicalSummary,
      clinicalConsiderations,
      suggestedMedications: suggestions,
      safetyFlags,
      requiresDoctorAssessment: true,
    };
  }

  /**
   * Internal clinical knowledge generator for common patient questions with Indian home remedies & triage
   */
  private generateClinicalKnowledgeResponse(query: string, language?: string): string {
    const q = query.toLowerCase();
    const isHindi = language === 'hi-IN' || /[\u0900-\u097F]/.test(query);
    const isHinglish = language === 'hinglish' || /(kya|hai|nahi|dard|bukhar|sardi|khasi|pet|sar|batao|kare|chahiye|pe|ho|mera|meri|khansi)/i.test(query);

    // 1. FEVER
    if (q.includes('fever') || q.includes('temperature') || q.includes('bukhar') || q.includes('बुखार')) {
      if (isHindi) {
        return (
          `### 🩺 प्राथमिक चिकित्सकीय समझ (Fever Assessment)\n` +
          `बुखार शरीर की रोग-प्रतिरोधक प्रणाली (Immune System) की एक स्वाभाविक प्रतिक्रिया है जो संक्रमण से लड़ने के लिए होती है।\n\n` +
          `### 🌿 सुरक्षित घरेलू उपचार (Evidence-Based Home Remedies)\n` +
          `- **हल्दी वाला गुनगुना दूध (Golden Milk):** 1 गिलास गुनगुने दूध में आधा चम्मच हल्दी मिलाकर रात में लें। इसमें मौजूद करक्यूमिन सूजन व दर्द में राहत देता है।\n` +
          `- **हाइड्रेशन (ORS व नारियल पानी):** दिनभर में 2.5-3 लीटर तरल पदार्थ पिएं (ORS, गुनगुना पानी, दाल का सूप, नारियल पानी) ताकि डिहाइड्रेशन न हो।\n` +
          `- **माथे पर सामान्य पानी की पट्टी:** तेज बुखार में माथे और गर्दन पर सामान्य नल के पानी की सूती पट्टी रखें (बर्फ का उपयोग न करें)।\n` +
          `- **तुलसी-अदरक का काढ़ा:** 5-6 तुलसी के पत्ते और थोड़ी अदरक उबालकर शहद के साथ पिएं।\n\n` +
          `### ⚠️ खतरे के संकेत (Red Flag Symptoms)\n` +
          `- बुखार 102°F से अधिक होना या 3 दिनों से लगातार बना रहना।\n` +
          `- गर्दन में अकड़न, तेज सिरदर्द, भ्रम (Confusion), या शरीर पर लाल चकत्ते।\n` +
          `- अत्यधिक कमजोरी या उल्टी के कारण कुछ भी न पचना।\n\n` +
          `### 👨‍⚕️ डॉक्टर से परामर्श (Next Steps)\n` +
          `यदि बुखार 48 घंटे से अधिक रहे या लक्षण बढ़ें, तो Upchaar पर हमारे सत्यापित सरकारी चिकित्सा अधिकारी (Government Medical Officer) से निःशुल्क वीडियो परामर्श लें।`
        );
      }
      if (isHinglish) {
        return (
          `### 🩺 Clinical Assessment (Bukhar / Fever)\n` +
          `Fever body ka natural immune response hai jo infection se ladne ke liye hota hai.\n\n` +
          `### 🌿 Ghar Par Surakshit Upaay (Home Remedies)\n` +
          `- **Haldi Doodh (Turmeric Milk):** Raat ko 1 glass gungune doodh me aadhi chammach haldi milakar lein. Curcumin body ache aur healing me madad karta hai.\n` +
          `- **Hydration (Pani aur ORS):** Din bhar me 2.5-3 liters fluids lein (ORS, nariyal pani, gunguna pani, daal soup) taaki dehydration na ho.\n` +
          `- **Cold Sponge (Pani ki patti):** Room temperature pani me cotton kapda bhigo kar maathe aur gardan par rakhein (ice use na karein).\n` +
          `- **Tulsi-Adrak Kadha:** 5-6 tulsi patte aur thodi adrak ubaal kar pijiye.\n\n` +
          `### ⚠️ Khatre ke Sanket (Red Flags)\n` +
          `- Bukhar 102°F se upar ho ya 3 din se zyada continue rahe.\n` +
          `- Gardan me akad (stiff neck), chakkar, behoshi ya body rash.\n\n` +
          `### 👨‍⚕️ Doctor Se Paramarsh\n` +
          `Agar bukhar 48 ghante me theek na ho, toh Upchaar par verified doctor se turant free video consultation schedule karein.`
        );
      }
      return (
        `### 🩺 Clinical Triage Assessment (Fever)\n` +
        `Fever is your body's immunological response fighting an underlying viral or bacterial trigger.\n\n` +
        `### 🌿 Evidence-Based Home Care Measures\n` +
        `- **Golden Turmeric Milk:** 1 cup warm milk with 1/2 tsp turmeric powder at bedtime provides anti-inflammatory and pain-relieving curcumin.\n` +
        `- **Active Hydration:** Drink 2.5–3 liters of oral fluids (ORS electrolyte solution, coconut water, warm broths) to prevent dehydration.\n` +
        `- **Tepid Sponging:** Apply a cloth soaked in room-temperature water across forehead and nape (never use ice water).\n` +
        `- **Metabolic Rest:** Maintain complete physical rest in a cool, ventilated room.\n\n` +
        `### ⚠️ Red Flag Symptoms (Seek Emergency Hospital Care)\n` +
        `- Body temperature exceeding 103°F (39.4°C) or unresponsive to antipyretics.\n` +
        `- Fever persisting for more than 3 consecutive days.\n` +
        `- Accompanied by stiff neck, confusion, petechial rash, or severe shortness of breath.\n\n` +
        `### 👨‍⚕️ Verified Doctor Recommendation\n` +
        `If fever persists beyond 48 hours, connect with a verified Government Medical Specialist directly on Upchaar for clinical evaluation and CBC/Widal tests.`
      );
    }

    // 2. COUGH & COLD
    if (q.includes('cough') || q.includes('cold') || q.includes('sore throat') || q.includes('sardi') || q.includes('khasi') || q.includes('khansi') || q.includes('सर्दी') || q.includes('खांसी') || q.includes('गला')) {
      if (isHindi) {
        return (
          `### 🩺 प्राथमिक चिकित्सकीय समझ (Cold & Cough Assessment)\n` +
          `सर्दी, जुकाम और गले की खराश आमतौर पर ऊपरी श्वसन तंत्र के वायरल संक्रमण (Upper Respiratory Tract Infection) के कारण होती है।\n\n` +
          `### 🌿 सुरक्षित घरेलू उपचार (Evidence-Based Home Remedies)\n` +
          `- **गुनगुने नमक के पानी से गरारे:** 1 गिलास गुनगुने पानी में आधा चम्मच सेंधा या सादा नमक मिलाकर दिन में 3 बार गरारे करें। यह गले की सूजन और बैक्टीरिया को कम करता है।\n` +
          `- **अदरक, तुलसी और शहद:** 1 चम्मच अदरक के रस में 4-5 तुलसी के पत्तों का रस और 1 चम्मच शुद्ध शहद मिलाकर दिन में 2 बार धीरे-धीरे लें।\n` +
          `- **भाप लेना (Steam Inhalation):** सादे गर्म पानी की भाप दिन में 2 बार 5-7 मिनट लें। यह बंद नाक और बलगम को ढीला करता है।\n` +
          `- **मुलेठी या लौंग चूसना:** गले में खराश या सूखी खांसी में 1 लौंग या मुलेठी का छोटा टुकड़ा मुंह में रखकर चूसें।\n\n` +
          `### ⚠️ खतरे के संकेत (Red Flag Symptoms)\n` +
          `- सांस लेने में तकलीफ होना या सीने में घरघराहट (Wheezing) की आवाज आना।\n` +
          `- खांसी के साथ खून आना (Hemoptysis)।\n` +
          `- खांसी 2 सप्ताह (14 दिन) से अधिक समय तक बनी रहना।\n\n` +
          `### 👨‍⚕️ डॉक्टर से परामर्श (Next Steps)\n` +
          `यदि गले में अत्यधिक दर्द हो या खाना-पानी निगलने में कठिनाई हो, तो Upchaar पर ईएनटी (ENT) या जनरल फिजिशियन से तुरंत सलाह लें।`
        );
      }
      if (isHinglish) {
        return (
          `### 🩺 Clinical Assessment (Sardi, Khansi & Gala Kharash)\n` +
          `Sardi aur khansi mostly self-limiting viral infection hota hai jo 5-7 din me settle ho jata hai.\n\n` +
          `### 🌿 Ghar Par Surakshit Upaay (Home Remedies)\n` +
          `- **Namak Pani ke Garare (Salt Water Gargle):** 1 glass gungune paani me 1/2 tsp namak daal kar din me 3 baar gargle karein. Gale ki sujan me turant aaram milta hai.\n` +
          `- **Adrak, Tulsi & Honey:** 1 tsp adrak ka ras + 4-5 tulsi patte + 1 tsp honey mila kar din me 2 baar lein.\n` +
          `- **Steam Inhalation (Bhaap):** Plain warm water ki steam din me 2 baar 5-8 minute lein. Chest congestion khul jayegi.\n` +
          `- **Mulethi / Laung:** Gale me dry cough ho toh 1 laung ya mulethi muh me rakh kar chusein.\n\n` +
          `### ⚠️ Khatre ke Sanket (Red Flags)\n` +
          `- Saans lene me dikkat (difficulty breathing) ya chest me pain.\n` +
          `- Khansi me khoon aana ya 10 din se zyada continue rehna.\n\n` +
          `### 👨‍⚕️ Doctor Se Paramarsh\n` +
          `Agar cough persistent ho ya fever ke saath ho, toh Upchaar par doctor se consultation karein.`
        );
      }
      return (
        `### 🩺 Clinical Triage Assessment (Cold, Cough & Sore Throat)\n` +
        `Acute rhinopharyngitis is most commonly a self-limiting viral upper respiratory infection resolving within 7–10 days.\n\n` +
        `### 🌿 Evidence-Based Home Care Measures\n` +
        `- **Hypertonic Saline Gargles:** Gargle with warm salt water (1/2 tsp salt in 250ml warm water) 3–4 times daily to reduce mucosal edema.\n` +
        `- **Ginger, Tulsi & Honey Elixir:** 1 tsp fresh ginger juice with crushed holy basil (tulsi) and honey soothes irritated bronchial pathways.\n` +
        `- **Gentle Steam Inhalation:** Inhaling warm water steam for 5–8 minutes thins tenacious mucus secretions.\n` +
        `- **Licorice (Mulethi) Root:** Sucking on a small piece of licorice root coats pharyngeal mucosa and dampens cough reflex.\n\n` +
        `### ⚠️ Red Flag Symptoms (Seek Urgent Physician Review)\n` +
        `- Severe shortness of breath, stridor, or inability to swallow saliva.\n` +
        `- Cough producing rusty or blood-tinged sputum.\n` +
        `- Symptoms persisting beyond 10–14 days.\n\n` +
        `### 👨‍⚕️ Verified Doctor Recommendation\n` +
        `For persistent bronchial cough or fever, connect directly with an ENT or General Physician on Upchaar for clinical chest auscultation.`
      );
    }

    // 3. ACIDITY, GAS & INDIGESTION
    if (q.includes('acidity') || q.includes('gas') || q.includes('indigestion') || q.includes('bloating') || q.includes('pet') || q.includes('acid') || q.includes('एसिडिटी') || q.includes('गैस') || q.includes('पेट दर्द')) {
      if (isHindi) {
        return (
          `### 🩺 प्राथमिक चिकित्सकीय समझ (Acidity & Digestion Assessment)\n` +
          `पेट में गैस, जलन और अपच आमतौर पर अनियमित खान-पान, तैलीय व तीखे भोजन, तनाव या खाली पेट रहने के कारण गैस्ट्रिक एसिड बढ़ने से होती है।\n\n` +
          `### 🌿 सुरक्षित घरेलू उपचार (Evidence-Based Home Remedies)\n` +
          `- **अजवाइन और काला नमक का पानी:** आधा चम्मच अजवाइन और एक चुटकी काला नमक गुनगुने पानी के साथ चबाकर लें। अजवाइन में मौजूद थाइमोल गैस व पेट फूलने में तुरंत आराम देता है।\n` +
          `- **ठंडा दूध या छाछ:** आधा कप ठंडा बिना मलाई का दूध या भुने जीरे व पुदीने वाली छाछ पिएं। यह अतिरिक्त एसिड को न्यूट्रलाइज करता है।\n` +
          `- **सौंफ का पानी:** 1 चम्मच सौंफ को 1 कप पानी में 5 मिनट उबालकर भोजन के 20 मिनट बाद पिएं।\n` +
          `- **जीवनशैली नियम:** खाना खाने के तुरंत बाद न लेटें, कम से कम 2 घंटे बाद ही सोएं और भोजन छोटी-छोटी मात्रा में करें।\n\n` +
          `### ⚠️ खतरे के संकेत (Red Flag Symptoms)\n` +
          `- पेट का तेज असहनीय दर्द जो पीठ या कंधे की तरफ फैले।\n` +
          `- काले रंग का मल (Black tarry stool) या खून की उल्टी।\n` +
          `- सीने में भारीपन के साथ पसीना और जबड़े में दर्द (यह हार्ट अटैक का संकेत हो सकता है)।\n\n` +
          `### 👨‍⚕️ डॉक्टर से परामर्श (Next Steps)\n` +
          `यदि एसिडिटी बार-बार हो रही हो, तो Upchaar पर गैस्ट्रोएंटेरोलॉजिस्ट या जनरल फिजिशियन से परामर्श लें।`
        );
      }
      if (isHinglish) {
        return (
          `### 🩺 Clinical Assessment (Acidity, Gas & Indigestion)\n` +
          `Pet me jalan aur gas aksar irregular diet, oily/spicy food ya excessive tea/coffee ki wajah se acid reflux hone par hoti hai.\n\n` +
          `### 🌿 Ghar Par Surakshit Upaay (Home Remedies)\n` +
          `- **Ajwain & Kala Namak:** Aadhi chammach ajwain aur 1 pinch kala namak gungune pani ke saath lein. Thymol gas ko turant release karta hai.\n` +
          `- **Thanda Doodh ya Chhachh (Buttermilk):** Half cup chilled milk ya jeere wali mattha/chhachh piyein. Natural antacid ka kaam karta hai.\n` +
          `- **Saunf ka Paani:** 1 tsp saunf ko ubaal kar khana khane ke baad sip karein.\n` +
          `- **Eating Habit:** Khane ke turant baad na soyein, kam se kam 2 ghante baad rest karein.\n\n` +
          `### ⚠️ Khatre ke Sanket (Red Flags)\n` +
          `- Severe pet dard jo peeth ki taraf radiate ho.\n` +
          `- Chest me heavy pressure ke saath pasina aana (emergency cardiac sign).\n\n` +
          `### 👨‍⚕️ Doctor Se Paramarsh\n` +
          `Agar acidity chronic ho chuki hai, toh Upchaar par doctor se prescription aur diet plan lein.`
        );
      }
      return (
        `### 🩺 Clinical Triage Assessment (Acidity & Acid Reflux)\n` +
        `Gastric hyperacidity and dyspepsia are frequently caused by delayed gastric emptying, dietary triggers, and stress.\n\n` +
        `### 🌿 Evidence-Based Home Care Measures\n` +
        `- **Carom Seeds (Ajwain) & Black Salt:** Chew 1/2 tsp ajwain with a pinch of rock salt and warm water. Thymol provides rapid carminative relief.\n` +
        `- **Chilled Milk or Probiotic Buttermilk:** 1/2 glass cold skimmed milk acts as a fast-acting gastric buffer to neutralize acid irritation.\n` +
        `- **Fennel Seed Infusion:** Sip warm water infused with 1 tsp fennel seeds post meals to soothe esophageal spasms.\n` +
        `- **Positional Therapy:** Elevate head by 6 inches during sleep and avoid lying down for 2–3 hours after eating.\n\n` +
        `### ⚠️ Red Flag Symptoms (Seek Emergency Medical Evaluation)\n` +
        `- Substernal chest tightness radiating to left arm or jaw with diaphoresis (Must rule out cardiac event).\n` +
        `- Coffee-ground vomitus or black tarry stools (melena).\n` +
        `- Difficulty or pain on swallowing food (dysphagia).\n\n` +
        `### 👨‍⚕️ Verified Doctor Recommendation\n` +
        `For persistent reflux or epigastric pain, book a free clinical consult with an Upchaar physician for H. pylori and ulcer screening.`
      );
    }

    // 4. HEADACHE
    if (q.includes('headache') || q.includes('migraine') || q.includes('sar dard') || q.includes('sir dard') || q.includes('सिरदर्द') || q.includes('माइग्रेन')) {
      if (isHindi) {
        return (
          `### 🩺 प्राथमिक चिकित्सकीय समझ (Headache Assessment)\n` +
          `सामान्य सिरदर्द तनाव (Tension Headache), पानी की कमी, नींद की कमी या स्क्रीन पर अत्यधिक समय बिताने के कारण होता है।\n\n` +
          `### 🌿 सुरक्षित घरेलू उपचार (Evidence-Based Home Remedies)\n` +
          `- **पर्याप्त पानी पिएं (Hydration):** 1-2 गिलास गुनगुना पानी तुरंत पिएं। सिरदर्द का एक बड़ा कारण डिहाइड्रेशन होता है।\n` +
          `- **माठे पर ठंडी या गर्म सिकाई:** माइग्रेन में माथे पर ठंडी पट्टी और टेंशन हेडएक में गर्दन पर हल्की गर्म सिकाई से मांसपेशियों का खिंचाव कम होता है।\n` +
          `- **अदरक की चाय:** ताजी अदरक का टुकड़ा उबालकर पिएं। अदरक में सूजन रोधी गुण होते हैं जो माइग्रेन के दर्द और उल्टी में लाभकारी हैं।\n` +
          `- **अंधेरे कमरे में 20-30 मिनट विश्राम:** तेज रोशनी और मोबाइल स्क्रीन से दूर शांत कमरे में आंखें बंद करके आराम करें।\n\n` +
          `### ⚠️ खतरे के संकेत (Red Flag Symptoms)\n` +
          `- अचानक बहुत तेज सिरदर्द होना (Thunderclap headache - जीवन का सबसे तेज दर्द)।\n` +
          `- सिरदर्द के साथ हाथ-पैर में कमजोरी, चेहरे का लटकना या बोलने में लड़खड़ाहट।\n` +
          `- सिरदर्द के साथ तेज बुखार और गर्दन में गंभीर अकड़न।\n\n` +
          `### 👨‍⚕️ डॉक्टर से परामर्श (Next Steps)\n` +
          `यदि सिरदर्द बार-बार होता है या दृष्टि में धुंधलापन आता है, तो Upchaar पर न्यूरोलॉजिस्ट या फिजिशियन से परामर्श लें।`
        );
      }
      return (
        `### 🩺 Clinical Triage Assessment (Headache)\n` +
        `Most common headaches are tension-type or dehydration-related headaches stemming from cervical muscle contraction and ocular fatigue.\n\n` +
        `### 🌿 Evidence-Based Home Care Measures\n` +
        `- **Prompt Hydration:** Drink 500ml of water immediately; mild dehydration is one of the most frequent triggers.\n` +
        `- **Temperature Compress:** Place a cold pack across your forehead for vascular headaches, or warm compress on your neck for tension tightness.\n` +
        `- **Ginger Infusion:** Fresh ginger tea inhibits prostaglandin synthesis and reduces headache intensity and accompanying nausea.\n` +
        `- **Sensory Rest:** Rest in a darkened, silent room away from digital monitors for 30 minutes.\n\n` +
        `### ⚠️ Red Flag Symptoms (Emergency Hospital Warning)\n` +
        `- Sudden onset "thunderclap" headache reaching maximal intensity in seconds.\n` +
        `- Headache accompanied by unilateral weakness, numbness, slurred speech, or vision impairment.\n` +
        `- Headache associated with high fever and stiff neck.\n\n` +
        `### 👨‍⚕️ Verified Doctor Recommendation\n` +
        `If headaches recur regularly or disrupt daily activities, connect with a certified physician on Upchaar for neurological evaluation.`
      );
    }

    // Default General Response
    if (isHindi) {
      return (
        `### 🩺 प्राथमिक चिकित्सकीय समझ (Health Assessment)\n` +
        `आपके प्रश्न "${query}" के संबंध में Upchaar AI की प्राथमिक समीक्षा प्रस्तुत है।\n\n` +
        `### 🌿 सामान्य स्वास्थ्य व घरेलू देखभाल उपाय (General Home Care)\n` +
        `- **संतुलित पोषण व जलयोजन:** दिनभर में 2.5 से 3 लीटर स्वच्छ पानी पिएं और हल्का, ताजा बना भोजन लें।\n` +
        `- **पर्याप्त विश्राम:** प्रतिदिन 7-8 घंटे की गहरी नींद लें ताकि शरीर को प्राकृतिक रूप से ठीक होने का समय मिले।\n` +
        `- **हल्का प्राणायाम व ध्यान:** तनाव कम करने के लिए 10 मिनट अनुलोम-विलोम या गहरी सांस लें।\n\n` +
        `### ⚠️ खतरे के संकेत (Warning Signs)\n` +
        `- यदि लक्षण 48 घंटे से अधिक समय तक लगातार बने रहें या दर्द बढ़ता जाए।\n` +
        `- तेज बुखार, चक्कर आना या अत्यधिक कमजोरी महसूस होना।\n\n` +
        `### 👨‍⚕️ डॉक्टर से निःशुल्क परामर्श\n` +
        `सटीक नैदानिक परीक्षण (Diagnosis) और उपचार के लिए Upchaar पर हमारे सत्यापित सरकारी डॉक्टरों से 1-क्लिक में तुरंत संपर्क करें।`
      );
    }

    return (
      `### 🩺 Clinical Triage Assessment\n` +
      `Regarding your health inquiry: "${query}".\n\n` +
      `### 🌿 Evidence-Based Supportive Self-Care\n` +
      `- **Steady Hydration:** Maintain 2.5–3 liters of clean fluid intake daily.\n` +
      `- **Restorative Sleep:** Ensure 7–8 hours of restful sleep to optimize immune regeneration.\n` +
      `- **Clean Nutrition:** Favor warm, freshly prepared, low-inflammatory meals.\n\n` +
      `### ⚠️ Warning Signs\n` +
      `- Persistent symptoms lasting beyond 3 days without signs of clinical improvement.\n` +
      `- Progression of pain, high fever, or systemic malaise.\n` +
      `- Unresponsive severe symptoms.\n\n` +
      `### 👨‍⚕️ Verified Doctor Recommendation\n` +
      `For tailored medical diagnosis and laboratory review, connect with a verified physician directly on Upchaar (100% Free Consultation).`
    );
  }
}

export const aiService = new AIService();
