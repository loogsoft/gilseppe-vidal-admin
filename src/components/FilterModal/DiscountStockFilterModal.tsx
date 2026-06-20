import { useState, useEffect, useRef } from "react";
import { X, DollarSign, Package, ArrowUpDown, AlertTriangle } from "lucide-react";
import styles from "./FilterModal.module.css";

type StockLevel = "all" | "ok" | "low" | "critical";
type SortOption = "alpha" | "priceAsc" | "priceDesc" | "stockAsc" | "stockDesc";

type DiscountStockFilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: {
    minPrice: string;
    maxPrice: string;
    minStock: string;
    maxStock: string;
    stockLevel: StockLevel;
    sortBy: SortOption;
  }) => void;
  initialFilters?: {
    minPrice: string;
    maxPrice: string;
    minStock: string;
    maxStock: string;
    stockLevel: StockLevel;
    sortBy: SortOption;
  };
};

export function DiscountStockFilterModal({
  isOpen,
  onClose,
  onApply,
  initialFilters,
}: DiscountStockFilterModalProps) {
  const [minPrice, setMinPrice] = useState(initialFilters?.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(initialFilters?.maxPrice || "");
  const [minStock, setMinStock] = useState(initialFilters?.minStock || "");
  const [maxStock, setMaxStock] = useState(initialFilters?.maxStock || "");
  const [stockLevel, setStockLevel] = useState<StockLevel>(
    initialFilters?.stockLevel || "all",
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    initialFilters?.sortBy || "alpha",
  );
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialFilters) {
      // Reabre o formulário com os filtros atualmente aplicados pelo usuário.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMinPrice(initialFilters.minPrice);
      setMaxPrice(initialFilters.maxPrice);
      setMinStock(initialFilters.minStock);
      setMaxStock(initialFilters.maxStock);
      setStockLevel(initialFilters.stockLevel);
      setSortBy(initialFilters.sortBy);
    }
  }, [isOpen, initialFilters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleClear = () => {
    setMinPrice("");
    setMaxPrice("");
    setMinStock("");
    setMaxStock("");
    setStockLevel("all");
    setSortBy("alpha");
  };

  const handleApply = () => {
    onApply({ minPrice, maxPrice, minStock, maxStock, stockLevel, sortBy });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className={styles.modal}>
      <div className={styles.header}>
        <h2 className={styles.title}>Filtros Avançados</h2>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      <div className={styles.content}>
        {/* Faixa de Preço */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <DollarSign size={16} />
            <span className={styles.sectionTitle}>Faixa de Preço</span>
          </div>
          <div className={styles.priceInputs}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Preço Mínimo</label>
              <input
                type="number"
                placeholder="R$ 0,00"
                className={styles.input}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Preço Máximo</label>
              <input
                type="number"
                placeholder="R$ 1.000,00"
                className={styles.input}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        {/* Faixa de Estoque */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Package size={16} />
            <span className={styles.sectionTitle}>Quantidade em Estoque</span>
          </div>
          <div className={styles.priceInputs}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Estoque Mínimo</label>
              <input
                type="number"
                placeholder="0"
                className={styles.input}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                min="0"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Estoque Máximo</label>
              <input
                type="number"
                placeholder="100"
                className={styles.input}
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Nível de Estoque */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <AlertTriangle size={16} />
            <span className={styles.sectionTitle}>Nível de Estoque</span>
          </div>
          <select
            className={styles.select}
            value={stockLevel}
            onChange={(e) => setStockLevel(e.target.value as StockLevel)}
          >
            <option value="all">Todos os níveis</option>
            <option value="ok">Normal</option>
            <option value="low">Baixo</option>
            <option value="critical">Crítico</option>
          </select>
        </div>

        {/* Ordenar por */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <ArrowUpDown size={16} />
            <span className={styles.sectionTitle}>Ordenar por</span>
          </div>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="sortBy"
                value="alpha"
                checked={sortBy === "alpha"}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.radio}
              />
              <span>Nome A-Z</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="sortBy"
                value="priceDesc"
                checked={sortBy === "priceDesc"}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.radio}
              />
              <span>Maior Preço</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="sortBy"
                value="priceAsc"
                checked={sortBy === "priceAsc"}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.radio}
              />
              <span>Menor Preço</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="sortBy"
                value="stockDesc"
                checked={sortBy === "stockDesc"}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.radio}
              />
              <span>Maior Estoque</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="sortBy"
                value="stockAsc"
                checked={sortBy === "stockAsc"}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.radio}
              />
              <span>Menor Estoque</span>
            </label>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <button className={styles.clearBtn} onClick={handleClear}>
          Limpar Filtros
        </button>
        <button className={styles.applyBtn} onClick={handleApply}>
          Aplicar Filtros
        </button>
      </div>
    </div>
  );
}
