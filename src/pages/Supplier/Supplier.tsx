import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiFilter,
  FiGrid,
  FiSearch,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import { Plus } from "lucide-react";
import EntityCard from "../../components/EntityCard/EntityCard";
import { SkeletonCard } from "../../components/SkeletonCard/SkeletonCard";
import { FilterModal } from "../../components/FilterModal/FilterModal";
import styles from "./Supplier.module.css";
import { SupplierService } from "../../service/Supplier.service";
import type { SupplierResponseDto } from "../../dtos/response/supplier-response.dto";
import StatCard from "../../components/StatCard/StatCard";
import { CustomSelect } from "../../components/CustomSelect/CustomSelect";
import type { CategoryKey } from "../../types/Product-type";

type SupplierStatus = "active" | "inactive";
type SortOption = "price-asc" | "price-desc" | "name-asc" | null;

type SupplierCardData = {
  id: string;
  name: string;
  category: string;
  email: string;
  phone: string;
  location: string;
  status: SupplierStatus;
  initials: string;
  avatarColor: string;
  openDiscountStock: number;
  imageUrl: { url: string; id?: string; publicId?: string }[];
};

const AVATAR_COLORS = ["var(--highlight-primary)"];

const getInitials = (name: string) => {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return "--";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

const normalizeStatus = (value: unknown): SupplierStatus => {
  if (value === true) return "active";
  if (value === false) return "inactive";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["active", "ativo", "actived", "enabled"].includes(normalized)) {
      return "active";
    }
    if (["inactive", "inativo", "disabled"].includes(normalized)) {
      return "inactive";
    }
  }
  return "active";
};

const resolveLocation = (item: SupplierResponseDto) => {
  if (typeof item.location === "string" && item.location.trim()) {
    return item.location;
  }

  return "-";
};

const mapSupplierCard = (
  item: SupplierResponseDto,
  index: number,
): SupplierCardData => {
  const name = String(item.name ?? "Fornecedor");
  return {
    id: String(item.id ?? index),
    name,
    category: String(item.category ?? "Geral"),
    email: String(item.email ?? "-"),
    phone: String(item.phone ?? "-"),
    location: resolveLocation(item),
    status: normalizeStatus(item.status),
    initials: getInitials(name),
    avatarColor: String(
      item.avatarColor ?? AVATAR_COLORS[index % AVATAR_COLORS.length],
    ),
    openDiscountStock: Number(item.openDiscountStock ?? 0),
    imageUrl: Array.isArray(item.images) ? item.images : [],
  };
};

export function Supplier() {
  const [activeCat, setActiveCat] = useState<CategoryKey>("all");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<SupplierCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    minPrice: string;
    maxPrice: string;
    category: CategoryKey;
    sortBy: SortOption;
  }>({
    minPrice: "",
    maxPrice: "",
    category: "all" as CategoryKey,
    sortBy: null,
  });

  const counts = useMemo(() => {
    const categories = new Set(suppliers.map((s) => s.category));
    const countBy = (category: string) =>
      suppliers.filter((s) => s.category === category).length;

    const result: Record<string, number> = { all: suppliers.length };
    categories.forEach((cat) => {
      result[cat] = countBy(cat);
    });
    return result;
  }, [suppliers]);

  const CATEGORIES = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(suppliers.map((s) => s.category)),
    );
    return [
      { key: "all" as CategoryKey, label: `Todos ${counts.all}` },
      ...uniqueCategories.map((cat) => ({
        key: cat as CategoryKey,
        label: cat,
      })),
    ];
  }, [suppliers, counts]);

  const LISTPAG: { value: number }[] = useMemo(
    () => [{ value: 12 }, { value: 24 }, { value: 48 }, { value: 100 }],
    [],
  );

  const [pageSize, setPageSize] = useState(12);

  const filtered = useMemo(() => {
    let current = suppliers;
    if (activeCat !== "all") {
      current = current.filter((s) => s.category === activeCat);
    }

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return current;
    return current.filter((s) =>
      [s.name, s.email, s.phone, s.location]
        .join(" ")
        .toLowerCase()
        .includes(trimmed),
    );
  }, [activeCat, query, suppliers]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await SupplierService.findAll();
        const list = Array.isArray(data) ? data : (data.data ?? []);
        setSuppliers(list.map(mapSupplierCard));
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar fornecedores");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (deletingId) return;

    try {
      setDeletingId(id);
      await SupplierService.remove(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      setError("Erro ao excluir fornecedor");
    } finally {
      setDeletingId(null);
    }
  };

  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, maxPage);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const pages = Array.from({ length: maxPage }, (_, index) => index + 1);

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter((s) => s.status === "active").length;

  const categoriesTotal = new Set(suppliers.map((s) => s.category)).size;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestao de Fornecedores</h1>
          <p className={styles.subtitle}>
            Centralize contatos, categorias e desempenho dos seus fornecedores.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.addBtn}
            type="button"
            onClick={() => navigate("/supplier-details")}
          >
            <Plus size={16} />
            Cadastrar Fornecedor
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <StatCard
          label="TOTAL DE FORNECEDORES"
          value={totalSuppliers.toLocaleString("pt-BR")}
          icon={<FiUsers />}
          iconColor="#EFF6FF"
          iconBackgroundColor="#3B82F6"
          valueColor="#3B82F6"
        />
        <StatCard
          label="FORNECEDORES ATIVOS"
          value={activeSuppliers.toLocaleString("pt-BR")}
          icon={<FiUserCheck />}
          iconColor="#ECFDF5"
          iconBackgroundColor="#059669"
          valueColor="#059669"
        />
        <StatCard
          label="CATEGORIAS"
          value={categoriesTotal}
          icon={<FiGrid />}
        />
      </div>

      <div className={styles.gridContainer}>
        <div className={styles.filters}>
          <div style={{ display: "flex", gap: "10px" }}>
            <div className={styles.search}>
              <FiSearch className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Buscar fornecedores..."
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
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
              onChange={(value) => {
                setActiveCat(value as CategoryKey);
                setPage(1);
              }}
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
                  setPage(1);
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
            <FiUsers className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>Nenhum fornecedor encontrado</h3>
            <p className={styles.emptySubtitle}>
              Tente ajustar os filtros ou cadastre um novo fornecedor.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {paginated.map((supplier) => (
              <EntityCard
                key={supplier.id}
                type="supplier"
                id={supplier.id}
                name={supplier.name}
                category={supplier.category}
                email={supplier.email}
                phone={supplier.phone}
                location={supplier.location}
                isActive={supplier.status === "active"}
                initials={supplier.initials}
                imageUrl={supplier.imageUrl}
                avatarColor={supplier.avatarColor}
                onEdit={(id) => navigate(`/supplier-details/${id}`)}
                onDelete={(id) => handleDelete(id)}
              />
            ))}
          </div>
        )}

        <div className={styles.bottom}>
          <div className={styles.counter}>
            Mostrando {paginated.length} de {total} fornecedores
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
