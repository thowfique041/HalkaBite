import React from 'react';
import { useGetAllOrdersQuery } from '../../store/api/orderApi';
import { Eye } from 'lucide-react';
import type { Order } from '../../types';
import DeliveryAuditTrail from '../../components/orders/DeliveryAuditTrail';

const OrdersPage: React.FC = () => {
    // Use the admin endpoint to get ALL orders
    const { data: ordersData, isLoading } = useGetAllOrdersQuery(undefined, {
        pollingInterval: 5000,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });
    const orders = ordersData?.data?.orders || [];

    if (isLoading) {
        return <div className="text-center py-8">Loading orders...</div>;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Orders Management</h1>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="p-4">Order ID</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Restaurant</th>
                                <th className="p-4">Items</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Delivery Partner</th>
                                <th className="p-4">Date</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {orders.map((order: Order) => (
                                <tr key={order._id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-mono text-sm">{order.orderNumber}</td>
                                    <td className="p-4">{(order.user as any)?.name}</td>
                                    <td className="p-4">{(order.restaurant as any)?.name}</td>
                                    <td className="p-4 text-sm text-white/60">
                                        {order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                                    </td>
                                    <td className="p-4 font-bold">৳{order.totalAmount}</td>
                                    <td className="p-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${order.orderStatus === 'delivered'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : order.orderStatus === 'pending'
                                                ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {(order.deliveryStatus || order.orderStatus).replaceAll('_', ' ').toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {order.deliveryManSnapshot ? (
                                            <div>
                                                <div className="font-medium">{order.deliveryManSnapshot.name}</div>
                                                <div className="text-xs text-white/40 font-mono">{order.deliveryManSnapshot.id}</div>
                                                <div className="text-xs text-white/50 mt-1">
                                                    {order.assignedAt ? `Assigned ${new Date(order.assignedAt).toLocaleString()}` : ''}
                                                </div>
                                                <DeliveryAuditTrail order={order} compact />
                                            </div>
                                        ) : <span className="text-white/30">Unassigned</span>}
                                    </td>
                                    <td className="p-4 text-sm text-white/60">
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default OrdersPage;
