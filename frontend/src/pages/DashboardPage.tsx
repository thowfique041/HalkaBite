import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, Heart, TrendingUp, ChevronRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  // Mock data
  const stats = [
    { label: 'Total Orders', value: '24', icon: ShoppingBag, color: 'from-blue-500 to-cyan-500' },
    { label: 'Total Spent', value: '৳12,450', icon: TrendingUp, color: 'from-green-500 to-emerald-500' },
    { label: 'Favorite Item', value: 'Spicy Burger', icon: Heart, color: 'from-pink-500 to-rose-500' },
    { label: 'Avg. Wait', value: '35 min', icon: Clock, color: 'from-orange-500 to-yellow-500' },
  ];

  const recentOrders = [
    { id: '#ORD-7829', date: 'Today, 12:30 PM', items: '2x Spicy Burger, 1x Coke', total: '৳450', status: 'Delivered' },
    { id: '#ORD-7828', date: 'Yesterday, 8:15 PM', items: '1x Chicken Pizza, 2x Garlic Bread', total: '৳890', status: 'Delivered' },
    { id: '#ORD-7825', date: 'Dec 2, 1:45 PM', items: '1x Biryani Platter', total: '৳350', status: 'Cancelled' },
  ];

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-between items-end"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-white/60">Welcome back, John! Here's what's happening.</p>
          </div>
          <Link to="/menu" className="btn btn-primary">
            Order New Meal
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Recent Orders</h2>
                <Link to="/orders" className="text-primary-400 text-sm hover:text-primary-300 flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {recentOrders.map((order, index) => (
                  <div key={index} className="p-4 rounded-xl bg-dark-100 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-primary-500/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-dark-200 text-white/40">
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {order.id}
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                            order.status === 'Delivered' 
                              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <div className="text-sm text-white/60 mt-1">{order.items}</div>
                        <div className="text-xs text-white/40 mt-1">{order.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{order.total}</div>
                      <button className="text-xs text-primary-400 hover:text-primary-300 mt-1">
                        Order Again
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Recommendations / Promo */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-1"
          >
            <div className="card p-6 h-full bg-gradient-to-br from-primary-900/50 to-dark-100 border-primary-500/30">
              <h2 className="text-xl font-bold mb-4">Special Offer</h2>
              <div className="aspect-video rounded-xl bg-black/20 mb-4 overflow-hidden relative group">
                <img 
                  src="https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500" 
                  alt="Pizza" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                  <div className="text-white font-bold">20% OFF on Pizzas</div>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-6">
                Order any large pizza today and get flat 20% discount. Use code: PIZZA20
              </p>
              <Link to="/menu?category=pizza" className="btn btn-primary w-full justify-center">
                Grab Deal
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
