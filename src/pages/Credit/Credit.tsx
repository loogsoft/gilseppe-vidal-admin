import styles from "./Credit.module.css";
import { useEffect, useMemo, useState } from "react";
import { FiBox, FiFilter, FiSearch } from "react-icons/fi";
import { SkeletonCard } from "../../components/SkeletonCard/SkeletonCard";
import { FilterModal } from "../../components/FilterModal/FilterModal";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StatCard from "../../components/StatCard/StatCard";
import { CustomSelect } from "../../components/CustomSelect/CustomSelect";
import { CreditCustomerService } from "../../service/Credit-customer.service";
import { CreditSaleService } from "../../service/Credit-sale.service";
import { CreditSaleInstallmentStatusEnum } from "../../dtos/enums/credit-sale-installment-status.enum";
import type { CreditCustomerResponseDto } from "../../dtos/response/credit-customer-response.dto";
import type { CreditSaleInstallmentResponseDto } from "../../dtos/response/credit-sale-installment-response.dto";
import type { CreditSaleResponseDto } from "../../dtos/response/credit-sale-response.dto";
import { CreditSaleStatusEnum } from "../../dtos/enums/credit-sale-status.enum";

type SortOption = "price-asc" | "price-desc" | "name-asc" | null;
type CreditStatusFilter = "all" | "overdue" | "pending" | "paid" | "completed";
type CustomerCreditFilter = "all" | "withCredit" | "withoutCredit";

type CreditFilters = {
  minPrice: string;
  maxPrice: string;
  category: CreditStatusFilter;
  sortBy: SortOption;
};

type CustomerFilters = {
  minPrice: string;
  maxPrice: string;
  category: CustomerCreditFilter;
  sortBy: SortOption;
};

const DEFAULT_CREDIT_FILTERS: CreditFilters = {
  minPrice: "",
  maxPrice: "",
  category: "all",
  sortBy: null,
};

const DEFAULT_CUSTOMER_FILTERS: CustomerFilters = {
  minPrice: "",
  maxPrice: "",
  category: "all",
  sortBy: null,
};

function toNumber(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function getTime(value?: Date | string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function addMonths(value: Date | string, months: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date();

  const target = new Date(date);
  const originalDay = target.getDate();

  target.setMonth(target.getMonth() + months);

  if (target.getDate() !== originalDay) {
    target.setDate(0);
  }

  return target;
}

function getInstallmentNumberForMonth(
  sale: CreditSaleResponseDto,
  installments: CreditSaleInstallmentResponseDto[],
  reference = new Date(),
) {
  const saleDate = new Date(sale.date);
  const installmentCount = Math.max(
    1,
    installments.length || Number(sale.installment) || 1,
  );

  if (Number.isNaN(saleDate.getTime())) {
    return installments[0]?.installmentNumber ?? 1;
  }

  const monthDistance =
    (reference.getFullYear() - saleDate.getFullYear()) * 12 +
    reference.getMonth() -
    saleDate.getMonth();

  return Math.min(Math.max(monthDistance + 1, 1), installmentCount);
}

function getFallbackInstallmentStatus(status: CreditSaleResponseDto["status"]) {
  if (
    status === CreditSaleStatusEnum.PAID ||
    status === CreditSaleStatusEnum.COMPLETED
  ) {
    return CreditSaleInstallmentStatusEnum.PAID;
  }

  if (status === CreditSaleStatusEnum.LATE) {
    return CreditSaleInstallmentStatusEnum.OVERDUE;
  }

  return CreditSaleInstallmentStatusEnum.PENDING;
}

function getUnpaidInstallments(
  installments: CreditSaleInstallmentResponseDto[],
) {
  return installments.filter(
    (installment) =>
      installment.status !== CreditSaleInstallmentStatusEnum.PAID,
  );
}

function getCreditInstallmentSummary(sale: CreditSaleResponseDto) {
  const installments = [...(sale.installments ?? [])].sort(
    (left, right) => getTime(left.dueDate) - getTime(right.dueDate),
  );
  const unpaidInstallments = getUnpaidInstallments(installments);
  const fallbackStatus = getFallbackInstallmentStatus(sale.status);
  const isCompleted = installments.length
    ? installments.every(
        (item) => item.status === CreditSaleInstallmentStatusEnum.PAID,
      )
    : fallbackStatus === CreditSaleInstallmentStatusEnum.PAID;
  const installmentNumber = getInstallmentNumberForMonth(sale, installments);
  const installment = installments.find(
    (item) => item.installmentNumber === installmentNumber,
  );
  const openAmount = installments.length
    ? unpaidInstallments.reduce((sum, item) => sum + toNumber(item.amount), 0)
    : fallbackStatus === CreditSaleInstallmentStatusEnum.PAID
      ? 0
      : toNumber(sale.totalAmount);

  return {
    installment,
    installmentNumber: installment?.installmentNumber ?? installmentNumber,
    status: installment?.status ?? fallbackStatus,
    dueDate: installment?.dueDate ?? addMonths(sale.date, installmentNumber),
    openAmount,
    isCompleted,
  };
}

function getInstallmentStatusLabel(
  status: CreditSaleInstallmentStatusEnum,
  isCompleted = false,
) {
  if (isCompleted) return "Finalizado";
  if (status === CreditSaleInstallmentStatusEnum.OVERDUE) return "Atrasado";
  if (status === CreditSaleInstallmentStatusEnum.PAID) return "Pago";
  return "Em aberto";
}

function passesAmountFilter(
  value: number,
  filters: { minPrice: string; maxPrice: string },
) {
  const min = Number.parseFloat(filters.minPrice);
  const max = Number.parseFloat(filters.maxPrice);

  if (filters.minPrice && Number.isFinite(min) && value < min) {
    return false;
  }

  if (filters.maxPrice && Number.isFinite(max) && value > max) {
    return false;
  }

  return true;
}

function matchesCreditStatusFilter(
  summary: Pick<
    ReturnType<typeof getCreditInstallmentSummary>,
    "status" | "isCompleted"
  >,
  filter: CreditStatusFilter,
) {
  if (filter === "completed") {
    return summary.isCompleted;
  }

  if (filter === "pending") {
    return (
      !summary.isCompleted &&
      summary.status === CreditSaleInstallmentStatusEnum.PENDING
    );
  }

  if (filter === "paid") {
    return (
      !summary.isCompleted &&
      summary.status === CreditSaleInstallmentStatusEnum.PAID
    );
  }

  if (filter === "overdue") {
    return (
      !summary.isCompleted &&
      summary.status === CreditSaleInstallmentStatusEnum.OVERDUE
    );
  }

  return true;
}

function getCreditListPriority(
  summary: Pick<
    ReturnType<typeof getCreditInstallmentSummary>,
    "status" | "isCompleted"
  >,
) {
  if (summary.isCompleted) return 3;
  if (summary.status === CreditSaleInstallmentStatusEnum.OVERDUE) return 0;
  if (summary.status === CreditSaleInstallmentStatusEnum.PENDING) return 1;
  if (summary.status === CreditSaleInstallmentStatusEnum.PAID) return 2;
  return 4;
}

function compareCreditSalesByStatus(
  left: CreditSaleResponseDto,
  right: CreditSaleResponseDto,
) {
  const leftSummary = getCreditInstallmentSummary(left);
  const rightSummary = getCreditInstallmentSummary(right);
  const priorityDiff =
    getCreditListPriority(leftSummary) - getCreditListPriority(rightSummary);

  if (priorityDiff !== 0) return priorityDiff;

  return getTime(leftSummary.dueDate) - getTime(rightSummary.dueDate);
}

export function Credit() {
  const [creditCustomer, setCreditCustomer] = useState<
    CreditCustomerResponseDto[]
  >([]);
  const [creditSales, setCreditSales] = useState<CreditSaleResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [view, setView] = useState<"creditSales" | "creditCustomers">(
    "creditSales",
  );
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [creditStatusFilter, setCreditStatusFilter] =
    useState<CreditStatusFilter>("all");
  const [customerCreditFilter, setCustomerCreditFilter] =
    useState<CustomerCreditFilter>("all");
  const [creditFilters, setCreditFilters] = useState<CreditFilters>(
    DEFAULT_CREDIT_FILTERS,
  );
  const [customerFilters, setCustomerFilters] = useState<CustomerFilters>(
    DEFAULT_CUSTOMER_FILTERS,
  );
  const navigate = useNavigate();

  const listedCredits = useMemo(
    () => [...creditSales].sort(compareCreditSalesByStatus),
    [creditSales],
  );

  const totalOpenAmount = useMemo(
    () =>
      listedCredits.reduce(
        (sum, sale) => sum + getCreditInstallmentSummary(sale).openAmount,
        0,
      ),
    [listedCredits],
  );

  const customerCreditIds = useMemo(
    () => new Set(creditSales.map((sale) => String(sale.customer.id))),
    [creditSales],
  );

  const creditFilterCounts = useMemo(() => {
    return listedCredits.reduce(
      (acc, sale) => {
        const summary = getCreditInstallmentSummary(sale);

        if (summary.isCompleted) {
          acc.completed += 1;
        } else if (summary.status === CreditSaleInstallmentStatusEnum.PAID) {
          acc.paid += 1;
        } else if (summary.status === CreditSaleInstallmentStatusEnum.OVERDUE) {
          acc.overdue += 1;
        } else {
          acc.pending += 1;
        }

        return acc;
      },
      {
        all: listedCredits.length,
        pending: 0,
        paid: 0,
        overdue: 0,
        completed: 0,
      },
    );
  }, [listedCredits]);

  const customerFilterCounts = useMemo(() => {
    const withCredit = creditCustomer.filter((customer) =>
      customerCreditIds.has(String(customer.id)),
    ).length;

    return {
      all: creditCustomer.length,
      withCredit,
      withoutCredit: creditCustomer.length - withCredit,
    };
  }, [creditCustomer, customerCreditIds]);

  const CREDIT_FILTER_OPTIONS: Array<{
    key: CreditStatusFilter;
    label: string;
  }> = useMemo(
    () => [
      { key: "all", label: `Todos ${creditFilterCounts.all}` },
      { key: "overdue", label: `Atrasados ${creditFilterCounts.overdue}` },
      { key: "pending", label: `Em aberto ${creditFilterCounts.pending}` },
      { key: "paid", label: `Pagos ${creditFilterCounts.paid}` },
      {
        key: "completed",
        label: `Finalizados ${creditFilterCounts.completed}`,
      },
    ],
    [creditFilterCounts],
  );

  const CUSTOMER_FILTER_OPTIONS: Array<{
    key: CustomerCreditFilter;
    label: string;
  }> = useMemo(
    () => [
      { key: "all", label: `Todos ${customerFilterCounts.all}` },
      {
        key: "withCredit",
        label: `Com crediário ${customerFilterCounts.withCredit}`,
      },
      {
        key: "withoutCredit",
        label: `Sem crediário ${customerFilterCounts.withoutCredit}`,
      },
    ],
    [customerFilterCounts],
  );

  const filteredCustomers = useMemo(() => {
    let current = [...creditCustomer];

    if (customerCreditFilter === "withCredit") {
      current = current.filter((customer) =>
        customerCreditIds.has(String(customer.id)),
      );
    } else if (customerCreditFilter === "withoutCredit") {
      current = current.filter(
        (customer) => !customerCreditIds.has(String(customer.id)),
      );
    }

    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      current = current.filter(
        (customer) =>
          customer.customerName.toLowerCase().includes(trimmed) ||
          customer.customerEmail.toLowerCase().includes(trimmed),
      );
    }

    current = current.filter((customer) =>
      passesAmountFilter(toNumber(customer.totalAmounts), customerFilters),
    );

    if (customerFilters.sortBy === "price-desc") {
      current.sort(
        (left, right) =>
          toNumber(right.totalAmounts) - toNumber(left.totalAmounts),
      );
    } else if (customerFilters.sortBy === "price-asc") {
      current.sort(
        (left, right) =>
          toNumber(left.totalAmounts) - toNumber(right.totalAmounts),
      );
    } else if (customerFilters.sortBy === "name-asc") {
      current.sort((left, right) =>
        left.customerName.localeCompare(right.customerName, "pt-BR"),
      );
    }

    return current;
  }, [
    creditCustomer,
    customerCreditFilter,
    customerCreditIds,
    customerFilters,
    query,
  ]);

  const filteredCreditSales = useMemo(() => {
    let current = listedCredits.filter((sale) => {
      const summary = getCreditInstallmentSummary(sale);

      return (
        matchesCreditStatusFilter(summary, creditStatusFilter) &&
        passesAmountFilter(summary.openAmount, creditFilters)
      );
    });

    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      current = current.filter(
        (sale) =>
          sale.customer.customerName.toLowerCase().includes(trimmed) ||
          sale.customer.customerEmail.toLowerCase().includes(trimmed) ||
          sale.products.some((product) =>
            product.name.toLowerCase().includes(trimmed),
          ),
      );
    }

    if (creditFilters.sortBy === "price-desc") {
      current.sort(
        (left, right) =>
          getCreditInstallmentSummary(right).openAmount -
          getCreditInstallmentSummary(left).openAmount,
      );
    } else if (creditFilters.sortBy === "price-asc") {
      current.sort(
        (left, right) =>
          getCreditInstallmentSummary(left).openAmount -
          getCreditInstallmentSummary(right).openAmount,
      );
    } else if (creditFilters.sortBy === "name-asc") {
      current.sort((left, right) =>
        left.customer.customerName.localeCompare(
          right.customer.customerName,
          "pt-BR",
        ),
      );
    }

    return current;
  }, [creditFilters, creditStatusFilter, listedCredits, query]);

  const filtered =
    view === "creditSales" ? filteredCreditSales : filteredCustomers;

  const total = filtered.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, maxPage);
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const paginatedCreditSales = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCreditSales.slice(start, start + pageSize);
  }, [filteredCreditSales, currentPage, pageSize]);

  const pages = Array.from({ length: maxPage }, (_, index) => index + 1);
  const counts = useMemo(
    () => ({ all: creditCustomer.length, sales: listedCredits.length }),
    [creditCustomer.length, listedCredits.length],
  );
  const LISTPAG: { value: number }[] = useMemo(
    () => [{ value: 12 }, { value: 24 }, { value: 48 }, { value: 100 }],
    [],
  );

  const formatLocation = (customer: CreditCustomerResponseDto) =>
    [
      customer.road,
      customer.number,
      customer.neighborhood,
      customer.city,
      customer.state,
      customer.zipCode,
    ]
      .filter(Boolean)
      .join(", ");

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const formatInstallmentDate = (date: Date | string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));

  const formatProducts = (sale: CreditSaleResponseDto) => {
    if (!sale.products.length) return "Sem produtos vinculados";

    const labels = sale.products.map((product) => {
      const details = [product.name, product.size].filter(Boolean).join(" ");
      return details || product.name;
    });

    if (labels.length <= 2) return labels.join(", ");

    return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
  };

  const getInstallmentStatusClass = (
    status: CreditSaleInstallmentStatusEnum,
    isCompleted = false,
  ) => {
    if (isCompleted) {
      return styles.statusCompleted;
    }

    if (status === CreditSaleInstallmentStatusEnum.OVERDUE) {
      return styles.statusLate;
    }

    if (status === CreditSaleInstallmentStatusEnum.PAID) {
      return styles.statusPaid;
    }

    return styles.statusPending;
  };

  function mask(value: string, type: "phone" | "cpf"): string {
    const numbers = value.replace(/\D/g, "").slice(0, 11);

    if (type === "cpf") {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }

    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    }
    if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }

    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        setError(null);
        const [customers, sales] = await Promise.all([
          CreditCustomerService.findAll(),
          CreditSaleService.findAll(),
        ]);
        setCreditCustomer(customers);
        setCreditSales(sales);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar crediários");
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    creditFilters,
    creditStatusFilter,
    customerCreditFilter,
    customerFilters,
    pageSize,
    query,
    view,
  ]);

  useEffect(() => {
    setIsFilterModalOpen(false);
  }, [view]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestao de Crediarios</h1>
          <p className={styles.subtitle}>
            Gerencie os crediarios, visualize detalhes e mantenha tudo
            atualizado.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.addBtn}
            type="button"
            onClick={() => navigate("/credit-sale-details")}
          >
            <Plus size={16} />
            Abrir Crediario
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <StatCard
          label="TOTAL DE CLIENTES"
          value={counts.all.toLocaleString("pt-BR")}
          icon={<FiBox />}
          valueColor="var(--highlight-primary)"
        />
        <StatCard
          label="TOTAL DE CREDIÁRIOS"
          value={counts.sales.toLocaleString("pt-BR")}
          icon={<FiBox />}
          valueColor="var(--highlight-primary)"
        />
        <StatCard
          label="VALOR TOTAL EM ABERTO"
          value={totalOpenAmount.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
          icon={<FiBox />}
          valueColor="var(--status-warning)"
        />
      </div>

      <section className={styles.tabs}>
        <button
          className={`${styles.tab} ${view === "creditSales" ? styles.tabActive : ""}`}
          type="button"
          onClick={() => setView("creditSales")}
        >
          Crediários
        </button>
        <button
          className={`${styles.tab} ${view === "creditCustomers" ? styles.tabActive : ""}`}
          type="button"
          onClick={() => setView("creditCustomers")}
        >
          Clientes cadastrados
        </button>
      </section>
      <div className={styles.gridContainer}>
        {view === "creditCustomers" ? (
          <>
            <div className={styles.filters}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div className={styles.search}>
                  <FiSearch className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="Buscar cliente..."
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
                  options={CUSTOMER_FILTER_OPTIONS.map((option) => ({
                    value: option.key,
                    label: option.label,
                  }))}
                  value={customerCreditFilter}
                  onChange={(value) => {
                    const nextFilter = value as CustomerCreditFilter;
                    setCustomerCreditFilter(nextFilter);
                    setCustomerFilters((current) => ({
                      ...current,
                      category: nextFilter,
                    }));
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
                    isOpen={isFilterModalOpen && view === "creditCustomers"}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={(newFilters) => {
                      setCustomerFilters(newFilters);
                      setCustomerCreditFilter(newFilters.category);
                    }}
                    categories={CUSTOMER_FILTER_OPTIONS}
                    initialFilters={customerFilters}
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
            ) : paginatedCustomers.length === 0 ? (
              <div className={styles.emptyState}>
                <FiBox className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>Nenhum cliente encontrado</h3>
                <p className={styles.emptySubtitle}>
                  Tente ajustar os filtros ou adicione novos clientes.
                </p>
              </div>
            ) : (
              <div className={styles.table}>
                <div
                  className={`${styles.row} ${styles.thead} ${styles.creditRow}`}
                >
                  <div>Cliente</div>
                  <div>Email</div>
                  <div>Telefone</div>
                  <div>Endereço</div>
                  <div>Tipo</div>
                </div>

                {paginatedCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className={`${styles.row} ${styles.creditRow} ${styles.customerRow}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/credit-details/${customer.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/credit-details/${customer.id}`);
                      }
                    }}
                  >
                    <div className={styles.clientCell}>
                      <div className={styles.avatar}>
                        {getInitials(customer.customerName)}
                      </div>
                      <div className={styles.customerInfo}>
                        <div className={styles.clientName}>
                          {customer.customerName}
                        </div>
                        <div className={styles.clientSubtext}>
                          ID {customer.id}
                        </div>
                      </div>
                    </div>
                    <div className={styles.cellText}>
                      {customer.customerEmail.slice(0, 25) + "..." || "-"}
                    </div>
                    <div className={styles.cellText}>
                      {mask(customer.phone, "phone") || "-"}
                    </div>
                    <div className={styles.cellText}>
                      {formatLocation(customer) || "-"}
                    </div>
                    <div>
                      <span className={styles.typeBadge}>CLIENTE</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.bottom}>
              <div className={styles.counter}>
                Mostrando {paginatedCustomers.length} de {total} clientes
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
          </>
        ) : (
          <>
            <div className={styles.filters}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div className={styles.search}>
                  <FiSearch className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="Buscar cliente com crediário..."
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
                  options={CREDIT_FILTER_OPTIONS.map((option) => ({
                    value: option.key,
                    label: option.label,
                  }))}
                  value={creditStatusFilter}
                  onChange={(value) => {
                    const nextFilter = value as CreditStatusFilter;
                    setCreditStatusFilter(nextFilter);
                    setCreditFilters((current) => ({
                      ...current,
                      category: nextFilter,
                    }));
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
                    isOpen={isFilterModalOpen && view === "creditSales"}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={(newFilters) => {
                      setCreditFilters(newFilters);
                      setCreditStatusFilter(newFilters.category);
                    }}
                    categories={CREDIT_FILTER_OPTIONS}
                    initialFilters={creditFilters}
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
            ) : paginatedCreditSales.length === 0 ? (
              <div className={styles.emptyState}>
                <FiBox className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>
                  Nenhum crediário encontrado
                </h3>
                <p className={styles.emptySubtitle}>
                  Tente ajustar a busca ou abra um novo crediário.
                </p>
              </div>
            ) : (
              <div className={styles.table}>
                <div
                  className={`${styles.row} ${styles.thead} ${styles.creditOpenRow}`}
                >
                  <div>Cliente</div>
                  <div>Itens</div>
                  <div>Status</div>
                  <div>Parcela</div>
                  <div>Aberto</div>
                </div>

                {paginatedCreditSales.map((sale) => {
                  const installmentSummary = getCreditInstallmentSummary(sale);

                  return (
                    <div
                      key={sale.id}
                      className={`${styles.row} ${styles.creditOpenRow} ${styles.clickableRow}`}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        navigate(`/credit-sale-details/${sale.id}`)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          navigate(`/credit-sale-details/${sale.id}`);
                        }
                      }}
                    >
                      <div className={styles.clientCell}>
                        <div className={styles.avatar}>
                          {getInitials(sale.customer.customerName)}
                        </div>
                        <div className={styles.customerInfo}>
                          <div className={styles.clientName}>
                            {sale.customer.customerName}
                          </div>
                          <div className={styles.clientSubtext}>
                            {sale.customer.customerEmail || `Venda ${sale.id}`}
                          </div>
                        </div>
                      </div>
                      <div className={styles.productCell}>
                        <span className={styles.productTitle}>
                          {formatProducts(sale)}
                        </span>
                        <span className={styles.productMeta}>
                          {sale.products.length} item
                          {sale.products.length > 1 ? "s" : ""} •{" "}
                          {sale.installment} parcela
                          {sale.installment > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div>
                        <span
                          className={`${styles.statusBadge} ${getInstallmentStatusClass(
                            installmentSummary.status,
                            installmentSummary.isCompleted,
                          )}`}
                        >
                          {getInstallmentStatusLabel(
                            installmentSummary.status,
                            installmentSummary.isCompleted,
                          )}
                        </span>
                      </div>
                      <div className={styles.installmentDateCell}>
                        <span>
                          {formatInstallmentDate(installmentSummary.dueDate)}
                        </span>
                        {installmentSummary.installmentNumber ? (
                          <strong>
                            Parcela do mês{" "}
                            {installmentSummary.installmentNumber}
                          </strong>
                        ) : null}
                      </div>
                      <div>
                        <span className={styles.amountBadge}>
                          {installmentSummary.openAmount.toLocaleString(
                            "pt-BR",
                            {
                              style: "currency",
                              currency: "BRL",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.bottom}>
              <div className={styles.counter}>
                Mostrando {paginatedCreditSales.length} de {total} crediários
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
          </>
        )}
      </div>
    </div>
  );
}
