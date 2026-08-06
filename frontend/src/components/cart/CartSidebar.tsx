import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleCart } from '../../store/slices/uiSlice';
import type { RootState } from '../../store/store';
import { 
  useGetCartQuery, 
  useUpdateCartItemMutation, 
  useRemoveFromCartMutation,
  useClearCartMutation 
} from '../../store/api/cartApi';
import toast from 'react-hot-toast';

const CartSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isCartOpen } = useAppSelector((state: RootState) => state.ui);
  const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);
  
  const { data: cartData, isLoading } = useGetCartQuery(undefined, {
    skip: !isAuthenticated,
  });
  
  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeFromCart] = useRemoveFromCartMutation();
  const [clearCart] = useClearCartMutation();

  const cart = cartData?.data;

  const handleUpdateQuantity = async (foodItemId: string, quantity: number) => {
    try {
      await updateCartItem({ foodItemId, quantity }).unwrap();
    } catch (error) {
      toast.error('Failed to update quantity');
    }
  };

  const handleRemoveItem = async (foodItemId: string) => {
    try {
      await removeFromCart(foodItemId).unwrap();
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart().unwrap();
      toast.success('Cart cleared');
    } catch (error) {
      toast.error('Failed to clear cart');
    }
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={() => dispatch(toggleCart())}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-dark-200 border-l border-white/10 z-50 flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold">Your Cart</h2>
            {cart && cart.itemCount > 0 && (
              <span className="badge badge-primary">{cart.itemCount} items</span>
            )}
          </div>
          <button
            onClick={() => dispatch(toggleCart())}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!isAuthenticated ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/60 mb-4">Please login to view your cart</p>
              <Link
                to="/login"
                onClick={() => dispatch(toggleCart())}
                className="btn btn-primary"
              >
                Login
              </Link>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-24 rounded-xl" />
              ))}
            </div>
          ) : !cart || cart.cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/60 mb-4">Your cart is empty</p>
              <Link
                to="/menu"
                onClick={() => dispatch(toggleCart())}
                className="btn btn-primary"
              >
                Browse Menu
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Restaurant Info */}
              {cart.cart.restaurant && (
                <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-sm text-white/60">Ordering from</p>
                  <p className="font-medium">{typeof cart.cart.restaurant === 'object' ? cart.cart.restaurant.name : 'Restaurant'}</p>
                </div>
              )}

              {/* Cart Items */}
              {cart.cart.items.map((item: any) => (
                <div key={item.foodItem._id} className="flex gap-3 p-3 bg-white/5 rounded-xl">
                  <img
                    src={item.foodItem.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100'}
                    alt={item.foodItem.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium line-clamp-1">{item.foodItem.name}</h4>
                    <p className="text-primary-400 font-semibold">
                      ৳{item.foodItem.discount 
                        ? Math.round(item.foodItem.price * (1 - item.foodItem.discount / 100)) 
                        : item.foodItem.price}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.foodItem._id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.foodItem._id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.foodItem._id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Clear Cart */}
              <button
                onClick={handleClearCart}
                className="w-full py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {cart && cart.cart.items.length > 0 && (
          <div className="p-4 border-t border-white/10 space-y-4">
            <div className="flex justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span className="text-primary-400">৳{Math.round(cart.subtotal)}</span>
            </div>
            <p className="text-white/40 text-sm">Delivery fee will be calculated at checkout</p>
            <Link
              to="/checkout"
              onClick={() => dispatch(toggleCart())}
              className="btn btn-primary w-full"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;
