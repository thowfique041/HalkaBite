import mongoose, { Schema, Document } from 'mongoose';

export interface IReviewDocument extends Document {
  user: mongoose.Types.ObjectId;
  foodItem?: mongoose.Types.ObjectId;
  restaurant?: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
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
  images: [String]
}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ foodItem: 1, createdAt: -1 });
reviewSchema.index({ restaurant: 1, createdAt: -1 });
reviewSchema.index({ user: 1 });

export const Review = mongoose.model<IReviewDocument>('Review', reviewSchema);
