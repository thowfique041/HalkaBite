import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { apiSlice } from '../../store/api/apiSlice';
import { chatApi } from '../../store/api/chatApi';
import { parseEventData } from '../../utils/realtime';

const ChatRealtimeInitializer = () => {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (!user || !['user', 'restaurant'].includes(user.role) || typeof EventSource === 'undefined') return;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
    const events = new EventSource(`${base}/chat/events`, { withCredentials: true });
    events.onmessage = event => {
      const payload = parseEventData<any>(event);
      if (!payload || payload.type === 'connected') return;
      let updated = false;
      if (['message', 'read', 'block'].includes(payload.type)) {
        dispatch(chatApi.util.updateQueryData('getConversations', undefined, draft => {
          const index = draft.data.findIndex(conversation => conversation._id === payload.conversationId);
          if (index < 0) return;
          const conversation = draft.data[index];
          updated = true;
          if (payload.type === 'message') {
            conversation.lastMessage = payload.message.message || '📷 Image';
            conversation.lastMessageAt = payload.message.createdAt;
            if (payload.message.senderRole !== user.role) {
              if (user.role === 'user') conversation.customerUnread += 1;
              else conversation.restaurantUnread += 1;
            }
            draft.data.splice(index, 1);
            draft.data.unshift(conversation);
          } else if (payload.type === 'read') {
            if (payload.readerRole === 'user') conversation.customerUnread = 0;
            else conversation.restaurantUnread = 0;
          } else if (payload.type === 'block') conversation.isBlocked = payload.blocked;
        }));
      }
      if (!updated) dispatch(apiSlice.util.invalidateTags(['Chat']));
      if (payload.type === 'message' && payload.message?.senderRole !== user.role) {
        toast(payload.notification, { icon: '🔔', id: `chat-${payload.message._id}` });
      }
    };
    return () => events.close();
  }, [user, dispatch]);
  return null;
};
export default ChatRealtimeInitializer;
