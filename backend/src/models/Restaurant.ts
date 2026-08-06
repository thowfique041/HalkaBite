import mongoose, { Schema, Document } from 'mongoose';
import { Counter } from './Counter';

export interface IRestaurantDocument extends Document {
  restaurantId?: string;
  name: string;
  description: string;
  address: {
    restaurantAddress?: string;
    area?: string;
    street: string;
    city: string;
    district?: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  phone: string;
  email: string;
  image: string;
  coverImage?: string;
  cuisine: string[];
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  deliveryRadius: number;
  isOpen: boolean;
  acceptingOrders: boolean;
  weeklyHoliday?: string;
  notificationPreferences: {
    newOrders: boolean; newReviews: boolean; orderCancellation: boolean;
    paymentReceived: boolean; deliveryUpdates: boolean; adminAnnouncements: boolean;
  };
  isActive: boolean;
  openingHours: Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }>;
  owner: mongoose.Types.ObjectId;
}

const addressSchema = new Schema({
  restaurantAddress: { type: String, trim: true, maxlength: 300 },
  area: { type: String, trim: true, maxlength: 150 },
  street: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, trim: true, maxlength: 150 },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, default: 'Bangladesh' },
  coordinates: {
    lat: Number,
    lng: Number
  }
}, { _id: false });

const openingHoursSchema = new Schema({
  day: { type: String, required: true },
  open: { type: String, required: true },
  close: { type: String, required: true },
  isClosed: { type: Boolean, default: false }
}, { _id: false });

const restaurantSchema = new Schema<IRestaurantDocument>({
  restaurantId: { type: String, unique: true, sparse: true, immutable: true, index: true },
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  address: {
    type: addressSchema,
    required: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true
  },
  image: {
    type: String,
    required: [true, 'Restaurant image is required']
  },
  coverImage: String,
  cuisine: [{
    type: String,
    required: true
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  deliveryTime: {
    type: String,
    default: '30-45 min'
  },
  deliveryFee: {
    type: Number,
    default: 50,
    min: 0
  },
  minimumOrder: {
    type: Number,
    default: 100,
    min: 0
  },
  deliveryRadius: { type: Number, default: 5, min: 0, max: 100 },
  isOpen: {
    type: Boolean,
    default: true
  },
  acceptingOrders: { type: Boolean, default: true },
  weeklyHoliday: { type: String, enum: ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], default: '' },
  notificationPreferences: {
    newOrders: { type: Boolean, default: true },
    newReviews: { type: Boolean, default: true },
    orderCancellation: { type: Boolean, default: true },
    paymentReceived: { type: Boolean, default: true },
    deliveryUpdates: { type: Boolean, default: true },
    adminAnnouncements: { type: Boolean, default: true }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  openingHours: [openingHoursSchema],
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
restaurantSchema.index({ name: 'text', cuisine: 'text' });
restaurantSchema.index({ 'address.city': 1, isOpen: 1, isActive: 1 });
restaurantSchema.pre('save', async function () {
  if (!this.restaurantId) {
    await Counter.findByIdAndUpdate(
      'restaurantId',
      { $setOnInsert: { sequence: 100000 } },
      { upsert: true, new: true, setDefaultsOnInsert: false }
    );
    const counter = await Counter.findByIdAndUpdate(
      'restaurantId',
      { $inc: { sequence: 1 } },
      { upsert: true, new: true }
    );
    this.restaurantId = `RST-${counter.sequence}`;
  }
});

export const Restaurant = mongoose.model<IRestaurantDocument>('Restaurant', restaurantSchema);
