import { apiSlice } from './apiSlice'; import type { ApiResponse, FoodItem } from '../../types';
export interface Campaign { _id:string; name:string; promotionLabel:string; description:string; discountType:'percentage'|'fixed';discountValue:number;foodItems:FoodItem[];startAt:string;endAt:string;targetType:'everyone'|'selected'|'eligibility';status:'active'|'scheduled'|'expired'|'cancelled';eligibleCount:number|'All';remainingMs:number;metrics:{views:number;clicks:number;redemptions:number;revenueGenerated:number};conversionRate:number }
export interface CampaignCustomer {_id:string;name:string;email:string;phone?:string;avatar?:string;lastOrderDate:string;totalOrders:number;totalSpending:number}
export const campaignApi=apiSlice.injectEndpoints({endpoints:b=>({
 getCampaigns:b.query<ApiResponse<Campaign[]>,void>({query:()=>'/campaigns',providesTags:['Campaign' as any]}),
 createCampaign:b.mutation<ApiResponse<Campaign>,any>({query:body=>({url:'/campaigns',method:'POST',body}),invalidatesTags:['Food','Campaign' as any]}),
 cancelCampaign:b.mutation<ApiResponse<Campaign>,string>({query:id=>({url:`/campaigns/${id}/cancel`,method:'PATCH'}),invalidatesTags:['Food','Campaign' as any]}),
 getCampaignCustomers:b.query<ApiResponse<CampaignCustomer[]>,string>({query:search=>({url:'/campaigns/customers',params:{search}})}),
 getAllCampaignsAdmin:b.query<ApiResponse<any>,void>({query:()=>'/campaigns/admin/all'}),
 getCustomerCampaignNotifications:b.query<ApiResponse<any>,void>({query:()=>'/campaigns/customer-notifications'}),
 trackCampaignClick:b.mutation<ApiResponse,string>({query:id=>({url:`/campaigns/${id}/click`,method:'POST'})})
})});
export const {useGetCampaignsQuery,useCreateCampaignMutation,useCancelCampaignMutation,useGetCampaignCustomersQuery,useGetAllCampaignsAdminQuery,useGetCustomerCampaignNotificationsQuery,useTrackCampaignClickMutation}=campaignApi;
