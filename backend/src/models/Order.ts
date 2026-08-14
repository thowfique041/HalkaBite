import mongoose, { Schema, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';

export interface IOrderDocument extends Document {
  orderNumber: string;
  checkoutToken?: string;
  user: mongoose.Types.ObjectId;
  restaurant: mongoose.Types.ObjectId;
  items: Array<{
    foodItem: mongoose.Types.ObjectId;
    foodId?: mongoose.Types.ObjectId;
    name: string;
    foodName?: string;
    foodImage?: string;
    foodPrice?: number;
    restaurantId?: mongoose.Types.ObjectId;
    quantity: number;
    price: number;
    specialInstructions?: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'payment_pending' | 'payment_failed' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  couponCode?: string;
  specialInstructions?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  deliveryPerson?: mongoose.Types.ObjectId;
  deliveryStatus?: 'accepted' | 'going_to_restaurant' | 'picked_up' | 'on_the_way' | 'delivered';
  deliveryEarning?: number;
  deliveryPlatformShare?: number;
  deliveryDistanceKm?: number;
  deliveryCompletionMinutes?: number;
  deliveryEarningMode?: 'fixed'|'distance'|'percentage'|'hybrid';
  deliveryEarningValue?: number;
  deliveryEarningStatus?: 'pending'|'processing'|'settled';
  deliverySettlement?: mongoose.Types.ObjectId;
  rejectedBy: mongoose.Types.ObjectId[];
  deliveryManSnapshot?: { id: string; name: string };
  assignedAt?: Date;
  pickupTime?: Date;
  deliveryInvalidatedAt?: Date;
  deliveryInvalidReason?: 'customer_missing' | 'restaurant_missing' | 'restaurant_inactive' | 'restaurant_unavailable';
  deliveryAuditTrail: Array<{
    event: 'assigned' | 'status_changed' | 'reassigned';
    status: string;
    deliveryManId: string;
    deliveryManName: string;
    at: Date;
  }>;
  transactionId?: string;
  isCatering: boolean;
  commissionMode?: 'percentage' | 'fixed' | 'none';
  commissionValue?: number;
  platformCommission?: number;
  restaurantEarnings?: number;
  commissionSetting?: mongoose.Types.ObjectId;
  cateringDetails?: {
    eventDate: Date;
    guestCount: number;
    eventType: string;
    specialRequirements?: string;
  };
}

const orderItemSchema = new Schema({
  foodItem: {
    type: Schema.Types.ObjectId,
    ref: 'FoodItem',
    required: true
  },
  foodId: { type: Schema.Types.ObjectId, immutable: true },
  name: { type: String, required: true },
  foodName: { type: String, immutable: true },
  foodImage: { type: String, immutable: true },
  foodPrice: { type: Number, min: 0, immutable: true },
  restaurantId: { type: Schema.Types.ObjectId, immutable: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  specialInstructions: String
}, { _id: false });

const addressSchema = new Schema({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: 'Bangladesh' },
  coordinates: {
    lat: Number,
    lng: Number
  }
}, { _id: false });

const orderSchema = new Schema<IOrderDocument>({
  checkoutToken: {
    type: String,
    trim: true,
    immutable: true
  },
  orderNumber: {
    type: String,
    unique: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryFee: {
    type: Number,
    default: 50,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryAddress: {
    type: addressSchema,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['bkash', 'nagad', 'rocket', 'cod'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['payment_pending', 'payment_failed', 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  couponCode: String,
  specialInstructions: String,
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  deliveryPerson: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveryStatus: {
    type: String,
    enum: ['accepted', 'going_to_restaurant', 'picked_up', 'on_the_way', 'delivered']
  },
  deliveryEarning: {
    type: Number,
    min: 0
  },
  deliveryPlatformShare:{type:Number,immutable:true},
  deliveryDistanceKm:{type:Number,min:0},
  deliveryCompletionMinutes:{type:Number,min:0,immutable:true},
  deliveryEarningMode:{type:String,enum:['fixed','distance','percentage','hybrid'],immutable:true},
  deliveryEarningValue:{type:Number,min:0,immutable:true},
  deliveryEarningStatus:{type:String,enum:['pending','processing','settled'],index:true},
  deliverySettlement:{type:Schema.Types.ObjectId,ref:'DeliverySettlement',index:true},
  rejectedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  deliveryManSnapshot: {
    id: { type: String, immutable: true },
    name: { type: String, immutable: true }
  },
  assignedAt: Date,
  pickupTime: Date,
  deliveryInvalidatedAt: Date,
  deliveryInvalidReason: {
    type: String,
    enum: ['customer_missing', 'restaurant_missing', 'restaurant_inactive', 'restaurant_unavailable']
  },
  deliveryAuditTrail: [{
    event: { type: String, enum: ['assigned', 'status_changed', 'reassigned'], required: true },
    status: { type: String, required: true },
    deliveryManId: { type: String, required: true },
    deliveryManName: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now }
  }],
  transactionId: String,
  isCatering: {
    type: Boolean,
    default: false
  },
  commissionMode: { type: String, enum: ['percentage', 'fixed', 'none'], immutable: true },
  commissionValue: { type: Number, min: 0, immutable: true },
  platformCommission: { type: Number, min: 0, immutable: true },
  restaurantEarnings: { type: Number, min: 0, immutable: true },
  commissionSetting: { type: Schema.Types.ObjectId, ref: 'CommissionSetting', immutable: true },
  cateringDetails: {
    eventDate: Date,
    guestCount: Number,
    eventType: String,
    specialRequirements: String
  }
}, {
  timestamps: true
});

// Generate order number before saving
orderSchema.pre('save', async function() {
  if (!this.orderNumber) {
    const date = new Date();
    const prefix = 'HB';
    const timestamp = date.getFullYear().toString().slice(-2) + 
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `${prefix}${timestamp}${random}`;
  }
});

// Indexes
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ paymentStatus: 1, paymentMethod: 1, createdAt: -1 });
orderSchema.index({ totalAmount: 1, createdAt: -1 });
orderSchema.index({ platformCommission: 1, commissionValue: 1 });
orderSchema.index({ restaurant: 1, orderStatus: 1, createdAt: -1 });
orderSchema.index({ deliveryPerson: 1, deliveryStatus: 1 });
orderSchema.index(
  { user: 1, checkoutToken: 1 },
  { unique: true, partialFilterExpression: { checkoutToken: { $type: 'string' } } }
);

export const Order = mongoose.model<IOrderDocument>('Order', orderSchema);
