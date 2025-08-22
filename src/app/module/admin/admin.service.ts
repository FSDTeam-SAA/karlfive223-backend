import AppError from "../../error/appError";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import User from "../user/user.model";
import { IVanue } from "./admin.interface";
import Vanue from "./admin.model";

const getAllUsers = async (params: any, options: Partial<IOption>) => {
  const { page, limit, skip, sortBy, sortOrder } = pagenation(options);
  const { searchTerm, ...filterData } = params;

  const andCondition: any[] = [];
  const userSearchableFields = [
    "name",
    "email",
    "role",
    "phoneNumber",
    "playingLevel",
  ];

  if (searchTerm) {
    andCondition.push({
      $or: userSearchableFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: "i" },
      })),
    });
  }

  if (Object.keys(filterData).length) {
    andCondition.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const whereCondition = andCondition.length > 0 ? { $and: andCondition } : {};

  const result = await User.find(whereCondition)
    .sort({ [sortBy]: sortOrder } as any)
    .skip(skip)
    .limit(limit)
    .select("-password");

  const total = await User.countDocuments(whereCondition);

  return { data: result, meta: { total, page, limit } };
};

const updatedRoleByUser = async (id: string, role: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  const result = await User.findByIdAndUpdate(user.id, { role }, { new: true });
  if (!result) {
    throw new AppError(500, "Something went wrong");
  }
  const { password, ...updatedUser } = result.toObject();
  return updatedUser;
};

const deletedUser = async (id: string) => {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError(404, "User not found");
  }
  const result = await User.findByIdAndDelete(user.id);
  if (!result) {
    throw new AppError(500, "Something went wrong");
  }
  return result;
};

// vanue
const createVanue = async (email: string, payload: IVanue) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError(404, "User not found");
  }

  const result = await Vanue.create({ ...payload, user: user.id });
  if (!result) {
    throw new AppError(400, "Something went wrong not create vanue");
  }
  return result;
};

const getAllVanues = async () => {
  const result = await Vanue.find().populate("user", "name email role");
  return result;
};

const deletedVanue = async (id: string) => {
  const vanue = await Vanue.findById(id);
  if (!vanue) {
    throw new AppError(404, "Vanue not found");
  }
  const result = await Vanue.findByIdAndDelete(vanue.id);
  if (!result) {
    throw new AppError(500, "Something went wrong");
  }
  return result;
};

export const adminService = {
  getAllUsers,
  updatedRoleByUser,
  createVanue,
  deletedUser,
  getAllVanues,
  deletedVanue,
};
