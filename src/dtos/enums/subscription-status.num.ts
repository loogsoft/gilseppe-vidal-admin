export const SubscriptionStatusEnum = {
  ACTIVATED: "ACTIVATED",
  DISABLED: "DISABLED",
} as const;

export type SubscriptionStatusEnum =
  (typeof SubscriptionStatusEnum)[keyof typeof SubscriptionStatusEnum];
