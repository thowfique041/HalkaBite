export interface User {
  _id: string;
  name: string;
  username?: string;
  email: string;
  role: 'user' | 'admin' | 'restaurant' | 'delivery';
  phone?: string;
  address?: Address;
  avatar?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  isVerified: boolean;
  favoriteItems: string[];
}

export interface Address {
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
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  slug: string;
  isActive: boolean;
}

export interface FoodItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: Category | string;
  restaurant: Restaurant | string;
  image: string;
  images?: string[];
  isAvailable: boolean;
  isDeleted?: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  preparationTime: number;
  rating: number;
  reviewCount: number;
  totalOrdersSold?: number;
  isFeatured?: boolean;
  featuredBy?: string;
  featuredAt?: string;
  discount?: number;
  promotion?: { campaignId: string; label: string; description: string; discountType: 'percentage'|'fixed'; discountValue: number; startAt: string; endAt: string; originalPrice: number; discountedPrice: number; amountSaved: number; percentageSaved: number };
  tags: string[];
}

export interface Restaurant {
  restaurantId?: string;
  _id: string;
  name: string;
  description: string;
  address: Address;
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
  deliveryRadius?: number;
  isOpen: boolean;
  acceptingOrders?: boolean;
  weeklyHoliday?: string;
  openingHours?: Array<{ day: string; open: string; close: string; isClosed: boolean }>;
  notificationPreferences?: {
    newOrders: boolean; newReviews: boolean; orderCancellation: boolean;
    paymentReceived: boolean; deliveryUpdates: boolean; adminAnnouncements: boolean;
  };
  paymentMethods?: PaymentMethods;
  isActive: boolean;
}

export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'cod';
export type PaymentAccountType = 'Personal' | 'Agent';
export interface PaymentMethods {
  bkash: { enabled: boolean; phoneNumber: string; accountType: PaymentAccountType };
  nagad: { enabled: boolean; phoneNumber: string; accountType: PaymentAccountType };
  rocket: { enabled: boolean; phoneNumber: string; accountType: PaymentAccountType };
  cod: { enabled: boolean };
}

export interface Payment {
  _id: string;
  orderId: Order | string;
  restaurantId: Restaurant | string;
  customerId: User | string;
  method: PaymentMethod;
  receiverNumber?: string;
  receiverAccountType?: PaymentAccountType;
  senderNumber?: string;
  transactionId?: string;
  amount: number;
  status: 'pending' | 'submitted' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  foodItem: FoodItem;
  quantity: number;
  specialInstructions?: string;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  restaurant?: Restaurant;
}

export interface OrderItem {
  foodItem: string;
  foodId?: string;
  name: string;
  foodName?: string;
  foodImage?: string;
  foodPrice?: number;
  restaurantId?: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface Order {
  _id: string;
  checkoutToken?: string;
  orderNumber: string;
  user: User | string;
  restaurant: Restaurant | string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  deliveryAddress: Address;
  paymentMethod: 'bkash' | 'nagad' | 'rocket' | 'cod';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  transactionId?: string;
  orderStatus: 'payment_pending' | 'payment_failed' | 'pending' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled';
  couponCode?: string;
  specialInstructions?: string;
  estimatedDeliveryTime?: string;
  createdAt: string;
  updatedAt: string;
  deliveryPerson?: string;
  deliveryStatus?: 'accepted' | 'going_to_restaurant' | 'picked_up' | 'on_the_way' | 'delivered';
  deliveryEarning?: number;
  deliveryPlatformShare?:number;
  deliveryDistanceKm?:number;
  deliveryCompletionMinutes?:number;
  deliveryEarningMode?:'fixed'|'distance'|'percentage'|'hybrid';
  deliveryEarningValue?:number;
  deliveryEarningStatus?:'pending'|'processing'|'settled';
  deliverySettlement?:string;
  deliveryManSnapshot?: { id: string; name: string };
  assignedAt?: string;
  pickupTime?: string;
  actualDeliveryTime?: string;
  deliveryAuditTrail?: Array<{
    event: 'assigned' | 'status_changed' | 'reassigned';
    status: string;
    deliveryManId: string;
    deliveryManName: string;
    at: string;
  }>;
  deliveryInvalidatedAt?: string;
  deliveryInvalidReason?: 'customer_missing' | 'restaurant_missing' | 'restaurant_inactive' | 'restaurant_unavailable';
}

export interface Review {
  _id: string;
  user: User | string;
  foodItem?: FoodItem | string;
  foodId?: string;
  foodName?: string;
  foodImage?: string;
  restaurant?: Restaurant | string;
  order?: string;
  rating: number;
  comment: string;
  review?: string;
  images?: string[];
  createdAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface CartState {
  items: CartItem[];
  restaurant: Restaurant | null;
  subtotal: number;
  itemCount: number;
  isLoading: boolean;
}
