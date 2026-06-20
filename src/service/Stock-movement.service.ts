import type { StockMovementRequestDto } from "../dtos/request/stock-movement-request.dto";
import type { StockMovementResponseDto } from "../dtos/response/stock-movement-response.dto";
import api from "./api";

const URL = "/stock-movements";
export const StockMovementService = {
  create: async (
    dto: StockMovementRequestDto,
  ): Promise<StockMovementResponseDto> => {
    const response = await api.post<StockMovementResponseDto>(URL, dto);
    return response.data;
  },

  findAll: async (): Promise<StockMovementResponseDto[]> => {
    const response = await api.get<StockMovementResponseDto[]>(URL);
    return response.data;
  },

  findByVariation: async (
    variationId: string,
  ): Promise<StockMovementRequestDto> => {
    const response = await api.get<StockMovementRequestDto>(
      `${URL}/variation/${variationId}`,
    );
    return response.data;
  },
};
