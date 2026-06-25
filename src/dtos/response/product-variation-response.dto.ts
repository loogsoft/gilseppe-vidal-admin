import type { ImageResponse } from "./image-response.dto";

export interface ProductVariationResponseDto {
  id: string;
  barCode?: string;
  name: string;
  price?: number;
  stock: number;
  lowStock: number;
  isActive?: boolean;
  activeLowStock?: boolean;
  color: string;
  size: string;
  imageUrl?: string;
  images?: ImageResponse[];
  createdAt: string;
  updatedAt: string;
}
