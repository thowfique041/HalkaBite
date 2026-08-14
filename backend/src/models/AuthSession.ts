import mongoose,{Document,Schema}from'mongoose';
export interface IAuthSessionDocument extends Document{user:mongoose.Types.ObjectId;tokenId:string;device:string;browser:string;ip:string;loginAt:Date;lastActiveAt:Date;expiresAt:Date;revokedAt?:Date}
const schema=new Schema<IAuthSessionDocument>({user:{type:Schema.Types.ObjectId,ref:'User',required:true,index:true},tokenId:{type:String,required:true,unique:true},device:{type:String,required:true},browser:{type:String,required:true},ip:{type:String,required:true},loginAt:{type:Date,default:Date.now},lastActiveAt:{type:Date,default:Date.now},expiresAt:{type:Date,required:true},revokedAt:Date},{timestamps:true});
schema.index({expiresAt:1},{expireAfterSeconds:0});schema.index({user:1,revokedAt:1,lastActiveAt:-1});
export const AuthSession=mongoose.model<IAuthSessionDocument>('AuthSession',schema);
