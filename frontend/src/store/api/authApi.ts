import { apiSlice } from './apiSlice';
import type { User, FoodItem, ApiResponse } from '../../types';
import { setUser } from '../slices/authSlice';

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<AuthResponse>, LoginRequest>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<ApiResponse<AuthResponse>, RegisterRequest>({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    logout: builder.mutation<ApiResponse, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    getMe: builder.query<ApiResponse<User>, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation<ApiResponse<User>, Partial<User>>({
      query: (data) => ({
        url: '/auth/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
      async onQueryStarted(_data, { dispatch, queryFulfilled }) {
        try { const { data } = await queryFulfilled; if (data.data) dispatch(setUser(data.data)); } catch { /* rendered by the caller */ }
      },
    }),
    googleLogin: builder.mutation<ApiResponse<AuthResponse>, { credential: string }>({
      query: body => ({ url: '/auth/google', method: 'POST', body }),
    }),
    getFavorites: builder.query<ApiResponse<FoodItem[]>, void>({
      query: () => '/auth/favorites',
      providesTags: ['User'],
    }),
    toggleFavorite: builder.mutation<ApiResponse<{ favoriteItems: string[]; isFavorite: boolean }>, string>({
      query: foodId => ({ url: `/auth/favorites/${foodId}`, method: 'POST' }),
      invalidatesTags: ['User'],
      async onQueryStarted(_foodId, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setUser({ ...(await dispatch(authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true })).unwrap()).data!, favoriteItems: data.data?.favoriteItems || [] }));
        } catch { /* rendered by the caller */ }
      },
    }),
    uploadProfileAvatar: builder.mutation<ApiResponse<User>, FormData>({
      query: body => ({ url: '/auth/profile/avatar', method: 'POST', body }),
      invalidatesTags: ['User'],
      async onQueryStarted(_data, { dispatch, queryFulfilled }) {
        try { const { data } = await queryFulfilled; if (data.data) dispatch(setUser(data.data)); } catch { /* rendered by the caller */ }
      },
    }),
    removeProfileAvatar: builder.mutation<ApiResponse<User>, void>({
      query: () => ({ url: '/auth/profile/avatar', method: 'DELETE' }),
      invalidatesTags: ['User'],
      async onQueryStarted(_data, { dispatch, queryFulfilled }) {
        try { const { data } = await queryFulfilled; if (data.data) dispatch(setUser(data.data)); } catch { /* rendered by the caller */ }
      },
    }),
    updatePassword: builder.mutation<ApiResponse, { currentPassword: string; newPassword: string }>({
      query: (data) => ({
        url: '/auth/password',
        method: 'PUT',
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGoogleLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  useGetFavoritesQuery,
  useToggleFavoriteMutation,
  useUpdateProfileMutation,
  useUploadProfileAvatarMutation,
  useRemoveProfileAvatarMutation,
  useUpdatePasswordMutation,
} = authApi;
