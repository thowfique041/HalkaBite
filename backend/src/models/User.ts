import mongoose, { Schema, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUserDocument extends Document {
  name: string;
  username?: string;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'restaurant' | 'delivery';
  phone?: string;
  address?: {
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
  avatar?: string;
  avatarPublicId?: string;
  bio?: string;
  lastLogin?: Date;
  isVerified: boolean;
  favoriteItems: mongoose.Types.ObjectId[];
  comparePassword(candidatePassword: string): Promise<boolean>;
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

const userSchema = new Schema<IUserDocument>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-z0-9._-]+$/, 'Username may only contain letters, numbers, dots, underscores, and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'restaurant', 'delivery'],
    default: 'user'
  },
  phone: {
    type: String,
    match: [/^(\+880|0)?1[3-9]\d{8}$/, 'Please enter a valid Bangladeshi phone number']
  },
  address: addressSchema,
  avatar: String,
  avatarPublicId: { type: String, select: false },
  bio: { type: String, trim: true, maxlength: [300, 'Bio cannot exceed 300 characters'] },
  lastLogin: Date,
  isVerified: {
    type: Boolean,
    default: false
  },
  favoriteItems: [{
    type: Schema.Types.ObjectId,
    ref: 'FoodItem'
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUserDocument>('User', userSchema);

