import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  CreditCard,
  Hash,
  Mail,
  Package,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { ButtonBack } from "../../components/ButtonBack/ButtonBack";
import type { StockMovementResponseDto } from "../../dtos/response/stock-movement-response.dto";
import type { StockOperationResponseDto } from "../../dtos/response/stock-operation-response.dto";
import { StockMovementService } from "../../service/Stock-movement.service";
import styles from "./MovementDetails.module.css";

function toNumber(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatBRL(value: number | string | null | undefined) {
  return toNumber(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getMovementTotal(movement: StockMovementResponseDto) {
  const storedPrice = toNumber(movement.price);
  if (storedPrice > 0) return storedPrice;
  return toNumber(movement.variation?.price) * Number(movement.quantity || 0);
}

function getMovementProductName(movement: StockMovementResponseDto) {
  return movement.productName || movement.variation?.name || "-";
}

function getMovementVariation(movement: StockMovementResponseDto) {
  return {
    size: movement.variation?.size || movement.product?.size || "",
    color: movement.variation?.color || movement.product?.color || "",
  };
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
    (acc, movement) => acc + getMovementTotal(movement),
    0,
  );
}

function getOperationQuantity(operation: StockOperationResponseDto) {
  return (operation.movements ?? []).reduce(
    (acc, movement) => acc + Number(movement.quantity || 0),
    0,
  );
}

function getShortId(id?: string) {
  return id ? id.slice(0, 8).toUpperCase() : "-";
}

export function MovementDetails() {
  const { id } = useParams<{ id?: string }>();
  const [operation, setOperation] = useState<StockOperationResponseDto | null>(
    null,
  );
  const [fetchError, setFetchError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let isActive = true;

    StockMovementService.findOperationById(id)
      .then((data) => {
        if (!isActive) return;
        setOperation(data);
        setFetchError(null);
      })
      .catch((err) => {
        console.error(err);
        if (!isActive) return;
        setFetchError({
          id,
          message: "Nao foi possivel carregar a movimentacao.",
        });
      });

    return () => {
      isActive = false;
    };
  }, [id]);

  const routeError = !id ? "Movimentacao nao encontrada." : "";
  const requestError = fetchError && fetchError.id === id ? fetchError.message : "";
  const error = routeError || requestError;
  const loading = Boolean(id) && operation?.id !== id && !requestError;

  const total = useMemo(
    () => (operation ? getOperationTotal(operation) : 0),
    [operation],
  );
  const quantity = useMemo(
    () => (operation ? getOperationQuantity(operation) : 0),
    [operation],
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.stateBox}>Carregando movimentacao...</div>
      </div>
    );
  }

  if (error || !operation) {
    return (
      <div className={styles.page}>
        <div className={styles.topbar}>
          <ButtonBack />
        </div>
        <div className={styles.stateBox}>
          <AlertCircle size={22} />
          <span>{error || "Movimentacao nao encontrada."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <ButtonBack />
          <div>
            <div className={styles.titleRow}>
              <h1 className={styles.title}>
                Movimentacao #{getShortId(operation.id)}
              </h1>
              <span
                className={
                  operation.type === "OUT" ? styles.statusOut : styles.statusIn
                }
              >
                {operation.type === "OUT" ? "SAIDA" : "ENTRADA"}
              </span>
            </div>
            <div className={styles.subtitle}>
              {formatDateTime(operation.createdAt)}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.content}>
        <section className={styles.leftCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <Package size={17} />
                Itens da operacao
              </div>
              <span className={styles.cardMeta}>
                {(operation.movements ?? []).length} itens
              </span>
            </div>

            <div className={styles.itemsList}>
              {(operation.movements ?? []).map((movement) => {
                const movementTotal = getMovementTotal(movement);
                const unitPrice =
                  Number(movement.quantity || 0) > 0
                    ? movementTotal / Number(movement.quantity || 1)
                    : movementTotal;

                return (
                  <div key={movement.id} className={styles.itemRow}>
                    <div className={styles.itemMain}>
                      <div className={styles.itemName}>
                        {getMovementProductName(movement)}
                      </div>
                      <div className={styles.itemVisualRow}>
                        {(() => {
                          const variation = getMovementVariation(movement);

                          return (
                            <>
                              <span className={styles.itemImageCircle}>
                                {getMovementImageUrl(movement) ? (
                                  <img
                                    src={getMovementImageUrl(movement)}
                                    alt={getMovementProductName(movement)}
                                    className={styles.itemImage}
                                  />
                                ) : (
                                  <span className={styles.itemImageFallback}>
                                    -
                                  </span>
                                )}
                              </span>
                              {variation.size ? (
                                <span className={styles.itemMeta}>
                                  Tam. {variation.size}
                                </span>
                              ) : null}
                              {variation.color ? (
                                <span
                                  className={styles.itemColorDot}
                                  style={{ backgroundColor: variation.color }}
                                  title={`Cor: ${variation.color}`}
                                />
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className={styles.itemNumbers}>
                      <span>{movement.quantity}x</span>
                      <span>{formatBRL(unitPrice)}</span>
                      <strong>{formatBRL(movementTotal)}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <ReceiptText size={17} />
                Resumo
              </div>
            </div>

            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span>Quantidade</span>
                <strong>{quantity} un.</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Total</span>
                <strong>{formatBRL(total)}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>Pagamento</span>
                <strong>{operation.paymentMethod || "-"}</strong>
              </div>
            </div>
          </div>
        </section>

        <aside className={styles.rightCol}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <Hash size={17} />
                Dados da movimentacao
              </div>
            </div>

            <div className={styles.fieldsGrid}>
              <label className={styles.field}>
                <span>ID da operacao</span>
                <input value={operation.id} readOnly />
              </label>
              <label className={styles.field}>
                <span>Motivo</span>
                <input value={operation.reason || "-"} readOnly />
              </label>
              <label className={styles.field}>
                <span>Tipo</span>
                <input
                  value={operation.type === "OUT" ? "Saida" : "Entrada"}
                  readOnly
                />
              </label>
              <label className={styles.field}>
                <span>Forma de pagamento</span>
                <input value={operation.paymentMethod || "-"} readOnly />
              </label>
              <label className={styles.field}>
                <span>Data</span>
                <input value={formatDateTime(operation.createdAt)} readOnly />
              </label>
              <label className={styles.field}>
                <span>Observacao</span>
                <textarea value={operation.observation || "-"} readOnly />
              </label>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <UserRound size={17} />
                Responsavel
              </div>
            </div>

            <div className={styles.personBlock}>
              <div className={styles.avatar}>
                {(operation.responsibleName || "?")
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? "")
                  .join("")}
              </div>
              <div>
                <div className={styles.personName}>
                  {operation.responsibleName || "-"}
                </div>
                <div className={styles.personEmail}>
                  <Mail size={14} />
                  {operation.responsibleEmail || "-"}
                </div>
              </div>
            </div>

            <div className={styles.infoLine}>
              <CalendarDays size={16} />
              <span>{formatDateTime(operation.createdAt)}</span>
            </div>
            <div className={styles.infoLine}>
              <CreditCard size={16} />
              <span>{operation.paymentMethod || "-"}</span>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
