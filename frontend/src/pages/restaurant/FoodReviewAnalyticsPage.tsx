import React, { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquare, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetFoodReviewAnalyticsQuery } from '../../store/api/reviewApi';
import type { User } from '../../types';

const sortOptions = [
  ['newest', 'Newest'], ['oldest', 'Oldest'], ['highest', 'Highest Rating'], ['lowest', 'Lowest Rating']
];

const FoodReviewAnalyticsPage: React.FC = () => {
  const { foodId = '' } = useParams(); const navigate = useNavigate();
  const [sort, setSort] = useState('newest'); const [rating, setRating] = useState<number | undefined>(); const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGetFoodReviewAnalyticsQuery({ id: foodId, sort, rating, page, limit: 15 }, { pollingInterval: 30000, refetchOnFocus: true });
  const analytics = data?.data;

  if (isLoading) return <div className="card p-12 text-center text-white/50">Calculating review analytics…</div>;
  if (isError || !analytics) return <div className="card p-12 text-center text-red-300">Unable to load analytics for this food item.</div>;
  const restaurant = typeof analytics.food.restaurant === 'string' ? undefined : analytics.food.restaurant;

  return <div className="space-y-6 animate-[fadeIn_.35s_ease-out]">
    <button onClick={() => navigate('/restaurant-dashboard/menu')} className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white transition"><ArrowLeft className="w-4 h-4" />Back to menu</button>
    <section className="card overflow-hidden"><div className="p-6 md:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center"><img src={analytics.food.image} alt={analytics.food.name} className="w-full sm:w-40 h-40 rounded-2xl object-cover" /><div className="flex-1"><span className="text-xs uppercase tracking-[.18em] text-primary-400">Food Review Analytics</span><h1 className="text-3xl font-bold mt-2">{analytics.food.name}</h1><p className="text-white/50 mt-1">{restaurant?.name || 'Your Restaurant'}</p><div className="flex flex-wrap gap-3 mt-5"><span className="px-4 py-2 rounded-xl bg-yellow-500/10 text-yellow-300 font-bold flex items-center gap-2"><Star className="w-5 h-5 fill-current" />{analytics.averageRating.toFixed(1)}/5</span><span className="px-4 py-2 rounded-xl bg-white/5 text-white/70">{analytics.totalReviews} Reviews</span><span className="px-4 py-2 rounded-xl bg-white/5 text-white/70">{analytics.totalRatingsCount} Ratings</span></div></div></div></section>

    <section className="grid lg:grid-cols-[340px_1fr] gap-6">
      <aside className="card p-6 h-fit"><h2 className="font-bold text-lg">Rating Distribution</h2><p className="text-sm text-white/45 mt-1">Calculated live from customer reviews</p><div className="space-y-4 mt-6">{[5,4,3,2,1].map(star => { const count = analytics.distribution[star] || 0; const percent = analytics.totalReviews ? count / analytics.totalReviews * 100 : 0; return <button key={star} onClick={() => { setRating(current => current === star ? undefined : star); setPage(1); }} className={`w-full p-2 -m-2 rounded-xl transition ${rating === star ? 'bg-yellow-500/10' : 'hover:bg-white/5'}`}><span className="flex items-center gap-3"><span className="w-12 text-sm font-medium flex items-center gap-1">{star}<Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /></span><span className="h-2 flex-1 rounded-full bg-white/10 overflow-hidden"><i className="block h-full rounded-full bg-gradient-to-r from-yellow-500 to-primary-500 transition-all duration-700" style={{ width: `${percent}%` }} /></span><span className="w-9 text-right text-sm text-white/50">{count}</span></span></button>; })}</div>{rating && <button onClick={() => { setRating(undefined); setPage(1); }} className="mt-5 text-xs text-primary-400 hover:text-primary-300">Clear star filter</button>}</aside>

      <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Customer Reviews</h2><p className="text-sm text-white/45">{analytics.pagination.total} matching review{analytics.pagination.total === 1 ? '' : 's'}</p></div><select value={sort} onChange={event => { setSort(event.target.value); setPage(1); }} className="input sm:w-48">{sortOptions.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        {!analytics.reviews.length ? <div className="card p-14 text-center"><MessageSquare className="w-14 h-14 mx-auto text-white/15" /><h3 className="text-xl font-bold mt-4">No Reviews Yet</h3><p className="text-white/45 mt-2">{rating ? `No ${rating}-star reviews were found.` : 'Customer feedback will appear here after completed orders.'}</p></div> : analytics.reviews.map(review => { const customer = typeof review.user === 'string' ? undefined : review.user as User; return <article key={review._id} className="card p-5 transition hover:border-white/10"><div className="flex gap-4"><div className="shrink-0">{customer?.avatar ? <img src={customer.avatar} alt={customer.name} className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-primary-500/15 text-primary-300 grid place-items-center font-bold">{customer?.name?.[0]?.toUpperCase() || 'C'}</div>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{customer?.name || 'Customer'}</h3><div className="flex gap-0.5 mt-1">{[1,2,3,4,5].map(value => <Star key={value} className={`w-4 h-4 ${value <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/15'}`} />)}</div></div><time className="text-xs text-white/35">{new Date(review.createdAt).toLocaleString()}</time></div><p className="text-sm text-white/70 mt-4 leading-relaxed">{review.comment}</p></div></div></article>; })}
        {(analytics.pagination.pages || 0) > 1 && <div className="flex justify-center items-center gap-4 pt-2"><button disabled={page === 1} onClick={() => setPage(value => value - 1)} className="p-2 rounded-lg bg-white/5 disabled:opacity-30"><ChevronLeft /></button><span className="text-sm text-white/50">Page {page} of {analytics.pagination.pages}</span><button disabled={page === analytics.pagination.pages} onClick={() => setPage(value => value + 1)} className="p-2 rounded-lg bg-white/5 disabled:opacity-30"><ChevronRight /></button></div>}
      </div>
    </section>
  </div>;
};
export default FoodReviewAnalyticsPage;
