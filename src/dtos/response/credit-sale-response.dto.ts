import type { CreditSaleStatusEnum } from "../enums/credit-sale-status.enum";
import type { CreditCustomerResponseDto } from "./credit-customer-response.dto";
import type { CreditSaleInstallmentResponseDto } from "./credit-sale-installment-response.dto";
import type { ProductResponse } from "./product-response.dto";

export interface CreditSaleResponseDto {
  id: string;
  totalAmount: number;
  customer: CreditCustomerResponseDto;
  installment: number;
  status: CreditSaleStatusEnum;
  date: Date;
  products: ProductResponse[];
  installments?: CreditSaleInstallmentResponseDto[];
}
