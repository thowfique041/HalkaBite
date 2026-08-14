import mongoose, { Document, Schema } from 'mongoose';
export interface IBlockedCustomerDocument extends Document { restaurantId:mongoose.Types.ObjectId;customerId:mongoose.Types.ObjectId;blockedBy:mongoose.Types.ObjectId;blockedAt:Date;reason?:string }
const schema = new Schema<IBlockedCustomerDocument>({
  restaurantId:{type:Schema.Types.ObjectId,ref:'Restaurant',required:true,index:true},customerId:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},blockedBy:{type:Schema.Types.ObjectId,ref:'User',required:true},blockedAt:{type:Date,default:Date.now},reason:{type:String,trim:true,maxlength:500}
},{timestamps:true});
schema.index({restaurantId:1,customerId:1},{unique:true});
export const BlockedCustomer=mongoose.model<IBlockedCustomerDocument>('BlockedCustomer',schema);
