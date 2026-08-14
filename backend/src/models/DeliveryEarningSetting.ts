import mongoose, { Document, Schema } from 'mongoose';
export type DeliveryEarningMode='fixed'|'distance'|'percentage'|'hybrid';
export interface IDeliveryEarningSettingDocument extends Document {mode:DeliveryEarningMode;fixedAmount:number;baseDistanceKm:number;baseAmount:number;extraPerKm:number;percentage:number;isActive:boolean;updatedBy?:mongoose.Types.ObjectId;}
const schema=new Schema<IDeliveryEarningSettingDocument>({mode:{type:String,enum:['fixed','distance','percentage','hybrid'],default:'fixed'},fixedAmount:{type:Number,min:0,default:50},baseDistanceKm:{type:Number,min:0,default:3},baseAmount:{type:Number,min:0,default:30},extraPerKm:{type:Number,min:0,default:10},percentage:{type:Number,min:0,max:100,default:20},isActive:{type:Boolean,default:true},updatedBy:{type:Schema.Types.ObjectId,ref:'User'}},{timestamps:true});
schema.index({isActive:1},{unique:true,partialFilterExpression:{isActive:true}});
export const DeliveryEarningSetting=mongoose.model<IDeliveryEarningSettingDocument>('DeliveryEarningSetting',schema);
