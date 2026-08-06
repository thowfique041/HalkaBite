import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, User, Phone, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useGetMyRestaurantQuery, useGetRestaurantOrdersQuery } from '../../store/api/restaurantApi';
import { useUpdateOrderStatusMutation, useCancelOrderMutation } from '../../store/api/orderApi';
import DeliveryAuditTrail from '../../components/orders/DeliveryAuditTrail';

const RestaurantOrdersPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialStatus = searchParams.get('status') || 'all';
    const focusedOrderId = searchParams.get('order');
    const [selectedStatus, setSelectedStatus] = useState(initialStatus);

    const { data: restaurantData, isLoading: restaurantLoading, isError: restaurantError } = useGetMyRestaurantQuery();
    const restaurantId = restaurantData?.data?._id;

    const { data: ordersData, isLoading, isError } = useGetRestaurantOrdersQuery(
        { id: restaurantId!, status: selectedStatus === 'all' ? undefined : selectedStatus, limit: 50 },
        { skip: !restaurantId, pollingInterval: 5000, refetchOnFocus: true, refetchOnReconnect: true }
    );

    const [updateOrderStatus] = useUpdateOrderStatusMutation();
    const [cancelOrder] = useCancelOrderMutation();

    const statusOptions = [
        { value: 'all', label: 'All Orders' },
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'preparing', label: 'Preparing' },
        { value: 'ready', label: 'Ready' },
        { value: 'out_for_delivery', label: 'Out for Delivery' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    const handleUpdateStatus = async (orderId: string, newStatus: string) => {
        try {
            await updateOrderStatus({ id: orderId, orderStatus: newStatus }).unwrap();
            toast.success(`Order status updated to ${newStatus}`);
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to update order status');
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        if (window.confirm('Are you sure you want to cancel this order?')) {
            try {
                await cancelOrder(orderId).unwrap();
                toast.success('Order cancelled successfully');
            } catch (error: any) {
                toast.error(error?.data?.message || 'Failed to cancel order');
            }
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
            confirmed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            preparing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            ready: 'bg-green-500/10 text-green-400 border-green-500/20',
            picked_up: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
        };
        return colors[status] || '';
    };

    if (restaurantLoading) return <div className="text-center py-12">Loading restaurant...</div>;

    if (restaurantError || !restaurantId) {
        return (
            <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <p className="text-white/60">No restaurant assigned</p>
            </div>
        );
    }

    const orders = ordersData?.data?.orders || [];

    if (isLoading) {
        return <div className="text-center py-12">Loading orders...</div>;
    }

    if (isError) return <div className="card p-8 text-center text-red-300">Failed to load restaurant orders. Please refresh and try again.</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Orders</h1>
                    <p className="text-white/60">Manage and track your restaurant orders</p>
                </div>

                <select
                    value={selectedStatus}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSelectedStatus(value);
                        setSearchParams(value === 'all' ? {} : { status: value });
                    }}
                    className="input w-full sm:w-48"
                >
                    {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="grid gap-6">
                {orders.length === 0 ? (
                    <div className="card p-12 text-center">
                        <Package className="w-16 h-16 mx-auto mb-4 text-white/20" />
                        <h3 className="text-xl font-bold mb-2">No Orders Found</h3>
                        <p className="text-white/60">
                            {selectedStatus === 'all'
                                ? 'You haven\'t received any orders yet.'
                                : `No ${selectedStatus} orders at the moment.`}
                        </p>
                    </div>
                ) : (
                    orders.map((order) => {
                        const customer = order.user as any;
                        return (
                            <div key={order._id} ref={element => { if (element && focusedOrderId === order._id) setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }} className={`card p-6 transition ${focusedOrderId === order._id ? 'ring-2 ring-primary-500 shadow-xl shadow-primary-500/20' : ''}`}>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-white/10">
                                    <div>
                                        <h3 className="text-lg font-bold mb-1">Order #{order.orderNumber}</h3>
                                        <p className="text-sm text-white/60">
                                            {new Date(order.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.orderStatus)}`}>
                                            {order.orderStatus.replace('_', ' ')}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${order.paymentStatus === 'paid'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                            }`}>
                                            {order.paymentStatus}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <User className="w-5 h-5 text-primary-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-white/60">Customer</p>
                                            <p className="font-medium">{customer?.name || 'N/A'}</p>
                                            <p className="text-sm text-white/60">{customer?.email || ''}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Phone className="w-5 h-5 text-primary-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-white/60">Phone</p>
                                            <p className="font-medium">{customer?.phone || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 md:col-span-2">
                                        <MapPin className="w-5 h-5 text-primary-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-white/60">Delivery Address</p>
                                            <p className="font-medium">
                                                {order.deliveryAddress.street}, {order.deliveryAddress.city}
                                                {order.deliveryAddress.zipCode && ` - ${order.deliveryAddress.zipCode}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <p className="text-sm font-medium text-white/60 mb-3">Order Items</p>
                                    <div className="space-y-2">
                                        {order.items.map((item, index) => {
                                            const foodItem = item.foodItem as any;
                                            return (
                                                <div key={index} className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
                                                    <img
                                                        src={foodItem?.image || 'https://via.placeholder.com/48'}
                                                        alt={foodItem?.name || item.name}
                                                        className="w-12 h-12 rounded-lg object-cover"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-medium">{foodItem?.name || item.name}</p>
                                                        <p className="text-sm text-white/60">Quantity: {item.quantity}</p>
                                                        {item.specialInstructions && (
                                                            <p className="text-sm text-yellow-400 mt-1 italic">
                                                                Note: {item.specialInstructions}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="font-bold">৳{(item.price * item.quantity).toFixed(0)}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-4 border-t border-white/10 mb-4">
                                    <p className="font-medium">Total Amount</p>
                                    <p className="text-2xl font-bold text-green-400">৳{order.totalAmount}</p>
                                </div>

                                {order.deliveryManSnapshot && (
                                    <div className="mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                        <p className="font-semibold text-blue-300">Delivery Partner: {order.deliveryManSnapshot.name}</p>
                                        <p className="text-xs text-white/50 font-mono">ID: {order.deliveryManSnapshot.id}</p>
                                        <p className="text-sm text-white/60 capitalize mt-1">Current status: {(order.deliveryStatus || order.orderStatus).replaceAll('_', ' ')}</p>
                                        <div className="text-xs text-white/40 mt-2 flex flex-wrap gap-4">
                                            {order.assignedAt && <span>Assigned: {new Date(order.assignedAt).toLocaleString()}</span>}
                                            {order.pickupTime && <span>Pickup: {new Date(order.pickupTime).toLocaleString()}</span>}
                                            {order.actualDeliveryTime && <span>Delivered: {new Date(order.actualDeliveryTime).toLocaleString()}</span>}
                                        </div>
                                        <DeliveryAuditTrail order={order} />
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {order.orderStatus === 'pending' && (
                                        <button
                                            onClick={() => handleUpdateStatus(order._id, 'confirmed')}
                                            className="btn btn-primary flex-1 sm:flex-none"
                                        >
                                            Confirm Order
                                        </button>
                                    )}
                                    {order.orderStatus === 'confirmed' && (
                                        <button
                                            onClick={() => handleUpdateStatus(order._id, 'preparing')}
                                            className="btn btn-primary flex-1 sm:flex-none"
                                        >
                                            Start Preparing
                                        </button>
                                    )}
                                    {order.orderStatus === 'preparing' && (
                                        <button
                                            onClick={() => handleUpdateStatus(order._id, 'ready')}
                                            className="btn btn-primary flex-1 sm:flex-none"
                                        >
                                            Mark as Ready
                                        </button>
                                    )}
                                    {order.orderStatus === 'ready' && (
                                        <span className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 text-sm">
                                            Waiting for a delivery partner
                                        </span>
                                    )}
                                    {['pending', 'confirmed'].includes(order.orderStatus) && (
                                        <button
                                            onClick={() => handleCancelOrder(order._id)}
                                            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium transition-colors flex-1 sm:flex-none"
                                        >
                                            Cancel Order
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default RestaurantOrdersPage;
