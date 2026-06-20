export interface CreditCustomerRequestDto {
  customerName: string;
  customerEmail: string;
  CPF: string;
  phone: string;
  road: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  totalAmounts?: number;
}
