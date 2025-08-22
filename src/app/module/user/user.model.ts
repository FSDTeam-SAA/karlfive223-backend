import mongoose from "mongoose";
import { IUser } from "./user.interface";
import bcrypt from "bcryptjs";
import config from "../../config";

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: [true, "Name is required"] },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
    },
    password: { type: String, required: [true, "Password is required"] },
    profileImage: { type: String, default: null },
    role: {
      type: String,
      enum: ["player", "manager", "admin"],
      default: "player",
    },
    phoneNumber: { type: String, required: true, unique: true },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    isVerified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds)
  );
  next();
});

// remove password from response after saving
userSchema.post("save", function (doc, next) {
  doc.password = "";
  next();
});

const User = mongoose.model<IUser>("User", userSchema);
export default User;
