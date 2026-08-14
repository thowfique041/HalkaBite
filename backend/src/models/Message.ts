import mongoose, { Document, Schema } from 'mongoose';
export interface IMessageDocument extends Document {
  conversationId: mongoose.Types.ObjectId; senderId: mongoose.Types.ObjectId; senderRole: 'user'|'restaurant';
  message: string; messageType: 'text'|'image'; imageUrl?: string; replyTo?: mongoose.Types.ObjectId;
  deliveredAt: Date; readAt?: Date; isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<IMessageDocument>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  senderRole: { type: String, enum: ['user','restaurant'], required: true, immutable: true },
  message: { type: String, trim: true, maxlength: 2000, default: '' },
  messageType: { type: String, enum: ['text','image'], default: 'text' },
  imageUrl: { type: String, trim: true, maxlength: 1000 },
  replyTo: { type: Schema.Types.ObjectId, ref: 'Message' },
  deliveredAt: { type: Date, default: Date.now },
  readAt: Date,
  isRead: { type: Boolean, default: false, index: true }
}, { timestamps: true });
schema.index({ conversationId: 1, createdAt: -1 });
schema.pre('validate', function () { if (!this.message && !this.imageUrl) this.invalidate('message', 'A message or image is required'); });
export const Message = mongoose.model<IMessageDocument>('Message', schema);
