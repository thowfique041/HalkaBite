import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const OrderSuccessPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30"
        >
          <CheckCircle className="w-12 h-12 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-3xl font-bold mb-2">Order Placed!</h1>
          <p className="text-white/60 mb-8">
            Thank you for your order. We've received it and will begin processing it right away.
          </p>

          <div className="card p-6 mb-8 bg-dark-100/50">
            <div className="text-sm text-white/40 mb-1">Order ID</div>
            <div className="text-xl font-mono font-bold text-primary-400">#ORD-7829</div>
          </div>

          <div className="space-y-3">
            <Link to="/orders" className="btn btn-primary w-full justify-center py-3">
              Track Order <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link to="/" className="btn btn-outline w-full justify-center py-3">
              <Home className="w-5 h-5 mr-2" /> Back to Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
