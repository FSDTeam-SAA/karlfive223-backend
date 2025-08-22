import AppError from "../../error/appError";
import { fileUploader } from "../../helper/fileUploded";
import { sendMailer } from "../../helper/sendMailer";
import { IUser } from "./user.interface";
import User from "./user.model";

const createUser = async (payload: Partial<IUser>) => {
  const existingUser = await User.findOne({ email: payload.email });
  if (existingUser) {
    throw new AppError(400, "User already exists");
  }
  const newUser = await User.create(payload);

  if (!newUser) {
    throw new AppError(400, "User creation failed");
  }
  await sendMailer(
    newUser.email,
    "Welcome to our platform",
    `Hello ${newUser.name}, welcome to our platform.`
  );
  newUser.isVerified = true;
  await newUser.save();

  // Remove password before returning
  const { password: _, ...result } = newUser.toObject();

  return result;
};

const getUserByEmail = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return user;
};

const playingLevel = async (email: string, payload: Partial<IUser>) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  const { playingLevel } = payload;
  const updatedPlayingLevel = await User.findByIdAndUpdate(
    user.id,
    { playingLevel },
    { new: true }
  );
  return updatedPlayingLevel;
};

const gender = async (email: string, payload: Partial<IUser>) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  const { gender } = payload;
  const updatedGender = await User.findByIdAndUpdate(
    user.id,
    { gender },
    { new: true }
  );
  return updatedGender;
};

const updatedProfile = async (
  userEmail: string,
  payload: Partial<IUser>,
  file?: Express.Multer.File
) => {
  const user = await User.findOne({ email: userEmail });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  // Handle image upload if file is provided
  if (file) {
    const uploadedImage = await fileUploader.uploadToCloudinary(file);
    payload.profileImage = uploadedImage.secure_url;
  }
  // Update allowed fields
  const updatedUser = await User.findByIdAndUpdate(
    user.id,
    {
      name: payload.name,
      profileImage: payload.profileImage,
      phoneNumber: payload.phoneNumber,
      clubAffiliation: payload.clubAffiliation,
      playingLevel: payload.playingLevel,
      birthday: payload.birthday,
    },
    { new: true }
  ).select("-password"); // don't return password

  return updatedUser;
};

export const userServices = {
  createUser,
  getUserByEmail,
  playingLevel,
  gender,
  updatedProfile,
};
