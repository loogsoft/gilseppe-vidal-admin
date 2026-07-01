export const InscriptionTypeStatusEnum = {
  CUSTOMER: 'CUSTOMER',
  TESTER: 'TESTER',
} as const;

export type InscriptionTypeStatusEnum =
  (typeof InscriptionTypeStatusEnum)[keyof typeof InscriptionTypeStatusEnum];
