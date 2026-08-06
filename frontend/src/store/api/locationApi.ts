import { apiSlice } from './apiSlice'; import type { ApiResponse } from '../../types';
export interface LocationResult { displayName:string;restaurantAddress:string;area:string;city:string;district:string;division:string;postalCode:string;country:string;countryCode:string;latitude:number;longitude:number }
export const locationApi=apiSlice.injectEndpoints({endpoints:builder=>({
 searchLocations:builder.query<ApiResponse<LocationResult[]>,string>({query:q=>({url:'/location/search',params:{q}})}),
 reverseLocation:builder.mutation<ApiResponse<LocationResult>,{lat:number;lng:number}>({query:params=>({url:'/location/reverse',method:'GET',params})})
})});
export const{useLazySearchLocationsQuery,useReverseLocationMutation}=locationApi;
