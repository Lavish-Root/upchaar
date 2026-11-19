import { Request, Response, NextFunction } from 'express';
import { homeRemedyService } from '../services/homeRemedyService';
import { homeRemedyFeedbackSchema, searchHomeRemediesSchema } from '../validators';
import { sendSuccess } from '../utils/response';

export class HomeRemedyController {
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await homeRemedyService.getCategories();
      return sendSuccess(res, categories);
    } catch (err) {
      next(err);
    }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const { symptom, categoryId } = searchHomeRemediesSchema.parse(req.query);
      const categorySlug = req.query.categorySlug as string | undefined;
      const remedies = await homeRemedyService.searchRemedies({ symptom, categoryId, categorySlug });
      return sendSuccess(res, remedies);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const remedy = await homeRemedyService.getRemedyById(req.params.id);
      return sendSuccess(res, remedy);
    } catch (err) {
      next(err);
    }
  }

  async consultRemedyAI(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { query } = req.body;
      const result = await homeRemedyService.consultRemedyAI(userId, query || '');
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async toggleBookmark(req: Request, res: Response, next: NextFunction) {
    try {
      const { recommendationId, wasBookmarked } = req.body;
      const updated = await homeRemedyService.saveBookmark(recommendationId, wasBookmarked);
      return sendSuccess(res, updated, 'Bookmark updated');
    } catch (err) {
      next(err);
    }
  }

  async getSavedRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const saved = await homeRemedyService.getSavedRecommendations(userId);
      return sendSuccess(res, saved);
    } catch (err) {
      next(err);
    }
  }

  async submitFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const validated = homeRemedyFeedbackSchema.parse(req.body);
      const feedback = await homeRemedyService.submitFeedback({ ...validated, userId });
      return sendSuccess(res, feedback, 'Thank you for your clinical feedback', 201);
    } catch (err) {
      next(err);
    }
  }
}

export const homeRemedyController = new HomeRemedyController();
