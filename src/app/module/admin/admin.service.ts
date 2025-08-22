import AppError from "../../error/appError";
import pagenation from "../../helper/pagenation";
import { IOption } from "../../interface";
import User from "../user/user.model";

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

export const adminService = {
  getAllUsers,
  updatedRoleByUser,
};
