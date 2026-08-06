import React from 'react';
import { motion } from 'framer-motion';
import { Users, Store, ShoppingBag, DollarSign } from 'lucide-react';
import { useGetAdminStatsQuery } from '../../store/api/adminApi';

const formatRelativeTime = (date: string) => {
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
    if (elapsedSeconds < 60) return 'Just now';
    const minutes = Math.floor(elapsedSeconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
};

const AdminDashboardPage: React.FC = () => {
    const { data, isLoading, isError, refetch } = useGetAdminStatsQuery();
    const stats = data?.data;

    const statCards = [
        { label: 'Total Users', value: stats?.totalUsers.toLocaleString() ?? '—', icon: Users, color: 'from-blue-500 to-cyan-500' },
        { label: 'Total Restaurants', value: stats?.totalRestaurants.toLocaleString() ?? '—', icon: Store, color: 'from-purple-500 to-pink-500' },
        { label: 'Total Orders', value: stats?.totalOrders.toLocaleString() ?? '—', icon: ShoppingBag, color: 'from-orange-500 to-yellow-500' },
        { label: 'Total Revenue', value: stats ? `৳${stats.totalRevenue.toLocaleString()}` : '—', icon: DollarSign, color: 'from-green-500 to-emerald-500' },
    ];

    if (isLoading) return <div className="text-center py-12">Loading dashboard...</div>;

    if (isError) {
        return (
            <div className="card p-8 text-center">
                <p className="text-red-400 mb-4">Could not load dashboard data.</p>
                <button className="btn btn-primary" onClick={() => refetch()}>Try Again</button>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="card p-6"
                    >
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
                            <stat.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold mb-1">{stat.value}</div>
                        <div className="text-white/60 text-sm">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                <div className="card p-6">
                    <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
                    <div className="space-y-4">
                        {stats?.recentActivity.map((activity) => (
                            <div key={activity._id} className="flex items-center gap-4 p-3 rounded-lg bg-white/5">
                                <div className="w-2 h-2 rounded-full bg-primary-500" />
                                <div>
                                    <div className="text-sm font-medium">
                                        Order #{activity.orderNumber} from {activity.user?.name || 'Customer'} · {activity.orderStatus.replaceAll('_', ' ')}
                                    </div>
                                    <div className="text-xs text-white/40">
                                        {activity.restaurant?.name || 'Restaurant'} · ৳{activity.totalAmount.toLocaleString()} · {formatRelativeTime(activity.createdAt)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {!stats?.recentActivity.length && <p className="text-sm text-white/40">No recent orders.</p>}
                    </div>
                </div>

                <div className="card p-6">
                    <h2 className="text-xl font-bold mb-4">Popular Restaurants</h2>
                    <div className="space-y-4">
                        {stats?.popularRestaurants.map((restaurant) => (
                            <div key={restaurant._id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                                <div className="flex items-center gap-3">
                                    {restaurant.image ? (
                                        <img src={restaurant.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/10" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center"><Store className="w-5 h-5 text-white/40" /></div>
                                    )}
                                    <div>
                                        <div className="text-sm font-medium">{restaurant.name}</div>
                                        <div className="text-xs text-white/40">{restaurant.orderCount} qualifying orders</div>
                                    </div>
                                </div>
                                <div className="text-green-400 font-bold">৳{restaurant.revenue.toLocaleString()}</div>
                            </div>
                        ))}
                        {!stats?.popularRestaurants.length && <p className="text-sm text-white/40">No restaurant order data yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
