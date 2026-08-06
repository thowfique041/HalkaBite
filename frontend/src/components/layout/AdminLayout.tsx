import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Store,
    ShoppingBag,
    Settings,
    LogOut,
    MessageSquare,
    Bike,
    BadgePercent,
    ShieldCheck
} from 'lucide-react';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';

const AdminLayout: React.FC = () => {
    const location = useLocation();
    const dispatch = useAppDispatch();

    const menuItems = [
        { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/admin/users', icon: Users, label: 'Users' },
        { path: '/admin/menu', icon: ShoppingBag, label: 'Menu' },
        { path: '/admin/restaurants', icon: Store, label: 'Restaurants' },
        { path: '/admin/restaurant-name-requests', icon: ShieldCheck, label: 'Name Requests' },
        { path: '/admin/delivery-management', icon: Bike, label: 'Delivery Management' },
        { path: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
        { path: '/admin/reviews', icon: MessageSquare, label: 'Reviews' },
        { path: '/admin/campaigns', icon: BadgePercent, label: 'Campaigns' },
        { path: '/admin/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="min-h-screen flex bg-dark-100">
            {/* Sidebar */}
            <div className="w-64 bg-dark-200 border-r border-white/10 flex flex-col fixed h-full">
                <div className="p-6">
                    <Link to="/" className="flex items-center space-x-2">
                        <span className="text-3xl">🍔</span>
                        <span className="text-xl font-bold gradient-text">HalkaBite Admin</span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${isActive
                                    ? 'bg-primary-500 text-white'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <item.icon className="w-5 h-5" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => dispatch(logout())}
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 w-full transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64">
                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AdminLayout;
