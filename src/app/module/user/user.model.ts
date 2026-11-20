import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import config from "../../config";
import { IUser } from "./user.interface";

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      trim: true,
    },
    profileImage: { type: String, default: null },
    role: {
      type: String,
      enum: ["player", "manager", "admin", "referee"],
      default: "player",
    },
    phoneNumber: { type: String },
    gender: { type: String ,default: null},
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    reset_otp: { type: String, default: null },
    reset_otpExpiry: { type: Date, default: null },
    playingLevel: {
      type: String,
      // enum: {
      //   values: [
      //     "Beginner",
      //     "Intermediate",
      //     "Intermediate high",
      //     "Advance",
      //     "Pro",
      //   ],
      //   message: "Invalid playing level",
      // },
      default: null

    },
    clubAffiliation: { type: String },
    birthday: { type: Date },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReferralPerson",
      default: null,
    },
    refreshToken: { type: String, default: null },
    // ─── Subscription tracking ─────────────────────────────────────────────────
    isOrganizer: { type: Boolean, default: false },
    freeTrialUsed: { type: Boolean, default: false },
    leaguesCreatedCount: { type: Number, default: 0 },
    leaguesJoinedCount: { type: Number, default: 0 },
    // ─── Stripe Integration ────────────────────────────────────────────────────
    stripeCustomerId: { type: String, default: null },
  },
  { timestamps: true }
);

// Never sent to a client, even when a user is populated into another document
// (league owner, match referee). Code reading these off the document itself,
// like the password check at login, is unaffected.
const PRIVATE_FIELDS = [
  "password",
  "refreshToken",
  "otp",
  "otpExpiry",
  "reset_otp",
  "reset_otpExpiry",
] as const;

const removePrivateFields = (_doc: unknown, ret: Record<string, any>) => {
  PRIVATE_FIELDS.forEach((field) => delete ret[field]);
  return ret;
};

userSchema.set("toJSON", { transform: removePrivateFields });
userSchema.set("toObject", { transform: removePrivateFields });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds)
  );
  next();
});

// remove password from response after saving
// userSchema.post("save", function (doc, next) {
//   // doc.password = "";
//   next();
// });

const User = mongoose.model<IUser>("User", userSchema);
export default User;
