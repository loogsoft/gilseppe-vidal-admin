import type { CreditCustomerRequestDto } from "../dtos/request/credit-customer-request.dto";
import type { CreditCustomerResponseDto } from "../dtos/response/credit-customer-response.dto";
import api from "./api";

export const CreditCustomerService = {
  create: async (dto: CreditCustomerRequestDto) => {
    const response = await api.post<CreditCustomerResponseDto>("/credit-customer", dto);
    return response.data;
  },

  findOne: async (id: string): Promise<CreditCustomerResponseDto> => {
    const response = await api.get<CreditCustomerResponseDto>(`/credit-customer/${id}`);
    return response.data;
  },

  update: async (
    id: string,
    dto: CreditCustomerRequestDto,
  ): Promise<CreditCustomerResponseDto> => {
    const response = await api.put<CreditCustomerResponseDto>(
      `/credit-customer/${id}`,
      dto,
    );
    return response.data;
  },

  findAll: async (): Promise<CreditCustomerResponseDto[]> => {
    const response = await api.get<CreditCustomerResponseDto[]>("/credit-customer");
    return response.data;
  },
};
