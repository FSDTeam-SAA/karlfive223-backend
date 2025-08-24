import mongoose, { Schema } from "mongoose";
import { IContact } from "./contact.interface";

const contactSchema = new mongoose.Schema<IContact>({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    firstName: String,
    lastName: String,
    address: String,
    phoneNumber: String,
    subject: String,
    yourCompony: String
}, {
    timestamps: true
})


const Contact = mongoose.model<IContact>("Contact", contactSchema);
export default Contact;
