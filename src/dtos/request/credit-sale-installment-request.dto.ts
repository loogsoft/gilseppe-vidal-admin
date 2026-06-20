import type { CreditSaleInstallmentStatusEnum } from "../enums/credit-sale-installment-status.enum";

export interface CreditSaleInstallmentRequestDto {
  creditSaleId: string;
  installmentNumber: number;
  amount: number;
  dueDate: Date | string;
  paidAt?: Date | string | null;
  status: CreditSaleInstallmentStatusEnum;
}
