import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, ChevronRight, Search, Filter, Star, MessageCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useGetOrderQuery, useGetOrdersQuery } from '../store/api/orderApi';
import type { Order } from '../types';
import ReviewModal from '../components/reviews/ReviewModal';
import DeliveryAuditTrail from '../components/orders/DeliveryAuditTrail';
import { toast } from 'react-hot-toast';

const OrdersPage: React.FC = () => {
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [searchParams] = useSearchParams();
  const focusedOrderId = searchParams.get('order');
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const unavailableNotice = useRef<string | null>(null);
  const { data: ordersData, isLoading, error } = useGetOrdersQuery(undefined, {
    pollingInterval: 5000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  // API types describe valid relationships, but guard against legacy/orphaned
  // payloads at runtime before any nested property is accessed.
  const loadedOrders = useMemo(() => (ordersData?.data?.orders || []).filter(order =>
    Boolean(order?.restaurant && order?.user)
  ), [ordersData]);
  const loadedFocusedOrder = loadedOrders.find(order => order._id === focusedOrderId);
  const { data: focusedOrderData, isFetching: isFetchingFocusedOrder, isError: focusedOrderError } = useGetOrderQuery(
    focusedOrderId || '',
    { skip: !focusedOrderId || Boolean(loadedFocusedOrder) }
  );
  const fetchedFocusedOrder = focusedOrderData?.data?.restaurant ? focusedOrderData.data : undefined;
  const focusedOrderUnavailable = Boolean(focusedOrderData && !focusedOrderData.data?.restaurant);
  const orders = useMemo(() => fetchedFocusedOrder && !loadedFocusedOrder
    ? [fetchedFocusedOrder, ...loadedOrders]
    : loadedOrders, [fetchedFocusedOrder, loadedFocusedOrder, loadedOrders]);

  useEffect(() => {
    if (!focusedOrderId) return;
    const found = orders.some(order => order._id === focusedOrderId);
    if (found) {
      unavailableNotice.current = null;
      const scrollTimer = window.setTimeout(() => {
        setHighlightedOrderId(focusedOrderId);
        document.getElementById(`customer-order-${focusedOrderId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 80);
      const highlightTimer = window.setTimeout(() => setHighlightedOrderId(null), 4000);
      return () => { window.clearTimeout(scrollTimer); window.clearTimeout(highlightTimer); };
    }
    if (!isFetchingFocusedOrder && (focusedOrderError || focusedOrderUnavailable) && unavailableNotice.current !== focusedOrderId) {
      unavailableNotice.current = focusedOrderId;
      toast.error('This order is no longer available.');
    }
  }, [focusedOrderId, orders, isFetchingFocusedOrder, focusedOrderError, focusedOrderUnavailable]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'cancelled':
      case 'payment_failed':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'payment_pending':
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
                id={`customer-order-${order._id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`card p-6 hover:border-primary-500/30 transition-all duration-700 group ${highlightedOrderId===order._id?'ring-2 ring-primary-400 bg-primary-500/10 shadow-xl shadow-primary-500/20':''}`}
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
                      {order.orderStatus === 'payment_pending' && <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-300">Payment submitted. Your order will be sent to the restaurant after verification.</div>}
                      {order.orderStatus === 'payment_failed' && <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">Payment could not be verified. This order was not sent for restaurant processing.</div>}
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
                      <Link to={`/messages?restaurantId=${typeof order.restaurant==='string'?order.restaurant:order.restaurant._id}&orderId=${order._id}`} className="btn btn-outline px-4 py-2 text-sm">
                        <MessageCircle className="w-4 h-4 mr-1" /> Chat with Restaurant
                      </Link>
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
