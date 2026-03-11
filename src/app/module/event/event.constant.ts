// ─── Event Status ─────────────────────────────────────────────────────────────
export const EVENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  DECLINED: 'declined',
} as const;

export type EventStatusType = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

// ─── OTP Configuration ────────────────────────────────────────────────────────
export const EVENT_OTP_CONFIG = {
  /** OTP length in characters */
  OTP_LENGTH: 6,
  /** Generate numeric OTP */
  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
};
