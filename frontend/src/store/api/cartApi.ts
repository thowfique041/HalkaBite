import { apiSlice } from './apiSlice';
import type { Cart, ApiResponse } from '../../types';

interface CartResponse {
  cart: Cart;
  subtotal: number;
  itemCount: number;
}

interface AddToCartRequest {
  foodItemId: string;
  quantity?: number;
  specialInstructions?: string;
}

export const cartApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCart: builder.query<ApiResponse<CartResponse>, void>({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation<ApiResponse<Cart>, AddToCartRequest>({
      query: (data) => ({
        url: '/cart/items',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation<ApiResponse<Cart>, { foodItemId: string; quantity: number }>({
      query: ({ foodItemId, quantity }) => ({
        url: `/cart/items/${foodItemId}`,
        method: 'PUT',
        body: { quantity },
      }),
      invalidatesTags: ['Cart'],
    }),
    removeFromCart: builder.mutation<ApiResponse, string>({
      query: (foodItemId) => ({
        url: `/cart/items/${foodItemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
    clearCart: builder.mutation<ApiResponse, void>({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
} = cartApi;
