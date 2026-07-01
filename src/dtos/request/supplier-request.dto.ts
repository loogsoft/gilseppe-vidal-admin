export type SupplierStatus = "active" | "inactive";

export interface SupplierRequestDto {
  name: string;
  category?: string;
  email?: string;
  phone?: string;
  location?: string;
  status?: SupplierStatus;
  avatarColor?: string;
  openOrders?: number;
}
