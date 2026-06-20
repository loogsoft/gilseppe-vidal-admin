import type { CreditSaleRequestDto } from "../dtos/request/credit-sale-request.dto";
import type { CreditSaleResponseDto } from "../dtos/response/credit-sale-response.dto";
import api from "./api";

export const CreditSaleService = {
  create: async (dto: CreditSaleRequestDto) => {
    const response = await api.post<CreditSaleResponseDto>("/credit-sale", dto);
    return response.data;
  },

  findAll: async (): Promise<CreditSaleResponseDto[]> => {
    const response = await api.get<CreditSaleResponseDto[]>("/credit-sale");
    return response.data;
  },

  findOne: async (id: string): Promise<CreditSaleResponseDto> => {
    const response = await api.get<CreditSaleResponseDto>(`/credit-sale/${id}`);
    return response.data;
  },
};
