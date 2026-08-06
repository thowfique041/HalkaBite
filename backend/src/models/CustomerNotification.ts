import mongoose, { Document, Schema } from 'mongoose';
export interface ICustomerNotificationDocument extends Document { user: mongoose.Types.ObjectId; title: string; message: string; campaign?: mongoose.Types.ObjectId; isRead: boolean; createdAt: Date }
const schema = new Schema<ICustomerNotificationDocument>({ user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, title: { type: String, required: true }, message: { type: String, required: true }, campaign: { type: Schema.Types.ObjectId, ref: 'Campaign' }, isRead: { type: Boolean, default: false } }, { timestamps: true });
schema.index({ user: 1, createdAt: -1 });
export const CustomerNotification = mongoose.model<ICustomerNotificationDocument>('CustomerNotification', schema);
