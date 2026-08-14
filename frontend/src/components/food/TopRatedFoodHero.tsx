import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Crown, ShoppingBag, Star, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGetFeaturedFoodQuery } from '../../store/api/foodApi';
import toast from 'react-hot-toast';
import { useAnimatedAddToCart } from '../../hooks/useAnimatedAddToCart';

const useCountUp = (target: number, duration = 900) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
};

const TopRatedFoodHero: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useGetFeaturedFoodQuery();
  const food = data?.data;
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const { addToCart, isLoading: isAdding, isAdded } = useAnimatedAddToCart({ name: food?.name || 'Food', image: food?.image });
  const reviews = useCountUp(food?.reviewCount || 0);
  const sold = useCountUp(food?.totalOrdersSold || 0);

  const pricing = useMemo(() => {
    if (!food) return { current: 0, original: 0, discount: 0 };
    if (food.promotion) return { current: food.promotion.discountedPrice, original: food.promotion.originalPrice, discount: food.promotion.percentageSaved };
    if (food.discount) return { current: food.price * (1 - food.discount / 100), original: food.price, discount: food.discount };
    return { current: food.price, original: food.price, discount: 0 };
  }, [food]);

  if (isLoading) return <div className="mx-auto h-[430px] max-w-5xl animate-pulse rounded-[2rem] bg-white/5" aria-label="Loading top-rated food" />;

  if (!food) return (
    <div className="top-food-frame mx-auto max-w-3xl p-[1px]">
      <div className="rounded-[calc(2rem-1px)] bg-dark-200/90 px-6 py-14 text-center backdrop-blur-xl">
        <span className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-yellow-400/10 text-4xl">🍽️</span>
        <h2 className="text-2xl font-bold">Be the first customer to rate our foods!</h2>
        <p className="mt-2 text-white/50">Order something delicious and help the community discover its next favorite.</p>
        <button onClick={() => navigate('/menu')} className="btn btn-primary mt-6">Browse the Menu</button>
      </div>
    </div>
  );

  const restaurant = typeof food.restaurant === 'object' ? food.restaurant.name : 'HalkaBite Restaurant';
  const category = typeof food.category === 'object' ? food.category.name : 'Food';
  const handleAdd = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await addToCart({ foodItemId: food._id, quantity: 1 }, addButtonRef.current);
      toast.success(`${food.name} added to cart!`);
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string } };
      toast.error(apiError.data?.message || 'Failed to add to cart');
    }
  };

  return (
    <article
      role="link"
      tabIndex={0}
      aria-label={`View ${food.name}, the top-rated food`}
      onClick={() => navigate(`/food/${food._id}`)}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/food/${food._id}`); } }}
      className="top-food-frame top-food-enter group relative mx-auto max-w-5xl cursor-pointer overflow-hidden p-[1px] outline-none transition-transform duration-500 hover:-translate-y-2 focus-visible:ring-2 focus-visible:ring-yellow-300"
    >
      <div className="top-food-shine pointer-events-none absolute inset-0 z-20" />
      <div className="grid overflow-hidden rounded-[calc(2rem-1px)] bg-dark-200/85 backdrop-blur-2xl md:grid-cols-[1.05fr_1fr]">
        <div className="relative min-h-72 overflow-hidden md:min-h-[430px]">
          <img src={food.image} alt={food.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-300/80 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-dark-200/30" />
          <span className="absolute left-5 top-5 rounded-full border border-yellow-200/40 bg-gradient-to-r from-amber-500 to-yellow-300 px-4 py-2 text-sm font-black text-amber-950 shadow-lg shadow-yellow-500/30 animate-pulse">
            <Trophy className="mr-1.5 inline h-4 w-4" /> #1 Top Rated
          </span>
          {pricing.discount > 0 && <span className="absolute bottom-5 left-5 rounded-xl bg-red-500 px-3 py-2 text-sm font-extrabold shadow-lg">🔥 {Math.round(pricing.discount)}% OFF</span>}
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-9">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-300"><Crown className="h-4 w-4" /> Community Favorite</div>
          <p className="text-sm font-medium text-primary-300">{category} · {restaurant}</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">{food.name}</h2>
          <p className="mt-4 line-clamp-3 leading-relaxed text-white/60">{food.description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-1 font-bold text-yellow-300">
              {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`top-food-star h-4 w-4 ${star <= Math.round(food.rating) ? 'fill-current' : 'opacity-25'}`} style={{ animationDelay: `${star * 100}ms` }} />)}
              <b className="ml-1 text-white">{food.rating.toFixed(1)}</b>
            </span>
            <span className="text-sm text-white/55">{reviews.toLocaleString()} Reviews</span>
            <span className="flex items-center gap-1 text-sm text-white/55"><ShoppingBag className="h-4 w-4" />{sold.toLocaleString()} Sold</span>
          </div>

          <div className="mt-7 flex items-end gap-3">
            <strong className="text-3xl text-primary-400">৳{Math.round(pricing.current)}</strong>
            {pricing.discount > 0 && <span className="pb-1 text-base text-white/35 line-through">৳{Math.round(pricing.original)}</span>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex w-fit items-center rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold transition-colors group-hover:bg-primary-500">View Food Details →</span>
            <button ref={addButtonRef} type="button" onClick={handleAdd} disabled={isAdding || !food.isAvailable} className={`btn btn-primary relative px-5 py-3 text-sm ${isAdded ? 'add-to-cart-success' : ''}`}>
              <ShoppingBag className="mr-2 h-4 w-4" />{isAdding ? 'Adding…' : isAdded ? 'Added ✓' : 'Add to Cart'}
              {isAdded && <span aria-hidden="true" className="add-to-cart-sparkles"><i /><i /><i /><i /><i /></span>}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default TopRatedFoodHero;
