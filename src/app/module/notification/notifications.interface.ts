import { ObjectId } from "mongoose";

export interface INotification{
    userId: ObjectId;
    title: string;
    message: string;
    type: string;
    read: boolean;
}