import { useGetConversationsQuery } from '../../store/api/chatApi';
import { useAppSelector } from '../../store/hooks';

export const useUnreadChatCount = () => {
  const role = useAppSelector(state => state.auth.user?.role);
  const { data } = useGetConversationsQuery(undefined, { skip: !role || !['user', 'restaurant'].includes(role) });
  return (data?.data || []).reduce((total, conversation) => {
    const unread = role === 'restaurant' ? conversation.restaurantUnread : conversation.customerUnread;
    return total + (unread > 0 ? 1 : 0);
  }, 0);
};
