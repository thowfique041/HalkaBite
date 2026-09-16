import { Heart } from 'lucide-react';
import FoodCard from '../components/food/FoodCard';
import { useGetFavoritesQuery } from '../store/api/authApi';

export default function FavoritesPage() {
  const { data, isLoading, isError } = useGetFavoritesQuery();
  const foods = data?.data || [];
  return <main className="min-h-screen px-4 pb-14 pt-24"><div className="mx-auto max-w-7xl">
    <div className="mb-8"><h1 className="flex items-center gap-3 text-3xl font-bold"><Heart className="fill-red-500 text-red-500" /> My Favourites</h1><p className="mt-2 text-white/55">Your saved meals, ready whenever you are.</p></div>
    {isLoading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(x=><div key={x} className="skeleton h-80 rounded-2xl" />)}</div>
      : isError ? <div className="card p-10 text-center text-red-300">Could not load your favourites.</div>
      : foods.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{foods.map(food=><FoodCard key={food._id} food={food} />)}</div>
      : <div className="card p-12 text-center"><Heart className="mx-auto h-14 w-14 text-white/20" /><h2 className="mt-4 text-xl font-bold">No favourites yet</h2><p className="mt-2 text-white/50">Tap the heart on any food to save it here.</p></div>}
  </div></main>;
}
