import type { InscriptionTypeStatusEnum } from "../enums/inscription-type-status.enum";
import type { SubscriptionStatusEnum } from "../enums/subscription-status.num";

export interface CompanyResponseDto {
  id: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  paymentDueDay: Date;
  subscriptionStatus: SubscriptionStatusEnum;
  inscriptionType: InscriptionTypeStatusEnum;
  companyCpfCnpj: string;
  color: string;
  imageUrl?: string | null;
  date: Date;
}
