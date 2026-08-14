import { apiSlice } from './apiSlice';
import type { FoodItem, Category, ApiResponse } from '../../types';
import { uniqueById } from '../../utils/uniqueById';

interface FoodFilters {
  category?: string;
  restaurant?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  isVegetarian?: boolean;
  isSpicy?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

interface FoodResponse {
  foodItems: FoodItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const foodApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFeaturedFood: builder.query<ApiResponse<FoodItem | null>, void>({
      query: () => '/foods/featured',
      providesTags: ['Food'],
    }),
    getFoodItems: builder.query<ApiResponse<FoodResponse>, FoodFilters>({
      query: (filters) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) params.append(key, String(value));
        });
        return `/food?${params.toString()}`;
      },
      transformResponse: (response: ApiResponse<FoodResponse>) => ({ ...response, data: response.data ? { ...response.data, foodItems: uniqueById(response.data.foodItems) } : response.data }),
      providesTags: ['Food'],
    }),
    getMyMenuItems: builder.query<ApiResponse<FoodResponse>, void>({
      query: () => '/food/manage/mine',
      transformResponse: (response: ApiResponse<FoodResponse>) => ({ ...response, data: response.data ? { ...response.data, foodItems: uniqueById(response.data.foodItems) } : response.data }),
      providesTags: ['Food'],
    }),
    getFoodItem: builder.query<ApiResponse<FoodItem>, string>({
      query: (id) => `/food/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Food', id }],
    }),
    getFoodByCategory: builder.query<ApiResponse<{ category: Category; foodItems: FoodItem[] }>, string>({
      query: (slug) => `/food/category/${slug}`,
    }),
    createFoodItem: builder.mutation<ApiResponse<FoodItem>, Partial<FoodItem>>({
      query: (data) => ({
        url: '/food',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Food'],
    }),
    updateFoodItem: builder.mutation<ApiResponse<FoodItem>, { id: string; data: Partial<FoodItem> }>({
      query: ({ id, data }) => ({
        url: `/food/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Food'],
    }),
    deleteFoodItem: builder.mutation<ApiResponse, string>({
      query: (id) => ({
        url: `/food/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Food'],
    }),
  }),
});

export const {
  useGetFeaturedFoodQuery,
  useGetFoodItemsQuery,
  useGetMyMenuItemsQuery,
  useGetFoodItemQuery,
  useGetFoodByCategoryQuery,
  useCreateFoodItemMutation,
  useUpdateFoodItemMutation,
  useDeleteFoodItemMutation,
} = foodApi;
