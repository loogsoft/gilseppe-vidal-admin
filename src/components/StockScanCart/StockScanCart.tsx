import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Barcode,
  Calendar,
  ChevronDown,
  CreditCard,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { ProductResponse } from "../../dtos/response/product-response.dto";
import type { CreditCustomerResponseDto } from "../../dtos/response/credit-customer-response.dto";
import { CreditCustomerService } from "../../service/Credit-customer.service";
import { useAuth } from "../../contexts/useAuth";
import styles from "./StockScanCart.module.css";

export type StockScanCartItem = {
  product: ProductResponse;
  stockItemId: string;
  stockItemType: "product" | "variation";
  stockItemLabel: string;
  maxStock: number;
  unitPrice: number;
  imageUrl?: string;
  barCode?: string;
  quantity: number;
};

export type StockScanOperationData = {
  reason: string;
  paymentMethod: string;
  responsibleName: string;
  observation: string;
  creditCustomerId?: string;
  installment?: number;
};

type StockScanCartProps = {
  isOpen: boolean;
  items: StockScanCartItem[];
  onClose: () => void;
  onChangeQuantity: (stockItemId: string, quantity: number) => void;
  onRemove: (stockItemId: string) => void;
  onConfirm: (data: StockScanOperationData) => void | Promise<void>;
  isConfirming?: boolean;
};

const REASONS = ["Venda", "Consumo interno", "Devolução", "Perda"];
const PAYMENT_METHODS = ["PIX", "Dinheiro", "Crédito", "Débito", "Crediario"];
const INSTALLMENT_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

export function StockScanCart({
  isOpen,
  items,
  onClose,
  onChangeQuantity,
  onRemove,
  onConfirm,
  isConfirming = false,
}: StockScanCartProps) {
  const { user } = useAuth();
  const operatorName = user?.name || user?.email || "";
  const [form, setForm] = useState<StockScanOperationData>({
    reason: "Venda",
    paymentMethod: "PIX",
    responsibleName: "",
    observation: "",
    installment: 1,
  });
  const [error, setError] = useState("");
  const [step, setStep] = useState<"products" | "details">("products");
  const [installmentOpen, setInstallmentOpen] = useState(false);
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
  const [creditCustomers, setCreditCustomers] = useState<
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
      setCreditCustomers(
        data.map((customer) => ({
          ...customer,
          id: String(customer.id),
        })),
      );
    } catch (err) {
      console.error(err);
      setCreditError("Erro ao carregar clientes.");
    } finally {
      setCreditLoading(false);
    }
  };

  const handleCreditModalClose = () => {
    setCreditModalOpen(false);
    setCreditModalMode("list");
    resetCreditForm();
  };

  useEffect(() => {
    if (!isOpen) {
      setStep("products");
      setError("");
      setCreditModalOpen(false);
      setCreditModalMode("list");
      setSelectedCreditCustomerId(null);
      setInstallmentOpen(false);
      resetCreditForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (creditModalOpen) {
      void fetchCreditCustomers();
    }
  }, [creditModalOpen]);

  useEffect(() => {
    if (items.length === 0) {
      setStep("products");
    }
  }, [items.length]);

  if (!isOpen) return null;

  const totalUnits = items.reduce((total, item) => total + item.quantity, 0);
  const totalValue = items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
  const installment = form.installment ?? 1;
  const installmentValue = totalValue / installment;
  const selectedCreditCustomer = creditCustomers.find(
    (customer) => String(customer.id) === String(selectedCreditCustomerId),
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const formatCreditLocation = (customer: CreditCustomerResponseDto) =>
    [customer.city, customer.state].filter(Boolean).join(" • ");

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
    } catch (err) {
      console.error(err);
      setCreditError("Erro ao criar crediário. Tente novamente.");
    } finally {
      setCreditSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (items.length === 0 || isConfirming) return;

    if (!operatorName.trim() || !user?.email?.trim()) {
      setError("Não foi possível identificar o usuário logado.");
      return;
    }

    if (
      form.paymentMethod === "Crediario" &&
      !String(selectedCreditCustomerId ?? "").trim()
    ) {
      setError("Selecione um cliente do crediário antes de confirmar.");
      return;
    }

    setError("");
    await onConfirm({
      ...form,
      responsibleName: operatorName,
      observation: form.observation.trim(),
      creditCustomerId:
        form.paymentMethod === "Crediario"
          ? String(selectedCreditCustomerId)
          : undefined,
      installment: form.paymentMethod === "Crediario" ? installment : 1,
    });
  };

  return (
    <aside
      className={`${styles.drawer} ${
        step === "details" ? styles.drawerDetails : ""
      }`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="scan-cart-title"
    >
      <header className={styles.header}>
        <div className={styles.headingIcon}>
          <ShoppingCart size={20} aria-hidden="true" />
        </div>
        <div className={styles.headingText}>
          <span className={styles.eyebrow}>BAIXA EM LOTE</span>
          <h2 id="scan-cart-title">
            {step === "products" ? "Produtos selecionados" : "Dados da baixa"}
          </h2>
        </div>
        <button
          className={styles.closeButton}
          type="button"
          onClick={onClose}
          aria-label="Fechar produtos selecionados"
        >
          <X size={18} />
        </button>
      </header>

      <div className={styles.stepper}>
        <span
          className={`${styles.stepPill} ${
            step === "products" ? styles.stepPillActive : ""
          }`}
        >
          1. Produtos
        </span>
        <span
          className={`${styles.stepPill} ${
            step === "details" ? styles.stepPillActive : ""
          }`}
        >
          2. Confirmação
        </span>
      </div>

      {step === "products" ? (
        <>
          <div className={styles.scanHint}>
            <Barcode size={17} aria-hidden="true" />
            <span>Continue lendo códigos para adicionar mais produtos.</span>
          </div>

          <div className={styles.items}>
            {items.map((item) => {
              const { product, quantity } = item;
              const imageUrl = item.imageUrl ?? product.images?.[0]?.url;

              return (
                <article className={styles.item} key={item.stockItemId}>
                  <div className={styles.productImage}>
                    {imageUrl ? (
                      <img src={imageUrl} alt="" />
                    ) : (
                      <Package size={22} aria-hidden="true" />
                    )}
                  </div>

                  <div className={styles.productContent}>
                    <div className={styles.productHeader}>
                      <div>
                        <strong>{product.name}</strong>
                        <span>
                          {item.stockItemLabel}
                          {item.barCode ? ` • ${item.barCode}` : ""}
                        </span>
                      </div>
                      <button
                        className={styles.removeButton}
                        type="button"
                        onClick={() => onRemove(item.stockItemId)}
                        aria-label={`Remover ${product.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className={styles.itemFooter}>
                      <div className={styles.quantityControl}>
                        <button
                          type="button"
                          onClick={() =>
                            onChangeQuantity(item.stockItemId, quantity - 1)
                          }
                          aria-label={`Diminuir quantidade de ${product.name}`}
                        >
                          <Minus size={13} />
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            onChangeQuantity(item.stockItemId, quantity + 1)
                          }
                          disabled={quantity >= item.maxStock}
                          aria-label={`Aumentar quantidade de ${product.name}`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <div className={styles.stockInfo}>
                        <strong>
                          {formatCurrency(
                            Number(item.unitPrice || 0) * quantity,
                          )}
                        </strong>
                        <span>{item.maxStock} em estoque</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <footer className={styles.footer}>
            <div className={styles.summary}>
              <span>
                {items.length} produto{items.length === 1 ? "" : "s"} •{" "}
                {totalUnits} unidade{totalUnits === 1 ? "" : "s"}
              </span>
              <strong>{formatCurrency(totalValue)}</strong>
            </div>
            <button
              className={styles.confirmButton}
              type="button"
              disabled={items.length === 0 || isConfirming}
              onClick={() => {
                setError("");
                setStep("details");
              }}
            >
              Continuar
            </button>
          </footer>
        </>
      ) : (
        <>
          <div className={styles.details}>
            <div className={styles.reviewBox}>
              <span>Resumo da baixa</span>
              <strong>{formatCurrency(totalValue)}</strong>
              <small>
                {items.length} produto{items.length === 1 ? "" : "s"} •{" "}
                {totalUnits} unidade{totalUnits === 1 ? "" : "s"}
              </small>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.labelText}>
                  <Tag className={styles.labelIcon} size={14} />
                  Motivo da baixa
                </span>
                <select
                  value={form.reason}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                >
                  {REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span className={styles.labelText}>
                  <CreditCard className={styles.labelIcon} size={14} />
                  Forma de pagamento
                </span>
                <select
                  value={form.paymentMethod}
                  onChange={(event) => {
                    const paymentMethod = event.target.value;
                    setError("");
                    setForm((current) => ({
                      ...current,
                      paymentMethod,
                      installment:
                        paymentMethod === "Crediario"
                          ? (current.installment ?? 1)
                          : 1,
                    }));
                    setInstallmentOpen(false);
                    setCreditModalMode("list");
                    setCreditError("");
                    setCreditModalOpen(paymentMethod === "Crediario");
                  }}
                >
                  {PAYMENT_METHODS.map((paymentMethod) => (
                    <option key={paymentMethod} value={paymentMethod}>
                      {paymentMethod}
                    </option>
                  ))}
                </select>
              </label>

              {form.paymentMethod === "Crediario" && (
                <>
                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span className={styles.labelText}>
                      <CreditCard className={styles.labelIcon} size={14} />
                      Cliente do crediário
                    </span>
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
                          : creditCustomers.length > 0
                            ? `${creditCustomers.length} cliente${creditCustomers.length > 1 ? "s" : ""} cadastrado${creditCustomers.length > 1 ? "s" : ""}`
                            : "Nenhum cliente cadastrado"}
                      </span>
                    </button>
                  </label>

                  <label className={`${styles.field} ${styles.fieldFull}`}>
                    <span className={styles.labelText}>
                      <Calendar className={styles.labelIcon} size={14} />
                      Parcelas
                    </span>
                    <div className={styles.installmentDropdown}>
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
                            {installment === 1
                              ? "1 parcela"
                              : `${installment} parcelas`}
                          </span>
                          <span className={styles.installmentTriggerMeta}>
                            {formatCurrency(installmentValue)} por parcela
                          </span>
                        </span>

                        <span className={styles.installmentTriggerAside}>
                          <span>Total da venda</span>
                          <strong>{formatCurrency(totalValue)}</strong>
                        </span>

                        <ChevronDown
                          className={`${styles.installmentChevron} ${
                            installmentOpen
                              ? styles.installmentChevronOpen
                              : ""
                          }`}
                          size={18}
                        />
                      </button>

                      {installmentOpen && (
                        <div
                          className={styles.installmentList}
                          role="listbox"
                          aria-label="Quantidade de parcelas"
                        >
                          {INSTALLMENT_LIST.map((item) => {
                            const optionValue = totalValue / item;
                            const isSelected = installment === item;

                            return (
                              <button
                                key={item}
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
                                    installment: item,
                                  }));
                                  setInstallmentOpen(false);
                                }}
                              >
                                <span className={styles.installmentOptionCount}>
                                  <strong>{item}x</strong>
                                  <span>
                                    {item === 1
                                      ? "1 parcela"
                                      : `${item} parcelas`}
                                  </span>
                                </span>

                                <span className={styles.installmentOptionValue}>
                                  <span>Valor por parcela</span>
                                  <strong>{formatCurrency(optionValue)}</strong>
                                </span>

                                <span className={styles.installmentOptionTotal}>
                                  <span>Total</span>
                                  <strong>{formatCurrency(totalValue)}</strong>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </label>
                </>
              )}

              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.labelText}>
                  <User className={styles.labelIcon} size={14} />
                  Responsável
                </span>
                <input
                  value={operatorName || "Usuário logado não identificado"}
                  readOnly
                />
              </label>

              <label className={`${styles.field} ${styles.fieldFull}`}>
                <span className={styles.labelText}>
                  <Tag className={styles.labelIcon} size={14} />
                  Observação (opcional)
                </span>
                <textarea
                  rows={2}
                  value={form.observation}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      observation: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                />
              </label>
            </div>

            {error && <div className={styles.error}>{error}</div>}
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                disabled={isConfirming}
                onClick={() => setStep("products")}
              >
                Voltar
              </button>
              <button
                className={styles.confirmButton}
                type="button"
                disabled={items.length === 0 || isConfirming}
                onClick={handleConfirm}
              >
                {isConfirming ? "Confirmando..." : "Confirmar baixa"}
              </button>
            </div>
          </footer>
        </>
      )}

      {creditModalOpen &&
        createPortal(
          <div
            className={styles.creditModalBackdrop}
            onClick={handleCreditModalClose}
          >
            <div
              className={styles.creditModal}
              onClick={(event) => event.stopPropagation()}
            >
              <div className={styles.creditModalHeader}>
                <div>
                  <span className={styles.creditModalBadge}>Crediário</span>
                  <h3>
                    {creditModalMode === "list"
                      ? "Escolha um cliente cadastrado"
                      : "Criar novo crediário"}
                  </h3>
                  <p>
                    {creditModalMode === "list"
                      ? "Visualize os clientes disponíveis antes de seguir com a baixa."
                      : "Preencha os dados do cliente e cadastre sem sair desta tela."}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.creditModalClose}
                  onClick={handleCreditModalClose}
                >
                  <X size={20} />
                </button>
              </div>

              <div className={styles.creditModalBody}>
                {creditModalMode === "list" ? (
                  creditLoading ? (
                    <div className={styles.creditEmptyState}>
                      Carregando clientes...
                    </div>
                  ) : creditCustomers.length > 0 ? (
                    creditCustomers.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        className={`${styles.creditCustomerCard} ${
                          String(selectedCreditCustomerId) ===
                          String(customer.id)
                            ? styles.creditCustomerCardSelected
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedCreditCustomerId(String(customer.id));
                          handleCreditModalClose();
                        }}
                      >
                        <div className={styles.creditCustomerAvatar}>
                          {getInitials(customer.customerName) || "?"}
                        </div>
                        <div className={styles.creditCustomerBody}>
                          <div className={styles.creditCustomerTop}>
                            <strong>{customer.customerName}</strong>
                            <span>
                              {Number(
                                customer.totalAmounts ?? 0,
                              ).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </span>
                          </div>
                          <small>{customer.customerEmail}</small>
                          <small>
                            {[customer.phone, formatCreditLocation(customer)]
                              .filter(Boolean)
                              .join(" • ")}
                          </small>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className={styles.creditEmptyState}>
                      <CreditCard size={36} />
                      <strong>Nenhum cliente encontrado</strong>
                      <span>
                        Cadastre um novo cliente de crediário para continuar.
                      </span>
                    </div>
                  )
                ) : (
                  <div className={styles.creditFormGrid}>
                    <label className={styles.creditField}>
                      <span>Nome</span>
                      <input
                        value={creditForm.customerName}
                        onChange={(event) =>
                          setCreditForm((current) => ({
                            ...current,
                            customerName: event.target.value,
                          }))
                        }
                        placeholder="Nome completo"
                      />
                    </label>
                    <label className={styles.creditField}>
                      <span>Email</span>
                      <input
                        value={creditForm.customerEmail}
                        onChange={(event) =>
                          setCreditForm((current) => ({
                            ...current,
                            customerEmail: event.target.value,
                          }))
                        }
                        placeholder="email@cliente.com"
                      />
                    </label>
                    <label className={styles.creditField}>
                      <span>CPF</span>
                      <input
                        value={cpfMask(creditForm.CPF)}
                        onChange={(event) =>
                          setCreditForm((current) => ({
                            ...current,
                            CPF: event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 11),
                          }))
                        }
                        placeholder="000.000.000-00"
                      />
                    </label>
                    <label className={styles.creditField}>
                      <span>Telefone</span>
                      <input
                        value={phoneMask(creditForm.phone)}
                        onChange={(event) =>
                          setCreditForm((current) => ({
                            ...current,
                            phone: event.target.value
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
                      <span>Rua</span>
                      <input
                        value={creditForm.road}
                        onChange={(event) =>
                          setCreditForm((current) => ({
                            ...current,
                            road: event.target.value,
                          }))
                        }
                        placeholder="Rua do cliente"
                      />
                    </label>
                    <label className={styles.creditField}>
                      <span>Número</span>
                      <input
                        value={creditForm.number}
                        onChange={(event) =>
                          setCreditForm((current) => ({
                            ...current,
                            number: event.target.value,
                          }))
                        }
                        placeholder="123"
                      />
                    </label>
                    <label className={styles.creditField}>
                      <span>Bairro</span>
                      <input
                        value={creditForm.neighborhood}
                        onChange={(event) =>
                          setCreditForm((current) => ({
                            ...current,
                            neighborhood: event.target.value,
                          }))
                        }
                        placeholder="Bairro"
                      />
                    </label>
                    <label className={styles.creditField}>
                      <span>Cidade</span>
                      <input
                        value={creditForm.city}
                        onChange={(event) =>
                          setCreditForm((current) => ({
                            ...current,
                            city: event.target.value,
                          }))
                        }
                        placeholder="Cidade"
                      />
                    </label>
                    <label className={styles.creditField}>
                      <span>Estado</span>
                      <input
                        value={creditForm.state}
                        onChange={(event) =>
                          setCreditForm((current) => ({
                            ...current,
                            state: event.target.value,
                          }))
                        }
                        placeholder="UF"
                      />
                    </label>
                    <label className={styles.creditField}>
                      <span>CEP</span>
                      <input
                        value={cepMask(creditForm.zipCode)}
                        onChange={(event) =>
                          setCreditForm((current) => ({
                            ...current,
                            zipCode: event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 8),
                          }))
                        }
                        placeholder="00000-000"
                      />
                    </label>
                  </div>
                )}

                {creditError && (
                  <div className={styles.creditFormError}>{creditError}</div>
                )}
              </div>

              <div className={styles.creditModalFooter}>
                {creditModalMode === "list" ? (
                  <button
                    type="button"
                    className={styles.creditCreateButton}
                    onClick={() => {
                      resetCreditForm();
                      setCreditModalMode("create");
                    }}
                  >
                    + Criar crediário
                  </button>
                ) : (
                  <div className={styles.creditModalActions}>
                    <button
                      type="button"
                      className={styles.creditSecondaryButton}
                      onClick={() => {
                        resetCreditForm();
                        setCreditModalMode("list");
                      }}
                    >
                      Voltar para lista
                    </button>
                    <button
                      type="button"
                      className={styles.creditCreateButton}
                      onClick={handleCreateCredit}
                      disabled={creditSaving}
                    >
                      {creditSaving ? "Criando..." : "+ Criar crediário"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </aside>
  );
}
