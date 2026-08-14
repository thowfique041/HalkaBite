import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { apiSlice } from '../../store/api/apiSlice';
import { parseEventData } from '../../utils/realtime';

const OrderSyncInitializer = () => {
  const dispatch = useAppDispatch();
  const token = useAppSelector(state => state.auth.token);

  useEffect(() => {
    if (!token || typeof EventSource === 'undefined') return;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const events = new EventSource(`${baseUrl}/orders/events/stream`, { withCredentials: true });
    const refreshOrders = (message: Event) => {
      const event = parseEventData<{ type?: string }>(message as MessageEvent<string>);
      if (!event) return;
      if (event.type === 'review_submitted') {
        dispatch(apiSlice.util.invalidateTags(['Review', 'Food', 'Restaurant']));
      } else {
        dispatch(apiSlice.util.invalidateTags(['Order', 'Restaurant', 'User']));
      }
    };
    events.addEventListener('order-lifecycle', refreshOrders);
    return () => {
      events.removeEventListener('order-lifecycle', refreshOrders);
      events.close();
    };
  }, [dispatch, token]);

  return null;
};

export default OrderSyncInitializer;
