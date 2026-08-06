import { apiSlice } from './apiSlice';
import type { Restaurant, ApiResponse, Order } from '../../types';

export const restaurantApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getRestaurants: builder.query<ApiResponse<{ restaurants: Restaurant[]; pagination: any }>, { page?: number; limit?: number; search?: string }>({
            query: (params) => ({
                url: '/restaurants',
                params,
            }),
            providesTags: ['Restaurant'],
        }),
        getRestaurant: builder.query<ApiResponse<Restaurant>, string>({
            query: (id) => `/restaurants/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Restaurant', id }],
        }),
        getMyRestaurant: builder.query<ApiResponse<Restaurant>, void>({
            query: () => '/restaurants/my-restaurant',
            providesTags: ['Restaurant'],
        }),
        getRestaurantOrders: builder.query<ApiResponse<{ orders: Order[]; pagination: any }>, { id: string; status?: string; page?: number; limit?: number }>({
            query: ({ id, status, page, limit }) => ({
                url: `/restaurants/${id}/orders`,
                params: { status, page, limit },
            }),
            providesTags: ['Order'],
        }),
        getRestaurantStats: builder.query<ApiResponse<{
            totalRevenue: number;
            totalOrders: number;
            todayRevenue: number;
            todayOrders: number;
            pendingOrders: number;
            menuItems: number;
            popularItems: Array<{ foodItemId: string; name: string; quantity: number; revenue: number }>;
        }>, string>({
            query: (id) => `/restaurants/${id}/stats`,
            providesTags: ['Order'],
        }),
        createRestaurant: builder.mutation<ApiResponse<Restaurant>, Partial<Restaurant>>({
            query: (data) => ({
                url: '/restaurants',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Restaurant'],
        }),
        updateRestaurant: builder.mutation<ApiResponse<Restaurant>, { id: string; data: Partial<Restaurant> }>({
            query: ({ id, data }) => ({
                url: `/restaurants/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Restaurant'],
        }),
        updateMyRestaurantSettings: builder.mutation<ApiResponse<Restaurant>, Partial<Restaurant>>({
            query: (data) => ({ url: '/restaurants/my-restaurant/settings', method: 'PUT', body: data }),
            invalidatesTags: ['Restaurant'],
        }),
        deleteRestaurant: builder.mutation<ApiResponse, string>({
            query: (id) => ({
                url: `/restaurants/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Restaurant'],
        }),
    }),
});

export const {
    useGetRestaurantsQuery,
    useGetRestaurantQuery,
    useGetMyRestaurantQuery,
    useGetRestaurantOrdersQuery,
    useGetRestaurantStatsQuery,
    useCreateRestaurantMutation,
    useUpdateRestaurantMutation,
    useUpdateMyRestaurantSettingsMutation,
    useDeleteRestaurantMutation,
} = restaurantApi;
