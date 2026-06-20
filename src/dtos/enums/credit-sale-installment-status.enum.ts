export const CreditSaleInstallmentStatusEnum = {
  PENDING: "PENDING",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
};

export type CreditSaleInstallmentStatusEnum =
  (typeof CreditSaleInstallmentStatusEnum)[keyof typeof CreditSaleInstallmentStatusEnum];
