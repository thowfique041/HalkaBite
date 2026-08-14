import React, { useState } from 'react';
import { Clock, MapPin, Search, Star, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useGetRestaurantsQuery } from '../store/api/restaurantApi';

const RestaurantsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useGetRestaurantsQuery({ search, page, limit: 12 });
  const restaurants = data?.data?.restaurants || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">All Restaurants</h1>
          <p className="text-white/60">Browse active restaurants and explore their menus.</p>
        </div>

        <div className="relative mb-8 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="input pl-12 w-full"
            placeholder="Search restaurants or cuisines..."
          />
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {['restaurant-a','restaurant-b','restaurant-c','restaurant-d','restaurant-e','restaurant-f'].map(slot => <div key={slot} className="skeleton h-96 rounded-2xl" />)}
          </div>
        ) : isError ? (
          <div className="card p-10 text-center">
            <p className="text-white/60 mb-4">Failed to load restaurants.</p>
            <button onClick={() => refetch()} className="btn btn-primary">Try Again</button>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="card p-10 text-center text-white/60">No restaurants found.</div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <article key={restaurant._id} className="card overflow-hidden group">
                  <div className="h-48 relative overflow-hidden bg-white/5">
                    <img
                      src={restaurant.coverImage || restaurant.image}
                      alt={restaurant.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${restaurant.isOpen ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                      {restaurant.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex justify-between gap-4 mb-2">
                      <h2 className="text-xl font-bold">{restaurant.name}</h2>
                      <span className="flex items-center gap-1 text-yellow-400 text-sm shrink-0">
                        <Star className="w-4 h-4 fill-current" /> {restaurant.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 mb-4 line-clamp-1">{restaurant.cuisine.join(' · ')}</p>
                    <div className="space-y-2 text-sm text-white/60 mb-5">
                      <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {restaurant.address.city}, {restaurant.address.state}</div>
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {restaurant.deliveryTime}</div>
                      <div className="flex items-center gap-2"><Truck className="w-4 h-4" /> Delivery ৳{restaurant.deliveryFee} · Minimum ৳{restaurant.minimumOrder}</div>
                    </div>
                    <Link to={`/menu?restaurant=${restaurant._id}`} className="btn btn-primary w-full justify-center">
                      View Menu
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: pagination.pages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`w-10 h-10 rounded-lg ${page === pageNumber ? 'bg-primary-500' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RestaurantsPage;
