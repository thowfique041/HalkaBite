import mongoose, { Schema, Document } from 'mongoose';

export interface IReviewDocument extends Document {
  user: mongoose.Types.ObjectId;
  foodItem?: mongoose.Types.ObjectId;
  foodId?: mongoose.Types.ObjectId;
  foodName?: string;
  foodImage?: string;
  restaurant?: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  review?: string;
  images?: string[];
}

const reviewSchema = new Schema<IReviewDocument>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foodItem: {
    type: Schema.Types.ObjectId,
    ref: 'FoodItem'
  },
  foodId: { type: Schema.Types.ObjectId, immutable: true },
  foodName: { type: String, immutable: true },
  foodImage: { type: String, immutable: true },
  restaurant: {
    type: Schema.Types.ObjectId,
    ref: 'Restaurant'
  },
  order: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  review: { type: String, maxlength: 500, immutable: true },
  images: [String]
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ foodItem: 1, createdAt: -1 });
reviewSchema.index({ restaurant: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });

export const Review = mongoose.model<IReviewDocument>('Review', reviewSchema);
