import mongoose from 'mongoose';
import { DeliveryEarningSetting, DeliveryTransaction, DeliveryWallet, Order } from '../models';

const currency=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
export const getDeliveryEarningSetting=async()=>await DeliveryEarningSetting.findOne({isActive:true}).lean()||{mode:'fixed' as const,fixedAmount:50,baseDistanceKm:3,baseAmount:30,extraPerKm:10,percentage:20};
export const calculateDeliveryEarning=(deliveryFee:number,distanceKm:number,setting:Awaited<ReturnType<typeof getDeliveryEarningSetting>>)=>{
 const extra=Math.max(0,distanceKm-setting.baseDistanceKm);let earning=0,value=0;
 if(setting.mode==='fixed'){earning=setting.fixedAmount;value=setting.fixedAmount}
 else if(setting.mode==='percentage'){earning=deliveryFee*setting.percentage/100;value=setting.percentage}
 else if(setting.mode==='distance'){earning=setting.baseAmount+extra*setting.extraPerKm;value=setting.extraPerKm}
 else{earning=setting.baseAmount+extra*setting.extraPerKm;value=setting.extraPerKm}
 earning=currency(Math.max(0,earning));
 return{earning,platformShare:currency(deliveryFee-earning),mode:setting.mode,value};
};
export const finalizeDeliveryEarning=async(orderId:mongoose.Types.ObjectId|string,distanceKm=0)=>{
 const setting=await getDeliveryEarningSetting();
 return mongoose.connection.transaction(async session=>{
  const order=await Order.findOne({_id:orderId,orderStatus:'delivered',deliveryPerson:{$exists:true},deliveryEarningStatus:{$exists:false}}).session(session);
  if(!order)return null;
  const result=calculateDeliveryEarning(order.deliveryFee,Math.max(0,distanceKm||order.deliveryDistanceKm||0),setting);
  const completionMinutes=order.assignedAt&&order.actualDeliveryTime?Math.max(0,(order.actualDeliveryTime.getTime()-order.assignedAt.getTime())/60000):0;
  const updated=await Order.findOneAndUpdate({_id:order._id,deliveryEarningStatus:{$exists:false}},{$set:{deliveryEarning:result.earning,deliveryPlatformShare:result.platformShare,deliveryDistanceKm:Math.max(0,distanceKm||order.deliveryDistanceKm||0),deliveryCompletionMinutes:currency(completionMinutes),deliveryEarningMode:result.mode,deliveryEarningValue:result.value,deliveryEarningStatus:'pending'}},{new:true,session});
  if(!updated)return null;
  const wallet=await DeliveryWallet.findOneAndUpdate({deliveryMan:order.deliveryPerson},{$setOnInsert:{deliveryMan:order.deliveryPerson},$inc:{currentBalance:result.earning,pendingEarnings:result.earning,totalEarnings:result.earning}},{upsert:true,new:true,session,setDefaultsOnInsert:true});
  await DeliveryTransaction.create([{deliveryMan:order.deliveryPerson,type:'earning',amount:result.earning,balanceAfter:wallet.currentBalance,reference:order.orderNumber}],{session});
  return updated;
 });
};
