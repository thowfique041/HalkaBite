import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { apiSlice } from '../../store/api/apiSlice';
import { parseEventData } from '../../utils/realtime';

/** Keeps every mounted Food query synchronized with featured/rating changes. */
const FeaturedFoodSyncInitializer = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (typeof EventSource === 'undefined') return;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
    const stream = new EventSource(`${base}/foods/featured/events`, { withCredentials: true });
    stream.onmessage = event => {
      const payload = parseEventData<{ type?: string }>(event);
      if (payload?.type === 'featured-food-changed') {
        dispatch(apiSlice.util.invalidateTags(['Food']));
      }
    };
    return () => stream.close();
  }, [dispatch]);

  return null;
};

export default FeaturedFoodSyncInitializer;
