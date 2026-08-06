import React, { useState } from 'react';
import { Clock, Eye, ShoppingBag, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import type { FoodItem } from '../../types';
import { useAddToCartMutation } from '../../store/api/cartApi';
import FoodModal from '../food/FoodModal';

export interface AIRecommendedFood {
  foodId: string;
  foodName: string;
  restaurant: string;
  restaurantId: string;
  price: number;
  rating: number;
  image: string;
  description: string;
  category: string;
  reviewCount: number;
  availability: boolean;
  discount: number;
  preparationTime: number;
  estimatedDeliveryTime: string;
  isVegetarian: boolean;
  isSpicy: boolean;
  reason: string;
}

export interface AIRecommendedCombo {
  comboId: string;
  comboName: string;
  items: Array<{ foodId: string; foodName: string; price: number; image: string }>;
  totalPrice: number;
  restaurant: string;
  rating: number;
}

const toFoodItem = (food: AIRecommendedFood): FoodItem => ({
  _id: food.foodId,
  name: food.foodName,
  description: food.description,
  price: food.price,
  category: food.category,
  restaurant: food.restaurantId,
  image: food.image,
  isAvailable: food.availability,
  isVegetarian: food.isVegetarian,
  isSpicy: food.isSpicy,
  preparationTime: food.preparationTime,
  rating: food.rating,
  reviewCount: food.reviewCount,
  discount: 0,
  tags: []
});

export const AIRecommendedFoodCard: React.FC<{ food: AIRecommendedFood }> = ({ food }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [addToCart, { isLoading }] = useAddToCartMutation();
  const item = toFoodItem(food);

  const handleAdd = async () => {
    try {
      await addToCart({ foodItemId: food.foodId, quantity: 1 }).unwrap();
      toast.success(`${food.foodName} added to cart`);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to add item to cart');
    }
  };

  return (
    <>
      <article className="card card-hover overflow-hidden flex-none w-[230px] sm:w-[250px] snap-start">
        <div className="relative h-32 overflow-hidden">
          <img
            src={food.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'}
            alt={food.foodName}
            className="w-full h-full object-cover"
          />
          <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-semibold ${food.availability ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
            {food.availability ? 'Available' : 'Unavailable'}
          </span>
        </div>
        <div className="p-3">
          <h4 className="font-semibold line-clamp-1">{food.foodName}</h4>
          <p className="text-xs text-primary-300 mt-1 line-clamp-1">{food.restaurant}</p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-lg font-bold text-primary-400">৳{food.price}</span>
            <span className="flex items-center gap-1 text-xs"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{food.rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/50 mt-2">
            <Clock className="w-3.5 h-3.5" />
            <span>{food.estimatedDeliveryTime || `${food.preparationTime} min`}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <button onClick={() => setShowDetails(true)} className="btn btn-outline px-2 py-2 text-xs flex items-center justify-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Details
            </button>
            <button onClick={handleAdd} disabled={!food.availability || isLoading} className="btn btn-primary px-2 py-2 text-xs flex items-center justify-center gap-1 disabled:opacity-50">
              <ShoppingBag className="w-3.5 h-3.5" /> {isLoading ? 'Adding' : 'Add'}
            </button>
          </div>
        </div>
      </article>
      <FoodModal food={item} isOpen={showDetails} onClose={() => setShowDetails(false)} />
    </>
  );
};

export const AIRecommendedComboCard: React.FC<{ combo: AIRecommendedCombo }> = ({ combo }) => {
  const [addToCart, { isLoading }] = useAddToCartMutation();
  const orderCombo = async () => {
    try {
      for (const item of combo.items) {
        await addToCart({ foodItemId: item.foodId, quantity: 1 }).unwrap();
      }
      toast.success(`${combo.comboName} added to cart`);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Could not add the complete combo');
    }
  };

  return (
    <article className="flex-none w-[250px] sm:w-[280px] snap-start rounded-2xl border border-primary-500/30 bg-gradient-to-br from-primary-500/15 to-secondary-500/10 p-4">
      <span className="text-[10px] uppercase tracking-wider text-primary-300 font-semibold">AI Meal Combo</span>
      <h4 className="font-bold mt-1 line-clamp-2">{combo.comboName}</h4>
      <p className="text-xs text-white/60 mt-1">{combo.restaurant}</p>
      <div className="space-y-2 mt-3">
        {combo.items.map(item => (
          <div key={item.foodId} className="flex items-center gap-2 text-sm">
            <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover bg-white/5" />
            <span className="flex-1 line-clamp-1">{item.foodName}</span>
            <span className="text-white/60">৳{item.price}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
        <span className="text-xl font-bold text-primary-400">৳{combo.totalPrice}</span>
        <span className="flex items-center gap-1 text-xs"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{combo.rating.toFixed(1)}</span>
      </div>
      <button onClick={orderCombo} disabled={isLoading} className="btn btn-primary w-full justify-center mt-3 py-2 text-sm disabled:opacity-50">
        <ShoppingBag className="w-4 h-4 mr-1" /> {isLoading ? 'Adding Combo...' : 'Order This Combo'}
      </button>
    </article>
  );
};
