import React from 'react';
import { MessageSquare, Star } from 'lucide-react';
import ReviewList from '../../components/reviews/ReviewList';
import { useGetAllReviewsQuery } from '../../store/api/reviewApi';

const ReviewsPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useGetAllReviewsQuery(undefined, {
    pollingInterval: 10000,
    refetchOnFocus: true,
  });
  const reviews = data?.data || [];
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  if (isLoading) return <div className="py-10 text-center">Loading reviews...</div>;
  if (isError) return <div className="card p-8 text-center"><p className="text-red-400 mb-3">Could not load reviews.</p><button onClick={() => refetch()} className="btn btn-primary">Try Again</button></div>;

  return <div>
    <h1 className="text-3xl font-bold mb-8">Customer Reviews</h1>
    <div className="grid sm:grid-cols-2 gap-4 mb-6">
      <div className="card p-5"><MessageSquare className="text-primary-400 mb-2" /><div className="text-2xl font-bold">{reviews.length}</div><div className="text-sm text-white/50">Total Reviews</div></div>
      <div className="card p-5"><Star className="text-yellow-400 fill-yellow-400 mb-2" /><div className="text-2xl font-bold">{average.toFixed(1)}</div><div className="text-sm text-white/50">Average Rating</div></div>
    </div>
    <div className="card p-6"><ReviewList reviews={reviews} emptyMessage="No customer reviews have been submitted." /></div>
  </div>;
};

export default ReviewsPage;
