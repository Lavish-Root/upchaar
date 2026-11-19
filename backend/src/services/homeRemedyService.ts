import { prisma } from '../config/database';
import { evaluateClinicalEmergency } from '../utils/safety';

export class HomeRemedyService {
  async getCategories() {
    return prisma.homeRemedyCategory.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { remedies: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async searchRemedies(query: { symptom?: string; categoryId?: string; categorySlug?: string }) {
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

    return prisma.homeRemedy.findMany({
      where,
      include: {
        category: true,
        feedback: { select: { rating: true, isHelpful: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRemedyById(id: string) {
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
  }

  /**
   * Conversational Home Remedy Query with emergency safety triage
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
          `**Action Required:** ${triage.recommendedAction}`,
        relevantRemedies: [],
      };
    }

    // 2. Search matched clinically reviewed remedies in PostgreSQL
    const matchingRemedies = await this.searchRemedies({ symptom: symptomQuery });

    let guidance = `Based on your symptom inquiry regarding "${symptomQuery}", here are evidence-grounded, supportive home care measures:\n\n`;

    if (matchingRemedies.length > 0) {
      const topRemedy = matchingRemedies[0];
      guidance +=
        `**Recommended Measure:** ${topRemedy.title}\n` +
        `**Summary:** ${topRemedy.summary}\n\n` +
        `**Preparation & Usage:**\n${topRemedy.preparationInstructions}\n\n` +
        `**Safety & Precautions:** ${topRemedy.safetyPrecautions}\n` +
        `**Age Warnings:** ${topRemedy.ageWarnings}\n` +
        `**Pregnancy Warnings:** ${topRemedy.pregnancyWarnings}\n\n` +
        `⚠️ **When to consult a doctor:** ${topRemedy.whenToSeekDoctor}`;

      // Log recommendation
      await prisma.homeRemedyRecommendation.create({
        data: {
          userId,
          symptomQuery,
          remedyId: topRemedy.id,
          aiGuidanceText: guidance,
        },
      });
    } else {
      guidance +=
        `While specific home remedies for this exact phrase are not recorded in our database, basic hydration, adequate rest, and avoiding known irritants are advised.\n\n` +
        `If symptoms are painful, persistent, or worsening, please consult with a verified physician on PraanSewa.`;
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
