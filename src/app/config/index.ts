import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  database_url: process.env.MONGO_URI,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt: {
    secret: process.env.JWT_SECRET,
    expires_in: process.env.JWT_EXPIRES_IN,

    access_secret: process.env.ACCESS_TOKEN_SECRET,
    access_expires_in: process.env.ACCESS_TOKEN_EXPIRES,
    refresh_secret: process.env.REFRESH_TOKEN_SECRET,
    refresh_expires_in: process.env.REFRESH_TOKEN_EXPIRES,
  },
  sendMail: {
    host: process.env.EMAIL_HOST,
    email_port: process.env.EMAIL_PORT,
    email: process.env.EMAIL_ADDRESS,
    password: process.env.EMAIL_PASS,
    email_from: process.env.EMAIL_FROM,
  },
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
};
