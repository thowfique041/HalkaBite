import mongoose, { Document, Schema } from 'mongoose';

export interface IConversationDocument extends Document {
  conversationId: string;
  customerId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  customerUnread: number;
  restaurantUnread: number;
}

const schema = new Schema<IConversationDocument>({
  conversationId: { type: String, required: true, unique: true, immutable: true, index: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
  restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, immutable: true, index: true },
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  lastMessage: { type: String, maxlength: 500 },
  lastMessageAt: Date,
  customerUnread: { type: Number, default: 0, min: 0 },
  restaurantUnread: { type: Number, default: 0, min: 0 }
}, { timestamps: true });
schema.index({ customerId: 1, restaurantId: 1 }, { unique: true });
schema.index({ restaurantId: 1, lastMessageAt: -1 });
schema.index({ customerId: 1, lastMessageAt: -1 });
export const Conversation = mongoose.model<IConversationDocument>('Conversation', schema);
