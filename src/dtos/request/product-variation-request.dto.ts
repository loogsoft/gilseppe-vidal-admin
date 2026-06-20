export interface ProductVariationRequestDto {
  name?: string;
  price?: number;
  stock: number;
  isActive?: boolean;
  activeLowStock?: boolean;
  color: string;
  size: string;
  images?: File[];
  imageUrl?: string;
  lowStock?: number;
}
