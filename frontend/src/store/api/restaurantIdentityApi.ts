import { apiSlice } from './apiSlice';

export type NameChangeStatus = 'pending' | 'approved' | 'rejected';
export interface NameChangeRequest {
  _id: string; restaurantId: string; oldName: string; requestedName: string; approvedName?: string;
  requestedBy: string | { _id: string; name: string; email: string };
  approvedBy?: string | { _id: string; name: string; email: string };
  reason: string; status: NameChangeStatus; requestedAt: string; approvalDate?: string;
}

export const restaurantIdentityApi = apiSlice.injectEndpoints({ endpoints: builder => ({
  verifyRestaurantPassword: builder.mutation<{success:boolean;message:string},{password:string}>({
    query: body => ({ url: '/restaurant-name-change-requests/verify-password', method: 'POST', body })
  }),
  getMyNameChangeRequests: builder.query<{success:boolean;data:{restaurantId:string;currentName:string;requests:NameChangeRequest[]}},void>({
    query: () => '/restaurant-name-change-requests/mine', providesTags: ['NameChange']
  }),
  submitNameChangeRequest: builder.mutation<any,{password:string;requestedName:string;reason:string}>({
    query: body => ({ url: '/restaurant-name-change-requests', method: 'POST', body }), invalidatesTags: ['NameChange','Notification']
  }),
  getNameChangeRequests: builder.query<{success:boolean;data:NameChangeRequest[]},NameChangeStatus|''>({
    query: status => ({ url: '/restaurant-name-change-requests', params: status ? { status } : undefined }), providesTags: ['NameChange']
  }),
  decideNameChangeRequest: builder.mutation<any,{id:string;status:'approved'|'rejected'}>({
    query: ({id,status}) => ({ url: `/restaurant-name-change-requests/${id}/decision`, method: 'PATCH', body: { status } }),
    invalidatesTags: ['NameChange','Restaurant','Notification']
  })
})});

export const { useVerifyRestaurantPasswordMutation, useGetMyNameChangeRequestsQuery, useSubmitNameChangeRequestMutation, useGetNameChangeRequestsQuery, useDecideNameChangeRequestMutation } = restaurantIdentityApi;
