import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateReviewMutation } from '../../store/api/reviewApi';
import type { Order } from '../../types';

interface ReviewModalProps {
  order: Order;
  onClose: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ order, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [foodItemId, setFoodItemId] = useState(order.items[0]?.foodItem || '');
  const [createReview, { isLoading }] = useCreateReviewMutation();
  const restaurant = typeof order.restaurant === 'string' ? null : order.restaurant;
  const restaurantId = typeof order.restaurant === 'string' ? order.restaurant : order.restaurant._id;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rating) {
      toast.error('Please select a rating');
      return;
    }

    try {
      await createReview({
        orderId: order._id,
        restaurantId,
        foodItemId,
        rating,
        comment: comment.trim(),
      }).unwrap();
      toast.success('Thank you for your review!');
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to submit review');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="card w-full max-w-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold">Rate Your Order</h2>
            <p className="text-sm text-white/50 mt-1">{restaurant?.name || `Order #${order.orderNumber}`}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close review form">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="review-food-item" className="block text-sm font-medium text-white/70 mb-2">Food item</label>
            <select id="review-food-item" value={foodItemId} onChange={(event) => setFoodItemId(event.target.value)} className="input w-full" required>
              {order.items.map(item => <option key={item.foodItem} value={item.foodItem}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-3">Your rating</label>
            <div className="flex gap-2" onMouseLeave={() => setHoveredRating(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  className="p-1 transition-transform hover:scale-110"
                  aria-label={`${value} star${value === 1 ? '' : 's'}`}
                >
                  <Star className={`w-9 h-9 ${(hoveredRating || rating) >= value ? 'fill-yellow-400 text-yellow-400' : 'text-white/20'}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="review-comment" className="block text-sm font-medium text-white/70 mb-2">Your review</label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className="input w-full h-32 resize-none"
              placeholder="Tell us about the food and service..."
              minLength={3}
              maxLength={500}
              required
            />
            <div className="text-right text-xs text-white/40 mt-1">{comment.length}/500</div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={isLoading || !rating || comment.trim().length < 3} className="btn btn-primary">
              {isLoading ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
