import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { CommissionHistory, CommissionSetting, Order, Restaurant, RestaurantActivityLog, RestaurantStatusHistory, Review } from '../models';
import { changeRestaurantStatus } from '../services/restaurantActivityService';
import { upsertCommissionSetting } from '../services/commissionService';

const dayStart = (value = new Date()) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const dateKey = (expression: any) => ({ $dateToString: { format: '%Y-%m-%d', date: expression } });
export const getAdminRestaurantPerformance = async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.restaurantId)) return res.status(400).json({ success: false, message: 'Invalid restaurant ID' });
    const restaurant = await Restaurant.findById(req.params.restaurantId).populate('owner', 'name email phone avatar').lean();
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    const now = new Date(); const today = dayStart(now); const thirtyDays = new Date(today); thirtyDays.setDate(thirtyDays.getDate() - 29);
    const twelveMonths = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const id = restaurant._id;

    const [todayOrders, lifetime, daily, monthly, hourly, reviewsToday, activity, statusHistory, recent] = await Promise.all([
      Order.aggregate([{ $match: { restaurant: id, createdAt: { $gte: today } } }, { $group: { _id: '$orderStatus', count: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ['$orderStatus','delivered'] }, '$totalAmount', 0] } }, customers: { $addToSet: '$user' } } }]),
      Order.aggregate([{ $match: { restaurant: id } }, { $group: { _id: null, orders: { $sum: 1 }, delivered: { $sum: { $cond: [{ $eq: ['$orderStatus','delivered'] },1,0] } }, cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus','cancelled'] },1,0] } }, refunded: { $sum: { $cond: [{ $eq: ['$paymentStatus','refunded'] },1,0] } }, gross: { $sum: { $cond: [{ $eq: ['$orderStatus','delivered'] }, { $subtract: ['$totalAmount','$deliveryFee'] },0] } }, commission: { $sum: { $cond: [{ $eq: ['$orderStatus','delivered'] }, { $ifNull: ['$platformCommission',{ $multiply: [{ $subtract: ['$totalAmount','$deliveryFee'] },0.05] }] },0] } }, net: { $sum: { $cond: [{ $eq: ['$orderStatus','delivered'] }, { $ifNull: ['$restaurantEarnings',{ $multiply: [{ $subtract: ['$totalAmount','$deliveryFee'] },0.95] }] },0] } }, customers: { $addToSet: '$user' }, avgPreparationMinutes: { $avg: { $cond: [{ $and: ['$pickupTime','$createdAt'] }, { $divide: [{ $subtract: ['$pickupTime','$createdAt'] },60000] },null] } }, avgDeliveryMinutes: { $avg: { $cond: [{ $and: ['$actualDeliveryTime','$pickupTime'] }, { $divide: [{ $subtract: ['$actualDeliveryTime','$pickupTime'] },60000] },null] } } } }]),
      Order.aggregate([{ $match: { restaurant: id, createdAt: { $gte: thirtyDays } } }, { $group: { _id: dateKey('$createdAt'), orders: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ['$orderStatus','delivered'] },'$totalAmount',0] } }, completed: { $sum: { $cond: [{ $eq: ['$orderStatus','delivered'] },1,0] } }, cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus','cancelled'] },1,0] } }, customers: { $addToSet: '$user' } } }, { $sort: { _id: 1 } }]),
      Order.aggregate([{ $match: { restaurant: id, createdAt: { $gte: twelveMonths } } }, { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, revenue: { $sum: { $cond: [{ $eq: ['$orderStatus','delivered'] },'$totalAmount',0] } }, orders: { $sum: 1 } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]),
      Order.aggregate([{ $match: { restaurant: id } }, { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Review.aggregate([{ $match: { restaurant: id, createdAt: { $gte: today } } }, { $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$rating' } } }]),
      RestaurantActivityLog.find({ restaurant: id }).sort({ occurredAt: -1 }).limit(50).populate('actor','name').lean(),
      RestaurantStatusHistory.find({ restaurant: id }).sort({ startedAt: 1 }).lean(),
      Order.find({ restaurant: id }).sort({ createdAt: -1 }).limit(8).select('orderNumber orderStatus totalAmount createdAt').populate('user','name').lean()
    ]);
    const statuses: Record<string,number> = { pending:0, confirmed:0, preparing:0, ready:0, out_for_delivery:0, delivered:0, cancelled:0 };
    let todayRevenue=0; const customerSet=new Set<string>();
    todayOrders.forEach(row => { statuses[row._id]=row.count; todayRevenue += row.revenue || 0; row.customers.forEach((x:any)=>customerSet.add(String(x))); });
    const life = lifetime[0] || { orders:0, delivered:0, cancelled:0, refunded:0, gross:0, commission:0, net:0, customers:[], avgPreparationMinutes:0, avgDeliveryMinutes:0 };
    const durationByDay = new Map<string,number>(); let lifetimeMinutes=0;
    statusHistory.filter(row => ['online','open','active'].includes(row.status)).forEach(row => { const end=row.endedAt || now; const minutes=Math.max(0,(end.getTime()-row.startedAt.getTime())/60000); lifetimeMinutes+=minutes; const key=row.startedAt.toISOString().slice(0,10); durationByDay.set(key,(durationByDay.get(key)||0)+minutes); });
    const activeToday=durationByDay.get(today.toISOString().slice(0,10))||0; const yesterday=new Date(today); yesterday.setDate(yesterday.getDate()-1);
    const weekStart=new Date(today); weekStart.setDate(weekStart.getDate()-6); const monthStart=new Date(today.getFullYear(),today.getMonth(),1);
    const sumSince=(start:Date)=>statusHistory.filter(x=>x.startedAt>=start&&['online','open','active'].includes(x.status)).reduce((sum,x)=>sum+Math.max(0,((x.endedAt||now).getTime()-x.startedAt.getTime())/60000),0);
    const totalToday=todayOrders.reduce((s,x)=>s+x.count,0); const review=reviewsToday[0]||{count:0,average:0};
    todayOrders.push({ _id:'refunded', count:await Order.countDocuments({ restaurant:id, paymentStatus:'refunded', updatedAt:{ $gte:today } }), revenue:0, customers:[] } as any);
    const status = !restaurant.isActive ? 'suspended' : !restaurant.acceptingOrders ? 'temporarily_closed' : restaurant.isOpen ? 'active' : 'closed';
    const lastStatus = statusHistory.length > 0 ? statusHistory[statusHistory.length - 1] : null;
    const currentOnlineDuration = lastStatus && !lastStatus.endedAt
      ? Math.max(0, (now.getTime() - lastStatus.startedAt.getTime()) / 60000)
      : 0;
    res.setHeader('Cache-Control','no-store');
    return res.json({ success:true, data:{ restaurant:{...restaurant,status}, today:{ revenue:todayRevenue, orders:totalToday, completed:statuses.delivered, pending:statuses.pending, preparing:statuses.preparing, outForDelivery:statuses.out_for_delivery, delivered:statuses.delivered, cancelled:statuses.cancelled, refunded:todayOrders.filter(x=>x._id==='refunded').reduce((s,x)=>s+x.count,0), averageOrderValue:statuses.delivered?todayRevenue/statuses.delivered:0, newCustomers:customerSet.size, reviews:review.count, averageRating:review.average||0 }, earnings:{ grossRevenue:life.gross, platformCommission:life.commission, netEarnings:life.net, withdrawnAmount:0, pendingBalance:life.net, lifetimeRevenue:life.gross, lifetimeOrders:life.orders }, activity:{ currentOnlineDuration, today:activeToday, yesterday:durationByDay.get(yesterday.toISOString().slice(0,10))||0, week:sumSince(weekStart), month:sumSince(monthStart), lifetime:lifetimeMinutes }, health:{ averagePreparationTime:life.avgPreparationMinutes||0, averageDeliveryTime:life.avgDeliveryMinutes||0, acceptanceRate:life.orders?(life.orders-statuses.cancelled)/life.orders*100:0, cancellationRate:life.orders?life.cancelled/life.orders*100:0, completionRate:life.orders?life.delivered/life.orders*100:0, lateDeliveryPercent:0, customerSatisfaction:(restaurant.rating||0)*20, averageRating:restaurant.rating||0, reviewCount:restaurant.reviewCount||0 }, charts:{ daily, monthly, hourly, activeDaily:Array.from(durationByDay.entries()).slice(-30).map(([_id,minutes])=>({_id,hours:minutes/60})), activeMonthly:Object.entries(statusHistory.filter(x=>['online','open','active'].includes(x.status)).reduce((acc:any,x)=>{const key=x.startedAt.toISOString().slice(0,7);acc[key]=(acc[key]||0)+Math.max(0,((x.endedAt||now).getTime()-x.startedAt.getTime())/3600000);return acc;},{})).map(([_id,hours])=>({_id,hours})) }, activities:activity, recentOrders:recent } });
  } catch(error:any){ return res.status(500).json({success:false,message:error.message||'Failed to load restaurant performance'}); }
};

export const getAdminRestaurantDirectory=async(req:AuthRequest,res:Response)=>{try{
  const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Math.max(1,Number(req.query.limit)||20)),search=String(req.query.search||'').trim();
  const query:any=search?{$or:[{name:{$regex:search,$options:'i'}},{restaurantId:{$regex:search,$options:'i'}},{email:{$regex:search,$options:'i'}}]}:{};
  const [restaurants,total,financialRows,rules]=await Promise.all([
    Restaurant.find(query).populate('owner','name email phone').sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean(),
    Restaurant.countDocuments(query),
    Order.aggregate([{ $group:{ _id:'$restaurant',
      todayIncome:{ $sum:{ $cond:[{ $and:[{ $eq:['$orderStatus','delivered']},{ $gte:['$actualDeliveryTime',dayStart()] }]},{ $ifNull:['$restaurantEarnings',{ $multiply:[{ $subtract:['$totalAmount','$deliveryFee'] },0.95] }] },0] } },
      monthlyIncome:{ $sum:{ $cond:[{ $and:[{ $eq:['$orderStatus','delivered']},{ $gte:['$actualDeliveryTime',new Date(new Date().getFullYear(),new Date().getMonth(),1)] }]},{ $ifNull:['$restaurantEarnings',{ $multiply:[{ $subtract:['$totalAmount','$deliveryFee'] },0.95] }] },0] } },
      totalIncome:{ $sum:{ $cond:[{ $eq:['$orderStatus','delivered']},{ $ifNull:['$restaurantEarnings',{ $multiply:[{ $subtract:['$totalAmount','$deliveryFee'] },0.95] }] },0] } },
      completedOrders:{ $sum:{ $cond:[{ $eq:['$orderStatus','delivered']},1,0] } }, pendingOrders:{ $sum:{ $cond:[{ $in:['$orderStatus',['pending','confirmed','preparing','ready','out_for_delivery']]},1,0] } }, cancelledOrders:{ $sum:{ $cond:[{ $eq:['$orderStatus','cancelled']},1,0] } }, totalOrders:{ $sum:1 }, grossRevenue:{ $sum:{ $cond:[{ $eq:['$orderStatus','delivered']},{ $subtract:['$totalAmount','$deliveryFee'] },0] } }, platformCommission:{ $sum:{ $cond:[{ $eq:['$orderStatus','delivered']},{ $ifNull:['$platformCommission',{ $multiply:[{ $subtract:['$totalAmount','$deliveryFee'] },0.05] }] },0] } }
    } }]),
    CommissionSetting.find({isActive:true}).lean()
  ]);
  const financialMap=new Map(financialRows.map(row=>[String(row._id),row])); const globalRule=rules.find(rule=>rule.scope==='global');
  const rows=restaurants.map(restaurant=>{const analytics=financialMap.get(String(restaurant._id))||{todayIncome:0,monthlyIncome:0,totalIncome:0,completedOrders:0,pendingOrders:0,cancelledOrders:0,totalOrders:0,grossRevenue:0,platformCommission:0};const commissionSetting=rules.find(rule=>rule.scope==='restaurant'&&String(rule.restaurant)===String(restaurant._id))||rules.find(rule=>rule.scope==='city'&&rule.city?.toLowerCase()===restaurant.address.city.toLowerCase())||rules.find(rule=>rule.scope==='category'&&restaurant.cuisine.includes(rule.category||''))||globalRule||{mode:'percentage',value:5,scope:'global'};return {...restaurant,todayIncome:analytics.todayIncome,monthlyIncome:analytics.monthlyIncome,totalIncome:analytics.totalIncome,completedOrders:analytics.completedOrders,pendingOrders:analytics.pendingOrders,cancelledOrders:analytics.cancelledOrders,activeStatus:!restaurant.isActive?'suspended':!restaurant.acceptingOrders?'temporarily_closed':restaurant.isOpen?'active':'closed',commissionSetting,analyticsSummary:{totalOrders:analytics.totalOrders,grossRevenue:analytics.grossRevenue,platformCommission:analytics.platformCommission,averageOrderValue:analytics.completedOrders?analytics.grossRevenue/analytics.completedOrders:0}};});
  return res.json({success:true,data:{restaurants:rows,pagination:{page,limit,total,pages:Math.ceil(total/limit)}}});
}catch(error:any){return res.status(500).json({success:false,message:error.message||'Failed to load admin restaurants'});}};

export const getAdminRestaurantDetails = getAdminRestaurantPerformance;
export const getAdminRestaurantAnalytics = getAdminRestaurantPerformance;

export const updateGlobalCommission=async(req:AuthRequest,res:Response)=>{try{const setting=await upsertCommissionSetting({mode:req.body.mode,value:Number(req.body.value||0),scope:'global',reason:String(req.body.reason||''),adminId:req.user._id.toString()});return res.json({success:true,message:'Global commission updated',data:setting});}catch(error:any){return res.status(400).json({success:false,message:error.message});}};
export const updateRestaurantCommission=async(req:AuthRequest,res:Response)=>{try{if(!await Restaurant.exists({_id:req.params.restaurantId}))return res.status(404).json({success:false,message:'Restaurant not found'});const setting=await upsertCommissionSetting({mode:req.body.mode,value:Number(req.body.value||0),scope:'restaurant',restaurant:req.params.restaurantId,reason:String(req.body.reason||''),adminId:req.user._id.toString()});return res.json({success:true,message:'Restaurant commission updated',data:setting});}catch(error:any){return res.status(400).json({success:false,message:error.message});}};

export const updateAdminRestaurantOperationalStatus = async (req: AuthRequest,res:Response) => {
  try { const action=String(req.body.action); if(!['activate','suspend','disable_ordering','enable_ordering','open','close'].includes(action)) return res.status(400).json({success:false,message:'Invalid status action'});
    const updates:any={}; let status:any='active';
    if(action==='activate'){updates.isActive=true;status='active';} if(action==='suspend'){updates.isActive=false;updates.acceptingOrders=false;status='suspended';}
    if(action==='disable_ordering'){updates.acceptingOrders=false;status='temporarily_closed';} if(action==='enable_ordering'){updates.acceptingOrders=true;status='active';}
    if(action==='open'){updates.isOpen=true;status='open';} if(action==='close'){updates.isOpen=false;status='closed';}
    const restaurant=await Restaurant.findByIdAndUpdate(req.params.restaurantId,{$set:updates},{new:true,runValidators:true}); if(!restaurant)return res.status(404).json({success:false,message:'Restaurant not found'});
    await changeRestaurantStatus(restaurant._id.toString(),status,req.user._id.toString()); return res.json({success:true,message:'Restaurant status updated',data:restaurant});
  }catch(error:any){return res.status(500).json({success:false,message:error.message||'Status update failed'});}
};

export const getCommissionManagement = async (req:AuthRequest,res:Response)=>{ try{
  const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Math.max(1,Number(req.query.limit)||20));
  const [settings,history,totalHistory,analytics]=await Promise.all([
    CommissionSetting.find({isActive:true}).populate('restaurant','name restaurantId').populate('updatedBy','name').sort({scope:1,updatedAt:-1}).lean(),
    CommissionHistory.find().populate('changedBy','name').sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean(), CommissionHistory.countDocuments(),
    Order.aggregate([{ $match:{orderStatus:'delivered'}},{ $addFields:{foodTotal:{$subtract:['$totalAmount','$deliveryFee']},commissionAmount:{$ifNull:['$platformCommission',{$multiply:[{$subtract:['$totalAmount','$deliveryFee']},0.05]}]}}},{ $group:{_id:'$restaurant',gross:{$sum:'$foodTotal'},commission:{$sum:'$commissionAmount'},today:{$sum:{$cond:[{$gte:['$actualDeliveryTime',dayStart()]},'$commissionAmount',0]}},monthly:{$sum:{$cond:[{$gte:['$actualDeliveryTime',new Date(new Date().getFullYear(),new Date().getMonth(),1)]},'$commissionAmount',0]}}}},{ $lookup:{from:'restaurants',localField:'_id',foreignField:'_id',as:'restaurant'}},{ $unwind:{path:'$restaurant',preserveNullAndEmptyArrays:true}},{ $project:{restaurantId:'$_id',name:'$restaurant.name',gross:1,commission:1,today:1,monthly:1}}])
  ]);
  const totalCommission=analytics.reduce((s,x)=>s+x.commission,0),todayCommission=analytics.reduce((s,x)=>s+x.today,0),monthlyCommission=analytics.reduce((s,x)=>s+x.monthly,0);
  const displaySettings=settings.some(setting=>setting.scope==='global')?settings:[{_id:'default-global',scope:'global',mode:'percentage',value:5,reason:'Platform default',isActive:true},...settings];
  return res.json({success:true,data:{settings:displaySettings,history,pagination:{page,limit,total:totalHistory,pages:Math.ceil(totalHistory/limit)},analytics:{totalPlatformRevenue:totalCommission,todayCommission,monthlyCommission,topRevenue:[...analytics].sort((a,b)=>b.gross-a.gross).slice(0,5),lowestRevenue:[...analytics].filter(x=>x.gross>0).sort((a,b)=>a.gross-b.gross).slice(0,5),highestCommission:[...analytics].sort((a,b)=>b.commission-a.commission).slice(0,5)}}});
}catch(error:any){return res.status(500).json({success:false,message:error.message||'Failed to load commission management'});} };

export const saveCommissionSetting=async(req:AuthRequest,res:Response)=>{try{const setting=await upsertCommissionSetting({...req.body,value:Number(req.body.value||0),adminId:req.user._id.toString()});return res.status(200).json({success:true,message:'Commission setting saved',data:setting});}catch(error:any){return res.status(400).json({success:false,message:error.message});}};
export const deleteCommissionSetting=async(req:AuthRequest,res:Response)=>{try{const setting=await CommissionSetting.findOne({_id:req.params.settingId,isActive:true});if(!setting)return res.status(404).json({success:false,message:'Commission setting not found'});if(setting.scope==='global')return res.status(409).json({success:false,message:'Global commission cannot be removed'});setting.isActive=false;await setting.save();await CommissionHistory.create({setting:setting._id,scope:setting.scope,target:String(setting.restaurant||setting.category||setting.city||''),oldMode:setting.mode,oldValue:setting.value,newMode:'percentage',newValue:5,changedBy:req.user._id,reason:'Override removed'});return res.json({success:true,message:'Commission override removed'});}catch(error:any){return res.status(500).json({success:false,message:error.message});}};
