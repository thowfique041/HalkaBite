import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurantDocument extends Document {
  name: string;
  description: string;
  address: {
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
  isOpen: boolean;
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

const openingHoursSchema = new Schema({
  day: { type: String, required: true },
  open: { type: String, required: true },
  close: { type: String, required: true },
  isClosed: { type: Boolean, default: false }
}, { _id: false });

const restaurantSchema = new Schema<IRestaurantDocument>({
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
  isOpen: {
    type: Boolean,
    default: true
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

export const Restaurant = mongoose.model<IRestaurantDocument>('Restaurant', restaurantSchema);
