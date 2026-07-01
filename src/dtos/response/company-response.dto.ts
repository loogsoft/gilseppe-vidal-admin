import type { InscriptionTypeStatusEnum } from "../enums/inscription-type-status.enum";
import type { SubscriptionStatusEnum } from "../enums/subscription-status.num";

export interface CompanyResponseDto {
  id: string;
  companyName: string;
  companyEmail: string;
  companyPhone: number;
  paymentDueDay: Date;
  subscriptionStatus: SubscriptionStatusEnum;
  inscriptionType: InscriptionTypeStatusEnum;
  companyCpfCnpj: number;
  color: string;
  imageUrl?: string | null;
  date: Date;
}
