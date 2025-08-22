import { ObjectId } from "mongoose";

export interface IVanue {
  user: ObjectId;
  name: string;
  teameName: string;
  courtName: string;
}
