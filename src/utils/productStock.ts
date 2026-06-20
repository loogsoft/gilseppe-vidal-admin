import type { ProductResponse } from "../dtos/response/product-response.dto";
import type { ProductVariationResponseDto } from "../dtos/response/product-variation-response.dto";

export type ProductStockEntry = {
  id: string;
  kind: "product" | "variation";
  stock: number;
  lowStock: number;
  lowStockEnabled: boolean;
  variation?: ProductVariationResponseDto;
};

const toStockNumber = (value: number | null | undefined) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

export const productHasVariations = (product: ProductResponse) =>
  Array.isArray(product.variations) && product.variations.length > 0;

export const getActiveVariations = (product: ProductResponse) =>
  productHasVariations(product)
    ? product.variations!.filter((variation) => variation.isActive !== false)
    : [];

export const getProductStockEntries = (
  product: ProductResponse,
): ProductStockEntry[] => {
  if (productHasVariations(product)) {
    return getActiveVariations(product).map((variation) => {
      const configuredLowStock = toStockNumber(variation.lowStock);
      return {
        id: variation.id,
        kind: "variation",
        stock: toStockNumber(variation.stock),
        lowStock:
          variation.activeLowStock === true && configuredLowStock === 0
            ? 5
            : configuredLowStock,
        lowStockEnabled: variation.activeLowStock === true,
        variation,
      };
    });
  }

  return [
    {
      id: product.id,
      kind: "product",
      stock: toStockNumber(product.stock),
      lowStock: toStockNumber(product.lowStock),
      lowStockEnabled: product.activeLowStock === true,
    },
  ];
};

export const getOutOfStockEntries = (product: ProductResponse) =>
  getProductStockEntries(product).filter((entry) => entry.stock === 0);

export const getLowStockEntries = (product: ProductResponse) =>
  getProductStockEntries(product).filter(
    (entry) =>
      entry.lowStockEnabled &&
      entry.lowStock > 0 &&
      entry.stock > 0 &&
      entry.stock <= entry.lowStock,
  );

export const productHasAvailableStock = (product: ProductResponse) =>
  getProductStockEntries(product).some((entry) => entry.stock > 0);

export const getProductTotalStock = (product: ProductResponse) =>
  getProductStockEntries(product).reduce(
    (total, entry) => total + entry.stock,
    0,
  );

export const isProductOutOfStock = (product: ProductResponse) => {
  const entries = getProductStockEntries(product);
  return entries.length === 0 || entries.every((entry) => entry.stock === 0);
};

export const getProductStockLevel = (
  product: ProductResponse,
): "ok" | "low" | "critical" => {
  if (isProductOutOfStock(product)) return "critical";
  if (getLowStockEntries(product).length > 0) return "low";
  return "ok";
};
