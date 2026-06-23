import type { CompanyRequestDto } from "../dtos/request/company-request.dto";
import type { CompanyResponseDto } from "../dtos/response/company-response.dto";
import api from "./api";

export const CompanyService = {
  uploadLogo: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<{ url: string }>("/upload", formData);
    return response.data.url;
  },

  create: async (dto: CompanyRequestDto) => {
    const response = await api.post("/company", dto);
    return response.data;
  },

  update: async (companyId: string, dto: Partial<CompanyRequestDto>) => {
    const response = await api.patch<CompanyResponseDto>(`/company/${companyId}`, dto);
    return response.data;
  },

  findOne: async (id: string): Promise<CompanyResponseDto> => {
    const response = await api.get<CompanyResponseDto>(`/company/${id}`);
    return response.data;
  },

  findAll: async (): Promise<CompanyResponseDto[]> => {
    const response = await api.get<CompanyResponseDto[]>(`/company`);
    return response.data;
  },
};
