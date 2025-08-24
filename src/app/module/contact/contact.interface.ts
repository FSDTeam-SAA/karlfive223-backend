import { ObjectId } from "mongoose";

export interface IContact {
    user:ObjectId;
    firstName:string;
    lastName:string;
    address:string;
    phoneNumber:string;
    subject:string;
    yourCompony:string;
}