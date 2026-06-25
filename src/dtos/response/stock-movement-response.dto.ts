import type { ProductVariationResponseDto } from "./product-variation-response.dto";
import type { ProductResponse } from "./product-response.dto";

export type StockMovementType = "IN" | "OUT";

export interface StockMovementResponseDto {
  id: string;
  productId?: string;
  variationId?: string;
  product?: ProductResponse | null;
  productName: string;
  variation: ProductVariationResponseDto;
  quantity: number;
  price: string;
  type: StockMovementType;
  reason: string;
  paymentMethod: string;
  responsibleName: string;
  responsibleEmail: string;
  observation?: string;
  createdAt: Date;
}
