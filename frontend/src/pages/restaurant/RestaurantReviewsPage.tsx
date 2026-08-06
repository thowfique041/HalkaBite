import React from 'react';
import { Star } from 'lucide-react';
import { useGetMyRestaurantQuery } from '../../store/api/restaurantApi';
import { useGetRestaurantReviewsQuery } from '../../store/api/reviewApi';
import ReviewList from '../../components/reviews/ReviewList';

const RestaurantReviewsPage: React.FC = () => {
  const { data: restaurantData } = useGetMyRestaurantQuery(); const id = restaurantData?.data?._id;
  const { data, isLoading } = useGetRestaurantReviewsQuery(id!, { skip: !id, pollingInterval: 30000 });
  const reviews = data?.data || [];
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold">Customer Reviews</h1><p className="text-white/50 mt-2">Feedback for your restaurant and menu items.</p></header><div className="card p-6 flex items-center gap-4"><span className="w-14 h-14 rounded-2xl bg-yellow-500/15 text-yellow-400 grid place-items-center"><Star className="w-7 h-7 fill-current" /></span><div><div className="text-3xl font-bold">{average.toFixed(1)}</div><div className="text-sm text-white/45">{reviews.length} verified review{reviews.length === 1 ? '' : 's'}</div></div></div><div className="card p-6">{isLoading ? <p className="text-white/50">Loading reviews…</p> : <ReviewList reviews={reviews} emptyMessage="No customer reviews yet." />}</div></div>;
};
export default RestaurantReviewsPage;
