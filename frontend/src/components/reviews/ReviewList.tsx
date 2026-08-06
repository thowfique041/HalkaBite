import React from 'react';
import { Star } from 'lucide-react';
import type { FoodItem, Review, User } from '../../types';

const ReviewList: React.FC<{ reviews: Review[]; emptyMessage?: string }> = ({ reviews, emptyMessage = 'No reviews yet.' }) => {
  if (!reviews.length) return <p className="text-sm text-white/50 py-4">{emptyMessage}</p>;
  return <div className="space-y-3">{reviews.map(review => {
    const reviewer = typeof review.user === 'string' ? undefined : review.user as User;
    const food = typeof review.foodItem === 'string' ? undefined : review.foodItem as FoodItem;
    return <article key={review._id} className="p-4 rounded-xl bg-white/5 border border-white/5">
      <div className="flex justify-between gap-3 mb-2"><div className="flex items-center gap-3">{reviewer?.avatar ? <img src={reviewer.avatar} alt="" className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center font-bold">{reviewer?.name?.[0] || 'U'}</div>}<div><div className="font-medium">{reviewer?.name || 'Customer'}</div>{food && <div className="text-xs text-white/40">{food.name}</div>}</div></div><div className="flex items-center gap-1 text-yellow-400"><Star className="w-4 h-4 fill-current" /><span className="font-semibold">{review.rating}</span></div></div>
      <p className="text-sm text-white/70">{review.comment}</p>
      <time className="block text-xs text-white/35 mt-2">{new Date(review.createdAt).toLocaleString()}</time>
    </article>;
  })}</div>;
};

export default ReviewList;
