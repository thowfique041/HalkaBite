import { apiSlice } from './apiSlice';
import type { ApiResponse, Payment, PaymentMethods } from '../../types';

interface AvailableMethods {
  restaurantId: string;
  restaurantName: string;
  paymentMethods: PaymentMethods;
}
interface PaymentPage { payments: Payment[]; pagination: { page: number; limit: number; total: number; pages: number } }
interface SubmitPayment { orderId: string; method: 'bkash'|'nagad'|'rocket'; senderNumber: string; transactionId: string; amount: number }

export const paymentApi = apiSlice.injectEndpoints({ endpoints: builder => ({
  getAvailablePaymentMethods: builder.query<ApiResponse<AvailableMethods>, string>({
    query: restaurantId => `/payments/available/${restaurantId}`,
    providesTags: ['Payment', 'Restaurant']
  }),
  submitPayment: builder.mutation<ApiResponse<Payment>, SubmitPayment>({
    query: body => ({ url: '/payments', method: 'POST', body }),
    invalidatesTags: ['Payment', 'Order']
  }),
  getOrderPayment: builder.query<ApiResponse<Payment | null>, string>({
    query: orderId => `/payments/order/${orderId}`,
    providesTags: ['Payment']
  }),
  getRestaurantPayments: builder.query<ApiResponse<PaymentPage>, { status?: string; page?: number; limit?: number }>({
    query: params => ({ url: '/payments/restaurant', params }),
    providesTags: ['Payment']
  }),
  verifyPayment: builder.mutation<ApiResponse<Payment>, string>({
    query: id => ({ url: `/payments/${id}/verify`, method: 'PATCH' }),
    invalidatesTags: ['Payment', 'Order', 'CustomerOrderNotification', 'Notification']
  }),
  rejectPayment: builder.mutation<ApiResponse<Payment>, { id: string; reason: string }>({
    query: ({ id, reason }) => ({ url: `/payments/${id}/reject`, method: 'PATCH', body: { reason } }),
    invalidatesTags: ['Payment', 'Order', 'CustomerOrderNotification', 'Notification']
  })
}) });

export const { useGetAvailablePaymentMethodsQuery, useSubmitPaymentMutation, useGetOrderPaymentQuery,
  useGetRestaurantPaymentsQuery, useVerifyPaymentMutation, useRejectPaymentMutation } = paymentApi;
