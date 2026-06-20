import styles from "./Product.module.css";
import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiBox,
  FiDollarSign,
  FiFilter,
  FiGrid,
  FiSearch,
} from "react-icons/fi";
import EntityCard from "../../components/EntityCard/EntityCard";
import { SkeletonCard } from "../../components/SkeletonCard/SkeletonCard";
import { FilterModal } from "../../components/FilterModal/FilterModal";
import { Plus } from "lucide-react";
import type { CategoryKey } from "../../types/Product-type";
import { ProductService } from "../../service/Product.service";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import { ProductCategoryEnum } from "../../dtos/enums/product-category.enum";
import { useLocation, useNavigate } from "react-router-dom";
import StatCard from "../../components/StatCard/StatCard";
import { CustomSelect } from "../../components/CustomSelect/CustomSelect";
import {
  getLowStockEntries,
  productHasAvailableStock,
  productHasVariations,
} from "../../utils/productStock";

type SortOption = "price-asc" | "price-desc" | "name-asc" | null;

export function Products() {
  const [activeCat, setActiveCat] = useState<CategoryKey>("all");
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const location = useLocation();

  // alert(JSON.stringify(user?.userType))
  // Seta o id do produto no input de busca se vier via state
  useEffect(() => {
    if (location.state && location.state.id) {
      setQuery(String(location.state.id));
      // Limpa o state após usar para evitar reuso em navegações futuras
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const [filters, setFilters] = useState<{
    minPrice: string;
    maxPrice: string;
    category: CategoryKey;
    sortBy: SortOption;
  }>({
    minPrice: "",
    maxPrice: "",
    category: "all",
    sortBy: null,
  });
  const categoryFromKey = (key: CategoryKey) => {
    switch (key) {
      case "shirt":
        return ProductCategoryEnum.SHIRT;
      case "tshirt":
        return ProductCategoryEnum.TSHIRT;
      case "polo":
        return ProductCategoryEnum.POLO;
      case "shorts":
        return ProductCategoryEnum.SHORTS;
      case "jacket":
        return ProductCategoryEnum.JACKET;
      case "pants":
        return ProductCategoryEnum.PANTS;
      case "dress":
        return ProductCategoryEnum.DRESS;
      case "sweater":
        return ProductCategoryEnum.SWEATER;
      case "hoodie":
        return ProductCategoryEnum.HOODIE;
      case "underwear":
        return ProductCategoryEnum.UNDERWEAR;
      case "footwear":
        return ProductCategoryEnum.FOOTWEAR;
      case "belt":
        return ProductCategoryEnum.BELT;
      case "wallet":
        return ProductCategoryEnum.WALLET;
      case "sunglasses":
        return ProductCategoryEnum.SUNGLASSES;
      default:
        return null;
    }
  };

  const filtered = useMemo(() => {
    let current = products.filter(productHasAvailableStock);

    // Filtro de categoria (select ou modal)
    const categoryToFilter =
      filters.category !== "all" ? filters.category : activeCat;
    if (categoryToFilter !== "all") {
      const category = categoryFromKey(categoryToFilter);
      if (category) {
        current = current.filter((p) => p.category === category);
      }
    }

    // Filtro de busca
    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      current = current.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed) ||
          p.id.toLowerCase().includes(trimmed),
      );
    }

    // Filtro de preço
    if (filters.minPrice) {
      const min = parseFloat(filters.minPrice);
      current = current.filter((p) => Number(p.price) >= min);
    }
    if (filters.maxPrice) {
      const max = parseFloat(filters.maxPrice);
      current = current.filter((p) => Number(p.price) <= max);
    }

    // Ordenação
    if (filters.sortBy === "price-asc") {
      current = [...current].sort((a, b) => Number(a.price) - Number(b.price));
    } else if (filters.sortBy === "price-desc") {
      current = [...current].sort((a, b) => Number(b.price) - Number(a.price));
    } else if (filters.sortBy === "name-asc") {
      current = [...current].sort((a, b) => a.name.localeCompare(b.name));
    }

    return current;
  }, [activeCat, products, query, filters]);

  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, maxPage);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const pages = Array.from({ length: maxPage }, (_, index) => index + 1);


  const counts = useMemo(() => {
    const countBy = (category: ProductCategoryEnum) =>
      products.filter(
        (p) => productHasAvailableStock(p) && p.category === category,
      ).length;

    return {
      all: products.filter(productHasAvailableStock).length,
      shirt: countBy(ProductCategoryEnum.SHIRT),
      tshirt: countBy(ProductCategoryEnum.TSHIRT),
      polo: countBy(ProductCategoryEnum.POLO),
      shorts: countBy(ProductCategoryEnum.SHORTS),
      jacket: countBy(ProductCategoryEnum.JACKET),
      pants: countBy(ProductCategoryEnum.PANTS),
      dress: countBy(ProductCategoryEnum.DRESS),
      sweater: countBy(ProductCategoryEnum.SWEATER),
      hoodie: countBy(ProductCategoryEnum.HOODIE),
      underwear: countBy(ProductCategoryEnum.UNDERWEAR),
      footwear: countBy(ProductCategoryEnum.FOOTWEAR),
      belt: countBy(ProductCategoryEnum.BELT),
      wallet: countBy(ProductCategoryEnum.WALLET),
      sunglasses: countBy(ProductCategoryEnum.SUNGLASSES),
    };
  }, [products]);

  const CATEGORIES: { key: CategoryKey; label: string }[] = useMemo(
    () => [
      { key: "all", label: `Todos ${counts.all}` },
      { key: "shirt", label: "Camisa" },
      { key: "tshirt", label: "Camiseta" },
      { key: "polo", label: "Polo" },
      { key: "shorts", label: "Shorts" },
      { key: "jacket", label: "Jaqueta" },
      { key: "pants", label: "Calça" },
      { key: "dress", label: "Vestido" },
      { key: "sweater", label: "Suéter" },
      { key: "hoodie", label: "Moletom" },
      { key: "underwear", label: "Cueca" },
      { key: "footwear", label: "Calçado" },
      { key: "belt", label: "Cinto" },
      { key: "wallet", label: "Carteira" },
      { key: "sunglasses", label: "Óculos" },
    ],
    [counts],
  );

  const LISTPAG: { value: number }[] = useMemo(
    () => [{ value: 12 }, { value: 24 }, { value: 48 }, { value: 100 }],
    [],
  );

  const totalValue = useMemo(() => {
    return products.reduce((sum, p) => {
      if (productHasVariations(p)) {
        return (
          sum +
          (p.variations ?? []).reduce((variationSum, variation) => {
            if (
              variation.isActive !== false &&
              Number(variation.stock) > 0
            ) {
              return variationSum + Number(variation.price || 0);
            }
            return variationSum;
          }, 0)
        );
      }

      if (Number(p.stock) > 0) {
        return sum + Number(p.price || 0);
      }

      return sum;
    }, 0);
  }, [products]);

  const lowStock = useMemo(
    () =>
      products.reduce(
        (count, product) => count + getLowStockEntries(product).length,
        0,
      ),
    [products],
  );

  const categoryTotal = useMemo(() => {
    return new Set(products.map((p) => p.category)).size;
  }, [products]);

  // const getPrimaryImageUrl = (images: ImageResponse[]) => {
  //   const primary = (images || []).find((img: any) => img?.isPrimary);
  //   return primary?.url || (images?.[0] as any)?.url || "";
  // };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await ProductService.findAll();
        setProducts(data);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar produtos");
      } finally {
        setLoading(false);
      }
    };
    void fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    try {
      setDeletingId(id);
      await ProductService.remove(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      setError("Erro ao excluir produto");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestao de Produtos</h1>
          <p className={styles.subtitle}>
            Organize seu catalogo, precos e niveis de estoque em um so lugar.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.addBtn}
            type="button"
            onClick={() => navigate("/product-details")}
          >
            <Plus size={16} />
            Cadastrar Produto
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <StatCard
          label="TOTAL DE PRODUTOS"
          value={counts.all.toLocaleString("pt-BR")}
          icon={<FiBox />}
          iconColor="#EFF6FF"
          iconBackgroundColor="#3B82F6"
          valueColor="#3B82F6"
        />
        <StatCard
          label="VALOR TOTAL"
          value={totalValue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          icon={<FiDollarSign />}
          iconColor="#ECFDF5"
          iconBackgroundColor="#059669"
          valueColor="#059669"
        />
        <StatCard
          label="ESTOQUE BAIXO"
          value={lowStock}
          icon={<FiAlertTriangle />}
          iconColor="#FFFBEB"
          iconBackgroundColor="#f50b0bd7"
          valueColor="#f50b0bd7"
        />
        <StatCard label="CATEGORIAS" value={categoryTotal} icon={<FiGrid />} />
      </div>

      <div className={styles.gridContainer}>
        <div className={styles.filters}>
          <div style={{ display: "flex", gap: "10px" }}>
            <div className={styles.search}>
              <FiSearch className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Buscar produtos..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
              />
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
              options={CATEGORIES.map((c) => ({
                value: c.key,
                label: c.label,
              }))}
              value={activeCat}
              onChange={(value) => setActiveCat(value as CategoryKey)}
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
              <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={(newFilters) => {
                  setFilters(newFilters);
                  setActiveCat(newFilters.category);
                }}
                categories={CATEGORIES}
                initialFilters={filters}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 12 }}>{error}</div>
        ) : paginated.length === 0 ? (
          <div className={styles.emptyState}>
            <FiBox className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhum produto encontrado</h3>
            <p className={styles.emptySubtitle}>
              Tente ajustar os filtros ou adicione novos produtos.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {paginated.map((p) => (
              <EntityCard
                lowStock={p.lowStock}
                key={p.id}
                id={p.id}
                name={p.name}
                description={p.description}
                category={p.category}
                price={p.price}
                promoPrice={p.promoPrice}
                imageUrl={[
                  ...(p.images || []),
                  ...(p.variations || [])
                    .filter((v) => v.imageUrl)
                    .map((v) => ({
                      url: Array.isArray(v.imageUrl)
                        ? v.imageUrl[0] || ""
                        : v.imageUrl || "",
                      fileName: v.name || "",
                      id: v.id || "",
                      isPrimary: false,
                    })),
                ]}
                stock={p.stock ?? undefined}
                available
                color={p.color}
                colors={Array.from(
                  new Set([
                    ...(p.color ? [p.color] : []),
                    ...((p.variations || [])
                      .map((v) => v.color)
                      .filter(Boolean) as string[]),
                  ]),
                )}
                size={p.size}
                sizes={Array.from(
                  new Set([
                    ...(p.size ? [p.size] : []),
                    ...((p.variations || [])
                      .map((v) => v.size)
                      .filter(Boolean) as string[]),
                  ]),
                )}
                variations={p.variations}
                status={p.status}
                onEdit={() => {}}
                onDelete={(id) => handleDelete(id)}
                onToggleAvailable={() => {}}
                navigateTo={`/product-details/${p.id}`}
              />
            ))}
          </div>
        )}

        <div className={styles.bottom}>
          <div className={styles.counter}>
            Mostrando {paginated.length} de {total} produtos
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
                currentPage === maxPage ? styles.pageBtnDisabled : ""
              }`}
              type="button"
              onClick={() => setPage(Math.min(maxPage, currentPage + 1))}
              disabled={currentPage === maxPage}
              aria-label="Proxima pagina"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
