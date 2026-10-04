import mongoose, { Schema } from "mongoose";

const fcmSchema = new Schema(
  {
    fcmToken: { type: String, required: true, trim: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  {
    timestamps: true,
  }
);

// Not unique: existing rows created by the old (buggy) createFCM before this
// fix may already have the same fcmToken duplicated across users — a unique
// index would fail to build against that data. registerFcmToken below
// matches on fcmToken alone and reassigns `user` in place, so duplicates
// stop accumulating going forward without needing a migration here.
fcmSchema.index({ fcmToken: 1 });

export const FCM = mongoose.model("fcm", fcmSchema);
