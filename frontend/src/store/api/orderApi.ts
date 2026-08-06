import { apiSlice } from './apiSlice';
import type { Order, ApiResponse } from '../../types';

export const orderApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getOrders: builder.query<ApiResponse<{ orders: Order[]; pagination: any }>, void>({
            query: () => '/orders',
            providesTags: ['Order'],
        }),
        createOrder: builder.mutation<ApiResponse<Order>, Partial<Order>>({
            query: (order) => ({
                url: '/orders',
                method: 'POST',
                body: order,
            }),
            invalidatesTags: ['Order'],
        }),
        updateOrderStatus: builder.mutation<ApiResponse<Order>, { id: string; orderStatus: string }>({
            query: ({ id, orderStatus }) => ({
                url: `/orders/${id}/status`,
                method: 'PUT',
                body: { orderStatus },
            }),
            invalidatesTags: ['Order'],
        }),
        cancelOrder: builder.mutation<ApiResponse<Order>, string>({
            query: (id) => ({
                url: `/orders/${id}/cancel`,
                method: 'PUT',
            }),
            invalidatesTags: ['Order'],
        }),
        // Admin endpoint
        getAllOrders: builder.query<ApiResponse<{ orders: Order[]; pagination: any }>, void>({
            query: () => '/orders/admin/all',
            providesTags: ['Order'],
        }),
    }),
});

export const {
    useGetOrdersQuery,
    useCreateOrderMutation,
    useUpdateOrderStatusMutation,
    useCancelOrderMutation,
    useGetAllOrdersQuery,
} = orderApi;
