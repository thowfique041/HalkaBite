import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, CreditCard, Banknote, ChevronRight, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { useGetMeQuery } from '../store/api/authApi';
import { useCreateOrderMutation } from '../store/api/orderApi';
import { useGetCartQuery } from '../store/api/cartApi';
import toast from 'react-hot-toast';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAddress, setSelectedAddress] = useState('default');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'rocket'>('cod');

  const { items, subtotal, restaurant } = useAppSelector((state) => state.cart);
  const { isLoading: isCartLoading } = useGetCartQuery();
  const { data: userData } = useGetMeQuery();
  const [createOrder, { isLoading: isOrdering }] = useCreateOrderMutation();

  const deliveryFee = restaurant?.deliveryFee || 60;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (!isCartLoading && items.length === 0) {
      navigate('/');
      toast.error('Your cart is empty');
    }
  }, [items, isCartLoading, navigate]);

  const handlePlaceOrder = async () => {
    if (!userData?.data?.address) {
      toast.error('Please add a delivery address to your profile');
      navigate('/profile');
      return;
    }

    try {
      const orderData = {
        items: items.map(item => ({
          foodItem: item.foodItem._id,
          name: item.foodItem.name,
          quantity: item.quantity,
          price: item.foodItem.price,
          specialInstructions: item.specialInstructions
        })),
        restaurant: restaurant?._id,
        subtotal,
        deliveryFee,
        totalAmount: total,
        deliveryAddress: userData.data.address,
        paymentMethod,
        discount: 0
      };

      await createOrder(orderData).unwrap();
      toast.success('Order placed successfully!');
      navigate('/order-success');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to place order');
    }
  };

  if (isCartLoading) {
    return <div className="min-h-screen pt-24 pb-12 px-4 text-center">Loading checkout...</div>;
  }

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold mb-2">Checkout</h1>
          <p className="text-white/60">Complete your order</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Delivery Address */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-500" />
                Delivery Address
              </h2>
              <div className="space-y-3">
                {userData?.data?.address ? (
                  <label
                    className={`block p-4 rounded-xl border cursor-pointer transition-all ${selectedAddress === 'default'
                      ? 'bg-primary-500/10 border-primary-500'
                      : 'bg-dark-100 border-white/5 hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddress === 'default'}
                        onChange={() => setSelectedAddress('default')}
                        className="text-primary-500 focus:ring-primary-500"
                      />
                      <div>
                        <div className="font-medium">My Address</div>
                        <div className="text-sm text-white/60">
                          {userData.data.address.street}, {userData.data.address.city}, {userData.data.address.zipCode}
                        </div>
                      </div>
                    </div>
                  </label>
                ) : (
                  <div className="text-center py-4 text-white/60">
                    No address found. Please update your profile.
                  </div>
                )}

                <button
                  onClick={() => navigate('/profile')}
                  className="btn btn-outline w-full mt-4"
                >
                  <MapPin className="w-4 h-4 mr-2" /> {userData?.data?.address ? 'Update Address' : 'Add Address'}
                </button>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-500" />
                Payment Method
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <label
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'cod'
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-dark-100 border-white/5 hover:border-white/20'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="text-primary-500 focus:ring-primary-500"
                    />
                    <div className="flex items-center gap-2">
                      <Banknote className="w-5 h-5 text-green-400" />
                      <span className="font-medium">Cash on Delivery</span>
                    </div>
                  </div>
                </label>

                <label
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === 'bkash'
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-dark-100 border-white/5 hover:border-white/20'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment"
                      value="bkash"
                      checked={paymentMethod === 'bkash'}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="text-primary-500 focus:ring-primary-500"
                    />
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-pink-500" />
                      <span className="font-medium">Bkash</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="card p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary-500" />
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.foodItem._id} className="flex gap-3">
                    <img
                      src={item.foodItem.image}
                      alt={item.foodItem.name}
                      className="w-16 h-16 rounded-lg object-cover bg-dark-200"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium line-clamp-1">{item.foodItem.name}</div>
                      <div className="text-xs text-white/60 mt-1">Qty: {item.quantity}</div>
                      <div className="text-sm font-bold text-primary-400 mt-1">৳{item.foodItem.price * item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t border-white/10 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Subtotal</span>
                  <span>৳{subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Delivery Fee</span>
                  <span>৳{deliveryFee}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10 mt-2">
                  <span>Total</span>
                  <span className="text-primary-400">৳{total}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isOrdering}
                className="btn btn-primary w-full justify-center py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOrdering ? 'Placing Order...' : 'Place Order'} <ChevronRight className="w-5 h-5 ml-2" />
              </button>

              <p className="text-xs text-center text-white/40 mt-4">
                By placing an order, you agree to our Terms & Conditions
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
