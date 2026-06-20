import type { CreditSaleStatusEnum } from "../enums/credit-sale-status.enum";

export interface CreditSaleRequestDto {
  totalAmount: number,
  customerId: string,
  installment: number,
  status: CreditSaleStatusEnum,
  date: Date,
  productIds: string[],
}
