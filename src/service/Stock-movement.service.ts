import type { StockMovementRequestDto } from "../dtos/request/stock-movement-request.dto";
import type { StockOperationResponseDto } from "../dtos/response/stock-operation-response.dto";
import type { StockMovementResponseDto } from "../dtos/response/stock-movement-response.dto";
import api from "./api";

const URL = "/stock-movements";
const OPERATION_URL = "/stock-operations";

const cleanPayload = (dto: StockMovementRequestDto): StockMovementRequestDto => ({
  ...dto,
  creditCustomerId:
    dto.paymentMethod === "Crediario" ? dto.creditCustomerId : undefined,
  installment: dto.paymentMethod === "Crediario" ? dto.installment : undefined,
  items: dto.items.map((item) => ({
    productId: item.productId,
    variationId: item.variationId,
    quantity: Number(item.quantity),
    productName: item.productName,
    price: item.price,
  })),
});

export const StockMovementService = {
  create: async (
    dto: StockMovementRequestDto,
  ): Promise<StockOperationResponseDto> => {
    const response = await api.post<StockOperationResponseDto>(
      OPERATION_URL,
      cleanPayload(dto),
    );
    return response.data;
  },

  findAll: async (): Promise<StockMovementResponseDto[]> => {
    const response = await api.get<StockMovementResponseDto[]>(URL);
    return response.data;
  },

  findAllOperations: async (): Promise<StockOperationResponseDto[]> => {
    const response = await api.get<StockOperationResponseDto[]>(OPERATION_URL);
    return response.data;
  },

  findOperationById: async (id: string): Promise<StockOperationResponseDto> => {
    const response = await api.get<StockOperationResponseDto>(
      `${OPERATION_URL}/${id}`,
    );
    return response.data;
  },

  findByVariation: async (
    variationId: string,
  ): Promise<StockMovementResponseDto[]> => {
    const response = await api.get<StockMovementResponseDto[]>(
      `${URL}/variation/${variationId}`,
    );
    return response.data;
  },
};
