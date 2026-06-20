export const CreditSaleStatusEnum = {
  PENDING: "PENDING",
  PAID: "PAID",
  LATE: "LATE",
  COMPLETED: "COMPLETED",
};
export type CreditSaleStatusEnum =
  (typeof CreditSaleStatusEnum)[keyof typeof CreditSaleStatusEnum];
