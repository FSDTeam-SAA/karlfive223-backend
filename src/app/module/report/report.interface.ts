import { ObjectId } from "mongoose";

export interface IReport {
  user: ObjectId;
  even: string;
  description: string;
  reportImage: string;
}
