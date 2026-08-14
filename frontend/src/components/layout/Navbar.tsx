import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart,
  Menu, 
  X, 
  Search,
  Mic,
  MessageCircle,
  Bell
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleMobileMenu, toggleCart, toggleVoiceModal, toggleChat } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import type { RootState } from '../../store/store';
import { useUnreadChatCount } from '../chat/useUnreadChatCount';
import { useGetCustomerOrderNotificationsQuery } from '../../store/api/customerOrderNotificationApi';
import UserAvatar from '../common/UserAvatar';
import { useLogoutMutation } from '../../store/api/authApi';
import { useCartAddedPulse } from '../../hooks/useAnimatedAddToCart';

type CustomerIconLinkProps = {
  to: '/messages' | '/notifications';
  label: 'Messages' | 'Notifications';
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  compact?: boolean;
};

const CustomerIconLink: React.FC<CustomerIconLinkProps> = ({ to, label, count, icon: Icon, compact = false }) => (
  <NavLink
    to={to}
    aria-label={`${label}${count ? `, ${count} unread` : ''}`}
    title={label}
    className={({ isActive }) => `group relative grid place-items-center rounded-full outline-none transition-all duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-200 ${compact ? 'h-10 w-10' : 'h-11 w-11'} ${isActive ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' : 'bg-white/5 text-white/75 hover:bg-white/10 hover:text-white'}`}
  >
    <Icon className="h-5 w-5" />
    {count > 0 && (
      <span key={count} aria-hidden="true" className="absolute -right-1 -top-1 grid h-5 min-w-5 animate-bounce place-items-center rounded-full border-2 border-dark-200 bg-red-500 px-1 text-[10px] font-extrabold leading-none text-white shadow-md shadow-red-950/40">
        {count > 99 ? '99+' : count}
      </span>
    )}
    <span role="tooltip" className="pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-dark-100 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
      {label}
    </span>
  </NavLink>
);

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAppSelector((state: RootState) => state.auth);
  const { itemCount } = useAppSelector((state: RootState) => state.cart);
  const { isMobileMenuOpen } = useAppSelector((state: RootState) => state.ui);
  const unreadChats = useUnreadChatCount();
  const { data: orderNotifications } = useGetCustomerOrderNotificationsQuery(undefined, { skip: user?.role !== 'user' });
  const [logoutRequest] = useLogoutMutation();
  const isCartPulsing = useCartAddedPulse();
  const unreadOrderNotifications = orderNotifications?.data.unreadCount || 0;

  const handleLogout = async () => {
    try { await logoutRequest().unwrap(); } catch { /* local logout must still complete */ }
    dispatch(logout());
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-3xl">🍔</span>
            <span className="text-2xl font-bold gradient-text">HalkaBite</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-white/80 hover:text-white transition-colors">Home</Link>
            <Link to="/menu" className="text-white/80 hover:text-white transition-colors">Menu</Link>
            <Link to="/restaurants" className="text-white/80 hover:text-white transition-colors">Restaurants</Link>
            <Link to="/orders" className="text-white/80 hover:text-white transition-colors">Orders</Link>
          </div>

          {/* Search Bar */}
          <div className="hidden lg:flex items-center relative">
            <Search className="absolute left-3 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search for food..."
              className="input pl-10 w-64"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {user?.role === 'user' && <CustomerIconLink to="/notifications" label="Notifications" count={unreadOrderNotifications} icon={Bell} compact />}
            {user?.role === 'user' && <CustomerIconLink to="/messages" label="Messages" count={unreadChats} icon={MessageCircle} compact />}
            {/* Voice Order Button */}
            <button
              onClick={() => dispatch(toggleVoiceModal())}
              className="order-4 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 hover:scale-105 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
              title="Voice Order"
              aria-label="Open voice assistant"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Cart Button */}
            <button
              onClick={() => dispatch(toggleCart())}
              data-cart-animation-target
              className={`order-3 relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 ${isCartPulsing ? 'cart-added-pulse' : ''}`}
              aria-label={`Open cart${itemCount ? `, ${itemCount} items` : ''}`}
              title="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </button>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="order-5 relative group">
                <button aria-label="Open user profile menu" title="Profile" className="flex items-center space-x-2 p-1 rounded-full hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300">
                  <UserAvatar name={user?.name} src={user?.avatar} className="h-8 w-8 text-sm" />
                </button>
                <div className="absolute right-0 mt-2 w-48 py-2 card opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link to={user?.role === 'admin' ? '/admin/profile' : '/profile'} className="block px-4 py-2 hover:bg-white/10">Profile</Link>
                  <Link to="/orders" className="block px-4 py-2 hover:bg-white/10">My Orders</Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin" className="block px-4 py-2 hover:bg-white/10">Admin Dashboard</Link>
                  )}
                  {user?.role === 'restaurant' && (
                    <Link to="/restaurant-dashboard" className="block px-4 py-2 hover:bg-white/10">Restaurant Dashboard</Link>
                  )}
                  {user?.role === 'delivery' && (
                    <Link to="/delivery-dashboard" className="block px-4 py-2 hover:bg-white/10">Delivery Dashboard</Link>
                  )}
                  <hr className="my-2 border-white/10" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-white/10"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary py-2">
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => dispatch(toggleMobileMenu())}
              className="md:hidden p-2"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-dark-200 animate-slide-down">
          <div className="px-4 py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search for food..."
                className="input pl-10 w-full"
              />
            </div>
            <Link to="/" className="block py-2 hover:text-primary-400">Home</Link>
            <Link to="/menu" className="block py-2 hover:text-primary-400">Menu</Link>
            <Link to="/restaurants" className="block py-2 hover:text-primary-400">Restaurants</Link>
            <Link to="/orders" className="block py-2 hover:text-primary-400">Orders</Link>
            <div className="flex space-x-4 pt-4">
              <button
                onClick={() => dispatch(toggleVoiceModal())}
                className="flex-1 btn btn-primary py-2"
              >
                <Mic className="w-4 h-4 mr-2" /> Voice Order
              </button>
              <button
                onClick={() => dispatch(toggleChat())}
                className="flex-1 btn btn-secondary py-2"
              >
                <MessageCircle className="w-4 h-4 mr-2" /> Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
