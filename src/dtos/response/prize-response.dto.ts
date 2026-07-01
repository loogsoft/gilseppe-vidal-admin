export interface PrizeResponseDto {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  quantity: number;
  probability: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
