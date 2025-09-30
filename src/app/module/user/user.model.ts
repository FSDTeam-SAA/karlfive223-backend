import mongoose from "mongoose";
import { IUser } from "./user.interface";
import bcrypt from "bcryptjs";
import config from "../../config";

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
    refreshToken: { type: String, default: null },
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
// userSchema.post("save", function (doc, next) {
//   // doc.password = "";
//   next();
// });

const User = mongoose.model<IUser>("User", userSchema);
export default User;
