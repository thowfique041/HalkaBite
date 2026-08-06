import React from 'react';
import { Bike, LayoutDashboard, LogOut, Map, Package, Star, User, Wallet } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const DeliveryLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(state => state.auth.user);
  const links = [
    ['overview', 'Dashboard', LayoutDashboard],
    ['orders', 'Orders', Package],
    ['navigation', 'Navigation', Map],
    ['earnings', 'Earnings', Wallet],
    ['history', 'History', Bike],
    ['ratings', 'Ratings', Star],
    ['profile', 'Profile', User],
  ] as const;

  return (
    <div className="min-h-screen bg-dark-100 lg:flex">
      <aside className="lg:fixed lg:inset-y-0 lg:w-64 bg-dark-200 border-r border-white/10 p-5 flex lg:flex-col overflow-x-auto z-20">
        <button onClick={() => navigate('/')} className="hidden lg:flex items-center gap-2 text-xl font-bold gradient-text mb-8"><Bike /> HalkaBite Rider</button>
        <nav className="flex lg:flex-col gap-2 flex-1">
          {links.map(([id, label, Icon]) => (
            <a key={id} href={`#${id}`} className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 whitespace-nowrap">
              <Icon className="w-5 h-5" /> {label}
            </a>
          ))}
        </nav>
        <button onClick={() => { dispatch(logout()); navigate('/'); }} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl">
          <LogOut className="w-5 h-5" /> <span className="hidden lg:inline">Logout</span>
        </button>
      </aside>
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
        <div className="mb-6"><p className="text-white/50 text-sm">Delivery Partner</p><h1 className="text-2xl font-bold">Welcome, {user?.name} 👋</h1></div>
        {children}
      </main>
    </div>
  );
};

export default DeliveryLayout;
