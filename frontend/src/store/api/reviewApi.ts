import { apiSlice } from './apiSlice';
import type { ApiResponse, Review } from '../../types';

interface CreateReviewRequest {
  orderId: string;
  restaurantId?: string;
  foodItemId?: string;
  rating: number;
  comment: string;
  images?: string[];
}

export interface FoodReviewAnalytics {
  food: import('../../types').FoodItem;
  averageRating: number;
  totalReviews: number;
  totalRatingsCount: number;
  distribution: Record<number, number>;
  reviews: Review[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export const reviewApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createReview: builder.mutation<ApiResponse<Review>, CreateReviewRequest>({
      query: (data) => ({
        url: '/reviews',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Review', 'Restaurant', 'Food'],
    }),
    getRestaurantReviews: builder.query<ApiResponse<Review[]>, string>({
      query: (id) => `/reviews/restaurant/${id}`,
      providesTags: ['Review'],
    }),
    getFoodReviews: builder.query<ApiResponse<Review[]>, string>({
      query: (id) => `/reviews/food/${id}`,
      providesTags: ['Review'],
    }),
    getAllReviews: builder.query<ApiResponse<Review[]>, void>({
      query: () => '/reviews/admin/all',
      providesTags: ['Review'],
    }),
    getFoodReviewAnalytics: builder.query<ApiResponse<FoodReviewAnalytics>, { id: string; sort?: string; rating?: number; page?: number; limit?: number }>({
      query: ({ id, ...params }) => ({ url: `/reviews/restaurant/food/${id}/analytics`, params }),
      providesTags: (_result, _error, args) => [{ type: 'Review', id: args.id }],
    }),
  }),
});

export const {
  useCreateReviewMutation,
  useGetRestaurantReviewsQuery,
  useGetFoodReviewsQuery,
  useGetAllReviewsQuery,
  useGetFoodReviewAnalyticsQuery,
} = reviewApi;
