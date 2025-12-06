import { Request, Response, NextFunction } from 'express';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'restaurant';
  phone?: string;
  address?: IAddress;
  avatar?: string;
  isVerified: boolean;
  favoriteItems: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ICategory {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
}

export interface IFoodItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  restaurant: string;
  image: string;
  isAvailable: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  preparationTime: number;
  rating: number;
  reviewCount: number;
  discount?: number;
  tags: string[];
}

export interface ICartItem {
  foodItem: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface IOrder {
  _id: string;
  user: string;
  restaurant: string;
  items: IOrderItem[];
  totalAmount: number;
  deliveryAddress: IAddress;
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  deliveryFee: number;
  discount: number;
  couponCode?: string;
  specialInstructions?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrderItem {
  foodItem: string;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface IRestaurant {
  _id: string;
  name: string;
  description: string;
  address: IAddress;
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
  openingHours: IOpeningHours[];
  owner: string;
}

export interface IOpeningHours {
  day: string;
  open: string;
  close: string;
  isClosed: boolean;
}

export interface IReview {
  _id: string;
  user: string;
  foodItem?: string;
  restaurant?: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: Date;
}

export interface ICoupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  validFrom: Date;
  validUntil: Date;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}
