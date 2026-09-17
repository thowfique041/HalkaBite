import React from 'react';
import { Star, Clock, Plus, Flame, Leaf, Heart } from 'lucide-react';
import type { FoodItem } from '../../types';
import FoodModal from './FoodModal';
import { useTrackCampaignClickMutation } from '../../store/api/campaignApi';
import { useAppSelector } from '../../store/hooks';
import { useToggleFavoriteMutation } from '../../store/api/authApi';
import toast from 'react-hot-toast';

interface FoodCardProps {
  food: FoodItem;
}

const FoodCard: React.FC<FoodCardProps> = ({ food }) => {
  const [showModal, setShowModal] = React.useState(false);
  const [trackClick] = useTrackCampaignClickMutation(); const user = useAppSelector(state=>state.auth.user);
  const [toggleFavorite, { isLoading: favoriteSaving }] = useToggleFavoriteMutation();
  const isFavorite = Boolean(user?.favoriteItems?.includes(food._id));
  const [remaining, setRemaining] = React.useState(() => food.promotion ? Math.max(0, new Date(food.promotion.endAt).getTime() - Date.now()) : 0);
  React.useEffect(() => { if (!food.promotion) return; const timer=setInterval(()=>setRemaining(Math.max(0,new Date(food.promotion!.endAt).getTime()-Date.now())),1000); return()=>clearInterval(timer); },[food.promotion]);
  const campaignActive = Boolean(food.promotion && remaining > 0);

  const itemDiscount = typeof food.discount === 'number' ? food.discount : 0;
  const hasItemDiscount = itemDiscount > 0;
  const discountedPrice = campaignActive ? food.promotion!.discountedPrice : hasItemDiscount
    ? food.price * (1 - itemDiscount / 100)
    : food.price;

  return (
    <>
      <div
        onClick={() => { if(food.isAvailable){setShowModal(true);if(food.promotion&&user?.role==='user')trackClick(food.promotion.campaignId);} }}
        className={`card card-hover group overflow-hidden cursor-pointer ${!food.isAvailable ? 'opacity-75' : ''}`}
      >
        {/* Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={food.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'}
            alt={food.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
          {user?.role === 'user' && <button
            type="button"
            disabled={favoriteSaving}
            aria-label={isFavorite ? `Remove ${food.name} from favourites` : `Add ${food.name} to favourites`}
            onClick={async event => { event.stopPropagation(); try { const result = await toggleFavorite(food._id).unwrap(); toast.success(result.message); } catch { toast.error('Could not update favourites'); } }}
            className={`absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full border backdrop-blur transition ${isFavorite ? 'border-red-400/50 bg-red-500 text-white' : 'border-white/20 bg-black/45 text-white hover:bg-red-500'}`}
          ><Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} /></button>}

          {/* Discount Badge */}
          {(campaignActive || hasItemDiscount) && (
            <div className="absolute top-3 left-3 bg-gradient-to-r from-red-600 via-primary-500 to-pink-500 text-white px-3 py-1.5 rounded-r-xl text-xs font-extrabold shadow-lg shadow-red-500/40 animate-pulse-slow">
              🔥 {campaignActive ? `${Math.round(food.promotion!.percentageSaved)}% OFF` : `${itemDiscount}% OFF`}
            </div>
          )}

          {/* Tags */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            {food.isVegetarian && (
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center" title="Vegetarian">
                <Leaf className="w-4 h-4 text-white" />
              </div>
            )}
            {food.isSpicy && (
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center" title="Spicy">
                <Flame className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Quick Add Button */}
          <button
            disabled={!food.isAvailable}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Category */}
          <p className="text-primary-400 text-sm font-medium mb-1">
            {typeof food.category === 'object' ? food.category.name : 'Category'}
          </p>

          {/* Name */}
          <h3 className="text-lg font-semibold mb-2 line-clamp-1">{food.name}</h3>

          {/* Description */}
          <p className="text-white/60 text-sm mb-3 line-clamp-2">{food.description}</p>
          {campaignActive && <div className="mb-3 p-3 rounded-xl bg-gradient-to-r from-red-500/15 to-primary-500/10 border border-red-500/20"><p className="text-xs font-bold text-red-300">⚡ {food.promotion!.label}</p><p className="text-[10px] text-white/45 mt-1">Offer ends in</p><div className="grid grid-cols-4 gap-1 mt-1 text-center">{[[86400000,'Day'],[3600000,'Hr'],[60000,'Min'],[1000,'Sec']].map(([unit,label],index)=>{const divisor=Number(unit);const value=index===0?Math.floor(remaining/divisor):Math.floor(remaining/divisor)% (index===1?24:60);return <span key={String(label)} className="bg-black/20 rounded py-1"><b className="block text-xs">{String(value).padStart(2,'0')}</b><i className="not-italic text-[8px] text-white/40">{label}</i></span>})}</div></div>}

          {/* Rating & Time */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-medium">{food.rating.toFixed(1)}</span>
              <span className="text-white/40 text-xs">({food.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-white/60">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{food.preparationTime} min</span>
            </div>
          </div>

          {/* Price & Add Button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-primary-400">৳{Math.round(discountedPrice)}</span>
              {(campaignActive || hasItemDiscount) && (
                <span className="text-sm text-white/40 line-through">৳{food.price}</span>
              )}
            </div>

            {!food.isAvailable && (
              <span className="badge badge-error">Unavailable</span>
            )}
          </div>
          {campaignActive && <p className="text-xs text-green-400 mt-2">You save ৳{Math.round(food.promotion!.amountSaved)} · {Math.round(food.promotion!.percentageSaved)}% saved</p>}
        </div>
      </div>

      <FoodModal
        food={food}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
};

export default FoodCard;
