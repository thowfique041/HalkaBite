import mongoose, { Document, Schema } from 'mongoose';
export interface IAdminSettingDocument extends Document {
  admin: mongoose.Types.ObjectId;
  appearance:{theme:'light'|'dark'|'system';primaryColor:'blue'|'purple'|'green'|'orange'|'red'};
  locale:{language:'en'|'bn';timezone:string;dateFormat:'DD/MM/YYYY'|'MM/DD/YYYY'|'YYYY-MM-DD';timeFormat:'12h'|'24h'};
  notifications:{push:boolean;email:boolean;system:boolean;orders:boolean;restaurants:boolean;complaints:boolean;userReports:boolean};
  security:{twoFactorEnabled:boolean};
  preferences:{autoRefreshSeconds:number;dashboardRefresh:boolean;defaultPage:string;sidebarBehavior:'remember'|'expanded'|'collapsed';sidebarCollapsed:boolean;rememberLastMenu:boolean;lastMenu:string};
  accessibility:{fontSize:'small'|'medium'|'large';highContrast:boolean;reducedMotion:boolean};
}
const schema=new Schema<IAdminSettingDocument>({
 admin:{type:Schema.Types.ObjectId,ref:'User',required:true,unique:true,immutable:true},
 appearance:{theme:{type:String,enum:['light','dark','system'],default:'dark'},primaryColor:{type:String,enum:['blue','purple','green','orange','red'],default:'orange'}},
 locale:{language:{type:String,enum:['en','bn'],default:'en'},timezone:{type:String,enum:['Asia/Dhaka','UTC','Asia/Kolkata','Europe/London','America/New_York'],default:'Asia/Dhaka'},dateFormat:{type:String,enum:['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'],default:'DD/MM/YYYY'},timeFormat:{type:String,enum:['12h','24h'],default:'12h'}},
 notifications:{push:{type:Boolean,default:true},email:{type:Boolean,default:true},system:{type:Boolean,default:true},orders:{type:Boolean,default:true},restaurants:{type:Boolean,default:true},complaints:{type:Boolean,default:true},userReports:{type:Boolean,default:true}},
 security:{twoFactorEnabled:{type:Boolean,default:false}},
 preferences:{autoRefreshSeconds:{type:Number,enum:[0,15,30,60,120,300],default:30},dashboardRefresh:{type:Boolean,default:true},defaultPage:{type:String,enum:['/admin','/admin/orders','/admin/restaurants','/admin/users'],default:'/admin'},sidebarBehavior:{type:String,enum:['remember','expanded','collapsed'],default:'remember'},sidebarCollapsed:{type:Boolean,default:false},rememberLastMenu:{type:Boolean,default:true},lastMenu:{type:String,match:[/^\/admin(?:\/[a-z0-9-]+)?$/,'Invalid admin menu path'],default:'/admin'}},
 accessibility:{fontSize:{type:String,enum:['small','medium','large'],default:'medium'},highContrast:{type:Boolean,default:false},reducedMotion:{type:Boolean,default:false}}
},{timestamps:true});
export const AdminSetting=mongoose.model<IAdminSettingDocument>('AdminSetting',schema);
