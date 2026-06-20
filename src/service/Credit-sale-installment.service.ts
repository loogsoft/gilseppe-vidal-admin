import type { CreditSaleInstallmentRequestDto } from "../dtos/request/credit-sale-installment-request.dto";
import type { CreditSaleInstallmentResponseDto } from "../dtos/response/credit-sale-installment-response.dto";
import api from "./api";

export const CreditSaleInstallmentService = {
  update: async (id: string, dto: CreditSaleInstallmentRequestDto) => {
    const response = await api.put<CreditSaleInstallmentResponseDto>(
      `/credit-sale-installment/${id}`,
      dto,
    );

    return response.data;
  },
};
