export type StockMovementType = "IN" | "OUT";

export interface StockMovementRequestDto {
  productName: string;
  price: string;
  variationId: string;
  quantity: number;
  type: StockMovementType;
  reason: string;
  paymentMethod: string;
  responsibleName: string;
  responsibleEmail: string;
  observation?: string;
}
