import { apiSlice } from './apiSlice';
import type { User, Restaurant, ApiResponse, Order } from '../../types';

export interface DeliveryManAdminRecord {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    vehicleType: string;
    vehicleNumber: string;
    status: 'online' | 'offline' | 'busy';
    isOnline: boolean;
    assignedOrders: number;
    completedDeliveries: number;
    cancelledDeliveries: number;
    totalEarnings: number;
    todayEarnings: number;
    weeklyEarnings: number;
    monthlyEarnings: number;
    rating: number;
    reviewCount: number;
    lastActiveAt?: string | null;
    profile?: {
        licenseNumber?: string;
        nidNumber?: string;
        payoutMethod?: string;
        payoutAccount?: string;
        currentLocation?: { lat: number; lng: number; updatedAt: string };
    };
    orders: Order[];
}

export interface DeliveryManagementData {
    summary: {
        totalDeliveryMen: number;
        activeDeliveryMen: number;
        offlineDeliveryMen: number;
        busyDeliveryMen: number;
        availableDeliveryMen: number;
        totalDeliveries: number;
        totalDeliveryEarnings: number;
        averageDeliveriesPerDeliveryMan: number;
        topPerformers: DeliveryManAdminRecord[];
        recentlyActive: DeliveryManAdminRecord[];
    };
    deliveryMen: DeliveryManAdminRecord[];
}

export interface AdminDashboardStats {
    totalUsers: number;
    totalRestaurants: number;
    totalOrders: number;
    totalRevenue: number;
    recentActivity: Array<{
        _id: string;
        orderNumber: string;
        totalAmount: number;
        orderStatus: string;
        createdAt: string;
        user?: { _id: string; name: string };
        restaurant?: { _id: string; name: string };
    }>;
    popularRestaurants: Array<{
        _id: string;
        name: string;
        image?: string;
        orderCount: number;
        revenue: number;
    }>;
}

export const adminApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getAdminStats: builder.query<ApiResponse<AdminDashboardStats>, void>({
            query: () => '/admin/stats',
            providesTags: ['User', 'Restaurant', 'Order'],
        }),
        getDeliveryManagement: builder.query<ApiResponse<DeliveryManagementData>, { search?: string; status?: string; sort?: string }>({
            query: (params) => ({ url: '/admin/delivery-men', params }),
            providesTags: ['User', 'Order'],
        }),
        getDeliveryManDetails: builder.query<ApiResponse<DeliveryManAdminRecord>, string>({
            query: (id) => `/admin/delivery-men/${id}`,
            providesTags: ['User', 'Order'],
        }),
        getUsers: builder.query<ApiResponse<User[]>, void>({
            query: () => '/users',
            providesTags: ['User'],
        }),
        deleteUser: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                url: `/users/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['User', 'Restaurant', 'Food'],
        }),
        updateUserRole: builder.mutation<ApiResponse<User>, { id: string; role: string }>({
            query: ({ id, role }) => ({
                url: `/users/${id}`,
                method: 'PUT',
                body: { role },
            }),
            invalidatesTags: ['User', 'Restaurant', 'Food'],
        }),
        updateUser: builder.mutation<ApiResponse<User>, { id: string; data: Pick<User, 'role'> }>({
            query: ({ id, data }) => ({
                url: `/users/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['User', 'Restaurant', 'Food'],
        }),
        convertToRestaurantOwner: builder.mutation<ApiResponse<{ user: User; restaurant: Restaurant }>, string>({
            query: (id) => ({
                url: `/users/${id}/make-restaurant-owner`,
                method: 'PUT',
            }),
            invalidatesTags: ['User', 'Restaurant'],
        }),
        // Re-using restaurant endpoints but adding specific admin ones if needed
        approveRestaurant: builder.mutation<Restaurant, string>({
            query: (id) => ({
                url: `/restaurants/${id}/toggle`,
                method: 'PUT',
            }),
            invalidatesTags: ['Restaurant'],
        }),
    }),
});

export const {
    useGetAdminStatsQuery,
    useGetDeliveryManagementQuery,
    useGetDeliveryManDetailsQuery,
    useGetUsersQuery,
    useDeleteUserMutation,
    useUpdateUserRoleMutation,
    useUpdateUserMutation,
    useConvertToRestaurantOwnerMutation,
    useApproveRestaurantMutation,
} = adminApi;
