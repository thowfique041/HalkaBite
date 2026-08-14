import mongoose,{Document,Schema}from'mongoose';
export interface IDeliveryWalletDocument extends Document{deliveryMan:mongoose.Types.ObjectId;currentBalance:number;pendingEarnings:number;paidEarnings:number;totalEarnings:number;updatedAt:Date;}
const schema=new Schema<IDeliveryWalletDocument>({deliveryMan:{type:Schema.Types.ObjectId,ref:'User',required:true,unique:true,immutable:true},currentBalance:{type:Number,min:0,default:0},pendingEarnings:{type:Number,min:0,default:0},paidEarnings:{type:Number,min:0,default:0},totalEarnings:{type:Number,min:0,default:0}},{timestamps:true});
export const DeliveryWallet=mongoose.model<IDeliveryWalletDocument>('DeliveryWallet',schema);
