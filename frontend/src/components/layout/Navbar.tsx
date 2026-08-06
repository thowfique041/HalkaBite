import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart,
  Menu, 
  X, 
  Search,
  Mic,
  MessageCircle
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleMobileMenu, toggleCart, toggleVoiceModal, toggleChat } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import type { RootState } from '../../store/store';
import CustomerOfferNotifications from '../notifications/CustomerOfferNotifications';

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAppSelector((state: RootState) => state.auth);
  const { itemCount } = useAppSelector((state: RootState) => state.cart);
  const { isMobileMenuOpen } = useAppSelector((state: RootState) => state.ui);

  const handleLogout = () => {
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
          <div className="flex items-center space-x-4">
            {user?.role === 'user' && <CustomerOfferNotifications />}
            {/* Voice Order Button */}
            <button
              onClick={() => dispatch(toggleVoiceModal())}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
              title="Voice Order"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Chat Button */}
            <button
              onClick={() => dispatch(toggleChat())}
              className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-secondary-500/20 text-secondary-400 hover:bg-secondary-500/30 transition-colors"
              title="AI Chat"
            >
              <MessageCircle className="w-5 h-5" />
            </button>

            {/* Cart Button */}
            <button
              onClick={() => dispatch(toggleCart())}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
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
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center">
                    <span className="text-sm font-bold">{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                </button>
                <div className="absolute right-0 mt-2 w-48 py-2 card opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link to="/profile" className="block px-4 py-2 hover:bg-white/10">Profile</Link>
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
