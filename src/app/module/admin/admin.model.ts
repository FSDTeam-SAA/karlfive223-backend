import mongoose from "mongoose";
import { IVanue } from "./admin.interface";

const vanueSchema = new mongoose.Schema<IVanue>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    name: {
      type: String,
      required: [true, "Vanue name is required"],
    },
    teameName: {
      type: String,
      required: [true, "Team name is required"],
    },
    courtName: {
      type: String,
      required: [true, "Court name is required"],
    },
  },
  { timestamps: true }
);

const Vanue = mongoose.model<IVanue>("Vanue", vanueSchema);
export default Vanue;
