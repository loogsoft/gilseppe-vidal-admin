export const ProductCategoryEnum = {
  SHIRT: "Camisa",
  TSHIRT: "Camiseta",
  POLO: "Polo",
  SHORTS: "Shorts",
  JACKET: "Jaqueta",
  PANTS: "Calça",
  DRESS: "Vestido",
  SWEATER: "Suéter",
  HOODIE: "Moletom",
  UNDERWEAR: "Cueca",
  FOOTWEAR: "Calçado",
  BELT: "Cinto",
  WALLET: "Carteira",
  SUNGLASSES: "Óculos",
  PHONE: "Fone",
} as const;
export type ProductCategoryEnum =
  (typeof ProductCategoryEnum)[keyof typeof ProductCategoryEnum];
