import type { CreditSaleInstallmentStatusEnum } from "../enums/credit-sale-installment-status.enum";
import type { CreditSaleResponseDto } from "./credit-sale-response.dto";

export interface CreditSaleInstallmentResponseDto {
  id: string | number;
  installmentNumber: number;
  creditSale?: CreditSaleResponseDto;
  amount: number | string;
  dueDate: Date | string;
  paidAt?: Date | string | null;
  status: CreditSaleInstallmentStatusEnum;
}
