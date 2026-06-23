import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./DiscountStock.module.css";
import {
  FiDollarSign,
  FiFilter,
  FiPackage,
  FiSearch,
  FiShoppingBag,
  FiUser,
} from "react-icons/fi";
import StatCard from "../../components/StatCard/StatCard";
import { CustomSelect } from "../../components/CustomSelect/CustomSelect";
import EntityCard from "../../components/EntityCard/EntityCard";
import { SkeletonCard } from "../../components/SkeletonCard/SkeletonCard";
import { ProductService } from "../../service/Product.service";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import type { StockMovementResponseDto } from "../../dtos/response/stock-movement-response.dto";
import { ProductStatusEnum } from "../../dtos/enums/product-status.enum";
import {
  ReturnStockModal,
  type StockHistoryItem,
} from "../../components/ReturnaStockModal/ReturnStockModal";
import { StockMovementService } from "../../service/Stock-movement.service";
import { DiscountStockModal } from "../../components/DiscountStockModal/DiscountStockModal";
import { DiscountStockFilterModal } from "../../components/FilterModal/DiscountStockFilterModal";
import {
  getProductStockLevel,
  getProductTotalStock,
  productHasAvailableStock,
} from "../../utils/productStock";
import { Barcode } from "lucide-react";
import { toast } from "react-toastify";
import {
  StockScanCart,
  type StockScanCartItem,
} from "../../components/StockScanCart/StockScanCart";
type StockLevel = "all" | "ok" | "low" | "critical";
type SortOption = "alpha" | "priceAsc" | "priceDesc" | "stockAsc" | "stockDesc";

const getStockLevel = (p: ProductResponse): "ok" | "low" | "critical" => {
  return getProductStockLevel(p);
};

export function DiscountStock() {
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [darBaixaProduct, setDarBaixaProduct] =
    useState<ProductResponse | null>(null);
  const [voltarEstoqueItem, setVoltarEstoqueItem] =
    useState<StockHistoryItem | null>(null);
  const [stockHistory, setStockHistory] =
    useState<StockMovementResponseDto[]>([]);
  const [search, setSearch] = useState("");
  const stockSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [scanCartItems, setScanCartItems] = useState<StockScanCartItem[]>([]);
  const [isScanCartOpen, setIsScanCartOpen] = useState(false);
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<"stock" | "history">("stock");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");
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
        const data = await StockMovementService.findAll();
        setStockHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

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

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = products.filter((item) => {
      if (!productHasAvailableStock(item)) return false;

      const matchesSearch = term
        ? `${item.name} ${item.description ?? ""} ${item.category} ${item.barCode}`
            .toLowerCase()
            .includes(term)
        : true;

      const matchesCategory =
        category === "all" ? true : item.category === category;

      const matchesPrice =
        (!filters.minPrice || Number(item.price) >= Number(filters.minPrice)) &&
        (!filters.maxPrice || Number(item.price) <= Number(filters.maxPrice));

      const totalStock = getProductTotalStock(item);
      const matchesStock =
        (!filters.minStock || totalStock >= Number(filters.minStock)) &&
        (!filters.maxStock || totalStock <= Number(filters.maxStock));

      const level = getStockLevel(item);
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
        return Number(a.price) - Number(b.price);
      if (filters.sortBy === "priceDesc")
        return Number(b.price) - Number(a.price);
      if (filters.sortBy === "stockAsc")
        return getProductTotalStock(a) - getProductTotalStock(b);
      if (filters.sortBy === "stockDesc")
        return getProductTotalStock(b) - getProductTotalStock(a);
      return a.name.localeCompare(b.name, "pt-BR");
    });

    return sorted;
  }, [search, category, filters, products]);

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();
    let filtered = stockHistory;

    if (historyTypeFilter !== "all") {
      filtered = filtered.filter((item) => item.type === historyTypeFilter);
    }

    if (!term) return filtered;

    return filtered.filter((item) => {
      const productName = item.productName || item.variation?.name || "";
      const responsible = item.responsibleName || "";
      const movementId = item.id || "";
      return `${productName} ${item.reason} ${responsible} ${movementId}`
        .toLowerCase()
        .includes(term);
    });
  }, [historyTypeFilter, search, stockHistory]);

  useEffect(() => {
    setPage(1);
  }, [view, search, category, filters, historyTypeFilter]);

  const totalResults =
    view === "stock" ? filteredItems.length : filteredHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedStockItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const pagedHistoryItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, currentPage, pageSize]);

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  const addProductToScanCart = (product: ProductResponse) => {
    const availableStock = getProductTotalStock(product);

    setScanCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.product.id === product.id,
      );

      if (existingItem && existingItem.quantity >= availableStock) {
        toast.warning("A quantidade selecionada atingiu o estoque disponível.");
        return currentItems;
      }

      if (existingItem) {
        return currentItems.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...currentItems, { product, quantity: 1 }];
    });

    setIsScanCartOpen(true);
    setSearch("");
    requestAnimationFrame(() => stockSearchInputRef.current?.focus());
  };

  const handleScanSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    const term = search.trim().toLowerCase();
    if (!term) return;

    const exactProduct = products.find(
      (product) =>
        productHasAvailableStock(product) &&
        (product.barCode?.trim().toLowerCase() === term ||
          product.id.toLowerCase() === term),
    );
    const product = exactProduct ?? (filteredItems.length === 1 ? filteredItems[0] : null);

    if (!product) {
      toast.error("Nenhum produto encontrado para este código.");
      return;
    }

    addProductToScanCart(product);
  };

  const changeScanCartQuantity = (productId: string, quantity: number) => {
    setScanCartItems((currentItems) =>
      currentItems
        .map((item) => {
          if (item.product.id !== productId) return item;
          const maxStock = getProductTotalStock(item.product);
          return { ...item, quantity: Math.min(quantity, maxStock) };
        })
        .filter((item) => item.quantity > 0),
    );
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
              pagedStockItems.map((item) => (
                <EntityCard
                  key={item.id}
                  id={item.id}
                  type="product"
                  name={item.name}
                  description={item.description}
                  category={item.category}
                  price={item.price}
                  promoPrice={item.promoPrice}
                  imageUrl={[
                    ...(item.images || []),
                    ...((item.variations || [])
                      .filter((v) => v.imageUrl)
                      .map((v) => ({
                        url: Array.isArray(v.imageUrl)
                          ? v.imageUrl[0]
                          : v.imageUrl || "",
                        fileName: v.name || "",
                        id: v.id || "",
                        isPrimary: false,
                      }))),
                  ]}
                  stock={item.stock ?? undefined}
                  lowStock={item.lowStock}
                  available={item.status === ProductStatusEnum.ACTIVED}
                  color={item.color}
                  colors={Array.from(
                    new Set([
                      ...(item.color ? [item.color] : []),
                      ...((item.variations || [])
                        .map((v) => v.color)
                        .filter(Boolean) as string[]),
                    ]),
                  )}
                  size={item.size}
                  sizes={Array.from(
                    new Set([
                      ...(item.size ? [item.size] : []),
                      ...((item.variations || [])
                        .map((v) => v.size)
                        .filter(Boolean) as string[]),
                    ]),
                  )}
                  navigateTo=""
                  status={item.status}
                  variations={item.variations}
                  actionButton={
                    <button
                      className={styles.actionBtn}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDarBaixaProduct(item);
                      }}
                    >
                      Dar baixa
                    </button>
                  }
                />
              ))
            )}
          </div>
          <div className={styles.tableFooter}>
            <div className={styles.tableSummary}>
              Mostrando {pagedStockItems.length} de {totalResults} produtos
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
          <div className={styles.filters}>
            <div className={styles.searchGroup}>
              <div className={styles.search}>
                <FiSearch className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="Buscar por responsável, produto ou ID..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <CustomSelect
                options={LISTPAG.map((c) => ({
                  value: String(c.value),
                  label: String(c.value),
                }))}
                value={String(pageSize)}
                onChange={(v: string) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              />
            </div>
            <div className={styles.filterActions}>
              <CustomSelect
                options={[
                  { value: "all", label: "Todos" },
                  { value: "OUT", label: "Saída" },
                  { value: "IN", label: "Entrada" },
                ]}
                value={historyTypeFilter}
                onChange={(value) => {
                  setHistoryTypeFilter(value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className={styles.table}>
            <div
              className={`${styles.row} ${styles.thead} ${styles.historyRow}`}
            >
              <div>PRODUTO</div>
              <div>DATA/HORA</div>
              <div>RESPONSÁVEL</div>
              <div>VARIAÇÃO</div>
              <div>QTD</div>
              <div>VALOR</div>
              <div>FORMA DE PAGAMENTO</div>
              <div>MOTIVO</div>
              <div>TIPO</div>
            </div>

            {pagedHistoryItems.length === 0 ? (
              <div className={styles.emptyState}>
                <FiUser className={styles.emptyIcon} />
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 18,
                    marginBottom: 4,
                    color: "var(--text-secondary)",
                  }}
                >
                  Nenhuma movimentação encontrada
                </div>
                <div style={{ fontSize: 14, color: "var(--text-muted)" }}>
                  Tente ajustar os filtros ou realize uma nova movimentação.
                </div>
              </div>
            ) : (
              pagedHistoryItems.map((r) => {
                const dt = new Date(r.createdAt);
                const date = dt.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                });
                const time = dt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const initials = (r.responsibleName || "?")
                  .split(" ")
                  .slice(0, 2)
                  .map((p: string) => p[0]?.toUpperCase() ?? "")
                  .join("");
                return (
                  <div
                    key={r.id}
                    className={`${styles.row} ${styles.historyRow}`}
                  >
                    <div className={styles.idCell}>
                      {r.productName || r.variation?.name || "-"}
                    </div>
                    <div className={styles.dateCell}>
                      <div>{date}</div>
                      <div className={styles.muted}>{time}</div>
                    </div>
                    <div className={styles.clientCell}>
                      <div className={styles.avatar}>{initials}</div>
                      <div className={styles.clientName}>
                        {r.responsibleName || "-"}
                      </div>
                    </div>
                    <div className={styles.productsCell}>
                      {r.variation?.color && (
                        <span
                          className={styles.colorDot}
                          style={{ backgroundColor: r.variation.color }}
                        />
                      )}
                      {r.variation?.size || "-"}
                    </div>
                    <div className={styles.totalCell}>{r.quantity}x</div>
                    <div className={styles.valueCell}>
                      {Number(
                        r.price || r.variation?.price || 0,
                      ).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </div>
                    <div className={styles.paymentCell}>
                      {r.paymentMethod || "-"}
                    </div>
                    <div className={styles.reasonCell}>{r.reason || "-"}</div>
                    <div className={styles.typeCell}>
                      {r.type === "OUT" ? (
                        <span className={styles.statusOut}>SAÍDA</span>
                      ) : (
                        <span className={styles.statusIn}>ENTRADA</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className={styles.tableFooter}>
            <div className={styles.tableSummary}>
              Mostrando {pagedHistoryItems.length} de {filteredHistory.length}{" "}
              movimentações
            </div>
            <div className={styles.pagination}>
              <button
                className={`${styles.pageBtn} ${currentPage === 1 ? styles.pageBtnDisabled : ""}`}
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
              >
                ‹
              </button>
              {pages.map((p) => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ""}`}
                  type="button"
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={`${styles.pageBtn} ${currentPage === totalPages ? styles.pageBtnDisabled : ""}`}
                type="button"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                aria-label="Próxima página"
              >
                ›
              </button>
            </div>
          </div>
        </section>
      )}

      <DiscountStockModal
        isOpen={darBaixaProduct !== null}
        onClose={() => setDarBaixaProduct(null)}
        product={darBaixaProduct}
        onClick={() => alternValue()}
        onConfirm={(data) => {
          console.log("Baixa confirmada:", data);
          setDarBaixaProduct(null);
        }}
      />
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
        onRemove={(productId) =>
          setScanCartItems((items) =>
            items.filter((item) => item.product.id !== productId),
          )
        }
      />
    </div>
  );
}
