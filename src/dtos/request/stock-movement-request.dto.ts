export type StockMovementType = "IN" | "OUT";

export interface StockMovementItemRequestDto {
  productId?: string;
  variationId?: string;
  quantity: number;
  productName?: string;
  price?: string;
}

export interface StockMovementRequestDto {
  companyId?: string;
  creditCustomerId?: string;
  installment?: number;
  items: StockMovementItemRequestDto[];
  type: StockMovementType;
  reason: string;
  paymentMethod: string;
  responsibleName: string;
  responsibleEmail: string;
  observation?: string;
}
