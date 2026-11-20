import { Request, Response, NextFunction } from 'express';
import { aiService } from '../integrations/aiService';
import { voiceService } from '../integrations/voiceService';
import { aiChatSchema, aiVoiceTranscribeSchema, aiVoiceSynthesizeSchema } from '../validators';
import { sendSuccess } from '../utils/response';
import { prisma } from '../config/database';
import { AIRole } from '@prisma/client';

export class AIController {
  async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, conversationId, conversationType } = aiChatSchema.parse(req.body);
      const userId = req.user!.userId;

      // Ensure conversation exists or create one
      let convId = conversationId;
      if (!convId) {
        const title = message.slice(0, 40) + '...';
        const newConv = await prisma.aIConversation.create({
          data: {
            userId,
            title,
            conversationType,
          },
        });
        convId = newConv.id;
      }

      // Save user message
      await prisma.aIMessage.create({
        data: {
          conversationId: convId,
          role: AIRole.USER,
          content: message,
        },
      });

      // Fetch recent history
      const history = await prisma.aIMessage.findMany({
        where: { conversationId: convId },
        take: 6,
        orderBy: { createdAt: 'desc' },
      });

      const formattedHistory = history.reverse().map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
        content: m.content,
      }));

      // Generate AI response with clinical triage
      const result = await aiService.processHealthQuery(message, formattedHistory);

      // Save assistant message
      const savedAssistantMsg = await prisma.aIMessage.create({
        data: {
          conversationId: convId,
          role: AIRole.ASSISTANT,
          content: result.reply,
          metadata: JSON.stringify({
            isEmergency: result.isEmergency,
            urgencyLevel: result.urgencyLevel,
            emergencyCategory: result.emergencyCategory,
          }),
        },
      });

      return sendSuccess(res, {
        conversationId: convId,
        message: savedAssistantMsg,
        isEmergency: result.isEmergency,
        urgencyLevel: result.urgencyLevel,
      });
    } catch (err) {
      next(err);
    }
  }

  async getConversations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const type = req.query.type as any;

      const conversations = await prisma.aIConversation.findMany({
        where: {
          userId,
          ...(type && { conversationType: type }),
        },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return sendSuccess(res, conversations);
    } catch (err) {
      next(err);
    }
  }

  async getConversationById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const conversation = await prisma.aIConversation.findFirst({
        where: { id: req.params.id, userId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });

      return sendSuccess(res, conversation);
    } catch (err) {
      next(err);
    }
  }

  async transcribeVoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { mimeType } = aiVoiceTranscribeSchema.parse(req.body);
      const audioBuffer = req.file?.buffer;
      const result = await voiceService.transcribeAudio(audioBuffer, mimeType);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async synthesizeVoice(req: Request, res: Response, next: NextFunction) {
    try {
      const { text } = aiVoiceSynthesizeSchema.parse(req.body);
      const result = await voiceService.synthesizeVoice(text);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async voiceTurn(req: Request, res: Response, next: NextFunction) {
    try {
      const { text } = req.body;
      const result = await voiceService.processVoiceTurn(text || 'Hello doctor');
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AIController();
