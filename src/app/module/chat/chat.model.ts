import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema({
  name: { type: String},
  seller : { type: Schema.Types.ObjectId, ref: 'Team'},
  match : { type: Schema.Types.ObjectId, ref: 'Match'},
  user : { type: Schema.Types.ObjectId, ref: 'Team'},
  messages:[{
    text: { type: String,  },
    user: { type: Schema.Types.ObjectId, ref: 'User'},
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
  }],
},{
  timestamps: true
});

export const Chat = mongoose.model("chat", chatSchema);