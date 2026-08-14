import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { BlockedCustomer, Conversation, Message, Order, Restaurant } from '../models';
import chatEmitter, { customerChatChannel, publishChatEvent, restaurantChatChannel } from '../services/chatEventService';
import { openSseStream } from '../utils/sse';

const clean=(value:unknown,max:number)=>typeof value==='string'?value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').trim().slice(0,max):'';
const ownedRestaurant=(owner:any)=>Restaurant.findOne({owner}).select('_id name image');
const orderForCustomer=(customer:any,restaurant:any,orderId?:string)=>Order.findOne({
  user:customer,restaurant,...(orderId&&mongoose.isValidObjectId(orderId)?{_id:orderId}:{})
}).sort({createdAt:-1});

const accessConversation=async(req:AuthRequest,id:string)=>{
  if(!mongoose.isValidObjectId(id)) return null;
  const conversation=await Conversation.findById(id);
  if(!conversation)return null;
  if(req.user.role==='user'&&conversation.customerId.toString()===req.user._id.toString())return conversation;
  if(req.user.role==='restaurant'){
    const restaurant=await ownedRestaurant(req.user._id);
    if(restaurant&&conversation.restaurantId.toString()===restaurant._id.toString())return conversation;
  }
  return null;
};

export const getChatEligibility=async(req:AuthRequest,res:Response)=>{
  if(!mongoose.isValidObjectId(req.params.restaurantId))return res.status(400).json({success:false,message:'Invalid restaurant'});
  const order=await orderForCustomer(req.user._id,req.params.restaurantId);
  const blocked=order?await BlockedCustomer.exists({restaurantId:req.params.restaurantId,customerId:req.user._id}):false;
  return res.json({success:true,data:{eligible:Boolean(order),blocked:Boolean(blocked),orderId:order?._id,message:!order?'You can chat with this restaurant after placing your first order.':blocked?'You can no longer send messages to this restaurant.':''}});
};

export const startConversation=async(req:AuthRequest,res:Response)=>{
  let restaurantId:any,customerId:any,order:any;
  if(req.user.role==='restaurant'){
    if(!mongoose.isValidObjectId(req.body.orderId))return res.status(400).json({success:false,message:'A valid order is required'});
    const restaurant=await ownedRestaurant(req.user._id);
    if(!restaurant)return res.status(404).json({success:false,message:'Restaurant not found'});
    order=await Order.findOne({_id:req.body.orderId,restaurant:restaurant._id});
    if(!order)return res.status(404).json({success:false,message:'Order not found or does not belong to your restaurant'});
    restaurantId=restaurant._id;customerId=order.user;
  }else{
    restaurantId=req.body.restaurantId;
    if(!mongoose.isValidObjectId(restaurantId))return res.status(400).json({success:false,message:'Invalid restaurant'});
    const restaurant=await Restaurant.findOne({_id:restaurantId,isActive:true});
    if(!restaurant)return res.status(404).json({success:false,message:'Restaurant not found'});
    order=await orderForCustomer(req.user._id,restaurantId,req.body.orderId);
    if(!order)return res.status(403).json({success:false,message:'You can chat with this restaurant after placing your first order.'});
    customerId=req.user._id;
    if(await BlockedCustomer.exists({restaurantId,customerId}))return res.status(403).json({success:false,message:'You can no longer send messages to this restaurant.'});
  }
  const conversation=await Conversation.findOneAndUpdate(
    {customerId,restaurantId},
    {$set:{orderId:order._id},$setOnInsert:{conversationId:`CHAT-${new mongoose.Types.ObjectId().toString().toUpperCase()}`}},
    {upsert:true,new:true,runValidators:true}
  );
  return res.status(201).json({success:true,data:conversation});
};

export const getConversations=async(req:AuthRequest,res:Response)=>{
  const filter:any={};
  if(req.user.role==='user')filter.customerId=req.user._id;
  else{
    const restaurant=await ownedRestaurant(req.user._id);
    if(!restaurant)return res.status(404).json({success:false,message:'Restaurant not found'});
    filter.restaurantId=restaurant._id;
  }
  const conversations=await Conversation.find(filter).sort({lastMessageAt:-1,updatedAt:-1})
    .populate('customerId','name email avatar').populate('restaurantId','name image restaurantId')
    .populate('orderId','orderNumber orderStatus deliveryStatus totalAmount createdAt').lean();
  const restaurantIds=conversations.map((c:any)=>c.restaurantId?._id).filter(Boolean);
  const customerIds=conversations.map((c:any)=>c.customerId?._id).filter(Boolean);
  const blocks=await BlockedCustomer.find({restaurantId:{$in:restaurantIds},customerId:{$in:customerIds}}).select('restaurantId customerId').lean();
  const blocked=new Set(blocks.map(b=>`${b.restaurantId}:${b.customerId}`));
  return res.json({success:true,data:conversations.map((c:any)=>({...c,isBlocked:blocked.has(`${c.restaurantId?._id}:${c.customerId?._id}`)}))});
};

export const getMessages=async(req:AuthRequest,res:Response)=>{
  const conversation=await accessConversation(req,req.params.id);
  if(!conversation)return res.status(403).json({success:false,message:'Conversation not found or access denied'});
  const limit=Math.min(Math.max(Number(req.query.limit)||30,1),50);const query:any={conversationId:conversation._id};
  if(req.query.before&&mongoose.isValidObjectId(String(req.query.before))){const cursor=await Message.findById(req.query.before).select('createdAt');if(cursor)query.createdAt={$lt:cursor.createdAt};}
  const messages=await Message.find(query).sort({createdAt:-1}).limit(limit+1).populate('replyTo','message messageType imageUrl senderRole').lean();
  const hasMore=messages.length>limit;if(hasMore)messages.pop();
  return res.json({success:true,data:{messages:messages.reverse(),hasMore,nextCursor:hasMore?messages[0]?._id:null}});
};

export const sendMessage=async(req:AuthRequest,res:Response)=>{
  const conversation=await accessConversation(req,req.params.id);
  if(!conversation)return res.status(403).json({success:false,message:'Conversation not found or access denied'});
  const text=clean(req.body.message,2000),imageUrl=clean(req.body.imageUrl,1000);
  if(!text&&!imageUrl)return res.status(400).json({success:false,message:'Message cannot be empty'});
  const blocked=await BlockedCustomer.exists({restaurantId:conversation.restaurantId,customerId:conversation.customerId});
  if(blocked)return res.status(403).json({success:false,message:'Messaging is disabled for this conversation'});
  const replyTo=mongoose.isValidObjectId(req.body.replyTo)&&await Message.exists({_id:req.body.replyTo,conversationId:conversation._id})?req.body.replyTo:undefined;
  const message=await Message.create({conversationId:conversation._id,senderId:req.user._id,senderRole:req.user.role,message:text,messageType:imageUrl?'image':'text',imageUrl:imageUrl||undefined,replyTo});
  const recipientUnread=req.user.role==='user'?'restaurantUnread':'customerUnread';
  await Conversation.updateOne({_id:conversation._id},{$set:{lastMessage:text||'📷 Image',lastMessageAt:message.createdAt},$inc:{[recipientUnread]:1}});
  const populated=await Message.findById(message._id).populate('replyTo','message messageType imageUrl senderRole').lean();
  publishChatEvent(conversation.customerId.toString(),conversation.restaurantId.toString(),{type:'message',conversationId:conversation._id,message:populated,notification:req.user.role==='user'?'New Message from Customer':'New Message from Restaurant'});
  return res.status(201).json({success:true,data:populated});
};

export const markConversationRead=async(req:AuthRequest,res:Response)=>{
  const conversation=await accessConversation(req,req.params.id);
  if(!conversation)return res.status(403).json({success:false,message:'Conversation not found or access denied'});
  const otherRole=req.user.role==='user'?'restaurant':'user',now=new Date();
  await Promise.all([Message.updateMany({conversationId:conversation._id,senderRole:otherRole,isRead:false},{$set:{isRead:true,readAt:now}}),Conversation.updateOne({_id:conversation._id},{$set:{[req.user.role==='user'?'customerUnread':'restaurantUnread']:0}})]);
  publishChatEvent(conversation.customerId.toString(),conversation.restaurantId.toString(),{type:'read',conversationId:conversation._id,readerRole:req.user.role,readAt:now});
  return res.json({success:true});
};

export const setCustomerBlocked=async(req:AuthRequest,res:Response)=>{
  const conversation=await accessConversation(req,req.params.id);
  if(!conversation||req.user.role!=='restaurant')return res.status(403).json({success:false,message:'Access denied'});
  const shouldBlock=Boolean(req.body.blocked);
  if(shouldBlock)await BlockedCustomer.findOneAndUpdate({restaurantId:conversation.restaurantId,customerId:conversation.customerId},{$set:{blockedBy:req.user._id,blockedAt:new Date(),reason:clean(req.body.reason,500)}},{upsert:true,new:true});
  else await BlockedCustomer.deleteOne({restaurantId:conversation.restaurantId,customerId:conversation.customerId});
  publishChatEvent(conversation.customerId.toString(),conversation.restaurantId.toString(),{type:'block',conversationId:conversation._id,blocked:shouldBlock});
  return res.json({success:true,message:shouldBlock?'Customer blocked':'Customer unblocked'});
};

export const sendTyping=async(req:AuthRequest,res:Response)=>{
  const conversation=await accessConversation(req,req.params.id);if(!conversation)return res.status(403).json({success:false,message:'Access denied'});
  publishChatEvent(conversation.customerId.toString(),conversation.restaurantId.toString(),{type:'typing',conversationId:conversation._id,senderRole:req.user.role,isTyping:Boolean(req.body.isTyping)});return res.json({success:true});
};

export const streamChatEvents=async(req:AuthRequest,res:Response)=>{
  let channel:string;
  if(req.user.role==='user')channel=customerChatChannel(req.user._id.toString());
  else{const restaurant=await ownedRestaurant(req.user._id);if(!restaurant)return res.status(404).end();channel=restaurantChatChannel(restaurant._id.toString());}
  const stream=openSseStream(req,res);const send=(event:any)=>stream.send(event);chatEmitter.on(channel,send);
  stream.send({type:'connected'});stream.onClose(()=>chatEmitter.off(channel,send));
};
