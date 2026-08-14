import { apiSlice } from './apiSlice';
import type { User, Restaurant, ApiResponse, Order, FoodItem } from '../../types';

export interface AdminFeaturedFoodsData {
    foods: FoodItem[];
    featuredFoodId: string | null;
    pagination: { page: number; limit: number; total: number; pages: number };
}

export interface AdminRestaurantPerformance {
    restaurant: Restaurant & { owner: User; status: 'active'|'closed'|'temporarily_closed'|'suspended'; createdAt?: string };
    today: Record<string, number>;
    earnings: Record<string, number>;
    activity: Record<string, number>;
    health: Record<string, number>;
    charts: {
        daily: Array<{ _id: string; orders: number; revenue: number; completed: number; cancelled: number; customers: string[] }>;
        monthly: Array<{ _id: { year: number; month: number }; orders: number; revenue: number }>;
        hourly: Array<{ _id: number; orders: number }>;
        activeDaily: Array<{ _id: string; hours: number }>;
        activeMonthly: Array<{ _id: string; hours: number }>;
    };
    activities: Array<{ _id: string; type: string; message: string; occurredAt: string; actor?: { name: string } }>;
    recentOrders: Order[];
}

export interface AdminRestaurantListItem extends Restaurant {
    owner?: User;
    todayIncome: number;
    monthlyIncome: number;
    totalIncome: number;
    completedOrders: number;
    pendingOrders: number;
    cancelledOrders: number;
    activeStatus: 'active'|'closed'|'temporarily_closed'|'suspended';
    commissionSetting: { _id?:string; mode:CommissionMode; value:number; scope:CommissionScope };
    analyticsSummary: { totalOrders:number; grossRevenue:number; platformCommission:number; averageOrderValue:number };
}

export type CommissionMode = 'percentage'|'fixed'|'none';
export type CommissionScope = 'global'|'restaurant'|'category'|'city';
export interface CommissionSettingRecord { _id: string; mode: CommissionMode; value: number; scope: CommissionScope; restaurant?: Restaurant; category?: string; city?: string; reason: string; updatedAt: string; updatedBy?: User }
export interface CommissionManagementData {
    settings: CommissionSettingRecord[];
    history: Array<{ _id:string; scope:CommissionScope; target?:string; oldMode?:CommissionMode; oldValue?:number; newMode:CommissionMode; newValue:number; reason:string; createdAt:string; changedBy?:User }>;
    pagination: { page:number; limit:number; total:number; pages:number };
    analytics: { totalPlatformRevenue:number; todayCommission:number; monthlyCommission:number; topRevenue:Array<{restaurantId:string;name:string;gross:number;commission:number}>; lowestRevenue:Array<{restaurantId:string;name:string;gross:number;commission:number}>; highestCommission:Array<{restaurantId:string;name:string;gross:number;commission:number}> };
}
export interface RestaurantCommissionSummary {
    restaurant:{_id:string;restaurantId?:string;name:string}; totalOrders:number; totalOrderValue:number; eligibleSales:number;
    totalCommission:number; commissionPaid:number; commissionDue:number; restaurantEarnings:number;
    currentCommission:{mode:CommissionMode;value:number;scope:string};
}
export interface RestaurantCommissionOrder {
    _id:string; orderNumber:string; customer?:{_id:string;name:string}; orderDate:string; orderTotal:number; eligibleSales:number;
    commissionMode:CommissionMode; commissionValue:number; commissionAmount:number; restaurantEarnings:number; commissionPaymentStatus:'paid'|'partial'|'pending';
}
export type CommissionPaymentMethod='cash'|'bkash'|'nagad'|'rocket'|'bank_transfer'|'other';
export interface RestaurantCommissionPayment {
    _id:string;paymentId:string;restaurantId:string|Restaurant;amount:number;paymentMethod:CommissionPaymentMethod;referenceId?:string;paymentDate:string;
    status:'verified';previousDue:number;remainingDue:number;notes?:string;createdBy?:User;createdAt:string;
}
export interface RestaurantCommissionAnalytics { monthly:Array<{year:number;month:number;sales:number;commission:number;earnings:number;paid:number}>;paidVsDue:{paid:number;due:number} }

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
        deliveryChargesCollected:number;
        totalPaidToDeliveryMen:number;
        pendingDeliveryPayments:number;
        platformDeliveryMargin:number;
        averageDeliveriesPerDeliveryMan: number;
        topPerformers: DeliveryManAdminRecord[];
        recentlyActive: DeliveryManAdminRecord[];
    };
    deliveryMen: DeliveryManAdminRecord[];
}
export type DeliverySettlementStatus='pending'|'processing'|'paid'|'rejected'|'cancelled';
export interface DeliverySettlementRecord{_id:string;settlementId:string;deliveryMan:string;periodStart:string;periodEnd:string;orders:string[];totalDeliveries:number;totalEarnings:number;bonus:number;penalty:number;finalAmount:number;status:DeliverySettlementStatus;paymentMethod?:string;referenceNumber?:string;paymentDate?:string;notes?:string;createdAt:string;createdBy?:User;paidBy?:User}
export interface DeliveryFinancialData{deliveryMan:User;profile?:DeliveryManAdminRecord['profile'];performance:{totalDeliveries:number;completedDeliveries:number;cancelledDeliveries:number;failedDeliveries:number;averageDeliveryTime:number;totalDistance:number;customerRating:number;restaurantRating:number;performanceScore:number};wallet:{currentBalance:number;pendingEarnings:number;paidEarnings:number;totalEarnings:number};financial:{deliveryChargesCollected:number;totalEarnings:number;paid:number;pending:number;platformMargin:number};daily:Array<{_id:string;deliveries:number;earnings:number;averageMinutes:number}>;monthly:Array<{_id:{year:number;month:number};deliveries:number;earnings:number;averageMinutes:number}>;restaurants:Array<{restaurantId:string;name?:string;deliveries:number;earnings:number}>;settlements:DeliverySettlementRecord[]}
export interface DeliveryEarningSettingRecord{_id?:string;mode:'fixed'|'distance'|'percentage'|'hybrid';fixedAmount:number;baseDistanceKm:number;baseAmount:number;extraPerKm:number;percentage:number}

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
        getAdminRestaurant: builder.query<ApiResponse<AdminRestaurantPerformance>, string>({
            query: restaurantId => `/admin/restaurants/${restaurantId}`,
            providesTags: (_r,_e,id) => [{ type:'Restaurant', id }, 'Order', 'Review'],
        }),
        getAdminRestaurantAnalytics: builder.query<ApiResponse<AdminRestaurantPerformance>, string>({
            query: restaurantId => `/admin/restaurants/${restaurantId}/analytics`,
            providesTags: (_r,_e,id) => [{ type:'Restaurant', id }, 'Order', 'Review'],
        }),
        getAdminRestaurants: builder.query<ApiResponse<{restaurants:AdminRestaurantListItem[];pagination:{page:number;limit:number;total:number;pages:number}}>, {page?:number;limit?:number;search?:string}>({
            query: params => ({url:'/admin/restaurants',params}), providesTags:['Restaurant'],
        }),
        updateAdminRestaurantStatus: builder.mutation<ApiResponse<Restaurant>, { restaurantId:string; action:'activate'|'suspend'|'disable_ordering'|'enable_ordering'|'open'|'close' }>({
            query: ({restaurantId,action}) => ({ url:`/admin/restaurants/${restaurantId}/status`, method:'PATCH', body:{action} }),
            invalidatesTags: ['Restaurant','Order'],
        }),
        getCommission: builder.query<ApiResponse<CommissionManagementData>, {page?:number;limit?:number}>({
            query: params => ({url:'/admin/commission',params}), providesTags:['Order','Restaurant'],
        }),
        updateCommission: builder.mutation<ApiResponse<CommissionSettingRecord>, {mode:CommissionMode;value:number;reason:string}>({
            query: body => ({url:'/admin/commission',method:'PATCH',body}), invalidatesTags:['Order','Restaurant'],
        }),
        updateRestaurantCommission: builder.mutation<ApiResponse<CommissionSettingRecord>, {restaurantId:string;mode:CommissionMode;value:number;reason:string}>({
            query: ({restaurantId,...body}) => ({url:`/admin/restaurants/${restaurantId}/commission`,method:'PATCH',body}), invalidatesTags:['Order','Restaurant'],
        }),
        getRestaurantCommissionSummary: builder.query<ApiResponse<RestaurantCommissionSummary>, string>({
            query: restaurantId => `/admin/restaurants/${restaurantId}/commission/summary`,
            providesTags: (_r,_e,id) => [{type:'Restaurant',id},'Order'],
        }),
        getRestaurantCommissionOrders: builder.query<ApiResponse<{orders:RestaurantCommissionOrder[];pagination:{page:number;limit:number;total:number;pages:number}}>, {restaurantId:string;page?:number;limit?:number;status?:string;from?:string;to?:string}>({
            query: ({restaurantId,...params}) => ({url:`/admin/restaurants/${restaurantId}/commission/orders`,params}),
            providesTags:['Order'],
        }),
        getRestaurantCommissionPayments: builder.query<ApiResponse<{payments:RestaurantCommissionPayment[];pagination:{page:number;limit:number;total:number;pages:number}}>, {restaurantId:string;page?:number;limit?:number;status?:string;method?:string;from?:string;to?:string}>({
            query: ({restaurantId,...params}) => ({url:`/admin/restaurants/${restaurantId}/commission/payments`,params}),
            providesTags:['Order','Restaurant'],
        }),
        getRestaurantCommissionAnalytics: builder.query<ApiResponse<RestaurantCommissionAnalytics>, {restaurantId:string;from?:string;to?:string}>({
            query: ({restaurantId,...params}) => ({url:`/admin/restaurants/${restaurantId}/commission/analytics`,params}),
            providesTags:['Order','Restaurant'],
        }),
        recordRestaurantCommissionPayment: builder.mutation<ApiResponse<RestaurantCommissionPayment>, {restaurantId:string;amount:number;paymentMethod:CommissionPaymentMethod;referenceId?:string;paymentDate:string;notes?:string}>({
            query: ({restaurantId,...body}) => ({url:`/admin/restaurants/${restaurantId}/commission/payments`,method:'POST',body}),
            invalidatesTags:['Order','Restaurant'],
        }),
        saveScopedCommission: builder.mutation<ApiResponse<CommissionSettingRecord>, {mode:CommissionMode;value:number;scope:CommissionScope;restaurant?:string;category?:string;city?:string;reason:string}>({
            query: body => body.scope==='global'
                ? ({url:'/admin/commission',method:'PATCH',body})
                : body.scope==='restaurant' && body.restaurant
                    ? ({url:`/admin/restaurants/${body.restaurant}/commission`,method:'PATCH',body})
                    : ({url:'/admin/commission/scoped',method:'PATCH',body}),
            invalidatesTags:['Order','Restaurant'],
        }),
        deleteCommissionSetting: builder.mutation<ApiResponse<void>, string>({
            query: id => ({url:`/admin/commission/${id}`,method:'DELETE'}), invalidatesTags:['Order','Restaurant'],
        }),
        getAdminFeaturedFoods: builder.query<ApiResponse<AdminFeaturedFoodsData>, { search?: string; status?: 'all' | 'available' | 'unavailable'; page?: number; limit?: number }>({
            query: (params) => ({ url: '/admin/featured-food', params }),
            providesTags: ['Food'],
        }),
        setAdminFeaturedFood: builder.mutation<ApiResponse<FoodItem>, string>({
            query: (foodId) => ({ url: `/admin/featured-food/${foodId}`, method: 'PUT' }),
            invalidatesTags: ['Food'],
        }),
        clearAdminFeaturedFood: builder.mutation<ApiResponse<null>, void>({
            query: () => ({ url: '/admin/featured-food', method: 'DELETE' }),
            invalidatesTags: ['Food'],
        }),
        getDeliveryManagement: builder.query<ApiResponse<DeliveryManagementData>, { search?: string; status?: string; sort?: string }>({
            query: (params) => ({ url: '/admin/delivery-men', params }),
            providesTags: ['User', 'Order'],
        }),
        getDeliveryManDetails: builder.query<ApiResponse<DeliveryManAdminRecord>, string>({
            query: (id) => `/admin/delivery-men/${id}`,
            providesTags: ['User', 'Order'],
        }),
        getDeliveryFinancialAnalytics: builder.query<ApiResponse<DeliveryFinancialData>, string>({query:id=>`/admin/delivery-men/${id}/analytics`,providesTags:['User','Order']}),
        getDeliverySettlements: builder.query<ApiResponse<DeliverySettlementRecord[]>, string>({query:id=>`/admin/delivery-men/${id}/settlements`,providesTags:['User','Order']}),
        createDeliverySettlement: builder.mutation<ApiResponse<DeliverySettlementRecord>,{id:string;periodStart:string;periodEnd:string;bonus:number;penalty:number;reason:string}>({query:({id,...body})=>({url:`/admin/delivery-men/${id}/settlements`,method:'POST',body}),invalidatesTags:['User','Order']}),
        payDeliveryMan: builder.mutation<ApiResponse<DeliverySettlementRecord>,{id:string;settlementId:string;paymentMethod:string;referenceNumber?:string;paymentDate:string;notes?:string}>({query:({id,...body})=>({url:`/admin/delivery-men/${id}/pay`,method:'POST',body}),invalidatesTags:['User','Order']}),
        getDeliveryEarningSettings:builder.query<ApiResponse<DeliveryEarningSettingRecord>,void>({query:()=>'/admin/delivery-earning-settings',providesTags:['Order']}),
        updateDeliveryEarningSettings:builder.mutation<ApiResponse<DeliveryEarningSettingRecord>,DeliveryEarningSettingRecord>({query:body=>({url:'/admin/delivery-earning-settings',method:'PATCH',body}),invalidatesTags:['Order']}),
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
    useGetAdminRestaurantQuery,
    useGetAdminRestaurantAnalyticsQuery,
    useGetAdminRestaurantsQuery,
    useUpdateAdminRestaurantStatusMutation,
    useGetCommissionQuery,
    useUpdateCommissionMutation,
    useUpdateRestaurantCommissionMutation,
    useGetRestaurantCommissionSummaryQuery,
    useGetRestaurantCommissionOrdersQuery,
    useGetRestaurantCommissionPaymentsQuery,
    useGetRestaurantCommissionAnalyticsQuery,
    useRecordRestaurantCommissionPaymentMutation,
    useSaveScopedCommissionMutation,
    useDeleteCommissionSettingMutation,
    useGetAdminFeaturedFoodsQuery,
    useSetAdminFeaturedFoodMutation,
    useClearAdminFeaturedFoodMutation,
    useGetDeliveryManagementQuery,
    useGetDeliveryManDetailsQuery,
    useGetDeliveryFinancialAnalyticsQuery,
    useGetDeliverySettlementsQuery,
    useCreateDeliverySettlementMutation,
    usePayDeliveryManMutation,
    useGetDeliveryEarningSettingsQuery,
    useUpdateDeliveryEarningSettingsMutation,
    useGetUsersQuery,
    useDeleteUserMutation,
    useUpdateUserRoleMutation,
    useUpdateUserMutation,
    useConvertToRestaurantOwnerMutation,
    useApproveRestaurantMutation,
} = adminApi;
