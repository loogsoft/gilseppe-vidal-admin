import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FiX,
  FiPackage,
  FiUser,
  FiTag,
  FiCreditCard,
  FiHash,
  FiCheckCircle,
  FiAlertTriangle,
  FiShield,
  FiHelpCircle,
  FiMail,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiCalendar,
  FiChevronDown,
} from "react-icons/fi";
import styles from "./DiscountStockModal.module.css";
import { CircularProgress } from "@mui/material";
import { useMessageContext } from "../../contexts/useMessageContext";
import { useAuth } from "../../contexts/useAuth";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import { StockMovementService } from "../../service/Stock-movement.service";
import { CreditCustomerService } from "../../service/Credit-customer.service";
import type { CreditCustomerResponseDto } from "../../dtos/response/credit-customer-response.dto";
import { CreditSaleService } from "../../service/Credit-sale.service";
import type { CreditSaleRequestDto } from "../../dtos/request/credit-sale-request.dto";
import { CreditSaleStatusEnum } from "../../dtos/enums/credit-sale-status.enum";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  product: ProductResponse | null;
  onConfirm: (data: BaixaFormData) => void;
  onClick: () => void;
};

export type BaixaFormData = {
  quantity: number;
  reason: string;
  paymentMethod: string;
  responsible: string;
  observation: string;
  operatorEmail: string;
  variationId?: string;
  variationLabel?: string;
  value: number;
  installment: number;
};

const REASONS = ["Venda", "Consumo interno", "Devolução", "Perda"];

const REASONS_INFO: Record<string, { desc: string; example: string }> = {
  Venda: {
    desc: "Produto saiu porque foi vendido a um cliente.",
    example: "Ex: Cliente comprou 1 camiseta tamanho M.",
  },
  "Consumo interno": {
    desc: "Produto usado pela própria empresa.",
    example: "Ex: Funcionário pegou uma camiseta para uniforme.",
  },
  Devolução: {
    desc: "Produto foi devolvido para o fornecedor.",
    example: "Ex: Loja devolveu 2 camisetas com defeito para o fornecedor.",
  },
  Perda: {
    desc: "Produto desapareceu ou não foi encontrado no estoque.",
    example: "Ex: 1 camiseta sumiu durante a contagem de estoque.",
  },
};
const PAYMENT_METHODS = ["PIX", "Dinheiro", "Crédito", "Débito", "Crediario"];

function phoneMask(value: string): string {
  if (!value) return "";
  const normalized = value.replace(/\D/g, "").slice(0, 11);
  if (normalized.length <= 10) {
    return normalized
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return normalized
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function cpfMask(value: string): string {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function cepMask(value: string): string {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/^(\d{5})(\d)/, "$1-$2");
}

export function DiscountStockModal({
  isOpen,
  onClose,
  product,
  onConfirm,
  onClick,
}: Props) {
  const { user } = useAuth();
  const operatorEmail = user?.email || "";
  const { checkStockAndNotify } = useMessageContext();

  const hasVariations = Boolean(product?.variations?.length);
  const allVariations = hasVariations
    ? (product?.variations?.map((variation) => ({
        ...variation,
        isMain: false,
      })) ?? [])
    : [
        {
          id: product?.id,
          name: product?.name,
          price: product?.price,
          stock: product?.stock ?? 0,
          lowStock: product?.lowStock ?? 0,
          activeLowStock: product?.activeLowStock ?? false,
          color: product?.color ?? "",
          size: product?.size ?? "",
          imageUrl: product?.images?.[0]?.url ?? "",
          isMain: true,
        },
      ];
  const [selectedVariationIdx, setSelectedVariationIdx] = useState<
    number | null
  >(hasVariations ? null : 0);
  const [form, setForm] = useState({
    quantity: 1,
    value: 0,
    percent: 0,
    reason: "Venda",
    paymentMethod: "PIX",
    responsible: "",
    observation: "",
    installment: 1,
  });
  const RESPONSIBLE_LIST = ["Bruna", "Eduardo"];
  const INSTALLMENT_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const responsibleRef = useRef<HTMLDivElement>(null);
  const [installmentOpen, setInstallmentOpen] = useState(false);
  const installmentRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [reasonOpen, setReasonOpen] = useState(false);
  const reasonRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [creditModalMode, setCreditModalMode] = useState<"list" | "create">(
    "list",
  );
  const [selectedCreditCustomerId, setSelectedCreditCustomerId] = useState<
    string | null
  >(null);
  const [creditError, setCreditError] = useState("");
  const [creditCustomer, setCreditCustomer] = useState<
    CreditCustomerResponseDto[]
  >([]);
  const [creditForm, setCreditForm] = useState({
    customerName: "",
    customerEmail: "",
    CPF: "",
    phone: "",
    road: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const resetCreditForm = () => {
    setCreditForm({
      customerName: "",
      customerEmail: "",
      CPF: "",
      phone: "",
      road: "",
      number: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
    });
    setCreditError("");
  };

  const fetchCreditCustomers = async () => {
    try {
      setCreditLoading(true);
      const data = await CreditCustomerService.findAll();
      setCreditCustomer(
        data.map((customer) => ({
          ...customer,
          id: String(customer.id),
        })),
      );
    } catch (err) {
      console.error(err);
      setError("Erro ao carregar clientes");
    } finally {
      setCreditLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditCustomers();
  }, [creditModalOpen]);

  useEffect(() => {
    if (!reasonOpen && !responsibleOpen && !installmentOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        reasonOpen &&
        reasonRef.current &&
        !reasonRef.current.contains(e.target as Node)
      ) {
        setReasonOpen(false);
      }
      if (
        responsibleOpen &&
        responsibleRef.current &&
        !responsibleRef.current.contains(e.target as Node)
      ) {
        setResponsibleOpen(false);
      }
      if (
        installmentOpen &&
        installmentRef.current &&
        !installmentRef.current.contains(e.target as Node)
      ) {
        setInstallmentOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [installmentOpen, reasonOpen, responsibleOpen]);

  useEffect(() => {
    if (!isOpen || !product) return;

    setSelectedVariationIdx(hasVariations ? null : 0);
    setCreditModalOpen(false);
    setCreditModalMode("list");
    setSelectedCreditCustomerId(null);
    setInstallmentOpen(false);
    resetCreditForm();
    setError("");
    setForm((current) => ({
      ...current,
      quantity: 1,
      value: hasVariations ? 0 : Number(product.price ?? 0),
      percent: 0,
      installment: 1,
    }));
  }, [hasVariations, isOpen, product]);

  const selectedVariation =
    selectedVariationIdx !== null ? allVariations[selectedVariationIdx] : null;

  const currentStock = selectedVariation ? Number(selectedVariation.stock) : 0;
  const currentLowStock = selectedVariation?.activeLowStock
    ? Number(selectedVariation.lowStock ?? 0)
    : 0;
  const isOverStock = form.quantity > currentStock;
  const isZero = form.quantity <= 0;
  const defaultValue = selectedVariation ? Number(selectedVariation.price) : 0;
  const value = form.value === 0 ? defaultValue : form.value;
  const percent = form.percent;
  const totalSaleValue = value * form.quantity;
  const installmentValue = totalSaleValue / form.installment;
  const selectedCreditCustomer = creditCustomer.find(
    (customer) => String(customer.id) === String(selectedCreditCustomerId),
  );
  const formatCreditLocation = (customer: CreditCustomerResponseDto) =>
    [customer.city, customer.state].filter(Boolean).join(" • ");
  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const handleCreditModalClose = () => {
    setCreditModalOpen(false);
    setCreditModalMode("list");
    resetCreditForm();
  };

  const handleCreateCredit = async () => {
    if (creditSaving) return;

    if (!creditForm.customerName.trim()) {
      setCreditError("Informe o nome do cliente.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !creditForm.customerEmail.trim() ||
      !emailRegex.test(creditForm.customerEmail.trim())
    ) {
      setCreditError("Informe um e-mail válido.");
      return;
    }

    if (creditForm.CPF.replace(/\D/g, "").length !== 11) {
      setCreditError("CPF deve conter 11 dígitos.");
      return;
    }

    if (creditForm.phone.replace(/\D/g, "").length < 10) {
      setCreditError("Informe um telefone válido.");
      return;
    }

    if (
      !creditForm.road.trim() ||
      !creditForm.number.trim() ||
      !creditForm.neighborhood.trim() ||
      !creditForm.city.trim() ||
      !creditForm.state.trim() ||
      !creditForm.zipCode.trim()
    ) {
      setCreditError("Preencha todos os campos obrigatórios do endereço.");
      return;
    }

    try {
      setCreditSaving(true);
      setCreditError("");
      const createdCustomer = await CreditCustomerService.create({
        customerName: creditForm.customerName.trim(),
        customerEmail: creditForm.customerEmail.trim(),
        CPF: creditForm.CPF.replace(/\D/g, ""),
        phone: creditForm.phone.replace(/\D/g, ""),
        road: creditForm.road.trim(),
        number: creditForm.number.trim(),
        neighborhood: creditForm.neighborhood.trim(),
        city: creditForm.city.trim(),
        state: creditForm.state.trim(),
        zipCode: creditForm.zipCode.replace(/\D/g, ""),
        totalAmounts: 0,
      });
      await fetchCreditCustomers();
      setSelectedCreditCustomerId(String(createdCustomer.id));
      resetCreditForm();
      setCreditModalMode("list");
    } catch (createError) {
      console.error(createError);
      setCreditError("Erro ao criar crediário. Tente novamente.");
    } finally {
      setCreditSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !product || !selectedVariation) return;

    setForm((current) => ({
      ...current,
      value: Number(selectedVariation.price ?? 0),
      percent: 0,
    }));
  }, [isOpen, product, selectedVariation]);

  if (!isOpen || !product) return null;

  // ...removido duplicidade...

  const handleConfirm = async () => {
    setLoading(true);
    if (selectedVariationIdx === null) {
      setError("Selecione uma variação antes de confirmar.");
      setLoading(false);
      return;
    }
    if (!form.responsible.trim()) {
      setError("Informe o responsável pela baixa.");
      setLoading(false);
      return;
    }
    if (isZero) {
      setError("A quantidade deve ser maior que zero.");
      setLoading(false);
      return;
    }
    if (isOverStock) {
      setError("Quantidade maior que o estoque disponível.");
      setLoading(false);
      return;
    }
    if (
      form.paymentMethod === "Crediario" &&
      !String(selectedCreditCustomerId ?? "").trim()
    ) {
      setError("Selecione um cliente do crediário antes de confirmar.");
      setLoading(false);
      return;
    }
    setError("");

    try {
      if (form.paymentMethod === "Crediario") {
        const customerId = String(selectedCreditCustomerId ?? "").trim();
        const productId = String(
          selectedVariation?.id ?? product.id ?? "",
        ).trim();

        if (!customerId) {
          setError("Selecione um cliente do crediário antes de confirmar.");
          setLoading(false);
          return;
        }

        if (!productId) {
          setError("Produto inválido para registrar no crediário.");
          setLoading(false);
          return;
        }

        const payloadSale: CreditSaleRequestDto = {
          totalAmount: totalSaleValue,
          customerId,
          installment: form.installment,
          status: CreditSaleStatusEnum.PENDING,
          date: new Date(),
          productIds: [productId],
        };
        await CreditSaleService.create(payloadSale);
      }

      if (!selectedVariation?.id) throw new Error("Variação não selecionada");
      await StockMovementService.create({
        productName: product.name,
        variationId: selectedVariation.id,
        type: "OUT",
        quantity: form.quantity,
        reason: form.reason,
        paymentMethod: form.paymentMethod,
        responsibleEmail: operatorEmail,
        responsibleName: form.responsible,
        observation: form.observation,
        price: String(value * form.quantity),
      });
      await checkStockAndNotify();
      onConfirm({
        ...form,
        value: value * form.quantity,
        operatorEmail,
        variationId: selectedVariation.id,
        variationLabel:
          `${selectedVariation.color ?? ""} ${selectedVariation.size ?? ""}`.trim(),
      });
      setLoading(false);
      onClick();
      onClose();
      setForm({
        quantity: 1,
        value: Number(product.price ?? 0),
        percent: 0,
        reason: "Venda",
        paymentMethod: "PIX",
        responsible: "",
        observation: "",
        installment: 1,
      });
      setSelectedVariationIdx(hasVariations ? null : 0);
      setSelectedCreditCustomerId(null);
    } catch {
      setError("Erro ao registrar a baixa. Tente novamente.");
      setLoading(false);
    }
  };

  const stockAfter = Math.max(0, currentStock - form.quantity);

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div>
              <span className={styles.badge}>AÇÃO DE INVENTÁRIO</span>
              <h2 className={styles.title}>Dar Baixa no Estoque</h2>
            </div>
            <button className={styles.closeBtn} type="button" onClick={onClose}>
              <FiX />
            </button>
          </div>

          <div className={styles.productCard}>
            <div className={styles.productThumb}>
              {product.images?.[0]?.url ? (
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className={styles.productImg}
                />
              ) : (
                <FiPackage className={styles.productIcon} />
              )}
            </div>
            <div className={styles.productInfo}>
              <div className={styles.productName}>{product.name}</div>
              <div className={styles.productCategory}>{product.category}</div>
              <div className={styles.stockRow}>
                <span
                  className={`${styles.stockDot} ${currentStock === 0 || (currentLowStock > 0 && currentStock <= currentLowStock) ? styles.stockDotLow : styles.stockDotOk}`}
                />
                <span className={styles.stockText}>
                  {Math.max(0, currentStock)} em estoque
                </span>
              </div>
            </div>
            {!isZero && !isOverStock && (
              <div className={styles.stockAfterBadge}>
                <span className={styles.stockAfterLabel}>Após a baixa</span>
                <span
                  className={`${styles.stockAfterValue} ${stockAfter === 0 || (currentLowStock > 0 && stockAfter <= currentLowStock) ? styles.stockAfterLow : ""}`}
                >
                  {stockAfter}
                </span>
              </div>
            )}
          </div>

          <div className={styles.variationSection}>
            <span className={styles.variationSectionLabel}>
              Selecione a variação
            </span>
            <div className={styles.variationGrid}>
              {allVariations.map((v, idx) => {
                const vStock = Number(v.stock);
                const vPrice = v.price ? Number(v.price) : null;
                const vLowStock = v.activeLowStock
                  ? Number(v.lowStock ?? 0)
                  : 0;
                const isSelected = selectedVariationIdx === idx;
                return (
                  <button
                    key={v.id + (v.isMain ? "-main" : "")}
                    type="button"
                    className={`${styles.variationChip} ${isSelected ? styles.variationChipActive : ""} ${vStock === 0 ? styles.variationChipEmpty : ""}`}
                    onClick={() => {
                      if (!hasVariations) return;
                      setSelectedVariationIdx(idx);
                      setError("");
                      setForm((f) => ({ ...f, quantity: 1 }));
                    }}
                    disabled={!hasVariations && idx === 0}
                    style={
                      !hasVariations && idx === 0
                        ? { cursor: "default", opacity: 0.7 }
                        : {}
                    }
                  >
                    {v.imageUrl ? (
                      <img
                        src={
                          Array.isArray(v.imageUrl)
                            ? v.imageUrl[0] || ""
                            : v.imageUrl || ""
                        }
                        alt={v.size || v.name}
                        className={styles.variationChipImg}
                      />
                    ) : (
                      <span
                        className={styles.variationChipDot}
                        style={{ background: v.color || "#ccc" }}
                      />
                    )}
                    <div className={styles.variationChipInfo}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          className={styles.variationColorDot}
                          style={{ background: v.color || "#ccc" }}
                        />
                        <span className={styles.variationChipSize}>
                          {v.size || v.name}
                        </span>
                      </span>
                      {vPrice !== null && (
                        <span className={styles.variationChipPrice}>
                          {vPrice.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      )}
                      <span
                        className={`${styles.variationChipStock} ${vStock === 0 ? styles.variationChipStockEmpty : vLowStock > 0 && vStock <= vLowStock ? styles.variationChipStockLow : ""}`}
                      >
                        {vStock === 0 ? "Sem estoque" : `${vStock} un`}
                      </span>
                    </div>
                    {isSelected && (
                      <span className={styles.variationChipCheck}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <FiHash className={styles.labelIcon} />
                QUANTIDADE
              </label>
              <input
                className={`${styles.input} ${isOverStock || isZero ? styles.inputError : ""}`}
                type="number"
                min={1}
                max={currentStock}
                value={form.quantity}
                onChange={(e) => {
                  setError("");
                  setForm((f) => ({ ...f, quantity: Number(e.target.value) }));
                }}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <FiTag className={styles.labelIcon} />
                VALOR DA BAIXA
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginRight: 4,
                  }}
                >
                  R$
                </span>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  value={value * form.quantity}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setForm((f) => ({
                      ...f,
                      value: v,
                      percent:
                        v === 0
                          ? 0
                          : Number(
                              (
                                ((v - defaultValue) / defaultValue) *
                                100
                              ).toFixed(2),
                            ),
                    }));
                  }}
                  style={{ width: 110 }}
                />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    marginLeft: 8,
                  }}
                >
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "none",
                      color: "#22c55e",
                      fontSize: 16,
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                    onClick={() => {
                      const newPercent = percent - 1;
                      const newValue = Number(
                        (defaultValue * (1 + newPercent / 100)).toFixed(2),
                      );
                      setForm((f) => ({
                        ...f,
                        percent: newPercent,
                        value: newValue,
                      }));
                    }}
                    aria-label="Aumentar %"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    style={{
                      border: "none",
                      background: "none",
                      color: "#ef4444",
                      fontSize: 16,
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                    onClick={() => {
                      const newPercent = percent + 1;
                      const newValue = Number(
                        (defaultValue * (1 + newPercent / 100)).toFixed(2),
                      );
                      setForm((f) => ({
                        ...f,
                        percent: newPercent,
                        value: newValue,
                      }));
                    }}
                    aria-label="Diminuir %"
                  >
                    ▼
                  </button>
                </div>
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginLeft: 8,
                    position: "relative",
                  }}
                >
                  {percent > 0 ? "+" : ""}
                  {percent}%
                </span>
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <FiTag className={styles.labelIcon} />
                MOTIVO DA BAIXA
              </label>
              <div className={styles.reasonDropdown} ref={reasonRef}>
                <button
                  type="button"
                  className={`${styles.select} ${styles.reasonTrigger}`}
                  onClick={() => setReasonOpen((o) => !o)}
                >
                  {form.reason}
                </button>
                {reasonOpen && (
                  <div className={styles.reasonList}>
                    {REASONS.map((r) => (
                      <div
                        key={r}
                        className={`${styles.reasonOption} ${form.reason === r ? styles.reasonOptionActive : ""}`}
                        onClick={() => {
                          setForm((f) => ({ ...f, reason: r }));
                          setReasonOpen(false);
                        }}
                      >
                        <span className={styles.reasonOptionLabel}>{r}</span>
                        <div
                          className={styles.reasonTooltipWrap}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiHelpCircle className={styles.reasonTooltipIcon} />
                          <div className={styles.reasonTooltip}>
                            <p>{REASONS_INFO[r].desc}</p>
                            <p>{REASONS_INFO[r].example}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <FiCreditCard className={styles.labelIcon} />
                FORMA DE PAGAMENTO
              </label>
              <select
                className={styles.select}
                value={form.paymentMethod}
                onChange={(e) => {
                  const paymentMethod = e.target.value;
                  setForm((f) => ({
                    ...f,
                    paymentMethod,
                    installment:
                      paymentMethod === "Crediario" ? f.installment : 1,
                  }));
                  setInstallmentOpen(false);
                  setCreditModalMode("list");
                  setCreditError("");
                  setCreditModalOpen(paymentMethod === "Crediario");
                }}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <FiUser className={styles.labelIcon} />
                RESPONSÁVEL
              </label>
              <div className={styles.reasonDropdown} ref={responsibleRef}>
                <button
                  type="button"
                  className={`${styles.select} ${styles.reasonTrigger}`}
                  onClick={() => setResponsibleOpen((o) => !o)}
                  style={
                    error && !form.responsible.trim()
                      ? {
                          borderColor: "#ef4444",
                          boxShadow: "0 0 0 3px rgba(239, 68, 68, 0.1)",
                        }
                      : {}
                  }
                >
                  {form.responsible || "Selecione o responsável"}
                </button>
                {responsibleOpen && (
                  <div className={styles.reasonList}>
                    {RESPONSIBLE_LIST.map((r) => (
                      <div
                        key={r}
                        className={`${styles.reasonOption} ${form.responsible === r ? styles.reasonOptionActive : ""}`}
                        onClick={() => {
                          setForm((f) => ({ ...f, responsible: r }));
                          setResponsibleOpen(false);
                          setError("");
                        }}
                      >
                        <span className={styles.reasonOptionLabel}>{r}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {form.paymentMethod === "Crediario" && (
            <>
              {" "}
              <div className={styles.fieldGroupFull}>
                <label className={styles.label}>
                  <FiCreditCard className={styles.labelIcon} />
                  CLIENTE DO CREDIÁRIO
                </label>
                <button
                  type="button"
                  className={styles.creditTrigger}
                  onClick={() => {
                    setCreditModalMode("list");
                    setCreditError("");
                    setCreditModalOpen(true);
                  }}
                >
                  <span className={styles.creditTriggerTitle}>
                    {selectedCreditCustomer
                      ? selectedCreditCustomer.customerName
                      : "Ver clientes do crediário"}
                  </span>
                  <span className={styles.creditTriggerMeta}>
                    {selectedCreditCustomer
                      ? "Cliente selecionado"
                      : creditCustomer.length > 0
                        ? `${creditCustomer.length} cliente${creditCustomer.length > 1 ? "s" : ""} cadastrado${creditCustomer.length > 1 ? "s" : ""}`
                        : "Nenhum cliente cadastrado"}
                  </span>
                </button>
              </div>
              <div className={styles.fieldGroupFull}>
                <label className={styles.label}>
                  <FiCalendar className={styles.labelIcon} />
                  PARCELAS
                </label>
                <div
                  className={styles.installmentDropdown}
                  ref={installmentRef}
                >
                  <button
                    type="button"
                    className={`${styles.installmentTrigger} ${
                      installmentOpen ? styles.installmentTriggerOpen : ""
                    }`}
                    aria-expanded={installmentOpen}
                    aria-haspopup="listbox"
                    onClick={() => setInstallmentOpen((open) => !open)}
                  >
                    <span className={styles.installmentTriggerMain}>
                      <span className={styles.installmentTriggerTitle}>
                        {form.installment === 1
                          ? "1 parcela"
                          : `${form.installment} parcelas`}
                      </span>
                      <span className={styles.installmentTriggerMeta}>
                        {installmentValue.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}{" "}
                        por parcela
                      </span>
                    </span>

                    <span className={styles.installmentTriggerAside}>
                      <span>Total da venda</span>
                      <strong>
                        {totalSaleValue.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </strong>
                    </span>

                    <FiChevronDown
                      className={`${styles.installmentChevron} ${
                        installmentOpen ? styles.installmentChevronOpen : ""
                      }`}
                    />
                  </button>

                  {installmentOpen && (
                    <div
                      className={styles.installmentList}
                      role="listbox"
                      aria-label="Quantidade de parcelas"
                    >
                      {INSTALLMENT_LIST.map((installment) => {
                        const optionValue = totalSaleValue / installment;
                        const isSelected = form.installment === installment;

                        return (
                          <button
                            key={installment}
                            type="button"
                            className={`${styles.installmentOption} ${
                              isSelected
                                ? styles.installmentOptionActive
                                : ""
                            }`}
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setForm((current) => ({
                                ...current,
                                installment,
                              }));
                              setInstallmentOpen(false);
                            }}
                          >
                            <span className={styles.installmentOptionCount}>
                              <strong>{installment}x</strong>
                              <span>
                                {installment === 1
                                  ? "1 parcela"
                                  : `${installment} parcelas`}
                              </span>
                            </span>

                            <span className={styles.installmentOptionValue}>
                              <span>Valor por parcela</span>
                              <strong>
                                {optionValue.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </strong>
                            </span>

                            <span className={styles.installmentOptionTotal}>
                              <span>Total</span>
                              <strong>
                                {totalSaleValue.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </strong>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className={styles.fieldGroupFull}>
            <label className={styles.label}>
              <FiTag className={styles.labelIcon} />
              OBSERVAÇÃO (opcional)
            </label>
            <textarea
              className={styles.textarea}
              placeholder="Alguma observação sobre esta baixa..."
              rows={2}
              value={form.observation}
              onChange={(e) =>
                setForm((f) => ({ ...f, observation: e.target.value }))
              }
            />
          </div>

          <div className={styles.operatorBadge}>
            <div className={styles.operatorLeft}>
              <FiShield className={styles.operatorIcon} />
              <div>
                <span className={styles.operatorTitle}>
                  Operação registrada por
                </span>
                <span className={styles.operatorName}>
                  {form.responsible || "—"}
                </span>
              </div>
            </div>
            {operatorEmail && (
              <span className={styles.operatorEmail}>{operatorEmail}</span>
            )}
          </div>

          {error && (
            <div className={styles.errorMsg}>
              <FiAlertTriangle />
              {error}
            </div>
          )}

          <div className={styles.actions}>
            <button
              className={styles.confirmBtn}
              type="submit"
              onClick={handleConfirm}
            >
              {loading ? (
                <CircularProgress
                  size={20}
                  color="inherit"
                  className={styles.loading}
                />
              ) : (
                <div style={{ display: "flex", gap: "10px" }}>
                  <FiCheckCircle />
                  Confirmar Baixa
                </div>
              )}
            </button>
            <button
              className={styles.cancelBtn}
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>

          <p className={styles.disclaimer}>
            Ao confirmar, o item será removido permanentemente do estoque
            disponível.
          </p>
        </div>
      </div>

      {creditModalOpen && (
        <div
          className={styles.creditModalBackdrop}
          onClick={handleCreditModalClose}
        >
          <div
            className={styles.creditModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.creditModalHeader}>
              <div>
                <span className={styles.creditModalBadge}>Crediário</span>
                <h3 className={styles.creditModalTitle}>
                  {creditModalMode === "list"
                    ? "Escolha um cliente cadastrado"
                    : "Criar novo crediário"}
                </h3>
                <p className={styles.creditModalSubtitle}>
                  {creditModalMode === "list"
                    ? "Visualize os clientes disponíveis antes de seguir com a baixa."
                    : "Preencha os dados do cliente e cadastre o crediário sem sair desta tela."}
                </p>
              </div>
              <button
                type="button"
                className={styles.creditModalClose}
                onClick={handleCreditModalClose}
              >
                <FiX />
              </button>
            </div>

            <div className={styles.creditCustomerList}>
              {creditModalMode === "list" ? (
                creditLoading ? (
                  <div className={styles.creditEmptyState}>
                    <CircularProgress size={28} color="inherit" />
                    <span className={styles.creditEmptyText}>
                      Carregando clientes...
                    </span>
                  </div>
                ) : creditCustomer.length > 0 ? (
                  creditCustomer.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className={`${styles.creditCustomerCard} ${String(selectedCreditCustomerId) === String(customer.id) ? styles.creditCustomerCardSelected : ""}`}
                      onClick={() => {
                        setSelectedCreditCustomerId(String(customer.id));
                        handleCreditModalClose();
                      }}
                    >
                      <span className={styles.creditCustomerCheck} />
                      <div className={styles.creditCustomerAvatar}>
                        {getInitials(customer.customerName) || <FiUser />}
                      </div>

                      <div className={styles.creditCustomerBody}>
                        <div className={styles.creditCustomerTopRow}>
                          <div>
                            <strong className={styles.creditCustomerName}>
                              {customer.customerName}
                            </strong>
                            <span className={styles.creditCustomerId}>
                              ID {customer.id}
                            </span>
                          </div>

                          <span className={styles.creditCustomerAmount}>
                            {Number(customer.totalAmounts ?? 0).toLocaleString(
                              "pt-BR",
                              {
                                style: "currency",
                                currency: "BRL",
                              },
                            )}
                          </span>
                        </div>

                        <div className={styles.creditCustomerMetaList}>
                          {customer.customerEmail && (
                            <span className={styles.creditCustomerMetaItem}>
                              <FiMail />
                              {customer.customerEmail}
                            </span>
                          )}
                          {customer.phone && (
                            <span className={styles.creditCustomerMetaItem}>
                              <FiPhone />
                              {customer.phone}
                            </span>
                          )}
                          {formatCreditLocation(customer) && (
                            <span className={styles.creditCustomerMetaItem}>
                              <FiMapPin />
                              {formatCreditLocation(customer)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className={styles.creditEmptyState}>
                    <div className={styles.creditEmptyIcon}>
                      <FiCreditCard />
                    </div>
                    <strong className={styles.creditEmptyTitle}>
                      Nenhum cliente encontrado
                    </strong>
                    <span className={styles.creditEmptyText}>
                      Cadastre um novo cliente de crediário para continuar.
                    </span>
                  </div>
                )
              ) : (
                <div className={styles.creditFormWrap}>
                  <div className={styles.creditFormGrid}>
                    <label className={styles.creditField}>
                      <span className={styles.creditFieldLabel}>Nome</span>
                      <input
                        className={styles.creditFieldInput}
                        value={creditForm.customerName}
                        onChange={(e) =>
                          setCreditForm((current) => ({
                            ...current,
                            customerName: e.target.value,
                          }))
                        }
                        placeholder="Nome completo"
                      />
                    </label>

                    <label className={styles.creditField}>
                      <span className={styles.creditFieldLabel}>Email</span>
                      <input
                        className={styles.creditFieldInput}
                        value={creditForm.customerEmail}
                        onChange={(e) =>
                          setCreditForm((current) => ({
                            ...current,
                            customerEmail: e.target.value,
                          }))
                        }
                        placeholder="email@cliente.com"
                      />
                    </label>

                    <label className={styles.creditField}>
                      <span className={styles.creditFieldLabel}>CPF</span>
                      <input
                        className={styles.creditFieldInput}
                        value={cpfMask(creditForm.CPF)}
                        onChange={(e) =>
                          setCreditForm((current) => ({
                            ...current,
                            CPF: e.target.value.replace(/\D/g, "").slice(0, 11),
                          }))
                        }
                        placeholder="000.000.000-00"
                      />
                    </label>

                    <label className={styles.creditField}>
                      <span className={styles.creditFieldLabel}>Telefone</span>
                      <input
                        className={styles.creditFieldInput}
                        value={phoneMask(creditForm.phone)}
                        onChange={(e) =>
                          setCreditForm((current) => ({
                            ...current,
                            phone: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 11),
                          }))
                        }
                        placeholder="(00) 00000-0000"
                      />
                    </label>

                    <label
                      className={`${styles.creditField} ${styles.creditFieldFull}`}
                    >
                      <span className={styles.creditFieldLabel}>Rua</span>
                      <input
                        className={styles.creditFieldInput}
                        value={creditForm.road}
                        onChange={(e) =>
                          setCreditForm((current) => ({
                            ...current,
                            road: e.target.value,
                          }))
                        }
                        placeholder="Rua do cliente"
                      />
                    </label>

                    <label className={styles.creditField}>
                      <span className={styles.creditFieldLabel}>Número</span>
                      <input
                        className={styles.creditFieldInput}
                        value={creditForm.number}
                        onChange={(e) =>
                          setCreditForm((current) => ({
                            ...current,
                            number: e.target.value,
                          }))
                        }
                        placeholder="123"
                      />
                    </label>

                    <label className={styles.creditField}>
                      <span className={styles.creditFieldLabel}>Bairro</span>
                      <input
                        className={styles.creditFieldInput}
                        value={creditForm.neighborhood}
                        onChange={(e) =>
                          setCreditForm((current) => ({
                            ...current,
                            neighborhood: e.target.value,
                          }))
                        }
                        placeholder="Bairro"
                      />
                    </label>

                    <label className={styles.creditField}>
                      <span className={styles.creditFieldLabel}>Cidade</span>
                      <input
                        className={styles.creditFieldInput}
                        value={creditForm.city}
                        onChange={(e) =>
                          setCreditForm((current) => ({
                            ...current,
                            city: e.target.value,
                          }))
                        }
                        placeholder="Cidade"
                      />
                    </label>

                    <label className={styles.creditField}>
                      <span className={styles.creditFieldLabel}>Estado</span>
                      <input
                        className={styles.creditFieldInput}
                        value={creditForm.state}
                        onChange={(e) =>
                          setCreditForm((current) => ({
                            ...current,
                            state: e.target.value,
                          }))
                        }
                        placeholder="UF"
                      />
                    </label>

                    <label className={styles.creditField}>
                      <span className={styles.creditFieldLabel}>CEP</span>
                      <input
                        className={styles.creditFieldInput}
                        value={cepMask(creditForm.zipCode)}
                        onChange={(e) =>
                          setCreditForm((current) => ({
                            ...current,
                            zipCode: e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 8),
                          }))
                        }
                        placeholder="00000-000"
                      />
                    </label>
                  </div>

                  {creditError && (
                    <div className={styles.creditFormError}>
                      <FiAlertTriangle />
                      {creditError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.creditModalFooter}>
              {creditModalMode === "list" ? (
                <button
                  type="button"
                  className={styles.creditCreateBtn}
                  onClick={() => {
                    resetCreditForm();
                    setCreditModalMode("create");
                  }}
                >
                  <FiPlus />
                  Criar crediário
                </button>
              ) : (
                <div className={styles.creditFooterActions}>
                  <button
                    type="button"
                    className={styles.creditSecondaryBtn}
                    onClick={() => {
                      resetCreditForm();
                      setCreditModalMode("list");
                    }}
                  >
                    Voltar para lista
                  </button>
                  <button
                    type="button"
                    className={styles.creditCreateBtn}
                    onClick={handleCreateCredit}
                    disabled={creditSaving}
                  >
                    {creditSaving ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <>
                        <FiPlus />
                        Criar crediário
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
