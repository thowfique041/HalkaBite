import React from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, ChevronRight, Search, Filter, Star } from 'lucide-react';
import { useGetOrdersQuery } from '../store/api/orderApi';
import type { Order } from '../types';
import ReviewModal from '../components/reviews/ReviewModal';
import { useState } from 'react';
import DeliveryAuditTrail from '../components/orders/DeliveryAuditTrail';

const OrdersPage: React.FC = () => {
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const { data: ordersData, isLoading, error } = useGetOrdersQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const orders = ordersData?.data?.orders || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'cancelled':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  if (isLoading) {
    return <div className="min-h-screen pt-24 pb-12 px-4 text-center">Loading orders...</div>;
  }

  if (error) {
    return <div className="min-h-screen pt-24 pb-12 px-4 text-center text-red-500">Error loading orders: {JSON.stringify(error)}</div>;
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold mb-2">My Orders</h1>
            <p className="text-white/60">Track and view your order history</p>
          </div>

          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search orders..."
                className="bg-dark-100 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary-500 w-full md:w-64"
              />
            </div>
            <button className="p-2 bg-dark-100 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
              <Filter className="w-5 h-5 text-white/60" />
            </button>
          </div>
        </motion.div>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-white/60">No orders found.</div>
          ) : (
            orders.map((order: Order, index: number) => (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-6 hover:border-primary-500/30 transition-colors group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-dark-200 text-primary-400">
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-lg">{order.orderNumber}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusColor(order.orderStatus)}`}>
                          {order.orderStatus.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-white/60 text-sm flex items-center gap-2 mb-2">
                        <Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleString()}
                      </div>
                      <div className="text-sm text-white/80">
                        {order.items.map((item: any) => `${item.quantity}x ${item.name || 'Item'}`).join(', ')}
                      </div>
                      {order.deliveryManSnapshot && (
                        <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                          <div className="font-medium text-blue-300">Delivery Partner: {order.deliveryManSnapshot.name}</div>
                          <div className="text-xs text-white/50 font-mono">ID: {order.deliveryManSnapshot.id}</div>
                          <div className="text-xs text-white/50 mt-1 capitalize">Status: {(order.deliveryStatus || order.orderStatus).replaceAll('_', ' ')}</div>
                          <div className="text-xs text-white/40 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            {order.assignedAt && <span>Assigned: {new Date(order.assignedAt).toLocaleString()}</span>}
                            {order.pickupTime && <span>Picked up: {new Date(order.pickupTime).toLocaleString()}</span>}
                            {order.actualDeliveryTime && <span>Delivered: {new Date(order.actualDeliveryTime).toLocaleString()}</span>}
                          </div>
                          <DeliveryAuditTrail order={order} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                    <div className="text-right">
                      <div className="text-sm text-white/40 mb-1">Total Amount</div>
                      <div className="text-xl font-bold text-primary-400">৳{order.totalAmount}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {order.orderStatus === 'delivered' && (
                        <button onClick={() => setReviewOrder(order)} className="btn btn-primary px-4 py-2 text-sm">
                          <Star className="w-4 h-4 mr-1" /> Rate & Review
                        </button>
                      )}
                      <button className="btn btn-outline px-4 py-2 text-sm group-hover:bg-primary-500 group-hover:text-white group-hover:border-primary-500 transition-all">
                        Details <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
      {reviewOrder && <ReviewModal order={reviewOrder} onClose={() => setReviewOrder(null)} />}
    </div>
  );
};

export default OrdersPage;
