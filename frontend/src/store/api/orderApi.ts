import { apiSlice } from './apiSlice';
import type { Order, ApiResponse } from '../../types';
import { uniqueById } from '../../utils/uniqueById';
import { clearCartState } from '../slices/cartSlice';

export interface AdminOrderFilters {
    status?: string; paymentStatus?: string; paymentMethod?: string; restaurant?: string; customer?: string; rider?: string;
    datePreset?: string; from?: string; to?: string; startTime?: string; endTime?: string;
    minAmount?: number; maxAmount?: number; commissionPercent?: number; minCommission?: number; maxCommission?: number;
    search?: string; sort?: string; page?: number; limit?: 10|25|50|100; export?: 'true';
}
export interface AdminOrder extends Order { effectiveCommission:number; commissionPercent?:number|null; preparationMinutes?:number|null; deliveryMinutes?:number|null }
export interface AdminOrderData {
    orders:AdminOrder[];
    summary:{totalOrders:number;pendingOrders:number;deliveredOrders:number;cancelledOrders:number;todayRevenue:number;platformCommission:number;averageOrderValue:number};
    pagination:{page:number;limit:number;total:number;pages:number};
}

export const orderApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getOrders: builder.query<ApiResponse<{ orders: Order[]; pagination: any }>, void>({
            query: () => '/orders',
            transformResponse: (response: ApiResponse<{ orders: Order[]; pagination: any }>) => ({ ...response, data: response.data ? { ...response.data, orders: uniqueById(response.data.orders) } : response.data }),
            providesTags: ['Order'],
        }),
        getOrder: builder.query<ApiResponse<Order>, string>({
            query: (id) => `/orders/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Order', id }],
        }),
        createOrder: builder.mutation<ApiResponse<Order>, Partial<Order>>({
            query: (order) => ({
                url: '/orders',
                method: 'POST',
                body: order,
            }),
            invalidatesTags: ['Order', 'Cart'],
            async onQueryStarted(_order, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    // The backend has now persisted the order and removed its cart items.
                    // Clear the visible snapshot immediately; the Cart invalidation then
                    // reconciles it with the authoritative backend state.
                    dispatch(clearCartState());
                } catch {
                    // A failed order must leave both the backend and visible cart intact.
                }
            },
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
        getAdminOrders: builder.query<ApiResponse<AdminOrderData>, AdminOrderFilters>({
            query: params => ({url:'/admin/orders',params}),
            transformResponse: (response: ApiResponse<AdminOrderData>) => ({ ...response, data: response.data ? { ...response.data, orders: uniqueById(response.data.orders) } : response.data }),
            providesTags: ['Order'],
        }),
    }),
});

export const {
    useGetOrdersQuery,
    useGetOrderQuery,
    useCreateOrderMutation,
    useUpdateOrderStatusMutation,
    useCancelOrderMutation,
    useGetAdminOrdersQuery,
    useLazyGetAdminOrdersQuery,
} = orderApi;
