import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import dotenv from 'dotenv';
import { processCustomerMessage } from './aiPipelineService';
import { AIServiceError, generateGeminiText, logAIError } from './geminiClient';

dotenv.config();

// @desc    Process voice command
// @route   POST /api/ai/voice
// @access  Private
export const handleVoiceCommand = async (req: AuthRequest, res: Response) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        message: 'No voice transcript provided'
      });
    }

    const pipelineResult = await processCustomerMessage(transcript, req.user._id.toString());
    const result = {
      intent: pipelineResult.intent,
      message: pipelineResult.answer,
      recommendedFoods: pipelineResult.recommendedFoods,
      recommendedCombos: pipelineResult.recommendedCombos,
      action: { type: 'NONE', payload: null }
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logAIError('voice-request', error);
    const status = error instanceof AIServiceError ? error.statusCode : 500;
    res.status(status).json({
      success: false,
      code: error?.code || 'VOICE_PROCESSING_FAILED',
      message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Voice processing failed'
    });
  }
};

// @desc    Chat with AI assistant
// @route   POST /api/ai/chat
// @access  Public
export const handleChat = async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'No message provided'
      });
    }

    const rawLocation = req.body?.location;
    const location = rawLocation
      && Number.isFinite(Number(rawLocation.lat))
      && Number.isFinite(Number(rawLocation.lng))
      && Number(rawLocation.lat) >= -90 && Number(rawLocation.lat) <= 90
      && Number(rawLocation.lng) >= -180 && Number(rawLocation.lng) <= 180
      ? { lat: Number(rawLocation.lat), lng: Number(rawLocation.lng) }
      : undefined;
    if (message.length > 2_000) {
      return res.status(400).json({ success: false, code: 'MESSAGE_TOO_LONG', message: 'Message cannot exceed 2000 characters.' });
    }
    const pipelineResult = await processCustomerMessage(message.trim(), (req as AuthRequest).user?._id?.toString(), location);

    res.status(200).json({
      success: true,
      data: {
        message: pipelineResult.answer,
        recommendedFoods: pipelineResult.recommendedFoods,
        recommendedCombos: pipelineResult.recommendedCombos,
        intent: pipelineResult.intent,
        sessionId: req.body.sessionId || Date.now().toString()
      }
    });
  } catch (error: any) {
    logAIError('chat-request', error, {
      messageLength: typeof req.body?.message === 'string' ? req.body.message.length : 0
    });
    const serviceError = error instanceof AIServiceError ? error : null;
    const status = serviceError?.statusCode || 500;
    const developmentMessage = serviceError?.message || (error instanceof Error ? error.message : 'Unknown AI error');
    return res.status(status).json({
      success: false,
      code: serviceError?.code || 'AI_CHAT_FAILED',
      message: process.env.NODE_ENV === 'development'
        ? developmentMessage
        : status === 504
          ? 'The AI service took too long to respond. Please try again.'
          : 'The AI service is temporarily unavailable. Please try again later.'
    });
  }
};

// @desc    Get catering quote
// @route   POST /api/ai/catering-quote
// @access  Public
export const getCateringQuote = async (req: Request, res: Response) => {
  try {
    const { guestCount, eventType, eventDate } = req.body;

    if (!guestCount || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide guest count and event type'
      });
    }

    const prompt = `Generate a catering quote for HalkaBite food delivery:
    - Guest count: ${guestCount}
    - Event type: ${eventType}
    - Event date: ${eventDate || 'Not specified'}
    
    Provide a JSON response with:
    {
      "pricePerPerson": number (in BDT),
      "estimatedTotal": number,
      "note": "brief explanation",
      "recommendations": "menu suggestions"
    }
    
    Base prices: Wedding: 1500 BDT, Corporate: 800 BDT, Birthday: 600 BDT, Other: 500 BDT per person.`;

    const text = await generateGeminiText(prompt, { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 500 });

    try {
      const quoteData = JSON.parse(text);

      res.status(200).json({
        success: true,
        data: {
          guestCount,
          eventType,
          eventDate,
          ...quoteData,
          currency: 'BDT',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    } catch (parseError) {
      // Fallback calculation
      const basePerPerson = eventType === 'wedding' ? 1500 :
        eventType === 'corporate' ? 800 :
          eventType === 'birthday' ? 600 : 500;

      const estimatedTotal = guestCount * basePerPerson;

      res.status(200).json({
        success: true,
        data: {
          guestCount,
          eventType,
          eventDate,
          pricePerPerson: basePerPerson,
          estimatedTotal,
          currency: 'BDT',
          note: 'This is an estimate. Final price may vary based on specific menu selections.',
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
    }
  } catch (error: any) {
    logAIError('catering-quote', error);
    const status = error instanceof AIServiceError ? error.statusCode : 500;
    res.status(status).json({
      success: false,
      code: error?.code || 'QUOTE_GENERATION_FAILED',
      message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Quote generation failed'
    });
  }
};
