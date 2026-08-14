import { EventEmitter } from 'events';
const emitter = new EventEmitter();
emitter.setMaxListeners(2000);
export const customerChatChannel=(id:string)=>`chat:customer:${id}`;
export const restaurantChatChannel=(id:string)=>`chat:restaurant:${id}`;
export const publishChatEvent=(customerId:string,restaurantId:string,event:any)=>{
  emitter.emit(customerChatChannel(customerId),event);
  emitter.emit(restaurantChatChannel(restaurantId),event);
};
export default emitter;
