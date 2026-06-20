import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FiX,
  FiPackage,
  FiUser,
  FiTag,
  FiHash,
  FiCheckCircle,
  FiAlertTriangle,
  FiShield,
} from "react-icons/fi";
import styles from "./ReturnStockModal.module.css";
import { useAuth } from "../../contexts/useAuth";

export type StockHistoryItem = {
  id: string;
  date: string;
  time: string;
  product: string;
  quantity: number;
  reason: string;
  owner: string;
};

export type VoltarEstoqueFormData = {
  quantity: number;
  observation: string;
  operatorEmail: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  item: StockHistoryItem | null;
  onConfirm: (data: VoltarEstoqueFormData) => void;
};

export function ReturnStockModal({ isOpen, onClose, item, onConfirm }: Props) {
  const { user } = useAuth();
  const operatorLabel = user?.name || user?.email || "Usuário desconhecido";
  const operatorEmail = user?.email || "";

  const [form, setForm] = useState({ quantity: 1, observation: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      // Cada item selecionado inicia uma nova operação de devolução.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({ quantity: item.quantity, observation: "" });
      setError("");
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleConfirm = () => {
    if (form.quantity <= 0) {
      setError("A quantidade deve ser maior que zero.");
      return;
    }
    if (form.quantity > 100) {
      setError("Quantidade máxima para restaurar: 100.");
      return;
    }
    setError("");
    onConfirm({ ...form, operatorEmail });
    onClose();
    setForm({ quantity: 1, observation: "" });
  };

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.badge}>RESTAURAÇÃO DE ESTOQUE</span>
            <h2 className={styles.title}>Voltar ao Estoque</h2>
          </div>
          <button className={styles.closeBtn} type="button" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className={styles.productCard}>
          <div className={styles.productThumb}>
            <FiPackage className={styles.productIcon} />
          </div>
          <div className={styles.productInfo}>
            <div className={styles.productName}>{item.product}</div>
            <div className={styles.productCategory}>{item.reason}</div>
            <div className={styles.stockRow}>
              <span className={styles.stockDotRemoved} />
              <span className={styles.stockText}>
                {item.quantity} unid. removidas — {item.date} às {item.time}
              </span>
            </div>
          </div>
          <div className={styles.stockAfterBadge}>
            <span className={styles.stockAfterLabel}>Restaurar</span>
            <span className={styles.stockAfterValue}>+{form.quantity}</span>
          </div>
        </div>

        <div className={styles.ownerInfo}>
          <div className={styles.ownerIconWrapper}>
            <FiUser className={styles.ownerIcon} />
          </div>
          <div className={styles.ownerDetails}>
            <span className={styles.ownerLabel}>BAIXA REALIZADA POR</span>
            <span className={styles.ownerName}>{item.owner}</span>
          </div>
          <span className={styles.ownerDate}>{item.date} às {item.time}</span>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldGroupFull}>
            <label className={styles.label}>
              <FiHash className={styles.labelIcon} />
              QUANTIDADE A RESTAURAR
            </label>
            <input
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              type="number"
              min={1}
              max={100}
              value={form.quantity === 0 ? "" : form.quantity}
              onChange={(e) => {
                setError("");
                const parsed = parseInt(e.target.value, 10);
                setForm((f) => ({ ...f, quantity: isNaN(parsed) ? 0 : parsed }));
              }}
            />
          </div>
        </div>

        <div className={styles.fieldGroupFull}>
          <label className={styles.label}>
            <FiTag className={styles.labelIcon} />
            OBSERVAÇÃO (opcional)
          </label>
          <textarea
            className={styles.textarea}
            placeholder="Motivo da restauração..."
            rows={2}
            value={form.observation}
            onChange={(e) => setForm((f) => ({ ...f, observation: e.target.value }))}
          />
        </div>

        <div className={styles.operatorBadge}>
          <div className={styles.operatorLeft}>
            <FiShield className={styles.operatorIcon} />
            <div>
              <span className={styles.operatorTitle}>Operação registrada por</span>
              <span className={styles.operatorName}>{operatorLabel}</span>
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
          <button className={styles.confirmBtn} type="button" onClick={handleConfirm}>
            <FiCheckCircle />
            Confirmar Restauração
          </button>
          <button className={styles.cancelBtn} type="button" onClick={onClose}>
            Cancelar
          </button>
        </div>

        <p className={styles.disclaimer}>
          Ao confirmar, as unidades serão devolvidas ao estoque disponível.
        </p>
      </div>
    </div>,
    document.body,
  );
}
