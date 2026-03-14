// ─── Subscription Plan Names ─────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  GOLD: 'gold',
  CLUB: 'club',
} as const;

export type SubscriptionPlanType =
  (typeof SUBSCRIPTION_PLANS)[keyof typeof SUBSCRIPTION_PLANS];

// ─── Plan Details ─────────────────────────────────────────────────────────────
export const PLAN_DETAILS: Record<
  SubscriptionPlanType,
  {
    name: string;
    price: number; // USD
    maxJoinLeagues: number | null; // null = unlimited
    maxCreateLeagues: number | null; // null = unlimited
    durationDays: number | null; // 1 = free trial (24 h), 30 = paid plans
    /** Club plan marks the user as an organizer (isOrganizer = true on User) */
    isOrganizerPlan: boolean;
  }
> = {
  free: {
    name: 'Free Trial',
    price: 0,
    maxJoinLeagues: 1,       // can join 1 private league
    maxCreateLeagues: 0,     // cannot create any private league
    durationDays: 1,         // 24 hours
    isOrganizerPlan: false,
  },
  basic: {
    name: 'Basic Plan',
    price: 5.44,
    maxJoinLeagues: 10,
    maxCreateLeagues: 5,
    durationDays: 30,
    isOrganizerPlan: false,
  },
  gold: {
    name: 'Gold Plan',
    price: 13.42,
    maxJoinLeagues: 20,
    maxCreateLeagues: 10,
    durationDays: 30,
    isOrganizerPlan: false,
  },
  club: {
    name: 'Club / Organiser Plan',
    price: 33.58,
    maxJoinLeagues: null,    // unlimited
    maxCreateLeagues: null,  // unlimited
    durationDays: 30,
    isOrganizerPlan: true,
  },
};
