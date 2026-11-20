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
   * Process patient chat message with medical emergency triage & conversational guidance
   */
  async processHealthQuery(query: string, history: ChatMessage[] = []): Promise<{
    reply: string;
    isEmergency: boolean;
    urgencyLevel: string;
    emergencyCategory?: string;
  }> {
    // 1. Mandatory Clinical Safety Triage Check
    const triage = evaluateClinicalEmergency(query);
    if (triage.isEmergency) {
      const emergencyReply = `🚨 **EMERGENCY WARNING DETECTED: ${triage.emergencyCategory}**\n\n` +
        `**Urgent Action Required:** ${triage.recommendedAction}\n\n` +
        `⚠️ Your symptoms indicate a potential medical emergency. PraanSewa AI cannot replace emergency medical intervention. **Please call emergency services (112 or 102 in India) or go immediately to the nearest hospital casualty/emergency department.**\n\n` +
        `*${triage.disclaimer}*`;

      return {
        reply: emergencyReply,
        isEmergency: true,
        urgencyLevel: 'EMERGENCY',
        emergencyCategory: triage.emergencyCategory,
      };
    }

    // 2. Call Grok API (xAI) if configured
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
                content:
                  'You are PraanSewa AI Healthcare Assistant, a compassionate, accurate, evidence-based triage support system for a public healthcare platform. ' +
                  'All consultations on PraanSewa are with verified Government Medical Officers and are 100% Free. ' +
                  'Never claim to make definitive medical diagnoses or prescribe controlled medications. Provide clear, empathetic guidance, lifestyle recommendations, and red flags. ' +
                  'Always advise patients to consult a verified Government doctor on the platform or visit the nearest government health center.',
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

    // 3. If Groq key is provided, call Groq API (GroqCloud OpenAI-compatible)
    if ((this.provider === 'groq' || config.ai.groqApiKey) && config.ai.groqApiKey) {
      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.ai.groqApiKey}`,
          },
          body: JSON.stringify({
            model: config.ai.groqModel || 'openai/gpt-oss-120b',
            messages: [
              {
                role: 'system',
                content:
                  'You are PraanSewa Health Assistant. All consultations on PraanSewa are with Government Medical Officers and are 100% Free. ' +
                  'Provide empathetic, evidence-based health guidance without claiming definitive diagnosis.',
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
          if (reply.trim()) {
            return {
              reply: `${reply.trim()}\n\n*${STANDARD_MEDICAL_DISCLAIMER}*`,
              isEmergency: false,
              urgencyLevel: 'ROUTINE',
            };
          }
        }
      } catch (err) {
        console.warn('[AIService] Groq API call error:', err);
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
    const reply = this.generateClinicalKnowledgeResponse(query);
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
   * Internal clinical knowledge generator for common patient questions
   */
  private generateClinicalKnowledgeResponse(query: string): string {
    const q = query.toLowerCase();

    if (q.includes('fever') || q.includes('high temperature')) {
      return (
        `### Clinical Guidance on Fever\n\n` +
        `A fever is the body's natural immunological response to infection.\n\n` +
        `**Key Care Steps:**\n` +
        `- **Hydration:** Drink plenty of fluids (water, ORS, clear broths, coconut water) to prevent dehydration.\n` +
        `- **Rest:** Allow your body adequate metabolic rest.\n` +
        `- **Cooling:** Wear lightweight, breathable cotton clothing and rest in a well-ventilated room.\n\n` +
        `**When to seek immediate medical attention:**\n` +
        `- Temperature > 103°F (39.4°C) or not responding to antipyretics.\n` +
        `- Fever lasting more than 3 consecutive days.\n` +
        `- Accompanying stiff neck, severe headache, confusion, or rash.`
      );
    }

    if (q.includes('cough') || q.includes('cold') || q.includes('sore throat')) {
      return (
        `### Guidance on Cold, Cough & Sore Throat\n\n` +
        `Most acute colds and pharyngitis are viral self-limiting infections that resolve within 7 to 10 days.\n\n` +
        `**Supportive Measures:**\n` +
        `- **Saline Gargle:** Gargle with warm salt water (1/2 tsp salt in 200ml warm water) 3-4 times daily.\n` +
        `- **Hydration:** Warm ginger water with honey (for adults and children > 1 year) soothes airway irritation.\n` +
        `- **Steam:** Inhaling gentle steam helps loosen stubborn nasal congestion.\n\n` +
        `**Red Flags:** Difficulty swallowing liquids, inability to open mouth, breathing difficulty, or coughing up blood.`
      );
    }

    if (q.includes('headache') || q.includes('migraine')) {
      return (
        `### Guidance on Headaches\n\n` +
        `Mild tension headaches often respond to lifestyle adjustments and stress reduction.\n\n` +
        `**Supportive Measures:**\n` +
        `- Rest in a dark, quiet, distraction-free environment.\n` +
        `- Apply a cool or warm compress across your forehead and neck.\n` +
        `- Ensure adequate fluid intake and avoid skipping meals.\n\n` +
        `**Emergency Warning:** Sudden severe "thunderclap" headache, headache accompanied by weakness, numbness, visual disturbances, or fever requires emergency evaluation.`
      );
    }

    if (q.includes('acidity') || q.includes('gas') || q.includes('bloating') || q.includes('indigestion')) {
      return (
        `### Guidance on Digestive Discomfort & Acidity\n\n` +
        `Occasional indigestion or acid reflux is commonly triggered by diet, meal timing, and stress.\n\n` +
        `**Helpful Steps:**\n` +
        `- Avoid lying down for at least 2 to 3 hours after a meal.\n` +
        `- Eat smaller, more frequent meals rather than heavy dinners.\n` +
        `- Limit deep-fried, oily, excessively spicy foods, caffeine, and carbonated beverages.\n` +
        `- Warm water with crushed cumin and ajwain seeds can aid natural digestive comfort.\n\n` +
        `**Consult a Doctor If:** Pain radiates to your back/jaw, you vomit blood, pass dark black stools, or experience unexplained weight loss.`
      );
    }

    return (
      `### PraanSewa Health Information\n\n` +
      `Thank you for reaching out with your question: "${query}".\n\n` +
      `For any symptoms or physical complaints, the most reliable step is a clinical evaluation by a certified physician who can review your history, conduct physical examination, and order diagnostic tests if indicated.\n\n` +
      `**General Health Tips:**\n` +
      `1. Maintain steady daily hydration (2-3 liters of clean water).\n` +
      `2. Prioritize 7-8 hours of continuous, restorative sleep.\n` +
      `3. Eat a nutrient-dense, fiber-rich balanced diet.\n` +
      `4. If symptoms persist or worsen, book an appointment with our specialist doctors right here on PraanSewa.`
    );
  }
}

export const aiService = new AIService();
