import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../../types';

export type NotificationType = 'new_order' | 'new_review' | 'order_cancelled' | 'delivery_assigned' |
  'order_picked_up' | 'order_delivered' | 'payment_received' | 'rating_increased' | 'milestone' | 'admin_announcement';

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

export const notificationApi = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getNotifications: builder.query<ApiResponse<NotificationPage>, { page?: number; limit?: number; type?: string }>({
      query: params => ({ url: '/notifications', params }),
      providesTags: ['Notification']
    }),
    markNotificationRead: builder.mutation<ApiResponse<RestaurantNotification>, string>({
      query: id => ({ url: `/notifications/${id}/read`, method: 'PATCH' }), invalidatesTags: ['Notification']
    }),
    markAllNotificationsRead: builder.mutation<ApiResponse, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }), invalidatesTags: ['Notification']
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
  useMarkAllNotificationsReadMutation, useDeleteNotificationMutation, useClearNotificationsMutation,
  useSendRestaurantAnnouncementMutation } = notificationApi;
