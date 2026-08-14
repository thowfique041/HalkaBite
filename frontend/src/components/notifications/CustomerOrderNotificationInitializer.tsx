import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { customerOrderNotificationApi, type CustomerOrderNotification } from '../../store/api/customerOrderNotificationApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { parseEventData } from '../../utils/realtime';

const CustomerOrderNotificationInitializer = () => {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'user' || typeof EventSource === 'undefined') return;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
    const events = new EventSource(`${base}/customer-order-notifications/events`, { withCredentials: true });
    events.onmessage = message => {
      const notification = parseEventData<CustomerOrderNotification | { type: 'connected' }>(message);
      if (!notification || notification.type === 'connected' || !('_id' in notification)) return;
      dispatch(customerOrderNotificationApi.util.updateQueryData('getCustomerOrderNotifications', undefined, draft => {
        if (draft.data.notifications.some(item => item._id === notification._id)) return;
        draft.data.notifications.unshift(notification);
        draft.data.unreadCount += 1;
        draft.data.pagination.total += 1;
      }));
      const restaurant = notification.restaurantId?.name || 'HalkaBite';
      toast.custom(t => <div className="card max-w-sm border border-primary-500/30 p-4 shadow-2xl">
        <b>🍔 {restaurant}</b><p className="mt-1 text-sm text-white/65">{notification.message}</p>
        <button onClick={() => { toast.dismiss(t.id); if (notification.orderId?._id) navigate(`/orders?order=${notification.orderId._id}`); }} className="mt-3 text-sm text-primary-400 hover:underline">View Order →</button>
      </div>, { duration: 7000, id: `order-notification-${notification._id}` });
    };
    return () => events.close();
  }, [user, dispatch, navigate]);

  return null;
};

export default CustomerOrderNotificationInitializer;
