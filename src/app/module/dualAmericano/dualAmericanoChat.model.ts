import mongoose, { Schema } from 'mongoose';

const dualAmericanoChatSchema = new Schema({
  name: { type: String },
  dualAmericano: { type: Schema.Types.ObjectId, ref: 'DualAmericano', required: true },
  matchId: { type: Schema.Types.ObjectId, required: true },
  roundNumber: { type: Number, required: true },
  pair1: { type: Schema.Types.ObjectId, required: true },
  pair2: { type: Schema.Types.ObjectId, required: true },
  messages: [
    {
      text: { type: String },
      sender: { type: Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
      read: { type: Boolean, default: false },
    },
  ],
}, { timestamps: true });

export const DualAmericanoChat = mongoose.model('DualAmericanoChat', dualAmericanoChatSchema);
