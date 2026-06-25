import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiUsers } from "react-icons/fi";
import { CustomSelect } from "../CustomSelect/CustomSelect";
import type { StockMovementResponseDto } from "../../dtos/response/stock-movement-response.dto";
import type { StockOperationResponseDto } from "../../dtos/response/stock-operation-response.dto";
import styles from "./StockOperationsTable.module.css";

type StockOperationsTableProps = {
  operations: StockOperationResponseDto[];
  pageSizeOptions?: number[];
  initialPageSize?: number;
  emptyTitle?: string;
  emptySubtitle?: string;
};

function toNumber(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getMovementRevenue(movement: StockMovementResponseDto) {
  const storedPrice = toNumber(movement.price);

  if (storedPrice > 0) {
    return storedPrice;
  }

  return toNumber(movement.variation?.price) * Number(movement.quantity || 0);
}

function getMovementProductLabel(movement: StockMovementResponseDto) {
  return movement.productName || movement.variation?.name || "-";
}

function getMovementVariationLabel(movement: StockMovementResponseDto) {
  const parts = [
    movement.variation?.size || movement.product?.size,
    movement.variation?.color || movement.product?.color,
  ].filter(Boolean);
  return parts.length ? parts.join(" / ") : "-";
}

function getMovementImageUrl(movement: StockMovementResponseDto) {
  return (
    movement.variation?.imageUrl ||
    movement.variation?.images?.[0]?.url ||
    movement.product?.images?.[0]?.url ||
    ""
  );
}

function getOperationTotal(operation: StockOperationResponseDto) {
  return (operation.movements ?? []).reduce(
    (acc, movement) => acc + getMovementRevenue(movement),
    0,
  );
}

function getOperationQuantity(operation: StockOperationResponseDto) {
  return (operation.movements ?? []).reduce(
    (acc, movement) => acc + Number(movement.quantity || 0),
    0,
  );
}

function getInitials(name?: string) {
  return (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function StockOperationsTable({
  operations,
  pageSizeOptions = [5, 10, 20, 50],
  initialPageSize = 10,
  emptyTitle = "Nenhuma movimentação encontrada",
  emptySubtitle = "Tente ajustar os filtros ou realize uma nova movimentação.",
}: StockOperationsTableProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(1);

  const sortedOperations = useMemo(
    () =>
      [...operations].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [operations],
  );

  const filteredOperations = useMemo(() => {
    let list = sortedOperations;

    if (typeFilter !== "all") {
      list = list.filter((operation) => operation.type === typeFilter);
    }

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return list;

    return list.filter(
      (operation) =>
        (operation.responsibleName || "").toLowerCase().includes(trimmed) ||
        operation.id.toLowerCase().includes(trimmed) ||
        (operation.movements ?? []).some(
          (movement) =>
            getMovementProductLabel(movement).toLowerCase().includes(trimmed) ||
            getMovementVariationLabel(movement)
              .toLowerCase()
              .includes(trimmed) ||
            movement.id.toLowerCase().includes(trimmed),
        ),
    );
  }, [query, sortedOperations, typeFilter]);

  const totalOperations = filteredOperations.length;
  const totalPages = Math.max(1, Math.ceil(totalOperations / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedOperations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOperations.slice(start, start + pageSize);
  }, [currentPage, filteredOperations, pageSize]);

  const pages = useMemo(() => {
    const visiblePages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let index = start; index <= end; index += 1) {
      visiblePages.push(index);
    }
    return visiblePages;
  }, [currentPage, totalPages]);

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.searchGroup}>
          <div className={styles.search}>
            <FiSearch className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar por responsável, produto ou ID..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <CustomSelect
            options={pageSizeOptions.map((size) => ({
              value: String(size),
              label: String(size),
            }))}
            value={String(pageSize)}
            onChange={(value: string) => {
              setPageSize(Number(value));
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
            value={typeFilter}
            onChange={(value: string) => {
              setTypeFilter(value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className={styles.table}>
        <div className={`${styles.row} ${styles.thead}`}>
          <div>PRODUTOS</div>
          <div>DATA/HORA</div>
          <div>RESPONSÁVEL</div>
          <div>ITENS</div>
          <div className={styles.qtdValorCell}>
            <span>QTD</span>
            <span>VALOR</span>
            <span>FORMA DE PAGAMENTO</span>
          </div>
          <div>MOTIVO</div>
          <div>TIPO</div>
        </div>

        {paginatedOperations.length === 0 ? (
          <div className={styles.emptyState}>
            <FiUsers className={styles.emptyIcon} />
            <div className={styles.emptyTitle}>{emptyTitle}</div>
            <div className={styles.emptySubtitle}>{emptySubtitle}</div>
          </div>
        ) : (
          paginatedOperations.map((operation) => {
            const dateTime = new Date(operation.createdAt);
            const date = dateTime.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            });
            const time = dateTime.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const movements = operation.movements ?? [];
            const operationTotal = getOperationTotal(operation);
            const operationQuantity = getOperationQuantity(operation);

            return (
              <div
                key={operation.id}
                className={`${styles.row} ${styles.clickableRow}`}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/movement-details/${operation.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/movement-details/${operation.id}`);
                  }
                }}
              >
                <div
                  className={styles.productsListCell}
                  title={movements.map(getMovementProductLabel).join(", ")}
                >
                  {movements.slice(0, 2).map((movement, index) => (
                    <span
                      key={movement.id}
                      className={
                        index === 0
                          ? styles.productNameFirst
                          : styles.productNameSecond
                      }
                    >
                      {index > 0 ? ", " : ""}
                      {getMovementProductLabel(movement)}
                    </span>
                  ))}
                  {movements.length > 2 ? (
                    <span className={styles.productMore}>
                      +{movements.length - 2}
                    </span>
                  ) : null}
                </div>

                <div className={styles.dateCell}>
                  <div>{date}</div>
                  <div className={styles.muted}>{time}</div>
                </div>

                <div className={styles.clientCell}>
                  <div className={styles.avatar}>
                    {getInitials(operation.responsibleName)}
                  </div>
                  <div className={styles.clientName}>
                    {operation.responsibleName || "-"}
                  </div>
                </div>

                <div
                  className={styles.itemsCell}
                  title={movements
                    .map(
                      (movement) =>
                        `${getMovementProductLabel(movement)} - ${getMovementVariationLabel(movement)}`,
                    )
                    .join("\n")}
                >
                  {movements.slice(0, ).map((movement, index) => {
                    const imageUrl = getMovementImageUrl(movement);

                    return (
                      <span
                        key={movement.id}
                        className={styles.itemImageCircle}
                        style={{ zIndex: movements.length - index }}
                        aria-label={getMovementProductLabel(movement)}
                      >
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={getMovementProductLabel(movement)}
                            className={styles.itemImage}
                          />
                        ) : (
                          <span className={styles.itemImageFallback}>-</span>
                        )}
                      </span>
                    );
                  })}
                  {movements.length > 5 ? (
                    <span className={styles.itemImageMore}>
                      +{movements.length - 5}
                    </span>
                  ) : null}
                </div>

                <div className={styles.qtdValorCell}>
                  <span className={styles.totalCell}>{operationQuantity}x</span>
                  <span className={styles.valueCell}>
                    {formatBRL(operationTotal)}
                  </span>
                  <span className={styles.paymentCell}>
                    {operation.paymentMethod || "-"}
                  </span>
                </div>

                <div className={styles.reasonCell}>
                  {operation.reason || "-"}
                </div>

                <div>
                  <span
                    className={
                      operation.type === "OUT"
                        ? styles.statusOk
                        : styles.statusBad
                    }
                  >
                    {operation.type === "OUT" ? "SAÍDA" : "ENTRADA"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className={styles.bottom}>
        <div className={styles.counter}>
          Mostrando {paginatedOperations.length} de {totalOperations} operações
        </div>
        <div className={styles.pagination}>
          <button
            className={`${styles.pageBtn} ${
              currentPage === 1 ? styles.pageBtnDisabled : ""
            }`}
            type="button"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label="Página anterior"
          >
            ‹
          </button>
          {pages.map((pageNumber) => (
            <button
              key={pageNumber}
              className={`${styles.pageBtn} ${
                pageNumber === currentPage ? styles.pageBtnActive : ""
              }`}
              type="button"
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            className={`${styles.pageBtn} ${
              currentPage === totalPages ? styles.pageBtnDisabled : ""
            }`}
            type="button"
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            aria-label="Próxima página"
          >
            ›
          </button>
        </div>
      </div>
    </>
  );
}
