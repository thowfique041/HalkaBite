import{apiSlice}from'./apiSlice';import type{ApiResponse}from'../../types';
export interface AdminSettings{_id:string;appearance:{theme:'light'|'dark'|'system';primaryColor:'blue'|'purple'|'green'|'orange'|'red'};locale:{language:'en'|'bn';timezone:string;dateFormat:'DD/MM/YYYY'|'MM/DD/YYYY'|'YYYY-MM-DD';timeFormat:'12h'|'24h'};notifications:{push:boolean;email:boolean;system:boolean;orders:boolean;restaurants:boolean;complaints:boolean;userReports:boolean};security:{twoFactorEnabled:boolean};preferences:{autoRefreshSeconds:number;dashboardRefresh:boolean;defaultPage:'/admin'|'/admin/orders'|'/admin/restaurants'|'/admin/users';sidebarBehavior:'remember'|'expanded'|'collapsed';sidebarCollapsed:boolean;rememberLastMenu:boolean;lastMenu:string};accessibility:{fontSize:'small'|'medium'|'large';highContrast:boolean;reducedMotion:boolean}}
export interface AuthSession{_id:string;device:string;browser:string;ip:string;loginAt:string;lastActiveAt:string;expiresAt:string;isCurrent:boolean}
export const adminSettingsApi=apiSlice.injectEndpoints({endpoints:builder=>({
 getAdminSettings:builder.query<ApiResponse<AdminSettings>,void>({query:()=>'/admin/settings',providesTags:['AdminSettings']}),
 updateAdminSettings:builder.mutation<ApiResponse<AdminSettings>,Partial<AdminSettings>>({query:body=>({url:'/admin/settings',method:'PATCH',body}),invalidatesTags:['AdminSettings']}),
 exportAdminSettings:builder.query<string,void>({query:()=>({url:'/admin/settings/export',responseHandler:response=>response.text()}),keepUnusedDataFor:0}),
 getAuthSessions:builder.query<ApiResponse<AuthSession[]>,void>({query:()=>'/auth/sessions',providesTags:['AuthSession']}),
 revokeAuthSession:builder.mutation<ApiResponse<{loggedOutCurrent:boolean}>,string>({query:id=>({url:`/auth/sessions/${id}`,method:'DELETE'}),invalidatesTags:['AuthSession']}),
 revokeOtherSessions:builder.mutation<ApiResponse,void>({query:()=>({url:'/auth/sessions/others',method:'DELETE'}),invalidatesTags:['AuthSession']}),
 revokeAllSessions:builder.mutation<ApiResponse,void>({query:()=>({url:'/auth/sessions/all',method:'DELETE'}),invalidatesTags:['AuthSession']})
})});
export const{useGetAdminSettingsQuery,useUpdateAdminSettingsMutation,useLazyExportAdminSettingsQuery,useGetAuthSessionsQuery,useRevokeAuthSessionMutation,useRevokeOtherSessionsMutation,useRevokeAllSessionsMutation}=adminSettingsApi;
