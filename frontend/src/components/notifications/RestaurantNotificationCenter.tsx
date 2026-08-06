import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { apiSlice } from '../../store/api/apiSlice';
import { useGetNotificationsQuery, useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation, type RestaurantNotification } from '../../store/api/notificationApi';
import NotificationIcon from './NotificationIcon';

const destination = (item: RestaurantNotification) => item.type === 'new_review'
  ? item.metadata?.foodItemId ? `/restaurant-dashboard/reviews/food/${String(item.metadata.foodItemId)}` : '/restaurant-dashboard/reviews'
  : item.orderId ? `/restaurant-dashboard/orders?order=${item.orderId}` : '/restaurant-dashboard/notifications';

const RestaurantNotificationCenter: React.FC = () => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const token = useAppSelector(state => state.auth.token);
  const { data } = useGetNotificationsQuery({ limit: 8 }, { pollingInterval: 30000, refetchOnFocus: true, refetchOnReconnect: true });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll] = useMarkAllNotificationsReadMutation();
  const notifications = data?.data?.notifications || [];
  const unread = data?.data?.unreadCount || 0;

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const connect = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${base}/notifications/stream`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = '';
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n'); buffer = events.pop() || '';
          for (const event of events) {
            if (!event.includes('event: notification')) continue;
            const line = event.split('\n').find(entry => entry.startsWith('data: '));
            if (!line) continue;
            const item = JSON.parse(line.slice(6)) as RestaurantNotification;
            toast(item.title, { icon: '🔔', duration: 5000 });
            dispatch(apiSlice.util.invalidateTags(['Notification', 'Order', 'Review', 'Restaurant']));
          }
        }
      } catch (error) { if (!controller.signal.aborted) console.warn('Notification stream reconnects through polling.', error); }
    };
    connect(); return () => controller.abort();
  }, [dispatch, token]);

  const openItem = async (item: RestaurantNotification) => {
    if (!item.isRead) await markRead(item._id);
    setOpen(false); navigate(destination(item));
  };

  return <div ref={root} className="relative">
    <button onClick={() => setOpen(value => !value)} className="relative p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition" aria-label={`${unread} unread notifications`}>
      <Bell className="w-5 h-5" />
      {unread > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[11px] font-bold grid place-items-center animate-pulse">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <div className="absolute right-0 top-14 z-50 w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-white/10 bg-dark-100/95 backdrop-blur-2xl shadow-2xl">
      <div className="p-4 flex items-center justify-between border-b border-white/10"><div><h3 className="font-bold">Notifications</h3><p className="text-xs text-white/45">{unread} unread</p></div><button onClick={() => markAll()} disabled={!unread} className="text-xs text-primary-400 flex items-center gap-1 disabled:opacity-40"><CheckCheck className="w-4 h-4" /> Mark all read</button></div>
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
