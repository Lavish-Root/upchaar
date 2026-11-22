import { prisma } from '../config/database';
import { evaluateClinicalEmergency } from '../utils/safety';
import { aiService } from '../integrations/aiService';

export class HomeRemedyService {
  async getCategories() {
    try {
      return await prisma.homeRemedyCategory.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { remedies: true } },
        },
        orderBy: { displayOrder: 'asc' },
      });
    } catch (e) {
      console.warn('Failed to fetch home remedy categories from DB, returning defaults:', e);
      return [
        { id: 'cat_respiratory', name: 'Respiratory & Cold', slug: 'respiratory-cold', description: 'Remedies for cough, cold, and throat', displayOrder: 1 },
        { id: 'cat_digestive', name: 'Digestive Health', slug: 'digestive-health', description: 'Remedies for gas, acidity, indigestion', displayOrder: 2 },
        { id: 'cat_pain', name: 'Pain & Fatigue', slug: 'pain-fatigue', description: 'Headaches, muscle pain, body aches', displayOrder: 3 },
        { id: 'cat_immunity', name: 'Immunity & Wellness', slug: 'immunity-wellness', description: 'Natural immunity boosters and herbs', displayOrder: 4 },
      ];
    }
  }

  async searchRemedies(query: { symptom?: string; categoryId?: string; categorySlug?: string }) {
    try {
      const where: any = { isActive: true };

      if (query.categoryId) {
        where.categoryId = query.categoryId;
      }

      if (query.categorySlug) {
        where.category = { slug: query.categorySlug };
      }

      if (query.symptom) {
        where.OR = [
          { title: { contains: query.symptom, mode: 'insensitive' } },
          { symptomsTargeted: { contains: query.symptom, mode: 'insensitive' } },
          { summary: { contains: query.symptom, mode: 'insensitive' } },
          { naturalIngredients: { contains: query.symptom, mode: 'insensitive' } },
        ];
      }

      return await prisma.homeRemedy.findMany({
        where,
        include: {
          category: true,
          feedback: { select: { rating: true, isHelpful: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (e) {
      console.warn('searchRemedies DB error, returning empty list:', e);
      return [];
    }
  }

  async getRemedyById(id: string) {
    try {
      const remedy = await prisma.homeRemedy.findUnique({
        where: { id },
        include: {
          category: true,
          feedback: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!remedy) throw new Error('Home remedy not found.');
      return remedy;
    } catch (e) {
      throw new Error('Home remedy not found.');
    }
  }

  /**
   * Conversational Home Remedy Query with emergency safety triage & Groq AI generation
   */
  async consultRemedyAI(userId: string, symptomQuery: string) {
    // 1. Mandatory emergency triage check
    const triage = evaluateClinicalEmergency(symptomQuery);
    if (triage.isEmergency) {
      return {
        isEmergency: true,
        emergencyCategory: triage.emergencyCategory,
        guidance:
          `🚨 **EMERGENCY WARNING: Urgent Medical Attention Needed**\n\n` +
          `Your query contains symptoms associated with a medical emergency (${triage.emergencyCategory}).\n\n` +
          `**Home remedies must NOT be used in place of immediate emergency medical care.** Delaying clinical intervention can be dangerous.\n\n` +
          `**Action Required:** ${triage.recommendedAction}\n\n` +
          `Please call 112 / 102 or proceed immediately to the nearest hospital casualty.`,
        relevantRemedies: [],
      };
    }

    // 2. Search matched clinically reviewed remedies in PostgreSQL
    const matchingRemedies = await this.searchRemedies({ symptom: symptomQuery });

    // 3. Generate rich clinical & home remedy guidance via AIService (Groq LLaMA-3.3)
    const aiResult = await aiService.processHealthQuery(
      `What are the most effective, safe evidence-based Indian home remedies and clinical self-care measures for: ${symptomQuery}?`
    );

    let guidance = aiResult.reply;

    // If matching remedies found in database, append structured database remedy
    if (matchingRemedies.length > 0) {
      const topRemedy = matchingRemedies[0];
      guidance =
        `### 🌿 Verified Remedy: ${topRemedy.title}\n\n` +
        `**Summary:** ${topRemedy.summary}\n\n` +
        `**Key Natural Ingredients:** ${topRemedy.naturalIngredients}\n\n` +
        `**Preparation & Usage:**\n${topRemedy.preparationInstructions}\n\n` +
        `**Safety & Precautions:** ${topRemedy.safetyPrecautions}\n` +
        `**When to Consult a Doctor:** ${topRemedy.whenToSeekDoctor}\n\n` +
        `---\n\n` +
        guidance;

      // Log recommendation safely
      try {
        await prisma.homeRemedyRecommendation.create({
          data: {
            userId,
            symptomQuery,
            remedyId: topRemedy.id,
            aiGuidanceText: guidance,
          },
        });
      } catch (logErr) {
        // Safe skip
      }
    }

    return {
      isEmergency: false,
      guidance,
      relevantRemedies: matchingRemedies.slice(0, 3),
    };
  }

  async saveBookmark(recommendationId: string, wasBookmarked: boolean = true) {
    return prisma.homeRemedyRecommendation.update({
      where: { id: recommendationId },
      data: { wasBookmarked },
    });
  }

  async getSavedRecommendations(userId: string) {
    return prisma.homeRemedyRecommendation.findMany({
      where: { userId, wasBookmarked: true },
      include: { remedy: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitFeedback(data: { remedyId: string; userId: string; rating: number; isHelpful: boolean; comments?: string }) {
    return prisma.homeRemedyFeedback.create({ data });
  }
}

export const homeRemedyService = new HomeRemedyService();
