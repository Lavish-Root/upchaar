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
      const { message, conversationId, conversationType, language } = aiChatSchema.parse(req.body);
      const userId = req.user?.userId || 'anonymous-patient';

      let convId = conversationId;
      let formattedHistory: any[] = [];

      // Attempt to load from / save to DB with graceful fallback if DB is temporarily unreachable
      try {
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

        formattedHistory = history.reverse().map((m) => ({
          role: m.role.toLowerCase() as 'user' | 'assistant' | 'system',
          content: m.content,
        }));
      } catch (dbErr) {
        console.warn('AIController: Database save skipped (operating in memory/offline mode):', dbErr instanceof Error ? dbErr.message : dbErr);
        if (!convId) {
          convId = 'conv_' + Date.now();
        }
      }

      // Generate AI response with clinical triage, home remedies & multilingual support
      const result = await aiService.processHealthQuery(message, formattedHistory, language);

      // Attempt to persist assistant message
      let savedAssistantMsg: any = {
        id: 'msg_' + Date.now(),
        conversationId: convId,
        role: 'ASSISTANT',
        content: result.reply,
        metadata: JSON.stringify({
          isEmergency: result.isEmergency,
          urgencyLevel: result.urgencyLevel,
          emergencyCategory: result.emergencyCategory,
        }),
      };

      try {
        savedAssistantMsg = await prisma.aIMessage.create({
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
      } catch (e) {
        // DB save fallback
      }

      return sendSuccess(res, {
        conversationId: convId,
        message: savedAssistantMsg,
        reply: result.reply,
        isEmergency: result.isEmergency,
        urgencyLevel: result.urgencyLevel,
        emergencyCategory: result.emergencyCategory,
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
      const { mimeType, audioBase64 } = aiVoiceTranscribeSchema.parse(req.body);
      const audioBuffer = req.file?.buffer || (audioBase64 ? Buffer.from(audioBase64.replace(/^data:audio\/\w+;base64,/, ''), 'base64') : undefined);
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
      const { text, language } = req.body;
      const result = await voiceService.processVoiceTurn(text || 'Hello doctor', language);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const aiController = new AIController();
