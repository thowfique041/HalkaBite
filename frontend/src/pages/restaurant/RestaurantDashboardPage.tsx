import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, DollarSign, TrendingUp, Clock, ChefHat, ShoppingCart, Store, Camera, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useGetMyRestaurantQuery,
    useGetRestaurantOrdersQuery,
    useGetRestaurantStatsQuery,
    useCreateRestaurantMutation,
    useUpdateRestaurantMutation,
} from '../../store/api/restaurantApi';
import { useUploadImageMutation } from '../../store/api/uploadApi';
import { useGetRestaurantReviewsQuery } from '../../store/api/reviewApi';
import ReviewList from '../../components/reviews/ReviewList';

// ── Setup form shown when owner has no Restaurant doc yet ─────────────────────
const RestaurantSetupForm: React.FC = () => {
    const [createRestaurant, { isLoading }] = useCreateRestaurantMutation();
    const [uploadImage, { isLoading: isUploading }] = useUploadImageMutation();

    const [form, setForm] = useState({
        name: '',
        description: '',
        phone: '',
        cuisine: '',
        deliveryTime: '30-45 min',
        deliveryFee: 50,
        minimumOrder: 100,
        street: '',
        city: '',
        state: '',
        zipCode: '',
        image: '',
    });

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const uploadData = new FormData();
        uploadData.append('image', file);
        try {
            const result = await uploadImage(uploadData).unwrap();
            setForm(prev => ({ ...prev, image: result.filePath }));
            toast.success('Restaurant picture uploaded');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to upload picture');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createRestaurant({
                name: form.name,
                description: form.description,
                phone: form.phone,
                cuisine: form.cuisine.split(',').map(c => c.trim()).filter(Boolean),
                deliveryTime: form.deliveryTime,
                deliveryFee: Number(form.deliveryFee),
                minimumOrder: Number(form.minimumOrder),
                address: {
                    street: form.street,
                    city: form.city,
                    state: form.state,
                    zipCode: form.zipCode,
                    country: 'Bangladesh',
                },
                image: form.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
                isOpen: true,
                isActive: true,
            }).unwrap();
            toast.success('Restaurant profile created! You can now manage your menu.');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to create restaurant profile');
        }
    };

    const inputClass =
        'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-primary-500 transition-colors';

    return (
        <div className="max-w-2xl mx-auto">
            <div className="card p-8">
                <div className="flex items-center gap-3 mb-2">
                    <Store className="w-8 h-8 text-primary-400" />
                    <h1 className="text-2xl font-bold">Complete Your Restaurant Profile</h1>
                </div>
                <p className="text-white/60 mb-8">
                    Your account has been granted restaurant-owner access. Fill in the details below to
                    create your restaurant profile — you'll be able to add food items and manage orders
                    once this is done.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                            {form.image ? <img src={form.image} alt="Restaurant preview" className="w-full h-full object-cover" /> : <Store className="w-8 h-8 text-white/30" />}
                        </div>
                        <label className="btn btn-outline cursor-pointer">
                            {isUploading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                            Upload Profile Picture
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                        </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-white/70 mb-1">Restaurant Name *</label>
                            <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Spice Garden" className={inputClass} />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-white/70 mb-1">Description *</label>
                            <textarea name="description" value={form.description} onChange={handleChange} required rows={3} placeholder="Tell customers about your restaurant…" className={`${inputClass} resize-none`} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">Phone *</label>
                            <input name="phone" value={form.phone} onChange={handleChange} required placeholder="01XXXXXXXXX" className={inputClass} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">Cuisines (comma-separated) *</label>
                            <input name="cuisine" value={form.cuisine} onChange={handleChange} required placeholder="e.g. Bengali, Fast Food" className={inputClass} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">Delivery Time</label>
                            <input name="deliveryTime" value={form.deliveryTime} onChange={handleChange} placeholder="30-45 min" className={inputClass} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-1">Delivery Fee (৳)</label>
                            <input name="deliveryFee" type="number" min={0} value={form.deliveryFee} onChange={handleChange} className={inputClass} />
                        </div>

                        <div className="sm:col-span-2 border-t border-white/10 pt-4">
                            <p className="text-sm font-semibold text-white/70 mb-3">Restaurant Address</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <input name="street" value={form.street} onChange={handleChange} required placeholder="Street address" className={inputClass} />
                                </div>
                                <input name="city" value={form.city} onChange={handleChange} required placeholder="City" className={inputClass} />
                                <input name="state" value={form.state} onChange={handleChange} required placeholder="State / Division" className={inputClass} />
                                <input name="zipCode" value={form.zipCode} onChange={handleChange} required placeholder="Zip / Postal code" className={inputClass} />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || isUploading}
                        className="w-full btn-primary py-3 rounded-xl font-semibold disabled:opacity-60"
                    >
                        {isLoading ? 'Creating profile…' : 'Create Restaurant Profile'}
                    </button>
                </form>
            </div>
        </div>
    );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const RestaurantDashboardPage: React.FC = () => {
    // Get the restaurant owned by current user
    const { data: restaurantData, isLoading: restaurantLoading, error: restaurantError } = useGetMyRestaurantQuery();
    const restaurant = restaurantData?.data;
    const restaurantId = restaurant?._id;
    const { data: reviewsData, isLoading: reviewsLoading } = useGetRestaurantReviewsQuery(restaurantId!, {
        skip: !restaurantId,
        pollingInterval: 5000,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });
    const [uploadImage, { isLoading: isUploadingImage }] = useUploadImageMutation();
    const [updateRestaurant, { isLoading: isUpdatingRestaurant }] = useUpdateRestaurantMutation();

    const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !restaurantId) return;
        const uploadData = new FormData();
        uploadData.append('image', file);
        try {
            const uploaded = await uploadImage(uploadData).unwrap();
            await updateRestaurant({ id: restaurantId, data: { image: uploaded.filePath } }).unwrap();
            toast.success('Restaurant profile picture updated');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to update profile picture');
        }
    };

    // Get orders for this restaurant (for recent orders list)
    const { data: ordersData, isError: ordersError } = useGetRestaurantOrdersQuery(
        { id: restaurantId!, status: 'all', limit: 5 },
        { skip: !restaurantId, pollingInterval: 5000, refetchOnFocus: true, refetchOnReconnect: true }
    );

    // Get restaurant stats
    const { data: statsData, isError: statsError } = useGetRestaurantStatsQuery(
        restaurantId!,
        { skip: !restaurantId, pollingInterval: 5000, refetchOnFocus: true, refetchOnReconnect: true }
    );

    const stats = statsData?.data || {
        totalRevenue: 0,
        totalOrders: 0,
        todayRevenue: 0,
        todayOrders: 0,
        pendingOrders: 0,
        menuItems: 0,
        popularItems: []
    };

    if (restaurantLoading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className="text-white/60">Loading restaurant data...</p>
            </div>
        );
    }

    const restaurantErrorStatus = (restaurantError as any)?.status;
    if (restaurantError && restaurantErrorStatus !== 404) {
        return <div className="card p-8 text-center text-red-300">Failed to load your restaurant profile. Please refresh or sign in again.</div>;
    }

    // No restaurant doc yet → show the owner profile setup form.
    if (!restaurant) {
        return <RestaurantSetupForm />;
    }

    const orders = ordersData?.data?.orders || [];

    const popularItems = stats.popularItems || [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="relative w-24 h-24 shrink-0 group">
                    <img src={restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80'} alt={restaurant.name} className="w-full h-full rounded-2xl object-cover bg-white/5" />
                    <label className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" title="Change profile picture">
                        {(isUploadingImage || isUpdatingRestaurant) ? <Loader className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePictureUpload} disabled={isUploadingImage || isUpdatingRestaurant} />
                    </label>
                </div>
                <div>
                    <h1 className="text-3xl font-bold mb-2">{restaurant.name}</h1>
                    <p className="text-white/60">Manage your restaurant and track your performance</p>
                    <label className="inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 mt-2 cursor-pointer sm:hidden">
                        <Camera className="w-4 h-4" /> Change profile picture
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleProfilePictureUpload} disabled={isUploadingImage || isUpdatingRestaurant} />
                    </label>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-primary-500/10 rounded-xl">
                            <ShoppingCart className="w-6 h-6 text-primary-400" />
                        </div>
                        <span className="text-sm text-white/60">Total</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1">{stats.totalOrders}</h3>
                    <p className="text-sm text-white/60">Total Orders</p>
                    <p className="text-xs text-white/40 mt-1">{stats.todayOrders} today</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/10 rounded-xl">
                            <DollarSign className="w-6 h-6 text-green-400" />
                        </div>
                        <span className="text-sm text-white/60">Revenue</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1">৳{stats.totalRevenue.toLocaleString()}</h3>
                    <p className="text-sm text-white/60">Delivered Revenue</p>
                    <p className="text-xs text-white/40 mt-1">৳{stats.todayRevenue.toLocaleString()} today</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-yellow-500/10 rounded-xl">
                            <Clock className="w-6 h-6 text-yellow-400" />
                        </div>
                        <span className="text-sm text-white/60">Active</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1">{stats.pendingOrders}</h3>
                    <p className="text-sm text-white/60">Pending Orders</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl">
                            <TrendingUp className="w-6 h-6 text-purple-400" />
                        </div>
                        <span className="text-sm text-white/60">Items</span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1">{stats.menuItems}</h3>
                    <p className="text-sm text-white/60">Menu Items</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Recent Orders
                        </h2>
                        <Link to="/restaurant-dashboard/orders" className="text-primary-400 hover:text-primary-300 text-sm">
                            View All →
                        </Link>
                    </div>

                    {ordersError ? (
                        <p className="text-center py-8 text-red-300">Failed to load recent orders.</p>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-8 text-white/60">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>No orders yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {orders.slice(0, 3).map((order) => {
                                const customer = order.user as any;
                                return (
                                    <div key={order._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                        <div>
                                            <p className="font-medium">#{order.orderNumber}</p>
                                            <p className="text-sm text-white/60">{customer?.name || 'Deleted customer'} • {order.items.length} items</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-400">৳{order.totalAmount}</p>
                                            <span className={`text-xs px-2 py-1 rounded-full ${order.orderStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                                                order.orderStatus === 'preparing' ? 'bg-blue-500/10 text-blue-400' :
                                                    'bg-green-500/10 text-green-400'
                                                }`}>
                                                {order.orderStatus}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Popular Items */}
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ChefHat className="w-5 h-5" />
                            Popular Items
                        </h2>
                        <Link to="/restaurant-dashboard/menu" className="text-primary-400 hover:text-primary-300 text-sm">
                            Manage Menu →
                        </Link>
                    </div>

                    {statsError ? (
                        <p className="text-center py-8 text-red-300">Failed to load analytics.</p>
                    ) : popularItems.length === 0 ? (
                        <div className="text-center py-8 text-white/60">
                            <ChefHat className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>No items ordered yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {popularItems.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl font-bold text-white/20">#{index + 1}</span>
                                        <div>
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-white/60">{item.quantity} sold</p>
                                        </div>
                                    </div>
                                    <p className="font-bold text-primary-400">৳{item.revenue.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Customer Reviews</h2>
                    <span className="text-sm text-white/50">{reviewsData?.data?.length || 0} total</span>
                </div>
                {reviewsLoading ? <p className="text-white/50">Loading reviews...</p> : <ReviewList reviews={reviewsData?.data || []} emptyMessage="Your food items have no reviews yet." />}
            </div>

            {/* Quick Actions */}
            <div className="card p-6">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Link
                        to="/restaurant-dashboard/menu"
                        className="p-4 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 rounded-xl text-center transition-colors"
                    >
                        <ChefHat className="w-8 h-8 mx-auto mb-2 text-primary-400" />
                        <p className="font-medium">Add Menu Item</p>
                    </Link>
                    <Link
                        to="/restaurant-dashboard/orders?status=pending"
                        className="p-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-xl text-center transition-colors"
                    >
                        <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                        <p className="font-medium">Pending Orders</p>
                    </Link>
                    <Link
                        to="/restaurant-dashboard/menu"
                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center transition-colors"
                    >
                        <Package className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-medium">View Menu</p>
                    </Link>
                    <Link
                        to="/restaurant-dashboard/orders"
                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-center transition-colors"
                    >
                        <ShoppingCart className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-medium">All Orders</p>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RestaurantDashboardPage;
