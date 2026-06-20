import type { SupplierStatus } from "../request/supplier-request.dto";

export interface SupplierResponseDto {
  id: string;
  name: string;
  category?: string;
  email?: string;
  phone?: string;
  location?: string;
  status?: SupplierStatus;
  imageUrl?: string[] | string;
  avatarColor?: string;
  openDiscountStock?: number;
  images?: { url: string }[];
}
