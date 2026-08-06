import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Mail, 
  Phone, 
  MapPin 
} from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-dark-200 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-3xl">🍔</span>
              <span className="text-2xl font-bold gradient-text">HalkaBite</span>
            </div>
            <p className="text-white/60 mb-4">
              AI-powered food delivery platform. Order your favorite meals with voice commands and smart recommendations.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary-500 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary-500 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary-500 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/menu" className="text-white/60 hover:text-primary-400 transition-colors">Menu</Link></li>
              <li><Link to="/restaurants" className="text-white/60 hover:text-primary-400 transition-colors">Restaurants</Link></li>
              <li><Link to="/offers" className="text-white/60 hover:text-primary-400 transition-colors">Offers</Link></li>
              <li><Link to="/orders" className="text-white/60 hover:text-primary-400 transition-colors">Track Order</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-white/60 hover:text-primary-400 transition-colors">Help Center</a></li>
              <li><a href="#" className="text-white/60 hover:text-primary-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-white/60 hover:text-primary-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-white/60 hover:text-primary-400 transition-colors">Partner with Us</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3 text-white/60">
                <MapPin className="w-5 h-5 text-primary-400" />
                <span>Sylhet, Bangladesh</span>
              </li>
              <li className="flex items-center space-x-3 text-white/60">
                <Phone className="w-5 h-5 text-primary-400" />
                <span>+880 1XXX-XXXXXX</span>
              </li>
              <li className="flex items-center space-x-3 text-white/60">
                <Mail className="w-5 h-5 text-primary-400" />
                <span>support@halkabite.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">
              © 2025 HalkaBite. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <span className="text-white/40 text-sm">Payment Methods:</span>
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded text-sm font-medium">bKash</span>
                <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded text-sm font-medium">Nagad</span>
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded text-sm font-medium">Rocket</span>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm font-medium">COD</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
