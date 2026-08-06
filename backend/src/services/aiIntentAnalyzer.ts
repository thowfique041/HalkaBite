import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIResponseLanguage, detectAIResponseLanguage } from '../utils/aiLanguage';

export type CustomerIntent =
  | 'food_search'
  | 'food_recommendation'
  | 'combo_recommendation'
  | 'order_status'
  | 'delivery_question'
  | 'general_information'
  | 'help_support'
  | 'account_question';

export interface IntentFilters {
  maxPrice?: number;
  minPrice?: number;
  category?: string;
  restaurant?: string;
  mealType?: string;
  minRating?: number;
  keywords?: string[];
  spicy?: boolean;
  vegetarian?: boolean;
  discounted?: boolean;
  nearby?: boolean;
}

export interface AnalyzedIntent {
  intent: CustomerIntent;
  filters: IntentFilters;
  language: AIResponseLanguage;
}

const ALLOWED_INTENTS = new Set<CustomerIntent>([
  'food_search', 'food_recommendation', 'combo_recommendation', 'order_status',
  'delivery_question', 'general_information', 'help_support', 'account_question'
]);
const MEAL_TYPES = new Set(['breakfast', 'brunch', 'lunch', 'dinner', 'snack', 'dessert']);

const safeNumber = (value: unknown, maximum: number) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.min(number, maximum) : undefined;
};

const sanitizeFilters = (value: unknown): IntentFilters => {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const mealType = typeof source.mealType === 'string' && MEAL_TYPES.has(source.mealType.toLowerCase())
    ? source.mealType.toLowerCase()
    : undefined;
  return {
    maxPrice: safeNumber(source.maxPrice, 1_000_000),
    minPrice: safeNumber(source.minPrice, 1_000_000),
    minRating: safeNumber(source.minRating, 5),
    category: typeof source.category === 'string' ? source.category.trim().slice(0, 60) : undefined,
    restaurant: typeof source.restaurant === 'string' ? source.restaurant.trim().slice(0, 100) : undefined,
    mealType,
    keywords: Array.isArray(source.keywords)
      ? source.keywords.filter((word): word is string => typeof word === 'string').map(word => word.trim()).filter(Boolean).slice(0, 5)
      : [],
    spicy: source.spicy === true ? true : undefined,
    vegetarian: source.vegetarian === true ? true : undefined,
    discounted: source.discounted === true ? true : undefined,
    nearby: source.nearby === true ? true : undefined
  };
};

const fallbackAnalysis = (message: string): AnalyzedIntent => {
  const digits: Record<string, string> = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  const text = message.toLowerCase().replace(/[০-৯]/g, digit => digits[digit]);
  const language = detectAIResponseLanguage(message);
  if (/\b(order|amar order|order koi|order status|track)\b|অর্ডার.*(?:কোথায়|স্ট্যাটাস)/i.test(text)) {
    return { intent: 'order_status', filters: {}, language };
  }
  if (/\b(delivery|deliver|shipping|eta)\b|ডেলিভারি/i.test(text)) {
    return { intent: 'delivery_question', filters: {}, language };
  }
  const foodQuery = /\b(food|foods|item|items|menu|eat|meal|burger|pizza|restaurant|breakfast|lunch|dinner|spicy|healthy|recommend|suggest|khabar|khawar|sajest)\b|খাবার|বার্গার|পিজ্জা|রেস্টুরেন্ট|নাশতা|ঝাল|সাজেস্ট/i.test(text);
  const budget = text.match(/(?:under|below|within|modhe|moddhe|nice|niche)\s*(?:tk|taka|bdt)?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/(\d+(?:\.\d+)?)\s*(?:tk|taka|bdt|টাকার?)/i);
  const filters: IntentFilters = {
    maxPrice: budget ? Number(budget[1]) : undefined,
    category: /\bburger\b|বার্গার/i.test(text) ? 'Burger' : /\bpizza\b|পিজ্জা/i.test(text) ? 'Pizza' : undefined,
    mealType: /\bbreakfast\b|নাশতা/i.test(text) ? 'breakfast' : /\blunch\b/i.test(text) ? 'lunch' : /\bdinner\b|রাতের/i.test(text) ? 'dinner' : undefined,
    spicy: /\bspicy|jhal\b|ঝাল/i.test(text) ? true : undefined,
    vegetarian: /\bvegetarian|vegan|veggie\b|নিরামিষ/i.test(text) ? true : undefined,
    keywords: /\bhealthy\b|স্বাস্থ্যকর/i.test(text) ? ['healthy'] : []
  };
  return { intent: foodQuery || budget ? 'food_recommendation' : 'general_information', filters, language };
};

export const analyzeCustomerIntent = async (message: string): Promise<AnalyzedIntent> => {
  const language = detectAIResponseLanguage(message);
  if (!process.env.GEMINI_API_KEY) return fallbackAnalysis(message);

  const prompt = `You are Stage 1 of HalkaBite's AI pipeline. Analyze intent only.
Never answer the user. Never write conversational text. Return JSON only.

Allowed intents:
food_search, food_recommendation, combo_recommendation, order_status, delivery_question,
general_information, help_support, account_question

Allowed filters:
maxPrice, minPrice, category, restaurant, mealType, minRating, keywords,
spicy, vegetarian, discounted, nearby

Normalize Bangla and Banglish meaning into English filter values. Numbers must be numeric.
Do not create database fields, MongoDB operators, code, or query syntax.
Schema:
{"intent":"allowed intent","filters":{"maxPrice":number,"minPrice":number,"category":"string","restaurant":"string","mealType":"breakfast|brunch|lunch|dinner|snack|dessert","minRating":number,"keywords":["string"],"spicy":boolean,"vegetarian":boolean,"discounted":boolean,"nearby":boolean}}

USER_MESSAGE:
${JSON.stringify(message)}`;

  try {
    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json', temperature: 0, maxOutputTokens: 400 }
    });
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text()) as Record<string, unknown>;
    const intent = typeof parsed.intent === 'string' && ALLOWED_INTENTS.has(parsed.intent as CustomerIntent)
      ? parsed.intent as CustomerIntent
      : fallbackAnalysis(message).intent;
    return { intent, filters: sanitizeFilters(parsed.filters), language };
  } catch (error) {
    console.error('Gemini intent analysis error:', error);
    return fallbackAnalysis(message);
  }
};
