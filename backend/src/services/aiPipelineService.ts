import { Order } from '../models';
import { getLanguageInstruction } from '../utils/aiLanguage';
import { analyzeCustomerIntent } from './aiIntentAnalyzer';
import { getRecommendationsFromFilters } from './foodRecommendationService';
import { generateGeminiText } from './geminiClient';

type LocationInput = { lat: number; lng: number };

const generateStageTwoResponse = async (
  message: string,
  languageInstruction: string,
  intent: string,
  retrievedData: unknown
) => {
  const prompt = `You are Stage 2 of HalkaBite's retrieval-augmented chatbot pipeline.
Generate a concise, friendly response using ONLY RETRIEVED_DATA.
Never invent foods, restaurants, prices, ratings, orders, delivery states, policies, or account details.
If RETRIEVED_DATA says authenticated is false, ask the customer to sign in.
If the data is empty, politely say no matching information was found.
${languageInstruction}

INTENT: ${intent}
USER_MESSAGE: ${JSON.stringify(message)}
RETRIEVED_DATA: ${JSON.stringify(retrievedData)}`;

  return generateGeminiText(prompt, { temperature: 0.2, maxOutputTokens: 700 });
};

export const processCustomerMessage = async (
  message: string,
  userId?: string,
  location?: LocationInput
) => {
  const analysis = await analyzeCustomerIntent(message);

  if (['food_search', 'food_recommendation', 'combo_recommendation'].includes(analysis.intent)) {
    const recommendation = await getRecommendationsFromFilters(message, analysis.filters, analysis.language, location);
    if (analysis.intent === 'combo_recommendation') {
      const foods = recommendation.recommendedFoods;
      const maximum = analysis.filters.maxPrice ?? Infinity;
      const combos: Array<{
        comboId: string;
        comboName: string;
        items: Array<{ foodId: string; foodName: string; price: number; image: string }>;
        totalPrice: number;
        restaurant: string;
        rating: number;
      }> = [];
      for (let first = 0; first < foods.length; first += 1) {
        for (let second = first + 1; second < foods.length; second += 1) {
          const pair = [foods[first], foods[second]];
          const totalPrice = pair.reduce((sum, food) => sum + food.price, 0);
          if (pair[0].restaurant !== pair[1].restaurant || totalPrice > maximum) continue;
          combos.push({
            comboId: `${pair[0].foodId}-${pair[1].foodId}`,
            comboName: `${pair[0].foodName} + ${pair[1].foodName}`,
            items: pair.map(food => ({ foodId: food.foodId, foodName: food.foodName, price: food.price, image: food.image })),
            totalPrice,
            restaurant: pair[0].restaurant,
            rating: Math.round((pair[0].rating + pair[1].rating) * 5) / 10
          });
          if (combos.length === 3) break;
        }
        if (combos.length === 3) break;
      }
      return {
        ...recommendation,
        recommendedFoods: combos.length ? [] : foods,
        recommendedCombos: combos,
        intent: analysis.intent
      };
    }
    return { ...recommendation, recommendedCombos: [], intent: analysis.intent };
  }

  let retrievedData: unknown;
  if (analysis.intent === 'order_status') {
    retrievedData = userId
      ? {
          authenticated: true,
          orders: await Order.find({
            user: userId,
            orderStatus: { $nin: ['delivered', 'cancelled'] }
          })
            .select('orderNumber orderStatus deliveryStatus totalAmount estimatedDeliveryTime createdAt restaurant deliveryManSnapshot')
            .populate('restaurant', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()
        }
      : { authenticated: false, orders: [] };
  } else if (analysis.intent === 'delivery_question') {
    retrievedData = {
      deliveryWindow: '30-45 minutes for most restaurants',
      tracking: 'Customers can view the latest status from their Orders page',
      stages: ['confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered']
    };
  } else if (analysis.intent === 'general_information') {
    retrievedData = {
      paymentMethods: ['Bkash', 'Nagad', 'Rocket', 'Cash on Delivery'],
      restaurantHours: 'Restaurant hours vary and are shown in each restaurant profile',
      platform: 'HalkaBite is a food ordering and delivery platform in Bangladesh'
    };
  } else {
    retrievedData = {
      supportedHelp: ['menu and food discovery', 'orders', 'delivery', 'payments', 'account profile'],
      accountPrivacy: 'Customers manage their own personal profile information'
    };
  }

  const answer = await generateStageTwoResponse(
    message,
    getLanguageInstruction(analysis.language),
    analysis.intent,
    retrievedData
  );
  return { answer, recommendedFoods: [], recommendedCombos: [], intent: analysis.intent };
};
