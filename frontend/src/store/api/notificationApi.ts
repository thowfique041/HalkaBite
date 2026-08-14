import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../../types';
import { uniqueById } from '../../utils/uniqueById';

export type NotificationType = 'new_order' | 'new_review' | 'order_cancelled' | 'delivery_assigned' |
  'order_picked_up' | 'order_delivered' | 'payment_received' | 'payment_submitted' | 'rating_increased' | 'milestone' | 'admin_announcement';

export interface RestaurantNotification {
  _id: string;
  restaurantId: string;
  title: string;
  message: string;
  type: NotificationType;
  orderId?: string;
  reviewId?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface NotificationPage {
  notifications: RestaurantNotification[];
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}
interface ReadDisplayedResponse { updatedCount: number; unreadCount: number }

export const notificationApi = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getNotifications: builder.query<ApiResponse<NotificationPage>, { page?: number; limit?: number; type?: string }>({
      query: params => ({ url: '/notifications', params }),
      transformResponse: (response: ApiResponse<NotificationPage>) => ({ ...response, data: response.data ? { ...response.data, notifications: uniqueById(response.data.notifications) } : response.data }),
      providesTags: ['Notification']
    }),
    markNotificationRead: builder.mutation<ApiResponse<RestaurantNotification>, string>({
      query: id => ({ url: `/notifications/${id}/read`, method: 'PATCH' }), invalidatesTags: ['Notification']
    }),
    markDisplayedNotificationsRead: builder.mutation<ApiResponse<ReadDisplayedResponse>, string[]>({
      query: ids => ({ url: '/notifications/read', method: 'PATCH', body: { ids } }),
      async onQueryStarted(ids, { dispatch, getState, queryFulfilled }) {
        const idSet = new Set(ids);
        const args = notificationApi.util.selectCachedArgsForQuery(getState(), 'getNotifications');
        const patches = args.map(arg => dispatch(notificationApi.util.updateQueryData('getNotifications', arg, draft => {
          if (!draft.data) return;
          let changed = 0;
          draft.data.notifications.forEach(item => {
            if (idSet.has(item._id) && !item.isRead) { item.isRead = true; changed += 1; }
          });
          draft.data.unreadCount = Math.max(0, draft.data.unreadCount - changed);
        })));
        try {
          const { data } = await queryFulfilled;
          args.forEach(arg => dispatch(notificationApi.util.updateQueryData('getNotifications', arg, draft => {
            if (draft.data && data.data) draft.data.unreadCount = data.data.unreadCount;
          })));
        } catch { patches.forEach(patch => patch.undo()); }
      },
      invalidatesTags: ['Notification']
    }),
    deleteNotification: builder.mutation<ApiResponse, string>({
      query: id => ({ url: `/notifications/${id}`, method: 'DELETE' }), invalidatesTags: ['Notification']
    }),
    clearNotifications: builder.mutation<ApiResponse, void>({
      query: () => ({ url: '/notifications', method: 'DELETE' }), invalidatesTags: ['Notification']
    }),
    sendRestaurantAnnouncement: builder.mutation<ApiResponse<RestaurantNotification>, { restaurantId: string; title: string; message: string }>({
      query: body => ({ url: '/notifications/announcements', method: 'POST', body })
    })
  })
});

export const { useGetNotificationsQuery, useMarkNotificationReadMutation,
  useMarkDisplayedNotificationsReadMutation, useDeleteNotificationMutation, useClearNotificationsMutation,
  useSendRestaurantAnnouncementMutation } = notificationApi;
