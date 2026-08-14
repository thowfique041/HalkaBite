import React, { useState } from 'react';
import { Search, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useClearAdminFeaturedFoodMutation, useGetAdminFeaturedFoodsQuery, useSetAdminFeaturedFoodMutation } from '../../store/api/adminApi';

const FeaturedFoodPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'available' | 'unavailable'>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useGetAdminFeaturedFoodsQuery({ search, status, page, limit: 20 });
  const [setFeatured, { isLoading: isAssigning }] = useSetAdminFeaturedFoodMutation();
  const [clearFeatured, { isLoading: isClearing }] = useClearAdminFeaturedFoodMutation();
  const payload = data?.data;
  const [optimisticFeaturedId, setOptimisticFeaturedId] = useState<string | null | undefined>(undefined);
  const featuredFoodId = optimisticFeaturedId === undefined ? payload?.featuredFoodId : optimisticFeaturedId;

  const assign = async (foodId: string) => {
    const previous = featuredFoodId;
    setOptimisticFeaturedId(foodId);
    try { await setFeatured(foodId).unwrap(); await refetch(); setOptimisticFeaturedId(undefined); toast.success('Featured food updated successfully.'); }
    catch (error: any) { setOptimisticFeaturedId(previous); toast.error(error?.data?.message || 'Unable to update featured food.'); }
  };
  const clear = async () => {
    if (!window.confirm('Remove the admin selection and restore the automatic top-rated food?')) return;
    const previous = featuredFoodId;
    setOptimisticFeaturedId(null);
    try { await clearFeatured().unwrap(); await refetch(); setOptimisticFeaturedId(undefined); toast.success('Automatic top-rated fallback restored.'); }
    catch (error: any) { setOptimisticFeaturedId(previous); toast.error(error?.data?.message || 'Unable to remove featured food.'); }
  };

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-semibold text-yellow-300">Homepage merchandising</p><h1 className="mt-1 text-3xl font-bold">Featured Food</h1><p className="mt-2 text-white/50">Choose one food for the customer homepage, or use the automatic highest-rated selection.</p></div>
      {featuredFoodId && <button onClick={clear} disabled={isClearing} className="btn border border-red-500/20 bg-red-500/10 text-red-300"><Trash2 className="mr-2 h-4 w-4" />Use Automatic Selection</button>}
    </header>

    <div className="card grid gap-3 p-4 sm:grid-cols-[1fr_210px]"><label className="relative block"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} className="input w-full pl-11" placeholder="Search foods by name or description…" aria-label="Search foods" /></label><select value={status} onChange={event => { setStatus(event.target.value as typeof status); setPage(1); }} className="input w-full" aria-label="Filter foods by availability"><option value="all">All availability</option><option value="available">Available</option><option value="unavailable">Unavailable</option></select></div>

    <section className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-wide text-white/40"><tr>{['Food','Restaurant','Category','Rating','Reviews','Status','Featured'].map(label => <th key={label} className="px-5 py-4">{label}</th>)}</tr></thead>
          <tbody>
            {payload?.foods.map(food => {
              const restaurant = typeof food.restaurant === 'object' ? food.restaurant.name : 'Unavailable';
              const category = typeof food.category === 'object' ? food.category.name : 'Uncategorized';
              const featured = food._id === featuredFoodId;
              return <tr key={food._id} className={`border-t border-white/5 transition-colors hover:bg-white/[0.025] ${featured ? 'bg-yellow-500/[0.06]' : ''}`}>
                <td className="px-5 py-4"><div className="flex items-center gap-3"><img src={food.image} alt="" className="h-12 w-12 rounded-xl object-cover" /><b>{food.name}</b></div></td>
                <td className="px-5 py-4 text-sm text-white/65">{restaurant}</td><td className="px-5 py-4 text-sm text-white/65">{category}</td>
                <td className="px-5 py-4 font-semibold text-yellow-300">★ {(food.rating || 0).toFixed(1)}</td><td className="px-5 py-4">{food.reviewCount || 0}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${food.isAvailable ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>{food.isAvailable ? 'Available' : 'Unavailable'}</span></td>
                <td className="px-5 py-4">{featured ? <span className="inline-flex items-center rounded-full bg-yellow-400/15 px-3 py-1.5 text-xs font-bold text-yellow-300"><Star className="mr-1 h-4 w-4 fill-current" />Featured</span> : <button onClick={() => assign(food._id)} disabled={isAssigning} className="rounded-xl border border-yellow-400/20 px-3 py-2 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-400/10"><Star className="mr-1 inline h-4 w-4" />Set as Featured</button>}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
      {isLoading && <div className="p-12 text-center text-white/40">Loading foods…</div>}
      {!isLoading && !payload?.foods.length && <div className="p-12 text-center text-white/40">No foods found.</div>}
      {(payload?.pagination.pages || 0) > 1 && <div className="flex items-center justify-center gap-4 border-t border-white/5 p-4"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="btn btn-ghost disabled:opacity-30">Previous</button><span className="text-sm text-white/50">Page {page} of {payload?.pagination.pages}</span><button disabled={page >= (payload?.pagination.pages || 1)} onClick={() => setPage(value => value + 1)} className="btn btn-ghost disabled:opacity-30">Next</button></div>}
    </section>
  </div>;
};

export default FeaturedFoodPage;
