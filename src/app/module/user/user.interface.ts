export interface IUser {
  name: string;
  email: string;
  password: string;
  profileImage?: string;
  role: "player" | "manager" | "admin";
  isVerified: boolean;
  phoneNumber: string;
  gender: "Male" | "Female" | "Other";
  otp?: string;
  otpExpiry?: Date;
}
