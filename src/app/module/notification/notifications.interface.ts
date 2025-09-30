import { ObjectId } from "mongoose";

export interface INotification{
    userId: ObjectId;
    message: string;
    type: string;
    read: boolean;
}