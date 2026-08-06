import { apiSlice } from './apiSlice';
import type { Category, ApiResponse } from '../../types';

export const categoryApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getCategories: builder.query<ApiResponse<Category[]>, void>({
            query: () => '/categories',
            providesTags: ['Category'],
        }),
        createCategory: builder.mutation<ApiResponse<Category>, Pick<Category, 'name'> & Partial<Pick<Category, 'description' | 'image'>>>({
            query: (data) => ({
                url: '/categories',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Category'],
        }),
    }),
});

export const { useGetCategoriesQuery, useCreateCategoryMutation } = categoryApi;
