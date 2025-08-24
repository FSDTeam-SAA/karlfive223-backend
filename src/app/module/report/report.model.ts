import mongoose from "mongoose";
import { IReport } from "./report.interface";

const reportSchema = new mongoose.Schema<IReport>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  even: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  reportImage: {
    type: String,
    default: null,
  },
});

const Report = mongoose.model<IReport>("Report", reportSchema);
export default Report;
