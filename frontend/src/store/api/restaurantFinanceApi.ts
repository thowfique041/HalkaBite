import { apiSlice } from './apiSlice';
import type { ApiResponse } from '../../types';

export interface FoodPerformance { _id: string; name: string; image: string; isDeleted?: boolean; totalOrders: number; totalRevenue: number; rating: number; reviewCount: number }
export interface RestaurantAnalytics {
  revenue: { total: number; today: number; weekly: number; monthly: number; trends: { today: number; weekly: number; monthly: number } };
  orders: Record<string, number>; menu: { total: number; available: number; outOfStock: number }; reviews: { total: number; average: number };
  highlights: Record<'bestSelling' | 'mostReviewed' | 'highestRated', { _id: string; name: string; image: string; isDeleted?: boolean; rating: number; reviewCount: number } | null>;
  charts: { dailySales: Array<{ _id: string; revenue: number; orders: number }>; monthlyRevenue: Array<{ _id: { year: number; month: number }; revenue: number }>; orderStatus: Record<string, number>; topSelling: Array<{ name: string; value: number }>; topRated: Array<{ name: string; value: number }> };
  foodPerformance: { rows: FoodPerformance[]; pagination: { page: number; limit: number; total: number; pages: number } };
}
export interface EarningTransaction { _id: string; orderNumber: string; customerName?: string; foodTotal: number; deliveryFee: number; commission: number; restaurantEarnings: number; paymentMethod: string; paymentStatus: string; date: string }
export interface RestaurantEarnings { commissionRate: number; summary: { today: number; weekly: number; monthly: number; total: number; totalCommission: number; netEarnings: number; withdrawableBalance: number; remainingBalance: number; trends: { today: number; weekly: number; monthly: number } }; transactions: EarningTransaction[]; pagination: { page: number; limit: number; total: number; pages: number } }

export const restaurantFinanceApi = apiSlice.injectEndpoints({ endpoints: builder => ({
  getOwnerAnalytics: builder.query<ApiResponse<RestaurantAnalytics>, { page?: number; limit?: number; search?: string; sortBy?: string; sortOrder?: string }>({ query: params => ({ url: '/restaurants/owner/analytics', params }), providesTags: ['Order', 'Food', 'Review'] }),
  getOwnerEarnings: builder.query<ApiResponse<RestaurantEarnings>, { page?: number; limit?: number; search?: string; from?: string; to?: string; sortOrder?: string; export?: boolean }>({ query: params => ({ url: '/restaurants/owner/earnings', params }), providesTags: ['Order'] })
}) });
export const { useGetOwnerAnalyticsQuery, useGetOwnerEarningsQuery, useLazyGetOwnerEarningsQuery } = restaurantFinanceApi;
