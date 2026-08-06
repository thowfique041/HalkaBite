import { apiSlice } from './apiSlice';
import type { User, ApiResponse } from '../../types';

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
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
  useUpdatePasswordMutation,
} = authApi;
