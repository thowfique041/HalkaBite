import { Schema, model } from 'mongoose';
const schema = new Schema({ _id: { type: String, required: true }, sequence: { type: Number, default: 100000 } });
export const Counter = model('Counter', schema);
