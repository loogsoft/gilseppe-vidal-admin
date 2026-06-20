import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  CreditCard,
  Hash,
  Mail,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  Save,
  UserRound,
  Wallet,
} from "lucide-react";
import { ButtonBack } from "../../components/ButtonBack/ButtonBack";
import { CreditSaleInstallmentStatusEnum } from "../../dtos/enums/credit-sale-installment-status.enum";
import { CreditSaleStatusEnum } from "../../dtos/enums/credit-sale-status.enum";
import { ProductStatusEnum } from "../../dtos/enums/product-status.enum";
import type { CreditSaleRequestDto } from "../../dtos/request/credit-sale-request.dto";
import type { CreditCustomerResponseDto } from "../../dtos/response/credit-customer-response.dto";
import type { CreditSaleInstallmentResponseDto } from "../../dtos/response/credit-sale-installment-response.dto";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import type { CreditSaleResponseDto } from "../../dtos/response/credit-sale-response.dto";
import { CreditCustomerService } from "../../service/Credit-customer.service";
import { ProductService } from "../../service/Product.service";
import { CreditSaleService } from "../../service/Credit-sale.service";
import { CreditSaleInstallmentService } from "../../service/Credit-sale-installment.service";
import styles from "./CreditSaleDetails.module.css";
import { IoLogoWhatsapp } from "react-icons/io5";

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

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function addMonths(value: Date | string, months: number) {
  const date = new Date(value);
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

function phoneMask(value?: string) {
  const rawDigits = (value ?? "").replace(/\D/g, "");
  const digits =
    rawDigits.startsWith("55") && rawDigits.length > 11
      ? rawDigits.slice(2, 13)
      : rawDigits.slice(0, 11);

  if (!digits) return "-";

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function getWhatsAppPhone(value?: string) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length < 10) return "";

  if (digits.startsWith("55") && digits.length >= 12) {
    return digits;
  }

  return `55${digits}`;
}

function cpfMask(value?: string) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "-";

  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function cepMask(value?: string) {
  const digits = (value ?? "").replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";

  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

function getInitials(name?: string) {
  return (name || "Cliente")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getProductLabel(product: ProductResponse) {
  return [product.name, product.size].filter(Boolean).join(" ") || product.name;
}

function getProductPrice(product: ProductResponse) {
  const promoPrice = toNumber(product.promoPrice);
  return promoPrice > 0 ? promoPrice : toNumber(product.price);
}

function toInputDate(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function buildCreditSaleWhatsAppMessage({
  customerName,
  creditSaleId,
  overdueInstallment,
  openAmount,
}: {
  customerName?: string;
  creditSaleId?: string;
  overdueInstallment?: CreditSaleInstallmentResponseDto | null;
  openAmount: number;
}) {
  const greeting = customerName?.trim()
    ? `Olá, ${customerName.trim()}. Tudo bem?`
    : "Olá! Tudo bem?";
  const saleText = creditSaleId ? ` do crediário #${creditSaleId}` : "";

  if (overdueInstallment) {
    return [
      greeting,
      `Identificamos que a parcela ${overdueInstallment.installmentNumber}${saleText} está em atraso.`,
      `Valor: ${formatBRL(overdueInstallment.amount)}. Vencimento: ${formatDate(overdueInstallment.dueDate)}.`,
      "Pode nos responder por aqui para combinarmos o pagamento?",
    ].join("\n");
  }

  return [
    greeting,
    `Estou entrando em contato sobre o seu crediário${creditSaleId ? ` #${creditSaleId}` : ""}.`,
    openAmount > 0 ? `Valor em aberto: ${formatBRL(openAmount)}.` : "",
    "Qualquer dúvida, pode responder por aqui.",
  ]
    .filter(Boolean)
    .join("\n");
}

const installmentStatusOptions = [
  {
    status: CreditSaleInstallmentStatusEnum.PENDING,
    label: "Em aberto",
  },
  {
    status: CreditSaleInstallmentStatusEnum.PAID,
    label: "Pago",
  },
  {
    status: CreditSaleInstallmentStatusEnum.OVERDUE,
    label: "Atrasado",
  },
];

function getCreditSaleStatusFromInstallments(
  installments: CreditSaleInstallmentResponseDto[],
  fallbackStatus: CreditSaleStatusEnum,
) {
  if (!installments.length) return fallbackStatus;

  const allPaid = installments.every(
    (installment) =>
      installment.status === CreditSaleInstallmentStatusEnum.PAID,
  );

  if (allPaid) return CreditSaleStatusEnum.COMPLETED;

  const hasOverdue = installments.some(
    (installment) =>
      installment.status === CreditSaleInstallmentStatusEnum.OVERDUE,
  );

  if (hasOverdue) return CreditSaleStatusEnum.LATE;

  return CreditSaleStatusEnum.PENDING;
}

export function CreditSaleDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isCreate = !id;
  const [creditSale, setCreditSale] = useState<CreditSaleResponseDto | null>(
    null,
  );
  const [installments, setInstallments] = useState<
    CreditSaleInstallmentResponseDto[]
  >([]);
  const [customers, setCustomers] = useState<CreditCustomerResponseDto[]>([]);
  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [createInstallment, setCreateInstallment] = useState(1);
  const [createDate, setCreateDate] = useState(toInputDate());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [openInstallmentStatusId, setOpenInstallmentStatusId] = useState<
    string | null
  >(null);
  const [updatingInstallmentId, setUpdatingInstallmentId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!id) {
      setInstallments([]);
      setOpenInstallmentStatusId(null);
      setStatusError(null);

      const loadCreateData = async () => {
        try {
          setLoading(true);
          setError(null);
          const [loadedCustomers, loadedProducts] = await Promise.all([
            CreditCustomerService.findAll(),
            ProductService.findAll(),
          ]);
          setCustomers(loadedCustomers);
          setProducts(loadedProducts);
        } catch (err) {
          console.error(err);
          setError("Não foi possível carregar clientes e produtos.");
        } finally {
          setLoading(false);
        }
      };

      void loadCreateData();
      return;
    }

    const loadCreditSale = async () => {
      try {
        setLoading(true);
        setError(null);
        setStatusError(null);
        const sale = await CreditSaleService.findOne(id);
        setCreditSale(sale);
        setInstallments(sale.installments ?? []);
        setOpenInstallmentStatusId(null);
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar os detalhes do crediário.");
      } finally {
        setLoading(false);
      }
    };

    void loadCreditSale();
  }, [id]);

  const availableProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.status !== ProductStatusEnum.DISABLED &&
          toNumber(product.stock) > 0,
      ),
    [products],
  );

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer) => String(customer.id) === String(selectedCustomerId),
      ),
    [customers, selectedCustomerId],
  );

  const selectedProducts = useMemo(
    () =>
      availableProducts.filter((product) =>
        selectedProductIds.includes(String(product.id)),
      ),
    [availableProducts, selectedProductIds],
  );

  const createTotalAmount = useMemo(
    () =>
      selectedProducts.reduce(
        (sum, product) => sum + getProductPrice(product),
        0,
      ),
    [selectedProducts],
  );

  const createInstallmentValue =
    createTotalAmount / Math.max(1, createInstallment);

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const onCreateCreditSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    if (!selectedCustomerId) {
      setError("Selecione um cliente para abrir o crediário.");
      return;
    }

    if (selectedProductIds.length === 0) {
      setError("Selecione ao menos um produto para o crediário.");
      return;
    }

    if (createInstallment < 1) {
      setError("Informe uma quantidade válida de parcelas.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload: CreditSaleRequestDto = {
        totalAmount: createTotalAmount,
        customerId: selectedCustomerId,
        installment: createInstallment,
        status: CreditSaleStatusEnum.PENDING,
        date: new Date(`${createDate}T12:00:00`),
        productIds: selectedProductIds,
      };
      const created = await CreditSaleService.create(payload);
      navigate(`/credit-sale-details/${created.id}`);
    } catch (err) {
      console.error(err);
      setError("Não foi possível abrir o crediário.");
    } finally {
      setSaving(false);
    }
  };

  const customer = creditSale?.customer;
  const totalAmount = toNumber(creditSale?.totalAmount);
  const installmentCount = Math.max(1, Number(creditSale?.installment) || 1);
  const productCount = creditSale?.products?.length ?? 0;
  const installmentValue = totalAmount / installmentCount;
  const openAmount = installments.length
    ? installments.reduce((sum, item) => {
        if (item.status === CreditSaleInstallmentStatusEnum.PAID) return sum;

        return sum + toNumber(item.amount);
      }, 0)
    : creditSale?.status === CreditSaleStatusEnum.PAID ||
        creditSale?.status === CreditSaleStatusEnum.COMPLETED
      ? 0
      : totalAmount;

  const customerAddress = useMemo(() => {
    if (!customer) return "-";

    const cityState = [customer.city, customer.state]
      .filter(Boolean)
      .join(" - ");
    const zipCode = cepMask(customer.zipCode);

    return [
      customer.road,
      customer.number,
      customer.neighborhood,
      cityState,
      zipCode,
    ]
      .filter(Boolean)
      .join(", ");
  }, [customer]);

  const displayInstallments = useMemo(() => {
    if (!creditSale) return [];

    if (installments.length) {
      return [...installments].sort(
        (first, second) => first.installmentNumber - second.installmentNumber,
      );
    }

    const totalCents = Math.round(totalAmount * 100);
    const baseCents = Math.floor(totalCents / installmentCount);
    const remainder = totalCents % installmentCount;
    const status =
      creditSale.status === CreditSaleStatusEnum.PAID ||
      creditSale.status === CreditSaleStatusEnum.COMPLETED
        ? CreditSaleInstallmentStatusEnum.PAID
        : creditSale.status === CreditSaleStatusEnum.LATE
          ? CreditSaleInstallmentStatusEnum.OVERDUE
          : CreditSaleInstallmentStatusEnum.PENDING;

    return Array.from({ length: installmentCount }, (_, index) => {
      const amountCents = baseCents + (index < remainder ? 1 : 0);
      const dueDate = addMonths(creditSale.date, index + 1);

      return {
        id: `fallback-${index + 1}`,
        installmentNumber: index + 1,
        amount: amountCents / 100,
        dueDate,
        status,
      };
    });
  }, [creditSale, installmentCount, installments, totalAmount]);

  const creditSaleCompleted = useMemo(
    () =>
      displayInstallments.length > 0 &&
      displayInstallments.every(
        (installment) =>
          installment.status === CreditSaleInstallmentStatusEnum.PAID,
      ),
    [displayInstallments],
  );

  const getInstallmentStatusMeta = (
    status?: CreditSaleInstallmentStatusEnum,
    isCreditSaleCompleted = false,
  ) => {
    if (isCreditSaleCompleted) {
      return {
        label: "Finalizado",
        className: styles.statusCompleted,
      };
    }

    if (status === CreditSaleInstallmentStatusEnum.OVERDUE) {
      return {
        label: "Atrasado",
        className: styles.statusLate,
      };
    }

    if (status === CreditSaleInstallmentStatusEnum.PAID) {
      return {
        label: "Pago",
        className: styles.statusPaid,
      };
    }

    return {
      label: "Em aberto",
      className: styles.statusPending,
    };
  };

  const monthInstallmentStatusMeta = useMemo(() => {
    const installmentNumber = creditSale
      ? getInstallmentNumberForMonth(creditSale, displayInstallments)
      : 1;
    const installment = displayInstallments.find(
      (item) => item.installmentNumber === installmentNumber,
    );
    const meta = getInstallmentStatusMeta(
      installment?.status,
      creditSaleCompleted,
    );

    if (creditSaleCompleted) {
      return {
        ...meta,
        icon: <CheckCircle2 size={14} />,
        cardClassName: styles.saleInfoStatusCompleted,
      };
    }

    if (installment?.status === CreditSaleInstallmentStatusEnum.PAID) {
      return {
        ...meta,
        icon: <CheckCircle2 size={14} />,
        cardClassName: styles.saleInfoStatusPaid,
      };
    }

    if (installment?.status === CreditSaleInstallmentStatusEnum.OVERDUE) {
      return {
        ...meta,
        icon: <AlertCircle size={14} />,
        cardClassName: styles.saleInfoStatusLate,
      };
    }

    return {
      ...meta,
      icon: <CreditCard size={14} />,
      cardClassName: styles.saleInfoStatusPending,
    };
  }, [creditSale, creditSaleCompleted, displayInstallments]);

  const overdueInstallment =
    displayInstallments.find(
      (installment) =>
        installment.status === CreditSaleInstallmentStatusEnum.OVERDUE,
    ) ?? null;
  const whatsappPhone = getWhatsAppPhone(customer?.phone);
  const whatsappMessage = buildCreditSaleWhatsAppMessage({
    customerName: customer?.customerName,
    creditSaleId: creditSale?.id,
    overdueInstallment,
    openAmount,
  });
  const whatsappUrl = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
        whatsappMessage,
      )}`
    : "";

  const onChangeInstallmentStatus = async (
    installment: CreditSaleInstallmentResponseDto,
    status: CreditSaleInstallmentStatusEnum,
  ) => {
    if (!creditSale) return;

    const installmentId = String(installment.id);

    if (installment.status === status) {
      setOpenInstallmentStatusId(null);
      return;
    }

    const paidAt =
      status === CreditSaleInstallmentStatusEnum.PAID
        ? (installment.paidAt ?? new Date().toISOString())
        : null;

    try {
      setUpdatingInstallmentId(installmentId);
      setStatusError(null);
      setOpenInstallmentStatusId(null);

      const updated = await CreditSaleInstallmentService.update(installmentId, {
        creditSaleId: String(creditSale.id),
        installmentNumber: installment.installmentNumber,
        amount: toNumber(installment.amount),
        dueDate: installment.dueDate,
        paidAt,
        status,
      });

      const nextInstallment: CreditSaleInstallmentResponseDto = {
        id: updated.id ?? installment.id,
        installmentNumber:
          updated.installmentNumber ?? installment.installmentNumber,
        amount: updated.amount ?? installment.amount,
        dueDate: updated.dueDate ?? installment.dueDate,
        paidAt: updated.paidAt ?? paidAt,
        status: updated.status ?? status,
      };

      const nextInstallments = (
        installments.length ? installments : (creditSale.installments ?? [])
      ).map((item) =>
        String(item.id) === installmentId ? nextInstallment : item,
      );

      const nextCreditSaleStatus = getCreditSaleStatusFromInstallments(
        nextInstallments,
        creditSale.status,
      );

      setInstallments(nextInstallments);
      setCreditSale((current) => {
        if (!current) return current;

        return {
          ...current,
          status: nextCreditSaleStatus,
          installments: nextInstallments,
        };
      });
    } catch (err) {
      console.error(err);
      setStatusError("Não foi possível atualizar o status da parcela.");
    } finally {
      setUpdatingInstallmentId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <section className={styles.loadingCard}>
            <span className={styles.spinner} />
            <div>
              <h1 className={styles.loadingTitle}>Carregando crediário</h1>
              <p className={styles.loadingText}>Buscando os dados da venda.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (isCreate) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.top}>
            <div className={styles.topLeft}>
              <ButtonBack />
              <div className={styles.titleWrap}>
                <span className={styles.eyebrow}>Crediários / Novo</span>
                <h1 className={styles.title}>Abrir crediário</h1>
                <p className={styles.subtitle}>
                  Selecione o cliente, os produtos e a condição de parcelas.
                </p>
              </div>
            </div>

            <div className={styles.topActions}>
              <button
                className={styles.ghostAction}
                type="button"
                onClick={() => navigate("/credit")}
              >
                Cancelar
              </button>
              <button
                className={styles.primaryAction}
                type="submit"
                form="credit-sale-form"
                disabled={saving}
              >
                {saving ? (
                  <span className={styles.smallSpinner} />
                ) : (
                  <Save size={16} />
                )}
                {saving ? "Abrindo..." : "Abrir crediário"}
              </button>
            </div>
          </header>

          {error ? (
            <section className={styles.formAlert}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </section>
          ) : null}

          <form
            id="credit-sale-form"
            className={styles.createForm}
            onSubmit={onCreateCreditSale}
          >
            <main className={styles.content}>
              <div className={styles.mainColumn}>
                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h2 className={styles.cardTitle}>Cliente do crediário</h2>
                      <p className={styles.cardSubtitle}>
                        Escolha um cliente cadastrado para vincular a venda.
                      </p>
                    </div>
                    <span className={styles.cardPill}>
                      {customers.length} cliente
                      {customers.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className={styles.formPanel}>
                    <label className={styles.formField}>
                      <span className={styles.formLabel}>Cliente</span>
                      <select
                        className={styles.selectInput}
                        value={selectedCustomerId}
                        onChange={(event) => {
                          setSelectedCustomerId(event.target.value);
                          setError(null);
                        }}
                        required
                      >
                        <option value="">Selecione um cliente</option>
                        {customers.map((customerOption) => (
                          <option
                            key={customerOption.id}
                            value={customerOption.id}
                          >
                            {customerOption.customerName} -{" "}
                            {customerOption.customerEmail}
                          </option>
                        ))}
                      </select>
                    </label>

                    {selectedCustomer ? (
                      <div className={styles.customerPreview}>
                        <div className={styles.customerAvatar}>
                          {getInitials(selectedCustomer.customerName)}
                        </div>
                        <div className={styles.customerTitle}>
                          <h2>{selectedCustomer.customerName}</h2>
                          <span>{selectedCustomer.customerEmail}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h2 className={styles.cardTitle}>
                        Produtos do crediário
                      </h2>
                      <p className={styles.cardSubtitle}>
                        Marque os produtos que ficarão vinculados a essa venda.
                      </p>
                    </div>
                    <span className={styles.cardPill}>
                      {selectedProducts.length} selecionado
                      {selectedProducts.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {availableProducts.length === 0 ? (
                    <div className={styles.emptyList}>
                      <Package size={24} />
                      <span>Nenhum produto disponível para crediário.</span>
                    </div>
                  ) : (
                    <div className={styles.productPickerList}>
                      {availableProducts.map((product) => {
                        const productId = String(product.id);
                        const selected = selectedProductIds.includes(productId);
                        const imageUrl = product.images?.[0]?.url;

                        return (
                          <button
                            key={product.id}
                            className={`${styles.productPickerRow} ${
                              selected ? styles.productPickerRowActive : ""
                            }`}
                            type="button"
                            onClick={() => {
                              toggleProduct(productId);
                              setError(null);
                            }}
                          >
                            <span className={styles.productPickerCheck}>
                              {selected ? "✓" : ""}
                            </span>
                            <span className={styles.productPickerMedia}>
                              {imageUrl ? (
                                <img src={imageUrl} alt={product.name} />
                              ) : (
                                <Package size={20} />
                              )}
                            </span>
                            <span className={styles.productPickerInfo}>
                              <strong>{getProductLabel(product)}</strong>
                              <span>
                                {product.category}
                                {product.stock !== undefined
                                  ? ` • Estoque ${product.stock}`
                                  : ""}
                              </span>
                            </span>
                            <strong className={styles.productPickerPrice}>
                              {formatBRL(getProductPrice(product))}
                            </strong>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              <aside className={styles.sideColumn}>
                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h2 className={styles.cardTitle}>
                        Condição do crediário
                      </h2>
                      <p className={styles.cardSubtitle}>
                        Defina abertura, quantidade de parcelas e confira o
                        total.
                      </p>
                    </div>
                  </div>

                  <div className={styles.formPanel}>
                    <label className={styles.formField}>
                      <span className={styles.formLabel}>Data de abertura</span>
                      <input
                        className={styles.selectInput}
                        type="date"
                        value={createDate}
                        onChange={(event) => setCreateDate(event.target.value)}
                        required
                      />
                    </label>

                    <label className={styles.formField}>
                      <span className={styles.formLabel}>Parcelas</span>
                      <select
                        className={styles.selectInput}
                        value={createInstallment}
                        onChange={(event) =>
                          setCreateInstallment(Number(event.target.value))
                        }
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((installment) => (
                          <option key={installment} value={installment}>
                            {installment}x de{" "}
                            {formatBRL(
                              createTotalAmount / Math.max(1, installment),
                            )}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className={styles.totalCard}>
                  <div>
                    <span className={styles.totalLabel}>
                      Total do crediário
                    </span>
                    <strong className={styles.totalValue}>
                      {formatBRL(createTotalAmount)}
                    </strong>
                  </div>
                  <div className={styles.totalBreakdown}>
                    <span>{selectedProducts.length} produto(s)</span>
                    <span>
                      {createInstallment}x de{" "}
                      {formatBRL(createInstallmentValue)}
                    </span>
                  </div>
                </section>
              </aside>
            </main>
          </form>
        </div>
      </div>
    );
  }

  if (error || !creditSale) {
    return (
      <div className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.top}>
            <div className={styles.topLeft}>
              <ButtonBack />
              <div>
                <span className={styles.eyebrow}>Crediários / Detalhes</span>
                <h1 className={styles.title}>Crediário não encontrado</h1>
              </div>
            </div>
          </header>

          <section className={styles.emptyCard}>
            <AlertCircle size={28} />
            <h2>{error ?? "Não foi possível localizar esse crediário."}</h2>
            <button
              className={styles.primaryAction}
              type="button"
              onClick={() => navigate("/credit")}
            >
              Voltar para crediários
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.top}>
          <div className={styles.topLeft}>
            <ButtonBack />
            <div className={styles.titleWrap}>
              <span className={styles.eyebrow}>
                Crediários / {monthInstallmentStatusMeta.label}
              </span>
              <div className={styles.titleRow}>
                <h1 className={styles.title}>Crediário #{creditSale.id}</h1>
                <span
                  className={`${styles.statusBadge} ${monthInstallmentStatusMeta.className}`}
                >
                  {monthInstallmentStatusMeta.icon}
                  {monthInstallmentStatusMeta.label}
                </span>
              </div>
              <p className={styles.subtitle}>
                Aberto em {formatDateTime(creditSale.date)} para{" "}
                {customer?.customerName ?? "cliente não identificado"}.
              </p>
            </div>
          </div>

          <div className={styles.topActions}>
            <button
              className={styles.primaryAction}
              type="button"
              onClick={() => navigate("/credit")}
            >
              Ver crediários
            </button>
          </div>
        </header>

        {statusError ? (
          <section className={styles.formAlert}>
            <AlertCircle size={18} />
            <span>{statusError}</span>
          </section>
        ) : null}

        <section className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryIcon}>
              <Wallet size={18} />
            </span>
            <span className={styles.summaryLabel}>Valor em aberto</span>
            <strong className={styles.summaryValue}>
              {formatBRL(openAmount)}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryIcon}>
              <CreditCard size={18} />
            </span>
            <span className={styles.summaryLabel}>Parcelas</span>
            <strong className={styles.summaryValue}>
              {installmentCount}x de {formatBRL(installmentValue)}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryIcon}>
              <CalendarDays size={18} />
            </span>
            <span className={styles.summaryLabel}>Data de abertura</span>
            <strong className={styles.summaryValue}>
              {formatDate(creditSale.date)}
            </strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryIcon}>
              <Package size={18} />
            </span>
            <span className={styles.summaryLabel}>Produtos</span>
            <strong className={styles.summaryValue}>
              {productCount} item{productCount === 1 ? "" : "s"}
            </strong>
          </div>
        </section>

        <main className={styles.content}>
          <div className={styles.mainColumn}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Produtos vinculados</h2>
                  <p className={styles.cardSubtitle}>
                    Itens lançados nesse crediário.
                  </p>
                </div>
                <span className={styles.cardPill}>
                  {productCount} item{productCount === 1 ? "" : "s"}
                </span>
              </div>

              {productCount === 0 ? (
                <div className={styles.emptyList}>
                  <Package size={24} />
                  <span>Sem produtos vinculados a esse crediário.</span>
                </div>
              ) : (
                <div className={styles.productsList}>
                  {creditSale.products.map((product) => {
                    const imageUrl = product.images?.[0]?.url;
                    const promoPrice = toNumber(product.promoPrice);
                    const price =
                      promoPrice > 0 ? product.promoPrice : product.price;

                    return (
                      <div key={product.id} className={styles.productRow}>
                        <div className={styles.productMedia}>
                          {imageUrl ? (
                            <img src={imageUrl} alt={product.name} />
                          ) : (
                            <Package size={22} />
                          )}
                        </div>

                        <div className={styles.productInfo}>
                          <div className={styles.productTop}>
                            <div>
                              <h3 className={styles.productName}>
                                {getProductLabel(product)}
                              </h3>
                              <p className={styles.productDescription}>
                                {product.description ||
                                  "Sem descrição cadastrada"}
                              </p>
                            </div>
                            <strong className={styles.productPrice}>
                              {formatBRL(price)}
                            </strong>
                          </div>

                          <div className={styles.productMeta}>
                            <span>{product.category}</span>
                            {product.color ? (
                              <span>{product.color}</span>
                            ) : null}
                            {product.size ? (
                              <span>Tam. {product.size}</span>
                            ) : null}
                            {typeof product.stock !== "undefined" ? (
                              <span>Estoque {product.stock}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className={`${styles.card} ${styles.installmentsCard}`}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Parcelas</h2>
                  <p className={styles.cardSubtitle}>
                    Distribuição do valor total do crediário.
                  </p>
                </div>
                <span className={styles.cardPill}>
                  Total {formatBRL(totalAmount)}
                </span>
              </div>

              <div className={styles.installmentList}>
                {displayInstallments.map((installment) => {
                  const rowStatusMeta = getInstallmentStatusMeta(
                    installment.status,
                  );
                  const installmentId = String(installment.id);
                  const statusMenuOpen =
                    openInstallmentStatusId === installmentId;
                  const updating = updatingInstallmentId === installmentId;
                  const canUpdateStatus =
                    !installmentId.startsWith("fallback-");

                  return (
                    <div key={installmentId} className={styles.installmentRow}>
                      <div className={styles.installmentNumber}>
                        <span>{installment.installmentNumber}</span>
                      </div>
                      <div className={styles.installmentInfo}>
                        <strong>Parcela {installment.installmentNumber}</strong>
                        <span>Previsão {formatDate(installment.dueDate)}</span>
                      </div>
                      <strong className={styles.installmentAmount}>
                        {formatBRL(installment.amount)}
                      </strong>
                      <div className={styles.installmentStatusWrap}>
                        <button
                          className={`${styles.installmentStatusButton} ${rowStatusMeta.className}`}
                          type="button"
                          disabled={updating || !canUpdateStatus}
                          onClick={() =>
                            setOpenInstallmentStatusId((current) =>
                              current === installmentId ? null : installmentId,
                            )
                          }
                        >
                          {updating ? "Salvando..." : rowStatusMeta.label}
                          <ChevronDown size={13} />
                        </button>

                        {statusMenuOpen ? (
                          <div className={styles.statusMenu}>
                            {installmentStatusOptions.map((option) => (
                              <button
                                key={option.status}
                                className={`${styles.statusOption} ${
                                  option.status === installment.status
                                    ? styles.statusOptionActive
                                    : ""
                                }`}
                                type="button"
                                onClick={() =>
                                  onChangeInstallmentStatus(
                                    installment,
                                    option.status,
                                  )
                                }
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.customerCard}>
              <div className={styles.customerHeader}>
                <div className={styles.customerAvatar}>
                  {getInitials(customer?.customerName)}
                </div>
                <div className={styles.customerTitle}>
                  <h2>
                    {customer?.customerName ?? "Cliente não identificado"}
                  </h2>
                  <span>Cliente do crediário</span>
                </div>
              </div>

              <div className={styles.infoList}>
                <div className={styles.infoItem}>
                  <UserRound size={16} />
                  <div>
                    <span>CPF</span>
                    <strong>{cpfMask(customer?.CPF)}</strong>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <Mail size={16} />
                  <div>
                    <span>E-mail</span>
                    <strong>{customer?.customerEmail || "-"}</strong>
                  </div>
                </div>
                <div className={styles.infoItem}>
                  <Phone size={16} />
                  <div>
                    <span>Telefone</span>
                    <strong>{phoneMask(customer?.phone)}</strong>
                  </div>
                </div>
                <div
                  className={`${styles.infoItem} ${styles.whatsappInfoItem}`}
                >
                  <IoLogoWhatsapp size={16} />
                  <div>
                    <span>WhatsApp</span>
                    <strong>{phoneMask(customer?.phone)}</strong>
                  </div>
                  {whatsappUrl ? (
                    <a
                      className={`${styles.whatsappAction} ${
                        overdueInstallment ? styles.whatsappActionLate : ""
                      }`}
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Falar com ${
                        customer?.customerName ?? "cliente"
                      } pelo WhatsApp`}
                    >
                      <IoLogoWhatsapp size={15} />
                      {overdueInstallment
                        ? "Cobrar no WhatsApp"
                        : "Falar no WhatsApp"}
                    </a>
                  ) : (
                    <span className={styles.whatsappUnavailable}>
                      Sem número
                    </span>
                  )}
                </div>
                <div className={styles.infoItem}>
                  <MapPin size={16} />
                  <div>
                    <span>Endereço</span>
                    <strong>{customerAddress}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Resumo do crediário</h2>
                  <p className={styles.cardSubtitle}>
                    Dados principais da venda.
                  </p>
                </div>
              </div>

              <div className={styles.saleInfoGrid}>
                <div className={styles.saleInfoItem}>
                  <Hash size={16} />
                  <span>ID</span>
                  <strong>#{creditSale.id}</strong>
                </div>
                <div
                  className={`${styles.saleInfoItem} ${monthInstallmentStatusMeta.cardClassName}`}
                >
                  <ReceiptText size={16} />
                  <span>Status</span>
                  <strong>{monthInstallmentStatusMeta.label}</strong>
                </div>
                <div className={styles.saleInfoItem}>
                  <CalendarDays size={16} />
                  <span>Aberto em</span>
                  <strong>{formatDateTime(creditSale.date)}</strong>
                </div>
                <div className={styles.saleInfoItem}>
                  <CreditCard size={16} />
                  <span>Forma</span>
                  <strong>Crediário</strong>
                </div>
              </div>
            </section>

            <section className={styles.totalCard}>
              <div>
                <span className={styles.totalLabel}>Total do crediário</span>
                <strong className={styles.totalValue}>
                  {formatBRL(totalAmount)}
                </strong>
              </div>
              <div className={styles.totalBreakdown}>
                <span>
                  {displayInstallments.length || installmentCount} parcelas
                </span>
                <span>{formatBRL(installmentValue)} por parcela</span>
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}
