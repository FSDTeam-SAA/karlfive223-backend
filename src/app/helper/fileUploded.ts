// import multer from "multer";
// import { v2 as cloudinary } from "cloudinary";
// import path from "path";
// import fs from "fs";
// import { ICloudinaryResponse } from "../interface";
// import config from "../config";

// cloudinary.config({
//   cloud_name: config.cloudinary.cloud_name,
//   api_key: config.cloudinary.api_key,
//   api_secret: config.cloudinary.api_secret,
// });

// const allowedFileTypes = [
//   "image/jpeg",
//   "image/png",
//   "image/jpg",
//   "image/gif",
//   "image/webp",
// ];

// const fileFilter = (
//   req: Express.Request,
//   file: Express.Multer.File,
//   cb: multer.FileFilterCallback
// ) => {
//   if (allowedFileTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only image files are allowed!"));
//   }
// };

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, path.join(process.cwd(), "uploads"));
//   },
//   filename: function (req, file, cb) {
//     const safeFileName = file.originalname.replace(/\s+/g, "_");
//     cb(null, safeFileName);
//   },
// });

// const upload = multer({
//   storage,
//   fileFilter,
// });

// const uploadToCloudinary = async (
//   file: Express.Multer.File
// ): Promise<ICloudinaryResponse> => {
//   return new Promise<ICloudinaryResponse>((resolve, reject) => {
//     cloudinary.uploader.upload(
//       file.path,
//       {
//         public_id: file.originalname.replace(/\s+/g, "_"),
//         folder: "karlfive223",
//         resource_type: "image",
//       },
//       (error, result) => {
//         fs.unlinkSync(file.path);
//         if (error) {
//           reject(error);
//         } else {
//           resolve(result as ICloudinaryResponse | any);
//         }
//       }
//     );
//   });
// };

// export const fileUploader = {
//   upload,
//   uploadToCloudinary,
// };


import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import config from "../config";
import { ICloudinaryResponse } from "../interface";

// 🧠 Cloudinary Config
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

// ✅ Allowed file types
const allowedFileTypes = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/gif",
  "image/webp",
];

// ✅ File filter
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

// ✅ Memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter,
});

// ✅ Upload image buffer directly to Cloudinary (no disk, no streamifier)
const uploadToCloudinary = async (
  file: Express.Multer.File
): Promise<ICloudinaryResponse> => {
  const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(base64Image, {
    folder: "karlfive223",
    public_id: file.originalname.replace(/\s+/g, "_"),
    resource_type: "image",
  });

  return result as ICloudinaryResponse | any;
};

export const fileUploader = {
  upload,
  uploadToCloudinary,
};
