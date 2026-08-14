import { EventEmitter } from 'events';
import mongoose from 'mongoose';
import { CustomerNotification, CustomerNotificationType, IOrderDocument, Order } from '../models';
const emitter=new EventEmitter();emitter.setMaxListeners(2000);
export const customerOrderNotificationChannel=(id:string)=>`customer-order-notification:${id}`;
const content:Record<string,{type:CustomerNotificationType;title:string;message:string}>={
 pending:{type:'ORDER_PLACED',title:'Order Placed',message:'Your order has been placed successfully.'},
 confirmed:{type:'ORDER_ACCEPTED',title:'Order Accepted',message:'Your order has been accepted by the restaurant.'},
 preparing:{type:'ORDER_PREPARING',title:'Order Preparing',message:'The restaurant has started preparing your food.'},
 ready:{type:'ORDER_READY',title:'Ready for Pickup',message:'Your order is ready for pickup.'},
 picked_up:{type:'ORDER_PICKED_UP',title:'Order Picked Up',message:'The delivery partner has picked up your order.'},
 on_the_way:{type:'OUT_FOR_DELIVERY',title:'Out for Delivery',message:'Your order is on the way.'},
 out_for_delivery:{type:'OUT_FOR_DELIVERY',title:'Out for Delivery',message:'Your order is on the way.'},
 delivered:{type:'ORDER_DELIVERED',title:'Order Delivered',message:'Your order has been delivered. Enjoy your meal!'},
 cancelled:{type:'ORDER_CANCELLED',title:'Order Cancelled',message:'Your order has been cancelled.'}
};
export const createCustomerOrderNotification=async(orderOrId:any,status:string)=>{
 const config=content[status];if(!config)return null;
 const order=typeof orderOrId==='string'?await Order.findById(orderOrId):orderOrId;if(!order)return null;
 const restaurantId=(order.restaurant as any)?._id||order.restaurant,customerId=(order.user as any)?._id||order.user;
 if(await CustomerNotification.exists({orderId:order._id,type:config.type}))return null;
 try{
  const created=await CustomerNotification.create({notificationId:`CN-${new mongoose.Types.ObjectId().toString().toUpperCase()}`,user:customerId,customerId,orderId:order._id,restaurantId,title:config.title,message:config.message,type:config.type,orderStatus:status,isRead:false});
  const notification=await CustomerNotification.findById(created._id).populate('restaurantId','name image').populate('orderId','orderNumber orderStatus deliveryStatus');
  if(notification)emitter.emit(customerOrderNotificationChannel(customerId.toString()),notification.toObject());return notification;
 }catch(error:any){if(error?.code===11000)return null;throw error;}
};
export const createCustomerPaymentNotification=async(orderOrId:IOrderDocument|string,verified:boolean,rejectionReason?:string)=>{
 const order=typeof orderOrId==='string'?await Order.findById(orderOrId):orderOrId;if(!order)return null;
 const restaurantId=order.restaurant,customerId=order.user;
 const type:CustomerNotificationType=verified?'PAYMENT_VERIFIED':'PAYMENT_REJECTED';
 const message=verified?`Your payment for order #${order.orderNumber} has been verified. Your order is confirmed.`:`Your payment for order #${order.orderNumber} could not be verified.${rejectionReason?` Reason: ${rejectionReason}`:''}`;
 try{const created=await CustomerNotification.create({notificationId:`CN-${new mongoose.Types.ObjectId().toString().toUpperCase()}`,user:customerId,customerId,orderId:order._id,restaurantId,title:verified?'Payment Verified':'Payment Rejected',message,type,orderStatus:order.orderStatus,isRead:false});const notification=await CustomerNotification.findById(created._id).populate('restaurantId','name image').populate('orderId','orderNumber orderStatus deliveryStatus');if(notification)emitter.emit(customerOrderNotificationChannel(customerId.toString()),notification.toObject());return notification}catch(error:any){if(error?.code===11000)return null;throw error}
};
export default emitter;
