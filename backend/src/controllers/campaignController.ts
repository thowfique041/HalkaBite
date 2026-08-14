import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Campaign, CustomerNotification, FoodItem, Order, Restaurant, User } from '../models';
import { activateDueCampaigns, effectiveStatus, eligibleCustomersFor } from '../services/campaignService';
import { logRestaurantActivity } from '../services/restaurantActivityService';

const owned = (id: string) => Restaurant.findOne({ owner: id }).select('_id name');
export const createCampaign = async (req: AuthRequest, res: Response) => { try {
  const restaurant = await owned(req.user._id); if (!restaurant) return res.status(404).json({ success:false,message:'Restaurant not found' });
  const foodItems = await FoodItem.find({ _id: { $in: req.body.foodItems || [] }, restaurant: restaurant._id, isDeleted: { $ne: true } }).select('_id');
  if (!foodItems.length || foodItems.length !== (req.body.foodItems || []).length) return res.status(400).json({ success:false,message:'Select valid food items from your restaurant' });
  const eligibleCustomers = await eligibleCustomersFor(restaurant._id, req.body);
  if (req.body.targetType !== 'everyone' && !eligibleCustomers.length) return res.status(400).json({ success:false,message:'No eligible customers match this campaign' });
  const startAt = new Date(req.body.startAt); const endAt = new Date(req.body.endAt); if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime())) return res.status(400).json({success:false,message:'Valid start and end times are required'});
  const campaign = new Campaign({ ...req.body, restaurant: restaurant._id, eligibleCustomers, status: 'scheduled' });
  await campaign.save();
  await activateDueCampaigns();
  await logRestaurantActivity(restaurant._id.toString(), 'campaign_created', `Campaign created: ${campaign.name}.`, req.user._id.toString(), { campaignId: campaign._id.toString() });
  res.status(201).json({ success:true,message:'Campaign created successfully',data:campaign });
} catch(error:any){ res.status(500).json({success:false,message:error.message||'Failed to create campaign'}); } };

export const listMyCampaigns = async (req: AuthRequest,res:Response) => { try { await activateDueCampaigns(); const restaurant=await owned(req.user._id); if(!restaurant)return res.status(404).json({success:false,message:'Restaurant not found'}); const rows=await Campaign.find({restaurant:restaurant._id}).populate('foodItems','name image price').sort({createdAt:-1}).lean(); res.json({success:true,data:rows.map(row=>({...row,status:effectiveStatus(row),eligibleCount:row.targetType==='everyone'?'All':row.eligibleCustomers.length,remainingMs:Math.max(0,new Date(row.endAt).getTime()-Date.now()),conversionRate:row.metrics.views?row.metrics.redemptions/row.metrics.views*100:0}))}); }catch(error:any){res.status(500).json({success:false,message:error.message});} };
export const cancelCampaign = async(req:AuthRequest,res:Response)=>{ const restaurant=await owned(req.user._id); const campaign=await Campaign.findOneAndUpdate({_id:req.params.id,restaurant:restaurant?._id,status:{$ne:'expired'}},{status:'cancelled'},{new:true}); if(!campaign)return res.status(404).json({success:false,message:'Campaign not found'}); res.json({success:true,message:'Campaign cancelled',data:campaign}); };
export const campaignClick = async(req:AuthRequest,res:Response)=>{ const campaign=await Campaign.findByIdAndUpdate(req.params.id,{$inc:{'metrics.clicks':1}},{new:true}); if(!campaign)return res.status(404).json({success:false,message:'Campaign not found'}); res.json({success:true}); };
export const customerSearch = async(req:AuthRequest,res:Response)=>{ const restaurant=await owned(req.user._id); if(!restaurant)return res.status(404).json({success:false,message:'Restaurant not found'}); const search=String(req.query.search||''); const rows=await Order.aggregate([{ $match:{restaurant:restaurant._id}},{ $group:{_id:'$user',totalOrders:{$sum:1},totalSpending:{$sum:'$totalAmount'},lastOrderDate:{$max:'$createdAt'}}},{ $lookup:{from:'users',localField:'_id',foreignField:'_id',as:'user'}},{ $unwind:'$user'},{ $match:search?{$or:[{'user.name':{$regex:search,$options:'i'}},{'user.email':{$regex:search,$options:'i'}},{'user.phone':{$regex:search,$options:'i'}}]}:{}},{ $project:{_id:'$user._id',name:'$user.name',email:'$user.email',phone:'$user.phone',avatar:'$user.avatar',totalOrders:1,totalSpending:1,lastOrderDate:1}},{ $sort:{lastOrderDate:-1}},{ $limit:100}]); res.json({success:true,data:rows}); };
export const listAllCampaigns = async(_req:AuthRequest,res:Response)=>{ await activateDueCampaigns(); const campaigns=await Campaign.find().populate('restaurant','name image').populate('foodItems','name').sort({createdAt:-1}); const totals=await Campaign.aggregate([{$group:{_id:null,campaigns:{$sum:1},views:{$sum:'$metrics.views'},clicks:{$sum:'$metrics.clicks'},redemptions:{$sum:'$metrics.redemptions'},revenue:{$sum:'$metrics.revenueGenerated'}}}]); res.json({success:true,data:{campaigns,summary:totals[0]||{campaigns:0,views:0,clicks:0,redemptions:0,revenue:0}}}); };
export const getCustomerNotifications=async(req:AuthRequest,res:Response)=>{const filter={user:req.user._id,campaign:{$exists:true}};const notifications=await CustomerNotification.find(filter).sort({createdAt:-1}).limit(20);res.json({success:true,data:{notifications,unreadCount:await CustomerNotification.countDocuments({...filter,isRead:false})}});};
