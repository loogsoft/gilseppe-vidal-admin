import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Barcode, Printer, X } from "lucide-react";
import styles from "./NewCodeBarModal.module.css";

type NewCodeBarModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (code: string) => void;
};

const generateEan13 = () => {
  const digits = Array.from({ length: 12 }, () =>
    Math.floor(Math.random() * 10),
  );
  const sum = digits.reduce(
    (total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3),
    0,
  );
  const checkDigit = (10 - (sum % 10)) % 10;

  return `${digits.join("")}${checkDigit}`;
};

export default function NewCodeBarModal({
  isOpen,
  onClose,
  onGenerate,
}: NewCodeBarModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    onGenerate(generateEan13());
    onClose();
  };

  return createPortal(
    <div className={styles.backdrop} onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-bar-code-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className={styles.closeIconButton}
          type="button"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className={styles.iconWrapper} aria-hidden="true">
          <Barcode size={30} />
        </div>

        <h2 id="new-bar-code-title" className={styles.title}>
          Produto sem código de barras?
        </h2>
        <p className={styles.description}>
          Gere um código exclusivo para identificar este produto no sistema.
          Depois, você poderá imprimi-lo e colar a etiqueta no produto.
        </p>

        <div className={styles.printHint}>
          <Printer size={16} aria-hidden="true" />
          <span>O código ficará disponível para impressão.</span>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} type="button" onClick={onClose}>
            Fechar
          </button>
          <button
            className={styles.generateButton}
            type="button"
            onClick={handleGenerate}
            autoFocus
          >
            <Barcode size={17} aria-hidden="true" />
            Gerar código
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
