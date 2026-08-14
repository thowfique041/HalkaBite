import React, { useRef, useState } from 'react';
import { X, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import type { FoodItem } from '../../types';
import toast from 'react-hot-toast';
import { useGetFoodReviewsQuery } from '../../store/api/reviewApi';
import ReviewList from '../reviews/ReviewList';
import { useAnimatedAddToCart } from '../../hooks/useAnimatedAddToCart';

interface FoodModalProps {
    food: FoodItem;
    isOpen: boolean;
    onClose: () => void;
}

const FoodModal: React.FC<FoodModalProps> = ({ food, isOpen, onClose }) => {
    const [quantity, setQuantity] = useState(1);
    const [specialInstructions, setSpecialInstructions] = useState('');
    const { addToCart, isLoading, isAdded } = useAnimatedAddToCart({ name: food.name, image: food.image });
    const addButtonRef = useRef<HTMLButtonElement>(null);
    const { data: reviewsData, isLoading: reviewsLoading } = useGetFoodReviewsQuery(food._id, {
        skip: !isOpen,
        pollingInterval: isOpen ? 5000 : 0,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });

    if (!isOpen) return null;

    const discountedPrice = food.discount
        ? food.price * (1 - food.discount / 100)
        : food.price;

    const totalPrice = discountedPrice * quantity;

    const handleAddToCart = async () => {
        try {
            await addToCart({
                foodItemId: food._id,
                quantity,
                specialInstructions: specialInstructions.trim() || undefined
            }, addButtonRef.current);
            toast.success(`${food.name} added to cart!`);
            window.setTimeout(onClose, 650);
        } catch (error: unknown) {
            const apiError = error as { data?: { code?: string; message?: string } };
            if (apiError.data?.code === 'DIFFERENT_RESTAURANT') {
                toast.error('Clear cart first to order from a different restaurant');
            } else {
                toast.error(apiError.data?.message || 'Failed to add to cart');
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-dark-200 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl border border-white/10 animate-in fade-in zoom-in duration-200">
                <div className="relative h-64">
                    <img
                        src={food.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'}
                        alt={food.name}
                        className="w-full h-full object-cover"
                    />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    {food.discount && (
                        <div className="absolute bottom-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg font-bold shadow-lg">
                            {food.discount}% OFF
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="text-2xl font-bold">{food.name}</h2>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-primary-400">৳{Math.round(discountedPrice)}</p>
                                {food.discount && (
                                    <p className="text-sm text-white/40 line-through">৳{food.price}</p>
                                )}
                            </div>
                        </div>
                        <p className="text-white/60">{food.description}</p>
                        <div className="flex items-center gap-2 mt-3">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-bold">{food.rating.toFixed(1)}</span>
                            <span className="text-sm text-white/40">({food.reviewCount} reviews)</span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Special Instructions (Optional)
                        </label>
                        <textarea
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
                            placeholder="E.g. No onions, extra spicy, sauce on side..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary-500/50 min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <div className="flex items-center gap-4 bg-white/5 rounded-xl p-1">
                            <button
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="p-3 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                                disabled={quantity <= 1}
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold w-8 text-center">{quantity}</span>
                            <button
                                onClick={() => setQuantity(quantity + 1)}
                                className="p-3 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            ref={addButtonRef}
                            onClick={handleAddToCart}
                            disabled={isLoading}
                            className={`btn btn-primary relative overflow-visible flex items-center gap-2 px-8 py-3 ${isAdded ? 'add-to-cart-success' : ''}`}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : isAdded ? (
                                <span>Added ✓</span>
                            ) : (
                                <>
                                    <ShoppingBag className="w-5 h-5" />
                                    <span>Add to Cart - ৳{Math.round(totalPrice)}</span>
                                </>
                            )}
                            {isAdded && <span aria-hidden="true" className="add-to-cart-sparkles"><i /><i /><i /><i /><i /></span>}
                        </button>
                    </div>

                    <div className="pt-5 border-t border-white/10">
                        <h3 className="text-lg font-bold mb-3">Customer Reviews</h3>
                        {reviewsLoading ? <p className="text-sm text-white/50">Loading reviews...</p> : <ReviewList reviews={reviewsData?.data || []} emptyMessage="No reviews for this item yet." />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FoodModal;
