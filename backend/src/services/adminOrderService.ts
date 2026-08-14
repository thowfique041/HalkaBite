import mongoose from 'mongoose';
import { aggregateAdminOrders } from '../repositories/adminOrderRepository';

const STATUS_MAP: Record<string, string> = { accepted: 'confirmed' };
const PAYMENT_METHOD_MAP: Record<string, string[]> = {
  cash_on_delivery: ['cod'], cod: ['cod'], mobile_banking: ['bkash','nagad','rocket'],
  card: ['card'], wallet: ['wallet']
};
const SORTS: Record<string, Record<string, 1|-1>> = {
  createdAt_desc:{createdAt:-1}, createdAt_asc:{createdAt:1}, amount_desc:{totalAmount:-1}, amount_asc:{totalAmount:1},
  commission_desc:{effectiveCommission:-1}, commission_asc:{effectiveCommission:1}, deliveryTime_desc:{deliveryMinutes:-1},
  deliveryTime_asc:{deliveryMinutes:1}, preparationTime_desc:{preparationMinutes:-1}, preparationTime_asc:{preparationMinutes:1}
};
const escapeRegex=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const startOfDay=(date=new Date())=>new Date(date.getFullYear(),date.getMonth(),date.getDate());
const parseDateRange=(preset:string,from?:string,to?:string)=>{
  const now=new Date(),today=startOfDay(now); let start:Date|undefined,end:Date|undefined;
  if(preset==='today'){start=today;end=now;} else if(preset==='yesterday'){start=new Date(today);start.setDate(start.getDate()-1);end=new Date(today.getTime()-1);}
  else if(preset==='last7'){start=new Date(today);start.setDate(start.getDate()-6);end=now;} else if(preset==='last30'){start=new Date(today);start.setDate(start.getDate()-29);end=now;}
  else if(preset==='thisMonth'){start=new Date(now.getFullYear(),now.getMonth(),1);end=now;} else if(preset==='previousMonth'){start=new Date(now.getFullYear(),now.getMonth()-1,1);end=new Date(now.getFullYear(),now.getMonth(),1);end.setMilliseconds(-1);}
  else if(preset==='thisYear'){start=new Date(now.getFullYear(),0,1);end=now;}
  if(from){const parsed=new Date(`${from}T00:00:00`);if(Number.isFinite(parsed.getTime()))start=parsed;}
  if(to){const parsed=new Date(`${to}T23:59:59.999`);if(Number.isFinite(parsed.getTime()))end=parsed;}
  return {start,end};
};
const number=(value:unknown)=>{const parsed=Number(value);return Number.isFinite(parsed)?parsed:undefined;};

export interface AdminOrderQuery { [key:string]: unknown; }
export const queryAdminOrders=async(params:AdminOrderQuery)=>{
  const page=Math.max(1,number(params.page)||1),requestedLimit=number(params.limit)||25,limit=[10,25,50,100].includes(requestedLimit)?requestedLimit:25;
  const exporting=params.export==='true',effectiveLimit=exporting?10000:limit;
  const baseMatch:Record<string,unknown>={}; const status=String(params.status||'all');
  if(status!=='all'){if(status==='refunded')baseMatch.paymentStatus='refunded';else baseMatch.orderStatus=STATUS_MAP[status]||status;}
  const paymentStatus=String(params.paymentStatus||'all'); if(paymentStatus!=='all')baseMatch.paymentStatus=paymentStatus==='unpaid'?'pending':paymentStatus;
  const method=String(params.paymentMethod||'all'); if(method!=='all')baseMatch.paymentMethod={$in:PAYMENT_METHOD_MAP[method]||[method]};
  const minAmount=number(params.minAmount),maxAmount=number(params.maxAmount);if(minAmount!==undefined||maxAmount!==undefined)baseMatch.totalAmount={...(minAmount!==undefined&&{$gte:minAmount}),...(maxAmount!==undefined&&{$lte:maxAmount})};
  const {start,end}=parseDateRange(String(params.datePreset||''),typeof params.from==='string'?params.from:undefined,typeof params.to==='string'?params.to:undefined);if(start||end)baseMatch.createdAt={...(start&&{$gte:start}),...(end&&{$lte:end})};
  const preLookup:Record<string,unknown>[]=[{$match:baseMatch},{$addFields:{effectiveCommission:{$ifNull:['$platformCommission',{$multiply:[{$subtract:['$totalAmount','$deliveryFee']},0.05]}]},commissionPercent:{$cond:[{$eq:['$commissionMode','percentage']},{$ifNull:['$commissionValue',5]},null]},preparationMinutes:{$cond:[{$and:['$pickupTime','$createdAt']},{$divide:[{$subtract:['$pickupTime','$createdAt']},60000]},null]},deliveryMinutes:{$cond:[{$and:['$actualDeliveryTime','$pickupTime']},{$divide:[{$subtract:['$actualDeliveryTime','$pickupTime']},60000]},null]}}}];
  const minCommission=number(params.minCommission),maxCommission=number(params.maxCommission),commissionPercent=number(params.commissionPercent);const computedMatch:Record<string,unknown>={};
  if(minCommission!==undefined||maxCommission!==undefined)computedMatch.effectiveCommission={...(minCommission!==undefined&&{$gte:minCommission}),...(maxCommission!==undefined&&{$lte:maxCommission})};if(commissionPercent!==undefined)computedMatch.commissionPercent=commissionPercent;
  const startTime=typeof params.startTime==='string'?params.startTime:'',endTime=typeof params.endTime==='string'?params.endTime:'';
  const minutes=(value:string)=>/^\d{2}:\d{2}$/.test(value)?Number(value.slice(0,2))*60+Number(value.slice(3)):undefined;const startMinutes=minutes(startTime),endMinutes=minutes(endTime);
  if(startMinutes!==undefined||endMinutes!==undefined)computedMatch.$expr={$let:{vars:{minuteOfDay:{$add:[{$multiply:[{$hour:{date:'$createdAt',timezone:'Asia/Dhaka'}},60]},{$minute:{date:'$createdAt',timezone:'Asia/Dhaka'}}]}},in:{$and:[...(startMinutes!==undefined?[{$gte:['$$minuteOfDay',startMinutes]}]:[]),...(endMinutes!==undefined?[{$lte:['$$minuteOfDay',endMinutes]}]:[])]}}};
  if(Object.keys(computedMatch).length)preLookup.push({$match:computedMatch});
  const lookups:Record<string,unknown>[]=[
    {$lookup:{from:'users',localField:'user',foreignField:'_id',as:'customerDocument'}},{$unwind:{path:'$customerDocument',preserveNullAndEmptyArrays:true}},
    {$lookup:{from:'restaurants',localField:'restaurant',foreignField:'_id',as:'restaurantDocument'}},{$unwind:{path:'$restaurantDocument',preserveNullAndEmptyArrays:true}},
    {$lookup:{from:'users',localField:'deliveryPerson',foreignField:'_id',as:'riderDocument'}},{$unwind:{path:'$riderDocument',preserveNullAndEmptyArrays:true}}
  ];
  const relationConditions:Record<string,unknown>[]=[];
  const relation=(field:string,value:unknown,paths:string[])=>{if(typeof value!=='string'||!value.trim())return;const term=value.trim();if(mongoose.isValidObjectId(term))relationConditions.push({$or:[{[field]:new mongoose.Types.ObjectId(term)},...paths.map(path=>({[path]:{$regex:`^${escapeRegex(term)}$`,$options:'i'}}))]});else relationConditions.push({$or:paths.map(path=>({[path]:{$regex:escapeRegex(term),$options:'i'}}))});};
  relation('restaurant',params.restaurant,['restaurantDocument.restaurantId','restaurantDocument.name']);relation('user',params.customer,['customerDocument.name','customerDocument.email','customerDocument.phone']);relation('deliveryPerson',params.rider,['riderDocument.name','riderDocument.email','riderDocument.phone']);
  const search=typeof params.search==='string'?params.search.trim():'';if(search){const regex={$regex:escapeRegex(search),$options:'i'};relationConditions.push({$or:[{orderNumber:regex},{transactionId:regex},{'restaurantDocument.name':regex},{'restaurantDocument.restaurantId':regex},{'customerDocument.name':regex},{'customerDocument.email':regex},{'customerDocument.phone':regex},{'items.name':regex},{'items.foodName':regex},...(mongoose.isValidObjectId(search)?[{_id:new mongoose.Types.ObjectId(search)},{user:new mongoose.Types.ObjectId(search)}]:[])]});}
  const relationStage=relationConditions.length?[{$match:{$and:relationConditions}}]:[];
  const sort=SORTS[String(params.sort||'createdAt_desc')]||SORTS.createdAt_desc;
  const pipeline=[...preLookup,...lookups,...relationStage,{$facet:{rows:[{$sort:sort},{$skip:(page-1)*effectiveLimit},{$limit:effectiveLimit},{$project:{orderNumber:1,items:1,totalAmount:1,subtotal:1,deliveryFee:1,discount:1,orderStatus:1,paymentStatus:1,paymentMethod:1,transactionId:1,createdAt:1,updatedAt:1,actualDeliveryTime:1,pickupTime:1,assignedAt:1,deliveryStatus:1,deliveryManSnapshot:1,deliveryAuditTrail:1,effectiveCommission:1,commissionPercent:1,preparationMinutes:1,deliveryMinutes:1,user:{_id:'$customerDocument._id',name:'$customerDocument.name',email:'$customerDocument.email',phone:'$customerDocument.phone'},restaurant:{_id:'$restaurantDocument._id',restaurantId:'$restaurantDocument.restaurantId',name:'$restaurantDocument.name'},deliveryPerson:{_id:'$riderDocument._id',name:'$riderDocument.name',phone:'$riderDocument.phone'}}}],summary:[{$group:{_id:null,totalOrders:{$sum:1},pendingOrders:{$sum:{$cond:[{$in:['$orderStatus',['pending','confirmed','preparing','ready','out_for_delivery']]},1,0]}},deliveredOrders:{$sum:{$cond:[{$eq:['$orderStatus','delivered']},1,0]}},cancelledOrders:{$sum:{$cond:[{$eq:['$orderStatus','cancelled']},1,0]}},todayRevenue:{$sum:{$cond:[{$and:[{$eq:['$orderStatus','delivered']},{$gte:['$actualDeliveryTime',startOfDay()]}]},'$totalAmount',0]}},platformCommission:{$sum:{$cond:[{$eq:['$orderStatus','delivered']},'$effectiveCommission',0]}},totalValue:{$sum:'$totalAmount'}}},{$project:{_id:0,totalOrders:1,pendingOrders:1,deliveredOrders:1,cancelledOrders:1,todayRevenue:1,platformCommission:1,averageOrderValue:{$cond:[{$gt:['$totalOrders',0]},{$divide:['$totalValue','$totalOrders']},0]}}}]} }];
  const [result]=await aggregateAdminOrders(pipeline);const summary=result?.summary?.[0]||{totalOrders:0,pendingOrders:0,deliveredOrders:0,cancelledOrders:0,todayRevenue:0,platformCommission:0,averageOrderValue:0};
  return {orders:result?.rows||[],summary,pagination:{page,limit,total:summary.totalOrders,pages:Math.ceil(summary.totalOrders/limit)}};
};

