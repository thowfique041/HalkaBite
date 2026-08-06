import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useGetFoodItemsQuery } from '../store/api/foodApi';
import FoodCard from '../components/food/FoodCard';
import { useSearchParams } from 'react-router-dom';

const MenuPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    isVegetarian: false,
    isSpicy: false,
    sort: '',
    page: 1,
    limit: 12,
    restaurant: searchParams.get('restaurant') || '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, error } = useGetFoodItemsQuery(filters);

  const categories = [
    'All',
    'Burgers',
    'Pizza',
    'Biryani',
    'Chinese',
    'Desserts',
    'Drinks',
  ];

  const sortOptions = [
    { value: '', label: 'Default' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'popular', label: 'Most Popular' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, page: 1 });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      isVegetarian: false,
      isSpicy: false,
      sort: '',
      page: 1,
      limit: 12,
      restaurant: '',
    });
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Our Menu</h1>
          <p className="text-white/60">Discover delicious food from the best restaurants</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search for food..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input pl-12 w-full"
            />
          </form>

          {/* Filter Toggle (Mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden btn btn-outline"
          >
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </button>

          {/* Sort Dropdown */}
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="input w-full lg:w-48"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className={`${showFilters ? 'fixed inset-0 z-50 bg-dark-300 p-4 lg:relative lg:p-0 lg:bg-transparent' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0`}>
            <div className="card p-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Filters</h3>
                <div className="flex gap-2">
                  <button onClick={clearFilters} className="text-sm text-primary-400">
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="lg:hidden p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white/60 mb-3">Categories</h4>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilters({ ...filters, category: cat === 'All' ? '' : cat.toLowerCase() })}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${(cat === 'All' && !filters.category) || filters.category === cat.toLowerCase()
                          ? 'bg-primary-500/20 text-primary-400'
                          : 'hover:bg-white/5'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white/60 mb-3">Dietary</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.isVegetarian}
                      onChange={(e) => setFilters({ ...filters, isVegetarian: e.target.checked })}
                      className="w-5 h-5 rounded bg-dark-100 border-white/20 text-primary-500 focus:ring-primary-500"
                    />
                    <span>Vegetarian</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.isSpicy}
                      onChange={(e) => setFilters({ ...filters, isSpicy: e.target.checked })}
                      className="w-5 h-5 rounded bg-dark-100 border-white/20 text-primary-500 focus:ring-primary-500"
                    />
                    <span>Spicy</span>
                  </label>
                </div>
              </div>

              {/* Apply Button (Mobile) */}
              <button
                onClick={() => setShowFilters(false)}
                className="lg:hidden btn btn-primary w-full"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Food Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="skeleton h-80 rounded-2xl" />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-white/60">Failed to load menu. Please try again.</p>
              </div>
            ) : data?.data?.foodItems?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-white/60 mb-4">No items available</p>
                <button onClick={clearFilters} className="btn btn-outline">
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data?.data?.foodItems?.map((food) => (
                    <FoodCard key={food._id} food={food} />
                  ))}
                </div>

                {/* Pagination */}
                {data?.data?.pagination && data.data.pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: data.data.pagination.pages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setFilters({ ...filters, page })}
                        className={`w-10 h-10 rounded-lg ${filters.page === page
                            ? 'bg-primary-500 text-white'
                            : 'bg-white/10 hover:bg-white/20'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuPage;
