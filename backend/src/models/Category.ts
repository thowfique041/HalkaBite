import mongoose, { Schema, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';

export interface ICategoryDocument extends Document {
  name: string;
  description?: string;
  image?: string;
  slug: string;
  isActive: boolean;
}

const categorySchema = new Schema<ICategoryDocument>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [50, 'Category name cannot exceed 50 characters']
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  image: String,
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Generate slug before saving
categorySchema.pre('save', function() {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
});

export const Category = mongoose.model<ICategoryDocument>('Category', categorySchema);

