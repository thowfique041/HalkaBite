import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, 
  Mic, 
  Sparkles, 
  Clock, 
  Shield, 
  Truck,
  MessageCircle,
  Star
} from 'lucide-react';

const HomePage: React.FC = () => {
  const categories = [
    { name: 'Burgers', emoji: '🍔', color: 'from-orange-500 to-red-500' },
    { name: 'Pizza', emoji: '🍕', color: 'from-red-500 to-yellow-500' },
    { name: 'Biryani', emoji: '🍛', color: 'from-yellow-500 to-orange-500' },
    { name: 'Chinese', emoji: '🥡', color: 'from-red-400 to-orange-400' },
    { name: 'Desserts', emoji: '🍰', color: 'from-pink-500 to-purple-500' },
    { name: 'Drinks', emoji: '🧋', color: 'from-cyan-500 to-blue-500' },
  ];

  const features = [
    {
      icon: <Mic className="w-6 h-6" />,
      title: 'Voice Ordering',
      description: 'Order your favorite food using voice commands. No typing needed!',
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: 'AI Chat Support',
      description: '24/7 automated support for menu info, hours, and catering quotes.',
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Fast Delivery',
      description: 'Average delivery time of 30-45 minutes. Track your order in real-time.',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure Payments',
      description: 'Multiple payment options including bKash, Nagad, Rocket, and COD.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920')] bg-cover bg-center opacity-10" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-400 text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                AI-Powered Food Delivery
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                Order Food with
                <span className="gradient-text block">Your Voice</span>
              </h1>
              
              <p className="text-xl text-white/60 mb-8 max-w-xl">
                Experience the future of food ordering. Simply speak your order, and our AI will handle the rest. Fast, easy, and delicious!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/menu" className="btn btn-primary text-lg py-4 px-8">
                  Order Now <ChevronRight className="w-5 h-5 ml-2" />
                </Link>
                <button className="btn btn-outline text-lg py-4 px-8">
                  <Mic className="w-5 h-5 mr-2" /> Try Voice Order
                </button>
              </div>
              
              {/* Stats */}
              <div className="flex gap-8 mt-12 justify-center lg:justify-start">
                <div>
                  <div className="text-3xl font-bold text-primary-400">500+</div>
                  <div className="text-white/60 text-sm">Restaurants</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-400">50K+</div>
                  <div className="text-white/60 text-sm">Happy Customers</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary-400">4.8</div>
                  <div className="text-white/60 text-sm flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> Rating
                  </div>
                </div>
              </div>
            </div>
            
            {/* Image */}
            <div className="relative hidden lg:block">
              <div className="relative w-96 h-96 mx-auto">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 blur-3xl opacity-30" />
                <img
                  src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500"
                  alt="Burger"
                  className="relative w-full h-full object-cover rounded-full animate-float"
                />
              </div>
              
              {/* Floating Cards */}
              <div className="absolute top-10 -left-10 card p-4 animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Fast Delivery</div>
                    <div className="text-xs text-white/60">30-45 min</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-10 -right-10 card p-4 animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Top Rated</div>
                    <div className="text-xs text-white/60">4.8 Stars</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Browse by Category</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              Explore our wide variety of cuisines and find your perfect meal
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/menu?category=${category.name.toLowerCase()}`}
                className="card p-6 text-center hover:scale-105 transition-transform group"
              >
                <div className={`w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-r ${category.color} flex items-center justify-center text-3xl group-hover:scale-110 transition-transform`}>
                  {category.emoji}
                </div>
                <h3 className="font-medium">{category.name}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-dark-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose HalkaBite?</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              Experience the next generation of food delivery with AI-powered features
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="card p-6 card-hover">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-white/60 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="card p-12 gradient-bg border-primary-500/30">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Order?</h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Join thousands of satisfied customers who enjoy the convenience of AI-powered food ordering
            </p>
            <Link to="/menu" className="btn btn-primary text-lg py-4 px-8">
              Start Ordering Now <ChevronRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
