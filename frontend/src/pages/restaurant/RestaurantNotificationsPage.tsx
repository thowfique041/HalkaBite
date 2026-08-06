import React, { useState } from 'react';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import NotificationIcon from '../../components/notifications/NotificationIcon';
import { useClearNotificationsMutation, useDeleteNotificationMutation, useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation, type RestaurantNotification } from '../../store/api/notificationApi';

const filters = [
  ['all', 'All'], ['new_order', 'Orders'], ['new_review', 'Reviews'], ['delivery_assigned', 'Delivery'],
  ['payment_received', 'Payments'], ['admin_announcement', 'Announcements']
];

const RestaurantNotificationsPage: React.FC = () => {
  const [type, setType] = useState('all'); const [page, setPage] = useState(1); const navigate = useNavigate();
  const { data, isLoading } = useGetNotificationsQuery({ page, limit: 12, type });
  const [markRead] = useMarkNotificationReadMutation(); const [markAll] = useMarkAllNotificationsReadMutation();
  const [remove] = useDeleteNotificationMutation(); const [clear] = useClearNotificationsMutation();
  const payload = data?.data; const notifications = payload?.notifications || [];
  const open = async (item: RestaurantNotification) => {
    if (!item.isRead) await markRead(item._id);
    navigate(item.type === 'new_review' ? (item.metadata?.foodItemId ? `/restaurant-dashboard/reviews/food/${String(item.metadata.foodItemId)}` : '/restaurant-dashboard/reviews') : item.orderId ? `/restaurant-dashboard/orders?order=${item.orderId}` : '/restaurant-dashboard');
  };
  const clearAll = async () => {
    if (!window.confirm('Delete all restaurant notifications?')) return;
    await clear().unwrap(); toast.success('Notifications cleared');
  };
  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><p className="text-primary-400 font-medium mb-1">Stay informed in real time</p><h1 className="text-3xl font-bold">Notification Center</h1><p className="text-white/50 mt-2">Orders, reviews, delivery events, payments, and announcements.</p></div><div className="flex gap-2"><button onClick={() => markAll()} disabled={!payload?.unreadCount} className="btn btn-ghost text-sm"><CheckCheck className="w-4 h-4 mr-2" />Mark all read</button><button onClick={clearAll} disabled={!notifications.length} className="btn bg-red-500/10 text-red-300 text-sm"><Trash2 className="w-4 h-4 mr-2" />Clear all</button></div></header>
    <div className="flex gap-2 overflow-x-auto pb-2">{filters.map(([value,label]) => <button key={value} onClick={() => { setType(value); setPage(1); }} className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm transition ${type === value ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{label}</button>)}</div>
    <section className="space-y-3">
      {isLoading && <div className="card p-10 text-center text-white/50">Loading notifications…</div>}
      {!isLoading && !notifications.length && <div className="card p-14 text-center"><Bell className="w-14 h-14 mx-auto text-white/15 mb-4" /><h2 className="text-xl font-bold">No notifications</h2><p className="text-white/45 mt-2">New activity will appear here instantly.</p></div>}
      {notifications.map(item => <article key={item._id} onClick={() => open(item)} className={`group cursor-pointer rounded-2xl border p-5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-primary-500/30 ${item.isRead ? 'bg-white/[0.035] border-white/5' : 'bg-gradient-to-r from-primary-500/15 to-white/[0.04] border-primary-500/20'}`}>
        <div className="flex gap-4"><div className="w-12 h-12 shrink-0 rounded-2xl bg-primary-500/15 text-primary-400 grid place-items-center"><NotificationIcon type={item.type} className="w-6 h-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-bold flex items-center gap-2">{item.title}{!item.isRead && <span className="w-2 h-2 rounded-full bg-primary-400" />}</h2><time className="text-xs text-white/35">{new Date(item.createdAt).toLocaleString()}</time></div><p className="text-sm text-white/65 mt-2">{item.message}</p><span className="inline-flex mt-3 px-2.5 py-1 rounded-full bg-white/5 text-[11px] uppercase tracking-wide text-white/45">{item.type.replaceAll('_', ' ')}</span></div><button onClick={async event => { event.stopPropagation(); await remove(item._id).unwrap(); }} className="self-center p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-white/35 hover:text-red-300 rounded-lg transition" aria-label="Delete notification"><Trash2 className="w-4 h-4" /></button></div>
      </article>)}
    </section>
    {(payload?.pagination.pages || 0) > 1 && <div className="flex justify-center items-center gap-4"><button className="p-2 rounded-lg bg-white/5 disabled:opacity-30" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft /></button><span className="text-sm text-white/55">Page {page} of {payload?.pagination.pages}</span><button className="p-2 rounded-lg bg-white/5 disabled:opacity-30" disabled={page === payload?.pagination.pages} onClick={() => setPage(p => p + 1)}><ChevronRight /></button></div>}
  </div>;
};
export default RestaurantNotificationsPage;
