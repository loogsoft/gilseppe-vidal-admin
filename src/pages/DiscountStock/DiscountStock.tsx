import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./DiscountStock.module.css";
import {
  FiDollarSign,
  FiFilter,
  FiPackage,
  FiSearch,
  FiShoppingBag,
} from "react-icons/fi";
import StatCard from "../../components/StatCard/StatCard";
import { CustomSelect } from "../../components/CustomSelect/CustomSelect";
import EntityCard from "../../components/EntityCard/EntityCard";
import { SkeletonCard } from "../../components/SkeletonCard/SkeletonCard";
import { ProductService } from "../../service/Product.service";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import type { StockMovementResponseDto } from "../../dtos/response/stock-movement-response.dto";
import type { StockOperationResponseDto } from "../../dtos/response/stock-operation-response.dto";
import { ProductStatusEnum } from "../../dtos/enums/product-status.enum";
import {
  ReturnStockModal,
  type StockHistoryItem,
} from "../../components/ReturnaStockModal/ReturnStockModal";
import { StockMovementService } from "../../service/Stock-movement.service";
import { DiscountStockFilterModal } from "../../components/FilterModal/DiscountStockFilterModal";
import {
  getProductStockEntries,
  productHasAvailableStock,
  type ProductStockEntry,
} from "../../utils/productStock";
import { Barcode } from "lucide-react";
import { toast } from "react-toastify";
import {
  StockScanCart,
  type StockScanCartItem,
  type StockScanOperationData,
} from "../../components/StockScanCart/StockScanCart";
import { useAuth } from "../../contexts/useAuth";
import { useMessageContext } from "../../contexts/useMessageContext";
import { StockOperationsTable } from "../../components/StockOperationsTable/StockOperationsTable";
type StockLevel = "all" | "ok" | "low" | "critical";
type SortOption = "alpha" | "priceAsc" | "priceDesc" | "stockAsc" | "stockDesc";
type StockSearchResult =
  | { product: ProductResponse; entry: ProductStockEntry }
  | "requires-variation"
  | null;
type DiscountStockCardItem = {
  product: ProductResponse;
  entry: ProductStockEntry;
};

const getStockItemLabel = (entry: ProductStockEntry) => {
  if (entry.kind === "product") return "Produto principal";

  return [entry.variation?.color, entry.variation?.size]
    .filter(Boolean)
    .join(" • ");
};

const getStockEntryLevel = (
  entry: ProductStockEntry,
): "ok" | "low" | "critical" => {
  if (entry.stock <= 0) return "critical";
  if (
    entry.lowStockEnabled &&
    entry.lowStock > 0 &&
    entry.stock <= entry.lowStock
  ) {
    return "low";
  }
  return "ok";
};

const getStockEntryPrice = (
  product: ProductResponse,
  entry: ProductStockEntry,
) => Number(entry.variation?.price ?? product.price ?? 0);

const getStockCardSearchText = ({ product, entry }: DiscountStockCardItem) =>
  [
    product.id,
    product.name,
    product.description,
    product.category,
    product.barCode,
    entry.id,
    entry.variation?.name,
    entry.variation?.barCode,
    entry.variation?.color,
    entry.variation?.size,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const getStockCardImages = (
  product: ProductResponse,
  entry: ProductStockEntry,
) => {
  const variationImageUrl = Array.isArray(entry.variation?.imageUrl)
    ? entry.variation?.imageUrl[0]
    : entry.variation?.imageUrl;

  if (variationImageUrl) {
    return [
      {
        url: variationImageUrl,
        fileName: entry.variation?.name || product.name,
        id: entry.variation?.id || product.id,
        isPrimary: true,
      },
    ];
  }

  return product.images || [];
};

export function DiscountStock() {
  const { user } = useAuth();
  const { checkStockAndNotify } = useMessageContext();
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [voltarEstoqueItem, setVoltarEstoqueItem] =
    useState<StockHistoryItem | null>(null);
  const [stockHistory, setStockHistory] =
    useState<StockMovementResponseDto[]>([]);
  const [stockOperations, setStockOperations] = useState<
    StockOperationResponseDto[]
  >([]);
  const [search, setSearch] = useState("");
  const stockSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [scanCartItems, setScanCartItems] = useState<StockScanCartItem[]>([]);
  const [isScanCartOpen, setIsScanCartOpen] = useState(false);
  const [scanCartLoading, setScanCartLoading] = useState(false);
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"stock" | "history">("stock");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activedFindAll, setActivedFindAll] = useState(false);
  function alternValue() {
    setActivedFindAll((prev) => !prev);
  }
  const [filters, setFilters] = useState<{
    minPrice: string;
    maxPrice: string;
    minStock: string;
    maxStock: string;
    stockLevel: StockLevel;
    sortBy: SortOption;
  }>({
    minPrice: "",
    maxPrice: "",
    minStock: "",
    maxStock: "",
    stockLevel: "all",
    sortBy: "alpha",
  });

  const totalVendas = useMemo(
    () => stockHistory.reduce((acc, h) => acc + h.quantity, 0),
    [stockHistory],
  );
  // ...existing code...

  const formatDate = (date: Date) => {
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const months = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];

    return `${weekdays[date.getDay()]}, ${String(date.getDate()).padStart(
      2,
      "0",
    )} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await ProductService.findAll();
        setProducts(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [activedFindAll]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await StockMovementService.findAllOperations();
        setStockOperations(data);
        setStockHistory(data.flatMap((operation) => operation.movements ?? []));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [activedFindAll]);

  const LISTPAG: { value: number }[] = useMemo(
    () => [{ value: 6 }, { value: 12 }, { value: 24 }, { value: 48 }],
    [],
  );

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category))).sort();
    return [
      { value: "all", label: `Todos ${products.length}` },
      ...unique.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [products]);

  const stockCardItems = useMemo<DiscountStockCardItem[]>(
    () =>
      products.flatMap((product) =>
        getProductStockEntries(product)
          .filter((entry) => entry.stock > 0)
          .map((entry) => ({ product, entry })),
      ),
    [products],
  );

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = stockCardItems.filter((item) => {
      const { product, entry } = item;
      const matchesSearch = term
        ? getStockCardSearchText(item).includes(term)
        : true;

      const matchesCategory =
        category === "all" ? true : product.category === category;

      const price = getStockEntryPrice(product, entry);
      const matchesPrice =
        (!filters.minPrice || price >= Number(filters.minPrice)) &&
        (!filters.maxPrice || price <= Number(filters.maxPrice));

      const matchesStock =
        (!filters.minStock || entry.stock >= Number(filters.minStock)) &&
        (!filters.maxStock || entry.stock <= Number(filters.maxStock));

      const level = getStockEntryLevel(entry);
      const matchesLevel =
        filters.stockLevel === "all" || level === filters.stockLevel;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPrice &&
        matchesStock &&
        matchesLevel
      );
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (filters.sortBy === "priceAsc")
        return (
          getStockEntryPrice(a.product, a.entry) -
          getStockEntryPrice(b.product, b.entry)
        );
      if (filters.sortBy === "priceDesc")
        return (
          getStockEntryPrice(b.product, b.entry) -
          getStockEntryPrice(a.product, a.entry)
        );
      if (filters.sortBy === "stockAsc") return a.entry.stock - b.entry.stock;
      if (filters.sortBy === "stockDesc") return b.entry.stock - a.entry.stock;
      return (
        a.product.name.localeCompare(b.product.name, "pt-BR") ||
        getStockItemLabel(a.entry).localeCompare(
          getStockItemLabel(b.entry),
          "pt-BR",
        )
      );
    });

    return sorted;
  }, [search, category, filters, stockCardItems]);

  useEffect(() => {
    setPage(1);
  }, [view, search, category, filters]);

  const totalResults = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedStockItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  const createScanCartItem = (
    product: ProductResponse,
    entry: ProductStockEntry,
  ): StockScanCartItem => ({
    product,
    stockItemId: entry.id,
    stockItemType: entry.kind,
    stockItemLabel: getStockItemLabel(entry) || entry.variation?.name || "-",
    maxStock: entry.stock,
    unitPrice: Number(entry.variation?.price ?? product.price ?? 0),
    imageUrl: entry.variation?.imageUrl || product.images?.[0]?.url,
    barCode:
      entry.kind === "variation" ? entry.variation?.barCode : product.barCode,
    quantity: 1,
  });

  const addStockEntryToScanCart = (
    product: ProductResponse,
    entry: ProductStockEntry,
  ) => {
    const itemToAdd = createScanCartItem(product, entry);

    setScanCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.stockItemId === itemToAdd.stockItemId,
      );

      if (existingItem && existingItem.quantity >= itemToAdd.maxStock) {
        toast.warning("A quantidade selecionada atingiu o estoque disponível.");
        return currentItems;
      }

      if (existingItem) {
        return currentItems.map((item) =>
          item.stockItemId === itemToAdd.stockItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentItems, itemToAdd];
    });

    setIsScanCartOpen(true);
    setSearch("");
    requestAnimationFrame(() => stockSearchInputRef.current?.focus());
  };

  const handleStockCardDiscount = (
    product: ProductResponse,
    entry: ProductStockEntry,
  ) => {
    if (entry.stock <= 0) {
      toast.warning("Produto sem estoque disponível para baixa.");
      return;
    }

    addStockEntryToScanCart(product, entry);
  };

  const resolveStockEntryFromSearch = (term: string): StockSearchResult => {
    for (const product of products) {
      if (!productHasAvailableStock(product)) continue;

      const entries = getProductStockEntries(product).filter(
        (entry) => entry.stock > 0,
      );

      const variationMatch = entries.find(
        (entry) =>
          entry.kind === "variation" &&
          (entry.id.toLowerCase() === term ||
            entry.variation?.barCode?.trim().toLowerCase() === term),
      );

      if (variationMatch) {
        return { product, entry: variationMatch };
      }

      const productMatches =
        product.id.toLowerCase() === term ||
        product.barCode?.trim().toLowerCase() === term;

      if (!productMatches) continue;

      if (entries.length === 1) {
        return { product, entry: entries[0] };
      }

      return "requires-variation";
    }

    return null;
  };

  const handleScanSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    const term = search.trim().toLowerCase();
    if (!term) return;

    const resolved = resolveStockEntryFromSearch(term);
    const fallbackResolved =
      resolved === null && filteredItems.length === 1
        ? (() => {
            const item = filteredItems[0];
            return { product: item.product, entry: item.entry };
          })()
        : resolved;

    if (fallbackResolved === "requires-variation") {
      toast.warning(
        "Esse produto possui variações. Leia o código da variação ou use a baixa manual.",
      );
      return;
    }

    if (!fallbackResolved) {
      toast.error("Nenhum produto encontrado para este código.");
      return;
    }

    addStockEntryToScanCart(fallbackResolved.product, fallbackResolved.entry);
  };

  const changeScanCartQuantity = (stockItemId: string, quantity: number) => {
    setScanCartItems((currentItems) =>
      currentItems
        .map((item) => {
          if (item.stockItemId !== stockItemId) return item;
          return { ...item, quantity: Math.min(quantity, item.maxStock) };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const handleConfirmScanCart = async (data: StockScanOperationData) => {
    if (scanCartItems.length === 0 || scanCartLoading) return;

    const operatorEmail = user?.email ?? "";
    if (!operatorEmail) {
      toast.error("Usuário sem e-mail para registrar a operação.");
      return;
    }

    try {
      setScanCartLoading(true);
      const discountPercent = Math.min(
        Math.max(Number(data.discountPercent ?? 0), 0),
        100,
      );
      const discountMultiplier = 1 - discountPercent / 100;
      await StockMovementService.create({
        creditCustomerId:
          data.paymentMethod === "Crediario"
            ? data.creditCustomerId
            : undefined,
        installment:
          data.paymentMethod === "Crediario" ? data.installment : undefined,
        items: scanCartItems.map((item) => ({
          productId:
            item.stockItemType === "product" ? item.stockItemId : undefined,
          variationId:
            item.stockItemType === "variation" ? item.stockItemId : undefined,
          quantity: item.quantity,
          productName: item.product.name,
          price: String(
            Number(
              (item.unitPrice * item.quantity * discountMultiplier).toFixed(2),
            ),
          ),
        })),
        type: "OUT",
        reason: data.reason,
        paymentMethod: data.paymentMethod,
        responsibleName: data.responsibleName,
        responsibleEmail: operatorEmail,
        observation: data.observation,
      });

      await checkStockAndNotify();
      setScanCartItems([]);
      setIsScanCartOpen(false);
      alternValue();
      toast.success("Baixa em lote registrada com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao registrar baixa em lote. Tente novamente.");
    } finally {
      setScanCartLoading(false);
    }
  };

  // Calcula o faturamento total
  const faturamento = useMemo(() => {
    return stockHistory.reduce(
      (acc, h) =>
        acc + Number(h.price || h.variation?.price || 0) * h.quantity,
      0,
    );
  }, [stockHistory]);

  const faturamentoFormatted = useMemo(() => {
    return faturamento.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }, [faturamento]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dar baixa no estoque</h1>
          <p className={styles.subtitle}>
            Registre saidas, ajuste quantidades e acompanhe o historico.
          </p>
        </div>
        <div className={styles.headerMeta}>
          <div className={styles.date}>{formatDate(new Date())}</div>
          <button className={styles.primaryBtn} type="button">
            Baixa manual
          </button>
        </div>
      </header>

      <section className={styles.metrics}>
        <StatCard
          label="Total de produtos"
          value={products.length}
          sub="Produtos cadastrados"
          icon={<FiPackage />}
          iconColor="#EFF6FF"
          iconBackgroundColor="#3B82F6"
          valueColor="#3B82F6"
        />
        <StatCard
          label="Total de vendas"
          value={`${totalVendas} un`}
          sub="Unidades vendidas"
          icon={<FiShoppingBag />}
        />
        <StatCard
          label="Faturamento"
          value={faturamentoFormatted}
          sub="Valor em vendas"
          icon={<FiDollarSign />}
          iconColor="#ECFDF5"
          iconBackgroundColor="#059669"
          valueColor="#059669"
        />
      </section>

      <section className={styles.tabs}>
        <button
          className={`${styles.tab} ${view === "stock" ? styles.tabActive : ""}`}
          type="button"
          onClick={() => setView("stock")}
        >
          Produtos em estoque
        </button>
        <button
          className={`${styles.tab} ${view === "history" ? styles.tabActive : ""}`}
          type="button"
          onClick={() => setView("history")}
        >
          Historico de baixas
        </button>
      </section>

      {view === "stock" ? (
        <section className={styles.tablePanel}>
          <div className={styles.filters}>
            <div className={styles.searchGroup}>
              <div className={`${styles.search} ${styles.stockSearch}`}>
                <FiSearch className={styles.searchIcon} />
                <input
                  ref={stockSearchInputRef}
                  className={styles.searchInput}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Busque por produto ou leia o código de barras"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={handleScanSearchKeyDown}
                />
                <button
                  className={styles.barcodeAction}
                  type="button"
                  onClick={() => stockSearchInputRef.current?.focus()}
                  aria-label="Posicionar cursor para leitura do código de barras"
                  title="Usar leitor de código de barras"
                >
                  <Barcode size={17} aria-hidden="true" />
                  <span>Ler código</span>
                </button>
              </div>
              <CustomSelect
                options={LISTPAG.map((c) => ({
                  value: String(c.value),
                  label: String(c.value),
                }))}
                value={String(pageSize)}
                onChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              />
            </div>
            <div className={styles.filterActions}>
              <CustomSelect
                options={categories}
                value={category}
                onChange={(value) => setCategory(value)}
              />
              <div style={{ position: "relative" }}>
                <button
                  className={styles.filterBtn}
                  type="button"
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  <FiFilter />
                  Filtros
                </button>
                <DiscountStockFilterModal
                  isOpen={isFilterModalOpen}
                  onClose={() => setIsFilterModalOpen(false)}
                  onApply={(newFilters) => {
                    setFilters(newFilters);
                    setPage(1);
                  }}
                  initialFilters={filters}
                />
              </div>
            </div>
          </div>
          <div className={styles.cardGrid}>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            ) : pagedStockItems.length === 0 ? (
              <div className={styles.emptyState}>
                <FiPackage className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>
                  Nenhum produto em promoção
                </h3>
                <p className={styles.emptySubtitle}>
                  Adicione produtos ao estoque promocional.
                </p>
              </div>
            ) : (
              pagedStockItems.map((item) => {
                const { product, entry } = item;
                const variation = entry.variation;
                const cardColor = variation?.color ?? product.color;
                const cardSize = variation?.size ?? product.size;
                const variationHasOwnPrice =
                  entry.kind === "variation" && variation?.price != null;

                return (
                  <EntityCard
                    key={`${product.id}-${entry.id}`}
                    id={entry.id}
                    type="product"
                    name={product.name}
                    description={product.description}
                    category={product.category}
                    price={getStockEntryPrice(product, entry)}
                    promoPrice={
                      variationHasOwnPrice ? undefined : product.promoPrice
                    }
                    imageUrl={getStockCardImages(product, entry)}
                    stock={entry.stock}
                    lowStock={entry.lowStock}
                    available={
                      product.status === ProductStatusEnum.ACTIVED &&
                      entry.stock > 0
                    }
                    color={cardColor}
                    colors={cardColor ? [cardColor] : undefined}
                    size={cardSize}
                    sizes={cardSize ? [cardSize] : undefined}
                    navigateTo=""
                    status={product.status}
                    actionButton={
                      <button
                        className={styles.actionBtn}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStockCardDiscount(product, entry);
                        }}
                      >
                        Dar baixa
                      </button>
                    }
                  />
                );
              })
            )}
          </div>
          <div className={styles.tableFooter}>
            <div className={styles.tableSummary}>
              Mostrando {pagedStockItems.length} de {totalResults} itens
            </div>
            <div className={styles.pagination}>
              <button
                className={`${styles.pageBtn} ${
                  currentPage === 1 ? styles.pageBtnDisabled : ""
                }`}
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Pagina anterior"
              >
                ‹
              </button>
              {pages.map((p) => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${
                    p === currentPage ? styles.pageBtnActive : ""
                  }`}
                  type="button"
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={`${styles.pageBtn} ${
                  currentPage === totalPages ? styles.pageBtnDisabled : ""
                }`}
                type="button"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                aria-label="Proxima pagina"
              >
                ›
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className={styles.tablePanel}>
          <StockOperationsTable
            operations={stockOperations}
            pageSizeOptions={LISTPAG.map((item) => item.value)}
            initialPageSize={6}
          />
        </section>
      )}

      <ReturnStockModal
        isOpen={voltarEstoqueItem !== null}
        onClose={() => setVoltarEstoqueItem(null)}
        item={voltarEstoqueItem}
        onConfirm={(data) => {
          console.log("Restauração confirmada:", data);
          setVoltarEstoqueItem(null);
        }}
      />
      <StockScanCart
        isOpen={isScanCartOpen}
        items={scanCartItems}
        onClose={() => setIsScanCartOpen(false)}
        onChangeQuantity={changeScanCartQuantity}
        onRemove={(stockItemId) =>
          setScanCartItems((items) =>
            items.filter((item) => item.stockItemId !== stockItemId),
          )
        }
        onConfirm={handleConfirmScanCart}
        isConfirming={scanCartLoading}
      />
    </div>
  );
}
