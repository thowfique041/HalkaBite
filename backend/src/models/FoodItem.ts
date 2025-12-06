import mongoose, { Schema, Document } from 'mongoose';

export interface IFoodItemDocument extends Document {
  name: string;
  description: string;
  price: number;
  category: mongoose.Types.ObjectId;
  restaurant: mongoose.Types.ObjectId;
  image: string;
  images?: string[];
  isAvailable: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  preparationTime: number;
  rating: number;
  reviewCount: number;
  discount?: number;
  tags: string[];
  ingredients?: string[];
  nutritionInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

const foodItemSchema = new Schema<IFoodItemDocument>({
  name: {
    type: String,
    required: [true, 'Food item name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: [true, 'Restaurant is required']
  },
  image: {
    type: String,
    required: [true, 'Image is required']
  },
  images: [String],
  isAvailable: {
    type: Boolean,
    default: true
  },
  isVegetarian: {
    type: Boolean,
    default: false
  },
  isSpicy: {
    type: Boolean,
    default: false
  },
  preparationTime: {
    type: Number,
    default: 30,
    min: [5, 'Preparation time must be at least 5 minutes']
  },
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
  discount: {
    type: Number,
    min: 0,
    max: 100
  },
  tags: [String],
  ingredients: [String],
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number
  }
}, {
  timestamps: true
});

// Indexes for search
foodItemSchema.index({ name: 'text', description: 'text', tags: 'text' });
foodItemSchema.index({ category: 1, isAvailable: 1 });
foodItemSchema.index({ restaurant: 1, isAvailable: 1 });

export const FoodItem = mongoose.model<IFoodItemDocument>('FoodItem', foodItemSchema);
