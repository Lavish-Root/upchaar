import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

router.use(authenticateToken);

router.post('/chat', (req, res, next) => aiController.chat(req, res, next));
router.get('/conversations', (req, res, next) => aiController.getConversations(req, res, next));
router.get('/conversations/:id', (req, res, next) => aiController.getConversationById(req, res, next));

router.post('/voice/transcribe', upload.single('audio'), (req, res, next) =>
  aiController.transcribeVoice(req, res, next)
);
router.post('/voice/synthesize', (req, res, next) => aiController.synthesizeVoice(req, res, next));
router.post('/voice/turn', (req, res, next) => aiController.voiceTurn(req, res, next));

export default router;
