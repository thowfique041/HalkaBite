import mongoose, { Schema, Document } from 'mongoose';

export interface ICartDocument extends Document {
  user: mongoose.Types.ObjectId;
  items: Array<{
    foodItem: mongoose.Types.ObjectId;
    quantity: number;
    specialInstructions?: string;
  }>;
  restaurant?: mongoose.Types.ObjectId;
}

const cartItemSchema = new Schema({
  foodItem: {
    type: Schema.Types.ObjectId,
    ref: 'FoodItem',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  specialInstructions: String
}, { _id: false });

const cartSchema = new Schema<ICartDocument>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant'
  }
}, {
  timestamps: true
});

export const Cart = mongoose.model<ICartDocument>('Cart', cartSchema);
