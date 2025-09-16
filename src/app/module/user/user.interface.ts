export interface IUser {
  name: string;
  email: string;
  password: string;
  profileImage?: string;
  role: "player" | "manager" | "admin" | "referee";
  isVerified: boolean;
  phoneNumber: string;
  gender: "Male" | "Female" | "Other";
  otp?: string;
  otpExpiry?: Date;
  reset_otp?: string;
  reset_otpExpiry?: Date;
  playingLevel:
    | "Beginner"
    | "Intermediate"
    | "Intermediate high"
    | "Advance"
    | "Pro";
  clubAffiliation?: string;
  birthday?: Date;
  refreshToken?: string;
}
