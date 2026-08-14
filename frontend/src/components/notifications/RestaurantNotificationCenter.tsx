import React, { useEffect, useRef, useState } from 'react';
import { Bell, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppDispatch } from '../../store/hooks';
import { apiSlice } from '../../store/api/apiSlice';
import { useGetNotificationsQuery, useMarkDisplayedNotificationsReadMutation, useMarkNotificationReadMutation, type RestaurantNotification } from '../../store/api/notificationApi';
import NotificationIcon from './NotificationIcon';
import { parseEventData } from '../../utils/realtime';

const destination = (item: RestaurantNotification) => item.type === 'payment_submitted'
  ? '/restaurant-dashboard/payments'
  : item.type === 'new_review'
  ? item.metadata?.foodItemId ? `/restaurant-dashboard/reviews/food/${String(item.metadata.foodItemId)}` : '/restaurant-dashboard/reviews'
  : item.orderId ? `/restaurant-dashboard/orders?order=${item.orderId}` : '/restaurant-dashboard/notifications';

const RestaurantNotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const openViewMarked = useRef(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { data } = useGetNotificationsQuery({ limit: 8 }, { refetchOnFocus: true, refetchOnReconnect: true });
  const [markRead] = useMarkNotificationReadMutation();
  const [markDisplayed] = useMarkDisplayedNotificationsReadMutation();
  const notifications = data?.data?.notifications || [];
  const unread = data?.data?.unreadCount || 0;

  useEffect(() => {
    if (!open || !data || openViewMarked.current) return;
    openViewMarked.current = true;
    const unreadIds = notifications.filter(item => !item.isRead).map(item => item._id);
    if (unreadIds.length) void markDisplayed(unreadIds);
  }, [data, markDisplayed, notifications, open]);

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
    const events = new EventSource(`${base}/notifications/stream`, { withCredentials: true });
    const receive = (event: Event) => {
      const item = parseEventData<RestaurantNotification>(event as MessageEvent<string>);
      if (!item?._id) return;
      toast(item.title, { icon: '🔔', duration: 5000, id: `restaurant-notification-${item._id}` });
      dispatch(apiSlice.util.invalidateTags(['Notification', 'Order', 'Review', 'Restaurant', 'Payment']));
    };
    events.addEventListener('notification', receive);
    return () => { events.removeEventListener('notification', receive); events.close(); };
  }, [dispatch]);

  const openItem = async (item: RestaurantNotification) => {
    if (!item.isRead) await markRead(item._id);
    setOpen(false); navigate(destination(item));
  };

  const toggleNotifications = () => {
    if (!open) {
      openViewMarked.current = false;
    }
    setOpen(value => !value);
  };

  return <div ref={root} className="relative">
    <button onClick={toggleNotifications} className="relative p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition" aria-label={`${unread} unread notifications`}>
      <Bell className="w-5 h-5" />
      {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[11px] font-bold grid place-items-center animate-pulse">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <div className="absolute right-0 top-14 z-50 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-white/10 bg-dark-100/95 backdrop-blur-2xl shadow-2xl">
      <div className="p-4 border-b border-white/10"><h3 className="font-bold">Notifications</h3><p className="text-xs text-white/45">Recent restaurant activity</p></div>
      <div className="max-h-[430px] overflow-y-auto">
        {!notifications.length && <div className="p-10 text-center text-white/45"><Bell className="w-9 h-9 mx-auto mb-3 opacity-40" />You’re all caught up.</div>}
        {notifications.map(item => <button key={item._id} onClick={() => openItem(item)} className={`w-full text-left p-4 flex gap-3 border-b border-white/5 hover:bg-white/10 transition ${item.isRead ? 'bg-transparent' : 'bg-primary-500/10'}`}>
          <span className="w-10 h-10 shrink-0 rounded-xl bg-primary-500/15 text-primary-400 grid place-items-center"><NotificationIcon type={item.type} /></span>
          <span className="min-w-0 flex-1"><span className="font-semibold text-sm flex items-center gap-2">{item.title}{!item.isRead && <i className="w-2 h-2 rounded-full bg-primary-400" />}</span><span className="block text-xs text-white/60 mt-1 line-clamp-2">{item.message}</span><time className="block text-[11px] text-white/35 mt-2">{new Date(item.createdAt).toLocaleString()}</time></span>
        </button>)}
      </div>
      <button onClick={() => { setOpen(false); navigate('/restaurant-dashboard/notifications'); }} className="w-full p-3 text-sm text-primary-400 font-medium hover:bg-white/5 flex items-center justify-center gap-2">View all notifications <ExternalLink className="w-4 h-4" /></button>
    </div>}
  </div>;
};
export default RestaurantNotificationCenter;
