import mongoose from "mongoose";
import { IUser } from "./user.interface";
import bcrypt from "bcryptjs";
import config from "../../config";

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: [true, "name is requried"] },
    email: {
      type: String,
      required: [true, "email is requried"],
      unique: true,
    },
    password: { type: String, required: [true, "Password is requried"] },
    profileImage: { type: String, default: null },
    role: {
      type: String,
      enum: ["player", "manager", "admin"],
      default: "player",
      validate: {
        validator: function (value: string) {
          return value === "player" || value === "manager" || value === "admin";
        },
        message: "Invalid role",
      },
    },
    phoneNumber: { type: String, required: true, unique: true },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  const hash = await bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds)
  );
  this.password = hash;
  next();
});

userSchema.post("save", function (doc, next) {
  doc.password = "";
  next();
});

const User = mongoose.model<IUser>("User", userSchema);
export default User;
