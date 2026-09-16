import { apiSlice } from './apiSlice';
import type { ApiResponse, User } from '../../types';

export interface AdminActiveSession {
  _id: string;
  user: Pick<User, '_id' | 'name' | 'email' | 'role' | 'avatar'>;
  device: string;
  browser: string;
  ip: string;
  loginAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface AuditLog {
  _id: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  success: boolean;
  ip: string;
  browser: string;
  device: string;
  durationMs: number;
  createdAt: string;
}

interface SessionResponse extends ApiResponse<AdminActiveSession[]> {
  summary: { totalActiveSessions: number; uniqueUsers: number; multipleDeviceUsers: number };
}
interface AuditResponse extends ApiResponse<AuditLog[]> {
  summary: { last24Hours: number; failedLast24Hours: number };
  pagination: { page: number; limit: number; total: number; pages: number };
}
export interface AuditFilters { page?: number; search?: string; method?: string; result?: string; role?: string }

export const adminSecurityApi = apiSlice.injectEndpoints({
  endpoints: builder => ({
    getAdminActiveSessions: builder.query<SessionResponse, void>({
      query: () => '/admin/security/sessions',
      providesTags: ['AuthSession']
    }),
    revokeAdminSession: builder.mutation<ApiResponse, string>({
      query: id => ({ url: `/admin/security/sessions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AuthSession']
    }),
    getAdminAuditLogs: builder.query<AuditResponse, AuditFilters>({
      query: params => ({ url: '/admin/security/audit-logs', params }),
      providesTags: ['AuditLog']
    })
  })
});

export const { useGetAdminActiveSessionsQuery, useRevokeAdminSessionMutation, useGetAdminAuditLogsQuery } = adminSecurityApi;
