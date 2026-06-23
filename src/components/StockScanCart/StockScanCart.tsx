import { Barcode, Minus, Package, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import { getProductTotalStock } from "../../utils/productStock";
import styles from "./StockScanCart.module.css";

export type StockScanCartItem = {
  product: ProductResponse;
  quantity: number;
};

type StockScanCartProps = {
  isOpen: boolean;
  items: StockScanCartItem[];
  onClose: () => void;
  onChangeQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
};

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function StockScanCart({
  isOpen,
  items,
  onClose,
  onChangeQuantity,
  onRemove,
}: StockScanCartProps) {
  if (!isOpen) return null;

  const totalUnits = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <aside
      className={styles.drawer}
      role="dialog"
      aria-modal="false"
      aria-labelledby="scan-cart-title"
    >
      <header className={styles.header}>
        <div className={styles.headingIcon}>
          <ShoppingCart size={20} aria-hidden="true" />
        </div>
        <div className={styles.headingText}>
          <span className={styles.eyebrow}>BAIXA EM LOTE</span>
          <h2 id="scan-cart-title">Produtos selecionados</h2>
        </div>
        <button
          className={styles.closeButton}
          type="button"
          onClick={onClose}
          aria-label="Fechar produtos selecionados"
        >
          <X size={18} />
        </button>
      </header>

      <div className={styles.scanHint}>
        <Barcode size={17} aria-hidden="true" />
        <span>Continue lendo códigos para adicionar mais produtos.</span>
      </div>

      <div className={styles.items}>
        {items.map(({ product, quantity }) => {
          const maxStock = getProductTotalStock(product);
          const imageUrl = product.images?.[0]?.url;

          return (
            <article className={styles.item} key={product.id}>
              <div className={styles.productImage}>
                {imageUrl ? (
                  <img src={imageUrl} alt="" />
                ) : (
                  <Package size={22} aria-hidden="true" />
                )}
              </div>

              <div className={styles.productContent}>
                <div className={styles.productHeader}>
                  <div>
                    <strong>{product.name}</strong>
                    <span>{product.barCode || product.id}</span>
                  </div>
                  <button
                    className={styles.removeButton}
                    type="button"
                    onClick={() => onRemove(product.id)}
                    aria-label={`Remover ${product.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className={styles.itemFooter}>
                  <div className={styles.quantityControl}>
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(product.id, quantity - 1)}
                      aria-label={`Diminuir quantidade de ${product.name}`}
                    >
                      <Minus size={13} />
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => onChangeQuantity(product.id, quantity + 1)}
                      disabled={quantity >= maxStock}
                      aria-label={`Aumentar quantidade de ${product.name}`}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className={styles.stockInfo}>
                    <strong>{formatCurrency(Number(product.price || 0))}</strong>
                    <span>{maxStock} em estoque</span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <footer className={styles.footer}>
        <div className={styles.summary}>
          <span>{items.length} produto{items.length === 1 ? "" : "s"}</span>
          <strong>{totalUnits} unidade{totalUnits === 1 ? "" : "s"}</strong>
        </div>
        <button
          className={styles.confirmButton}
          type="button"
          disabled={items.length === 0}
        >
          Confirmar baixa
        </button>
      </footer>
    </aside>
  );
}
