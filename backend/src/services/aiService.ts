import { Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FoodItem, Restaurant, Order } from '../models';
import { AuthRequest } from '../middleware/auth';
import dotenv from 'dotenv';
import { detectAIResponseLanguage, getLanguageInstruction } from '../utils/aiLanguage';
import { processCustomerMessage } from './aiPipelineService';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Process voice command with Gemini AI
const processVoiceCommand = async (transcript: string, userId: string) => {
  try {
    const responseLanguage = detectAIResponseLanguage(transcript);
    const prompt = `You are an AI assistant for HalkaBite, a food delivery platform. 
    User said: "${transcript}"

    Language requirement: ${getLanguageInstruction(responseLanguage)}
    
    Analyze this voice command and determine the intent. Respond in JSON format with:
    {
      "intent": "order" | "status" | "recommend" | "help" | "navigate" | "unknown",
      "message": "your response to the user",
      "action": {
        "type": "NAVIGATE" | "NONE",
        "payload": "route path or null"
      }
    }
    
    For navigation:
    - "menu" -> "/menu"
    - "orders" -> "/orders"
    - "profile" -> "/profile"
    - "home" -> "/"
    - "cart" -> "/cart"
    
    Keep responses friendly and concise.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    text = text.trim();
    if (text.startsWith('```json')) {
      text = text.substring(7);
    }
    if (text.endsWith('```')) {
      text = text.substring(0, text.length - 3);
    }
    text = text.trim();

    // Parse JSON response
    const aiResponse = JSON.parse(text);

    // Enhance response based on intent
    if (aiResponse.intent === 'navigate') {
      return aiResponse;
    }

    if (aiResponse.intent === 'order') {
      const lowerTranscript = transcript.toLowerCase();
      const foodItems = await FoodItem.find({ isAvailable: true, isDeleted: { $ne: true } });
      const matchedItems = foodItems.filter(item =>
        lowerTranscript.includes(item.name.toLowerCase())
      );

      return {
        ...aiResponse,
        items: matchedItems.map(item => ({
          id: item._id,
          name: item.name,
          price: item.price
        }))
      };
    }

    if (aiResponse.intent === 'status') {
      const latestOrder = await Order.findOne({ user: userId })
        .sort({ createdAt: -1 });

      if (latestOrder) {
      return {
        ...aiResponse,
        order: latestOrder,
        message: responseLanguage === 'bn'
          ? `আপনার সর্বশেষ অর্ডার (${latestOrder.orderNumber}) এখন ${latestOrder.orderStatus} অবস্থায় আছে।`
          : `Your latest order (${latestOrder.orderNumber}) is ${latestOrder.orderStatus}.`
        };
      }
    }

    if (aiResponse.intent === 'recommend') {
      const popularItems = await FoodItem.find({ isAvailable: true, isDeleted: { $ne: true } })
        .sort({ rating: -1, reviewCount: -1 })
        .limit(5);

      return {
        ...aiResponse,
        items: popularItems
      };
    }

    return aiResponse;
  } catch (error) {
    console.error('Gemini AI error:', error);
    // Fallback to basic response
    return {
      intent: 'unknown',
      message: detectAIResponseLanguage(transcript) === 'bn'
        ? 'এই মুহূর্তে আপনার অনুরোধটি বুঝতে সমস্যা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করবেন?'
        : "I'm having trouble processing that right now. Could you please try again?",
      action: null
    };
  }
};

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
    res.status(500).json({
      success: false,
      message: error.message || 'Voice processing failed'
    });
  }
};

// @desc    Chat with AI assistant
// @route   POST /api/ai/chat
// @access  Public
export const handleChat = async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
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
    const pipelineResult = await processCustomerMessage(message, (req as AuthRequest).user?._id?.toString(), location);

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
    console.error('Gemini AI chat error:', error);
    const responseLanguage = detectAIResponseLanguage(typeof req.body?.message === 'string' ? req.body.message : '');
    // Fallback response
    res.status(200).json({
      success: true,
      data: {
        message: responseLanguage === 'bn'
          ? 'আমি HalkaBite-এর এআই সহকারী। মেনু, ডেলিভারির সময়, পেমেন্ট এবং অন্যান্য বিষয়ে সাহায্য করতে পারি। কীভাবে সাহায্য করব?'
          : "I'm HalkaBite's AI assistant! I can help with menu information, delivery times, payment options, and more. How can I assist you today?",
        sessionId: req.body.sessionId || Date.now().toString()
      }
    });
  }
};

// @desc    Get catering quote
// @route   POST /api/ai/catering-quote
// @access  Public
export const getCateringQuote = async (req: Request, res: Response) => {
  try {
    const { guestCount, eventType, items, eventDate } = req.body;

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

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
    res.status(500).json({
      success: false,
      message: error.message || 'Quote generation failed'
    });
  }
};
