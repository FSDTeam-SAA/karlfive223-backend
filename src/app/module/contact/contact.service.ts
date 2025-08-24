import AppError from "../../error/appError";
import User from "../user/user.model";
import { IContact } from "./contact.interface";
import Contact from "./contact.model";

const createContact = async (email: string, payload: IContact) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError(404, "User not found");
  const result = await Contact.create({ ...payload, user: user._id });
  if (!result) throw new AppError(500, "Something went wrong");
  return result;
};

const getAllContact = async () => {
  const result = await Contact.find().populate("user", "name email role");
  if (!result) throw new AppError(500, "Something went wrong");
  return result;
};

const getSingleContact = async (id: string) => {
  const result = await Contact.findById(id).populate("user", "name email role");
  if (!result) throw new AppError(500, "Something went wrong");
  return result;
};

const  updateContact = async (id: string, payload: Partial<IContact>) => {
  const result = await Contact.findByIdAndUpdate(id, payload, { new: true });
  if (!result) throw new AppError(500, "Something went wrong");
  return result;
};

const  deleteContact = async (id: string) => {
  const result = await Contact.findByIdAndDelete(id);
  if (!result) throw new AppError(500, "Something went wrong");
  return result;
};

export const contactService = {
  createContact,
  getAllContact,
  getSingleContact,
  updateContact,
  deleteContact
};
