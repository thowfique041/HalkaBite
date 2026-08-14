import { apiSlice } from './apiSlice';
export interface ChatParty{_id:string;name:string;email?:string;avatar?:string;image?:string;restaurantId?:string}
export interface ChatOrder{_id:string;orderNumber:string;orderStatus:string;deliveryStatus?:string;totalAmount:number;createdAt:string}
export interface Conversation{_id:string;conversationId:string;customerId:ChatParty;restaurantId:ChatParty;orderId:ChatOrder;lastMessage?:string;lastMessageAt?:string;customerUnread:number;restaurantUnread:number;isBlocked:boolean}
export interface ChatMessage{_id:string;conversationId:string;senderId:string;senderRole:'user'|'restaurant';message:string;messageType:'text'|'image';imageUrl?:string;replyTo?:Partial<ChatMessage>;deliveredAt:string;readAt?:string;isRead:boolean;createdAt:string}
export const chatApi=apiSlice.injectEndpoints({endpoints:b=>({
 getChatEligibility:b.query<any,string>({query:id=>`/chat/eligibility/${id}`}),
 getConversations:b.query<{success:boolean;data:Conversation[]},void>({query:()=>'/chat/conversations',providesTags:['Chat' as any]}),
 startConversation:b.mutation<any,{restaurantId?:string;orderId?:string}>({query:body=>({url:'/chat/conversations',method:'POST',body}),invalidatesTags:['Chat' as any]}),
 getMessages:b.query<{success:boolean;data:{messages:ChatMessage[];hasMore:boolean;nextCursor?:string}},{id:string;before?:string}>({query:({id,before})=>({url:`/chat/conversations/${id}/messages`,params:{limit:30,...(before&&{before})}})}),
 sendChatMessage:b.mutation<any,{id:string;message?:string;imageUrl?:string;replyTo?:string}>({query:({id,...body})=>({url:`/chat/conversations/${id}/messages`,method:'POST',body})}),
 markChatRead:b.mutation<any,string>({query:id=>({url:`/chat/conversations/${id}/read`,method:'PATCH'})}),
 setChatBlocked:b.mutation<any,{id:string;blocked:boolean;reason?:string}>({query:({id,...body})=>({url:`/chat/conversations/${id}/block`,method:'PATCH',body})}),
 sendTyping:b.mutation<any,{id:string;isTyping:boolean}>({query:({id,...body})=>({url:`/chat/conversations/${id}/typing`,method:'POST',body})})
})});
export const{useGetChatEligibilityQuery,useGetConversationsQuery,useStartConversationMutation,useLazyGetMessagesQuery,useSendChatMessageMutation,useMarkChatReadMutation,useSetChatBlockedMutation,useSendTypingMutation}=chatApi;
