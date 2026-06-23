export interface CompanyResponseDto {
  id: string;
  companyName: string;
  companyEmail: string;
  companyPhone: number;
  companyCpfCnpj: number;
  color: string;
  imageUrl?: string | null;
  date: Date;
}
