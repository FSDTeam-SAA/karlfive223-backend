import mongoose from "mongoose";
import AppError from "../../error/appError";
import User from "../user/user.model";
import ReferralPerson from "./referral.model";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createReferralPerson = async (name: string) => {
  const normalizedName = name?.trim();
  if (!normalizedName) {
    throw new AppError(400, "Referral person name is required");
  }

  const existing = await ReferralPerson.findOne({
    name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: "i" },
  });

  if (existing) {
    throw new AppError(400, "Referral person already exists");
  }

  const result = await ReferralPerson.create({
    name: normalizedName,
  });

  return result;
};

const getReferralNames = async () => {
  return ReferralPerson.find({}, { name: 1 }).sort({ name: 1 });
};

const getReferralSummary = async () => {
  return ReferralPerson.find({}, { name: 1, joinedCount: 1 }).sort({ joinedCount: -1, name: 1 });
};

const getReferralDailyStats = async (referralId: string) => {
  if (!mongoose.Types.ObjectId.isValid(referralId)) {
    throw new AppError(400, "Invalid referral id");
  }

  const referral = await ReferralPerson.findById(referralId);
  if (!referral) {
    throw new AppError(404, "Referral person not found");
  }

  const dailyStats = await User.aggregate([
    {
      $match: {
        referredBy: new mongoose.Types.ObjectId(referralId),
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        joinedCount: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        date: "$_id",
        joinedCount: 1,
      },
    },
    {
      $sort: {
        date: 1,
      },
    },
  ]);

  return {
    referralPerson: {
      _id: referral._id,
      name: referral.name,
      joinedCount: referral.joinedCount,
    },
    dailyStats,
  };
};

const increaseReferralJoinCount = async (referralId: string) => {
  await ReferralPerson.findByIdAndUpdate(referralId, { $inc: { joinedCount: 1 } });
};

const findReferralById = async (referralId: string) => {
  if (!mongoose.Types.ObjectId.isValid(referralId)) {
    return null;
  }

  return ReferralPerson.findById(referralId);
};

const findReferralByName = async (name: string) => {
  const normalizedName = name?.trim();
  if (!normalizedName) {
    return null;
  }

  return ReferralPerson.findOne({
    name: { $regex: `^${escapeRegex(normalizedName)}$`, $options: "i" },
  });
};

export const referralService = {
  createReferralPerson,
  getReferralNames,
  getReferralSummary,
  getReferralDailyStats,
  increaseReferralJoinCount,
  findReferralById,
  findReferralByName,
};
