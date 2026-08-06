import { Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PipelineStage, Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Category, FoodItem, Restaurant } from '../models';
import { AIResponseLanguage, detectAIResponseLanguage, localizeDigits } from '../utils/aiLanguage';
import type { IntentFilters } from './aiIntentAnalyzer';

const MAX_QUERY_LENGTH = 500;
const CANDIDATE_LIMIT = 25;
const RECOMMENDATION_LIMIT = 5;
const GEMINI_TIMEOUT_MS = 12_000;

type LocationInput = { lat: number; lng: number };

interface RecommendationIntent {
  budget?: number;
  minPrice?: number;
  minRating?: number;
  categoryId?: Types.ObjectId;
  categoryName?: string;
  restaurantId?: Types.ObjectId;
  restaurantName?: string;
  spicy?: boolean;
  vegetarian?: boolean;
  discounted?: boolean;
  mealType?: string;
  keywords: string[];
  nearby: boolean;
  sortByRating: boolean;
  sortByPrice: boolean;
}

interface FoodCandidate {
  foodId: string;
  foodName: string;
  description: string;
  category: string;
  price: number;
  restaurant: string;
  restaurantId: string;
  rating: number;
  totalReviews: number;
  availability: boolean;
  discount: number;
  image: string;
  preparationTime: number;
  deliveryTime: string;
  isVegetarian: boolean;
  isSpicy: boolean;
  coordinates?: LocationInput;
  distanceKm?: number;
}

interface ModelRecommendation {
  foodId?: unknown;
}

export const isFoodRecommendationQuery = (message: string) => {
  const text = message.toLowerCase().trim();
  const foodTerms = /\b(food|foods|item|items|menu|eat|meal|burger|pizza|restaurant|restaurants|breakfast|brunch|lunch|dinner|snack|dessert|spicy|healthy|vegetarian|vegan|cheapest|highest[- ]rated|recommend|suggest|khabar|khawar|khabo|khai|sajest|nasta|nashta)\b|খাবার|বার্গার|পিজ্জা|রেস্টুরেন্ট|নাশতা|ব্রেকফাস্ট|লাঞ্চ|ডিনার|ঝাল|স্বাস্থ্যকর|সাজেস্ট|সুপারিশ/i;
  const budgetFoodPhrase = /(?:\d+|[০-৯]+)\s*(?:tk\.?|taka|bdt|৳|টাকা|টাকার)\b/i;
  const budgetQualifier = /\b(?:under|below|within|nice|niche|modhe|moddhe|item|items|food|khabar)\b|নিচে|মধ্যে|কম|আইটেম|খাবার/i;
  const availabilityPhrase = /\b(?:ki ki|what)\s+(?:item|items|food|foods)|\b(?:item|items)\s+(?:ace|ase|ache|available)\b|কি কি (?:আইটেম|খাবার)/i;
  return foodTerms.test(text) || (budgetFoodPhrase.test(text) && budgetQualifier.test(text)) || availabilityPhrase.test(text);
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const numberFrom = (match?: RegExpMatchArray | null) => {
  if (!match?.[1]) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
};

const parseIntent = async (query: string): Promise<RecommendationIntent> => {
  const banglaDigits: Record<string, string> = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  const normalizedQuery = query.replace(/[০-৯]/g, digit => banglaDigits[digit]);
  const banglaAliases = [
    [/বার্গার/, 'burger'], [/পিজ্জা/, 'pizza'], [/ঝাল/, 'spicy'], [/স্বাস্থ্যকর/, 'healthy'],
    [/সকালের খাবার|নাশতা|ব্রেকফাস্ট/, 'breakfast'], [/দুপুরের খাবার|লাঞ্চ/, 'lunch'],
    [/রাতের খাবার|ডিনার/, 'dinner'], [/ছাড়|অফার/, 'discount'], [/কাছাকাছি|কাছে/, 'nearby']
  ] as const;
  const semanticAliases = banglaAliases
    .filter(([pattern]) => pattern.test(normalizedQuery))
    .map(([, alias]) => alias)
    .join(' ');
  const text = `${normalizedQuery.toLowerCase()} ${semanticAliases}`.replace(/\s+/g, ' ').trim();
  const budget = numberFrom(
    text.match(/(?:under|below|within|up to|maximum|max|less than)\s*(?:৳|bdt|tk\.?|taka)?\s*(\d+(?:\.\d+)?)/i)
      || text.match(/(\d+(?:\.\d+)?)\s*(?:৳|bdt|tk\.?|taka)\b/i)
      || text.match(/(\d+(?:\.\d+)?)\s*টাকার?/i)
  );
  const explicitRating = numberFrom(
    text.match(/(?:rating|rated)\s*(?:of|above|over|at least)?\s*(\d(?:\.\d)?)/i)
      || text.match(/(\d(?:\.\d)?)\s*(?:\+|or higher)?\s*stars?/i)
  );

  const categories = await Category.find({ isActive: true })
    .select('_id name slug')
    .lean();
  const category = categories.find(({ name, slug }) => {
    const terms = [name.toLowerCase(), slug?.toLowerCase().replace(/-/g, ' ')].filter(Boolean);
    return terms.some(term => new RegExp(`\\b${escapeRegex(term as string)}\\b`, 'i').test(text));
  });

  let restaurant: { _id: Types.ObjectId; name: string } | null = null;
  const restaurantMatch = text.match(/\b(?:from|at|by)\s+([a-z0-9][a-z0-9 '&.-]{1,60}?)(?=\s+(?:under|below|within|with|rated|rating|near|nearby)\b|[?.!,]|$)/i);
  if (restaurantMatch?.[1]) {
    restaurant = await Restaurant.findOne({
      name: { $regex: `^${escapeRegex(restaurantMatch[1].trim())}$`, $options: 'i' },
      isActive: true
    }).select('_id name').lean();
  }

  const mealTypes = ['breakfast', 'brunch', 'lunch', 'dinner', 'snack', 'dessert'];
  const mealType = mealTypes.find(meal => new RegExp(`\\b${meal}\\b`, 'i').test(text));
  const stopWords = new Set([
    'suggest', 'recommend', 'show', 'find', 'give', 'want', 'need', 'food', 'foods', 'item', 'items',
    'me', 'my', 'the', 'a', 'an', 'some', 'what', 'is', 'are', 'best', 'highest', 'cheapest', 'rated', 'rating',
    'under', 'below', 'within', 'from', 'near', 'nearby', 'restaurant', 'restaurants', 'bdt', 'taka', 'tk',
    'spicy', 'vegetarian', 'vegan', 'discount', 'discounted', 'offer', 'available',
    'ami', 'amake', 'amar', 'apni', 'apnar', 'koro', 'korun', 'kore', 'chai', 'dao', 'den', 'dekhao',
    'modhe', 'moddhe', 'khabar', 'khawar', 'khai', 'khabo', 'bhalo', 'valo', 'lagbe', 'ache', 'ase',
    'jonno', 'ajke', 'ekta', 'kichu', 'sajest', 'nice', 'niche', 'ace', ...mealTypes
  ]);
  const knownTerms = new Set(categories.flatMap(({ name, slug }) => [name.toLowerCase(), slug?.toLowerCase()]));
  const keywords = text
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3 && !stopWords.has(word) && !knownTerms.has(word) && !/^\d/.test(word))
    .slice(0, 4);

  return {
    budget,
    minRating: explicitRating !== undefined ? Math.min(explicitRating, 5) : undefined,
    categoryId: category?._id,
    categoryName: category?.name,
    restaurantId: restaurant?._id,
    restaurantName: restaurant?.name,
    spicy: /\bspicy|hot\b/i.test(text) ? true : undefined,
    vegetarian: /\bvegetarian|vegan|veggie\b/i.test(text) ? true : undefined,
    discounted: /\bdiscount|discounted|deal|offer\b/i.test(text) ? true : undefined,
    mealType,
    keywords,
    nearby: /\bnearby|near me|closest\b/i.test(text),
    sortByRating: /\bbest|highest[- ]rated|top[- ]rated\b/i.test(text),
    sortByPrice: /\bcheapest|lowest[- ]price|most affordable\b|সবচেয়ে সস্তা/i.test(text)
  };
};

const findCandidates = async (intent: RecommendationIntent, location?: LocationInput) => {
  const initialMatch: Record<string, unknown> = { isAvailable: true, isDeleted: { $ne: true } };
  if (intent.categoryId) initialMatch.category = intent.categoryId;
  if (intent.restaurantId) initialMatch.restaurant = intent.restaurantId;
  if (intent.spicy) initialMatch.isSpicy = true;
  if (intent.vegetarian) initialMatch.isVegetarian = true;
  if (intent.discounted) initialMatch.discount = { $gt: 0 };
  if (intent.minRating !== undefined) initialMatch.rating = { $gte: intent.minRating };

  const searchTerms = [...intent.keywords, ...(intent.mealType ? [intent.mealType] : [])];
  if (searchTerms.length) {
    const patterns = searchTerms.map(term => new RegExp(escapeRegex(term), 'i'));
    initialMatch.$or = [
      { name: { $in: patterns } },
      { description: { $in: patterns } },
      { tags: { $in: patterns } },
      { ingredients: { $in: patterns } }
    ];
  }

  const pipeline: PipelineStage[] = [
    { $match: initialMatch },
    {
      $addFields: {
        effectivePrice: {
          $round: [{ $multiply: ['$price', { $subtract: [1, { $divide: [{ $ifNull: ['$discount', 0] }, 100] }] }] }, 2]
        }
      }
    },
    ...(intent.budget !== undefined || intent.minPrice !== undefined ? [{
      $match: {
        effectivePrice: {
          ...(intent.minPrice !== undefined ? { $gte: intent.minPrice } : {}),
          ...(intent.budget !== undefined ? { $lte: intent.budget } : {})
        }
      }
    } as PipelineStage] : []),
    { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'categoryData' } },
    { $unwind: '$categoryData' },
    { $match: { 'categoryData.isActive': true } },
    { $lookup: { from: 'restaurants', localField: 'restaurant', foreignField: '_id', as: 'restaurantData' } },
    { $unwind: '$restaurantData' },
    { $match: { 'restaurantData.isActive': true, 'restaurantData.isOpen': true } },
    {
      $sort: intent.sortByPrice
        ? { effectivePrice: 1, rating: -1 }
        : intent.sortByRating
          ? { rating: -1, reviewCount: -1 }
          : { rating: -1, reviewCount: -1, discount: -1 }
    },
    { $limit: CANDIDATE_LIMIT },
    {
      $project: {
        _id: 0,
        foodId: { $toString: '$_id' },
        foodName: '$name',
        description: 1,
        category: '$categoryData.name',
        price: '$effectivePrice',
        restaurant: '$restaurantData.name',
        restaurantId: { $toString: '$restaurantData._id' },
        rating: { $ifNull: ['$rating', 0] },
        totalReviews: { $ifNull: ['$reviewCount', 0] },
        availability: '$isAvailable',
        discount: { $ifNull: ['$discount', 0] },
        image: 1,
        preparationTime: { $ifNull: ['$preparationTime', 30] },
        deliveryTime: '$restaurantData.deliveryTime',
        isVegetarian: { $ifNull: ['$isVegetarian', false] },
        isSpicy: { $ifNull: ['$isSpicy', false] },
        coordinates: '$restaurantData.address.coordinates'
      }
    }
  ];

  let foods = await FoodItem.aggregate<FoodCandidate>(pipeline);

  if (intent.nearby && location) {
    const toRadians = (degrees: number) => degrees * Math.PI / 180;
    foods = foods
      .filter(food => Number.isFinite(food.coordinates?.lat) && Number.isFinite(food.coordinates?.lng))
      .map(food => {
        const latDifference = toRadians(food.coordinates!.lat - location.lat);
        const lngDifference = toRadians(food.coordinates!.lng - location.lng);
        const a = Math.sin(latDifference / 2) ** 2
          + Math.cos(toRadians(location.lat)) * Math.cos(toRadians(food.coordinates!.lat))
          * Math.sin(lngDifference / 2) ** 2;
        return { ...food, distanceKm: Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10 };
      })
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  return foods.map(({ coordinates, ...food }) => food);
};

const groundedReason = (food: FoodCandidate, language: AIResponseLanguage): string => {
  const description = food.description.trim().replace(/\s+/g, ' ').slice(0, 180);
  if (language === 'bilingual') {
    return `বাংলা: ${groundedReason(food, 'bn')}\nEnglish: ${groundedReason(food, 'en')}`;
  }
  if (language === 'bn') {
    const reviewText = food.totalReviews > 0 ? `, ${localizeDigits(food.totalReviews, language)}টি রিভিউয়ের ভিত্তিতে` : '';
    const discountText = food.discount > 0 ? ` (${localizeDigits(food.discount, language)}% ছাড়ের পর)` : '';
    const distanceText = food.distanceKm !== undefined ? ` রেস্তোরাঁটি প্রায় ${localizeDigits(food.distanceKm, language)} কিলোমিটার দূরে।` : '';
    return `${food.restaurant}-এর ${food.foodName}-এর দাম ${localizeDigits(food.price, language)} টাকা${discountText} এবং রেটিং ${localizeDigits(food.rating, language)}/৫${reviewText}। বর্ণনা: ${description}।${distanceText}`;
  }
  const reviewText = food.totalReviews > 0 ? ` from ${food.totalReviews} review${food.totalReviews === 1 ? '' : 's'}` : '';
  const discountText = food.discount > 0 ? ` after a ${food.discount}% discount` : '';
  const distanceText = food.distanceKm !== undefined ? ` It is approximately ${food.distanceKm} km away.` : '';
  return `${food.foodName} costs BDT ${food.price}${discountText} at ${food.restaurant}, has a ${food.rating}/5 rating${reviewText}, and is described as: ${description}.${distanceText}`;
};

const buildGroundedResponse = (foods: FoodCandidate[], language: AIResponseLanguage, message?: string) => ({
  answer: message || (language === 'bn'
    ? 'বর্তমানে পাওয়া যাচ্ছে—এমন খাবারগুলোর মধ্যে সেরা মিলগুলো এখানে দেওয়া হলো।'
    : 'Here are the best matches I found from currently available foods.'),
  recommendedFoods: foods.slice(0, 3).map(food => ({
    foodId: food.foodId,
    foodName: food.foodName,
    restaurant: food.restaurant,
    price: food.price,
    rating: food.rating,
    image: food.image,
    description: food.description,
    category: food.category,
    restaurantId: food.restaurantId,
    reviewCount: food.totalReviews,
    availability: food.availability,
    discount: food.discount,
    preparationTime: food.preparationTime,
    estimatedDeliveryTime: food.deliveryTime,
    isVegetarian: food.isVegetarian,
    isSpicy: food.isSpicy,
    reason: groundedReason(food, language)
  }))
});

const askGemini = async (query: string, foods: FoodCandidate[], language: AIResponseLanguage) => {
  if (!process.env.GEMINI_API_KEY) return buildGroundedResponse(foods, language);

  const promptFoods = foods.map(({ distanceKm, ...food }) => ({ ...food, ...(distanceKm !== undefined ? { distanceKm } : {}) }));
  const prompt = `You are HalkaBite's grounded food recommendation ranker.

Rules:
- Recommend ONLY foods in AVAILABLE_FOODS and copy each foodId exactly.
- Never invent, rename, or change a food, restaurant, price, or rating.
- Select at most ${RECOMMENDATION_LIMIT} foods that best satisfy USER_REQUEST.
- Your only task is to rank/select foodId values. The backend will attach all displayed facts.
- If none is appropriate, return an empty recommendedFoods array.
- Return valid JSON only, with this schema:
{"recommendedFoods":[{"foodId":"string"}]}

USER_REQUEST:
${JSON.stringify(query)}

AVAILABLE_FOODS:
${JSON.stringify(promptFoods)}`;

  const recommendationModel = new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 1000 }
  });
  const generation = recommendationModel.generateContent(prompt);
  const result = await Promise.race([
    generation,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Gemini recommendation timed out')), GEMINI_TIMEOUT_MS))
  ]);
  const raw = result.response.text().trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(raw) as { recommendedFoods?: ModelRecommendation[] };
  const byId = new Map(foods.map(food => [food.foodId, food]));
  const seen = new Set<string>();
  const recommendedFoods = (Array.isArray(parsed.recommendedFoods) ? parsed.recommendedFoods : [])
    .flatMap(item => {
      const id = typeof item.foodId === 'string' ? item.foodId : '';
      const food = byId.get(id);
      if (!food || seen.has(id)) return [];
      seen.add(id);
      return [{
        foodId: food.foodId,
        foodName: food.foodName,
        restaurant: food.restaurant,
        price: food.price,
        rating: food.rating,
        image: food.image,
        description: food.description,
        category: food.category,
        restaurantId: food.restaurantId,
        reviewCount: food.totalReviews,
        availability: food.availability,
        discount: food.discount,
        preparationTime: food.preparationTime,
        estimatedDeliveryTime: food.deliveryTime,
        isVegetarian: food.isVegetarian,
        isSpicy: food.isSpicy,
        reason: groundedReason(food, language)
      }];
    })
    .slice(0, RECOMMENDATION_LIMIT);

  if (!recommendedFoods.length) {
    return {
      answer: language === 'bn'
        ? 'দুঃখিত, আপনার অনুরোধের সঙ্গে মেলে এমন কোনো খাবার খুঁজে পাইনি।'
        : "Sorry, I couldn't find any food matching your request.",
      recommendedFoods: []
    };
  }
  return {
    answer: language === 'bn'
      ? `বর্তমান মেনু থেকে আপনার জন্য ${localizeDigits(recommendedFoods.length, language)}টি উপযুক্ত খাবার পেয়েছি।`
      : `I found ${recommendedFoods.length} matching food${recommendedFoods.length === 1 ? '' : 's'} from the available menu.`,
    recommendedFoods
  };
};

export const getRecommendationsFromFilters = async (
  query: string,
  filters: IntentFilters,
  language: AIResponseLanguage,
  location?: LocationInput
) => {
  const category = filters.category
    ? await Category.findOne({
        isActive: true,
        $or: [
          { name: { $regex: `^${escapeRegex(filters.category)}$`, $options: 'i' } },
          { slug: filters.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') }
        ]
      }).select('_id name').lean()
    : null;
  const restaurant = filters.restaurant
    ? await Restaurant.findOne({
        isActive: true,
        name: { $regex: `^${escapeRegex(filters.restaurant)}$`, $options: 'i' }
      }).select('_id name').lean()
    : null;

  if ((filters.category && !category) || (filters.restaurant && !restaurant)) {
    return {
      answer: language === 'bn'
        ? 'দুঃখিত, আপনার অনুরোধের সঙ্গে মেলে এমন কোনো খাবার খুঁজে পাইনি।'
        : "Sorry, I couldn't find any food matching your request.",
      recommendedFoods: []
    };
  }

  // Stage-1 values are mapped into this fixed allow-list; no AI-generated query is executed.
  const intent: RecommendationIntent = {
    budget: filters.maxPrice,
    minPrice: filters.minPrice,
    minRating: filters.minRating,
    categoryId: category?._id,
    categoryName: category?.name,
    restaurantId: restaurant?._id,
    restaurantName: restaurant?.name,
    spicy: filters.spicy,
    vegetarian: filters.vegetarian,
    discounted: filters.discounted,
    mealType: filters.mealType,
    keywords: filters.keywords || [],
    nearby: filters.nearby === true,
    sortByRating: /\bbest|highest[- ]rated|top[- ]rated\b|সেরা|সর্বোচ্চ রেট/i.test(query),
    sortByPrice: /\bcheapest|lowest[- ]price|most affordable\b|সবচেয়ে সস্তা/i.test(query)
  };

  const foods = await findCandidates(intent, location);
  if (!foods.length) {
    return {
      answer: language === 'bn'
        ? 'দুঃখিত, আপনার অনুরোধের সঙ্গে মেলে এমন কোনো খাবার খুঁজে পাইনি।'
        : "Sorry, I couldn't find any food matching your request.",
      recommendedFoods: []
    };
  }
  try {
    return await askGemini(query, foods, language);
  } catch (error) {
    console.error('Gemini grounded response generation error:', error);
    return buildGroundedResponse(foods, language);
  }
};

export const handleFoodRecommendation = async (req: AuthRequest, res: Response) => {
  try {
    const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (query.length < 3 || query.length > MAX_QUERY_LENGTH) {
      return res.status(400).json({ success: false, message: `Query must be between 3 and ${MAX_QUERY_LENGTH} characters.` });
    }

    let location: LocationInput | undefined;
    if (req.body?.location !== undefined) {
      const lat = Number(req.body.location?.lat);
      const lng = Number(req.body.location?.lng);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ success: false, message: 'Location must contain valid lat and lng values.' });
      }
      location = { lat, lng };
    }

    const { analyzeCustomerIntent } = await import('./aiIntentAnalyzer');
    const analysis = await analyzeCustomerIntent(query);
    const language = analysis.language;
    const sendRecommendation = (data: { answer: string; recommendedFoods: unknown[] }) => res.status(200).json({
      success: true,
      data: req.body?.chatMode ? { message: data.answer, recommendedFoods: data.recommendedFoods } : data
    });
    if (analysis.filters.nearby && !location) {
      return res.status(400).json({
        success: false,
        message: language === 'bn' ? 'কাছাকাছি খাবারের পরামর্শ পেতে অনুগ্রহ করে আপনার লোকেশন শেয়ার করুন।' : 'Please share your location to receive nearby recommendations.'
      });
    }

    const data = await getRecommendationsFromFilters(query, analysis.filters, language, location);
    return sendRecommendation(data);
  } catch (error: any) {
    console.error('Food recommendation error:', error);
    return res.status(500).json({ success: false, message: 'Unable to generate food recommendations right now.' });
  }
};
