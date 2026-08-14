import React, { useEffect, useRef } from 'react';
import { Bell, Package, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  useDeleteCustomerOrderNotificationMutation,
  useDeleteReadCustomerOrderNotificationsMutation,
  useGetCustomerOrderNotificationsQuery,
  useReadCustomerOrderNotificationMutation,
  useReadDisplayedCustomerOrderNotificationsMutation,
  type CustomerOrderNotification
} from '../store/api/customerOrderNotificationApi';

const icons: Record<string, string> = {
  ORDER_PLACED: '🟡', ORDER_ACCEPTED: '🔵', ORDER_PREPARING: '🟣', ORDER_READY: '🟠',
  ORDER_PICKED_UP: '🚚', OUT_FOR_DELIVERY: '🛵', ORDER_DELIVERED: '✅', ORDER_CANCELLED: '❌', PAYMENT_VERIFIED: '💰', PAYMENT_REJECTED: '⚠️'
};

const CustomerNotificationsPage: React.FC = () => {
  const { data, isLoading } = useGetCustomerOrderNotificationsQuery();
  const [read] = useReadCustomerOrderNotificationMutation();
  const [readDisplayed] = useReadDisplayedCustomerOrderNotificationsMutation();
  const [remove] = useDeleteCustomerOrderNotificationMutation();
  const [clearRead] = useDeleteReadCustomerOrderNotificationsMutation();
  const navigate = useNavigate();
  const viewedInitialPage = useRef(false);
  const rows = data?.data.notifications || [];

  useEffect(() => {
    if (isLoading || !data || viewedInitialPage.current) return;
    viewedInitialPage.current = true;
    const unreadIds = rows.filter(row => !row.isRead).map(row => row._id);
    if (unreadIds.length) void readDisplayed(unreadIds);
  }, [data, isLoading, rows, readDisplayed]);

  const open = async (row: CustomerOrderNotification) => {
    if (!row.isRead) await read(row._id);
    if (!row.orderId?._id) return toast.error('This order is no longer available.');
    navigate(`/orders?order=${row.orderId._id}`);
  };

  return <div className="min-h-screen pt-24 pb-12 px-4"><div className="max-w-4xl mx-auto">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
      <div><h1 className="text-3xl font-bold flex items-center gap-2"><Bell className="text-primary-400" />Notifications</h1><p className="text-white/50 mt-1">Order updates and delivery history</p></div>
      <button onClick={() => clearRead()} className="btn btn-outline text-sm text-red-300 self-start sm:self-auto"><Trash2 className="w-4 mr-1" />Delete Read</button>
    </header>
    {isLoading ? <div className="card p-12 animate-pulse text-center">Loading notifications…</div> : !rows.length ? <div className="card p-12 text-center text-white/40"><Bell className="w-14 h-14 mx-auto mb-3" /><p>No order notifications yet.</p></div> : <div className="space-y-3">
      {rows.map(row => <article key={row._id} className={`card p-4 flex gap-3 transition hover:border-primary-500/30 ${row.isRead ? 'opacity-75' : 'bg-primary-500/10 border-primary-500/20'}`}>
        <button onClick={() => open(row)} aria-label={`Open notification for order ${row.orderId?.orderNumber || ''}`} className="flex-1 flex gap-3 text-left focus:outline-none focus:ring-2 focus:ring-primary-400 rounded-xl">
          <span className="text-2xl">{icons[row.type] || '🔔'}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap justify-between gap-2"><b>{row.title}</b><time className="text-xs text-white/35">{new Date(row.createdAt).toLocaleString()}</time></span><span className="block text-sm text-white/65 mt-1">{row.message}</span><span className="flex flex-wrap gap-3 text-xs mt-2"><i className="not-italic text-white/45">{row.restaurantId?.name || 'Restaurant unavailable'}</i><i className="not-italic text-primary-300"><Package className="inline w-3 mr-1" />#{row.orderId?.orderNumber || 'Unavailable'}</i><i className="not-italic capitalize text-white/45">{row.orderStatus?.replaceAll('_', ' ')}</i>{!row.isRead && <i className="not-italic text-red-300">● Unread</i>}</span></span>
        </button>
        <button onClick={() => remove(row._id)} aria-label="Delete notification" className="p-2 self-center text-white/30 hover:text-red-400"><Trash2 className="w-4" /></button>
      </article>)}
    </div>}
  </div></div>;
};

export default CustomerNotificationsPage;
