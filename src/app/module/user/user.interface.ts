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
  // ─── Subscription tracking ───────────────────────────────────────────────────
  /** True after the user purchases / activates the Club plan */
  isOrganizer: boolean;
  /** Whether the user has already consumed their one-time 24-hour free trial */
  freeTrialUsed: boolean;
  /** How many private leagues this user has created in the current billing period */
  leaguesCreatedCount: number;
  /** How many private leagues this user has joined in the current billing period */
  leaguesJoinedCount: number;
}
