import type { StockMovementResponseDto, StockMovementType } from "./stock-movement-response.dto";

export interface StockOperationResponseDto {
  id: string;
  companyId?: string;
  type: StockMovementType;
  reason: string;
  paymentMethod: string;
  responsibleName: string;
  responsibleEmail: string;
  observation?: string;
  movements: StockMovementResponseDto[];
  createdAt: Date;
}
