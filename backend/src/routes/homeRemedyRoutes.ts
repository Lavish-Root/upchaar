import { Router } from 'express';
import { homeRemedyController } from '../controllers/homeRemedyController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public discovery routes
router.get('/categories', (req, res, next) => homeRemedyController.getCategories(req, res, next));
router.get('/', (req, res, next) => homeRemedyController.search(req, res, next));
router.get('/:id', (req, res, next) => homeRemedyController.getById(req, res, next));

// Authenticated AI consultation & bookmarking
router.post('/consult', authenticateToken, (req, res, next) =>
  homeRemedyController.consultRemedyAI(req, res, next)
);
router.post('/bookmark', authenticateToken, (req, res, next) =>
  homeRemedyController.toggleBookmark(req, res, next)
);
router.get('/bookmarks/saved', authenticateToken, (req, res, next) =>
  homeRemedyController.getSavedRecommendations(req, res, next)
);
router.post('/feedback', authenticateToken, (req, res, next) =>
  homeRemedyController.submitFeedback(req, res, next)
);

export default router;
