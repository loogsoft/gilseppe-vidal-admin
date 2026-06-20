import { useState, useEffect, useRef } from "react";
import { X, DollarSign, Tag, ArrowUpDown } from "lucide-react";
import styles from "./FilterModal.module.css";
import type { CategoryKey } from "../../types/Product-type";

type SortOption = "price-asc" | "price-desc" | "name-asc" | null;

type FilterModalFilters<TCategory extends string = CategoryKey> = {
  minPrice: string;
  maxPrice: string;
  category: TCategory;
  sortBy: SortOption;
};

type FilterModalProps<TCategory extends string = CategoryKey> = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterModalFilters<TCategory>) => void;
  categories: Array<{ key: TCategory; label: string }>;
  initialFilters?: FilterModalFilters<TCategory>;
};

export function FilterModal<TCategory extends string = CategoryKey>({
  isOpen,
  onClose,
  onApply,
  categories,
  initialFilters,
}: FilterModalProps<TCategory>) {
  const [minPrice, setMinPrice] = useState(initialFilters?.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(initialFilters?.maxPrice || "");
  const [category, setCategory] = useState<TCategory>(
    initialFilters?.category || ("all" as TCategory),
  );
  const [sortBy, setSortBy] = useState<SortOption>(
    initialFilters?.sortBy || null,
  );
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && initialFilters) {
      // Reabre o formulário com os filtros atualmente aplicados pelo usuário.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMinPrice(initialFilters.minPrice);
      setMaxPrice(initialFilters.maxPrice);
      setCategory(initialFilters.category);
      setSortBy(initialFilters.sortBy);
    }
  }, [isOpen, initialFilters]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
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
    setCategory("all" as TCategory);
    setSortBy(null);
  };

  const handleApply = () => {
    onApply({ minPrice, maxPrice, category, sortBy });
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

        {/* Categoria */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Tag size={16} />
            <span className={styles.sectionTitle}>Categoria</span>
          </div>
          <select
            className={styles.select}
            value={category}
            onChange={(e) => setCategory(e.target.value as TCategory)}
          >
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
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
                value="price-desc"
                checked={sortBy === "price-desc"}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.radio}
              />
              <span>Maior Preço</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="sortBy"
                value="price-asc"
                checked={sortBy === "price-asc"}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.radio}
              />
              <span>Menor Preço</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="sortBy"
                value="name-asc"
                checked={sortBy === "name-asc"}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={styles.radio}
              />
              <span>Nome A-Z</span>
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
