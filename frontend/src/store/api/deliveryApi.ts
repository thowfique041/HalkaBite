import { apiSlice } from './apiSlice';
import type { ApiResponse, Order } from '../../types';

export interface DeliveryProfile {
  _id: string;
  isOnline: boolean;
  rating: number;
  reviewCount: number;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  nidNumber?: string;
  payoutMethod?: 'bkash' | 'nagad' | 'bank';
  payoutAccount?: string;
  currentLocation?: { lat: number; lng: number; updatedAt: string };
  bonus: number;
  incentives: number;
}

export interface DeliveryDashboardData {
  profile: DeliveryProfile;
  activeOrder: Order | null;
  availableCount: number;
  todayOrders: number;
  earnings: { today: number; weekly: number; monthly: number; bonus: number; incentives: number };
  wallet:{currentBalance:number;pendingEarnings:number;paidEarnings:number;totalEarnings:number};
  settlements:Array<{_id:string;settlementId:string;periodStart:string;periodEnd:string;totalDeliveries:number;totalEarnings:number;bonus:number;penalty:number;finalAmount:number;status:'pending'|'processing'|'paid'|'rejected'|'cancelled';paymentMethod?:string;referenceNumber?:string;paymentDate?:string;createdAt:string}>;
  earningSetting:{mode:'fixed'|'distance'|'percentage'|'hybrid';fixedAmount:number;baseDistanceKm:number;baseAmount:number;extraPerKm:number;percentage:number};
  history: Order[];
  reviews: Array<{ _id: string; comment: string; rating: number }>;
}

export const deliveryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDeliveryDashboard: builder.query<ApiResponse<DeliveryDashboardData>, void>({
      query: () => '/delivery/dashboard',
      providesTags: ['Order', 'User'],
    }),
    getAvailableDeliveryOrders: builder.query<ApiResponse<Order[]>, void>({
      query: () => '/delivery/orders/available',
      providesTags: ['Order'],
    }),
    toggleDeliveryOnline: builder.mutation<ApiResponse<DeliveryProfile>, boolean>({
      query: (isOnline) => ({ url: '/delivery/online', method: 'PUT', body: { isOnline } }),
      invalidatesTags: ['User'],
    }),
    acceptDeliveryOrder: builder.mutation<ApiResponse<Order>, string>({
      query: (id) => ({ url: `/delivery/orders/${id}/accept`, method: 'POST' }),
      invalidatesTags: ['Order'],
    }),
    rejectDeliveryOrder: builder.mutation<ApiResponse<void>, string>({
      query: (id) => ({ url: `/delivery/orders/${id}/reject`, method: 'POST' }),
      invalidatesTags: ['Order'],
    }),
    updateDeliveryStatus: builder.mutation<ApiResponse<Order>, { id: string; status: string }>({
      query: ({ id, status }) => ({ url: `/delivery/orders/${id}/status`, method: 'PUT', body: { status } }),
      invalidatesTags: ['Order'],
    }),
    updateDeliveryProfile: builder.mutation<ApiResponse<DeliveryProfile>, Partial<DeliveryProfile>>({
      query: (data) => ({ url: '/delivery/profile', method: 'PUT', body: data }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetDeliveryDashboardQuery,
  useGetAvailableDeliveryOrdersQuery,
  useToggleDeliveryOnlineMutation,
  useAcceptDeliveryOrderMutation,
  useRejectDeliveryOrderMutation,
  useUpdateDeliveryStatusMutation,
  useUpdateDeliveryProfileMutation,
} = deliveryApi;
