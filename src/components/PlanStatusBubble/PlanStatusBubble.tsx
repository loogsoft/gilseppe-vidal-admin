import { ArrowUpRight, Crown } from "lucide-react";
import styles from "./PlanStatusBubble.module.css";

export type PlanStatusType = "tester" | "customer";

type PlanStatusBubbleVariant = "inline" | "floating";

type PlanStatusBubbleProps = {
  companyName: string;
  planType: PlanStatusType;
  trialStartDate?: Date | string | null;
  variant?: PlanStatusBubbleVariant;
};

const SUPPORT_PHONE = "64999663524";

const PLAN_CONTENT: Record<
  PlanStatusType,
  {
    label: string;
    title: string;
    description: string;
    action: string;
    message: (companyName: string) => string;
  }
> = {
  tester: {
    label: "Plano gratuito de 7 dias",
    title: "Você está testando agora",
    description: "Atualize para virar cliente e manter o acesso completo.",
    action: "Atualizar plano",
    message: (companyName) =>
      `Olá! Quero atualizar o plano gratuito da empresa ${companyName} para o plano cliente no Loog System.`,
  },
  customer: {
    label: "Plano premium",
    title: "Cliente ativo Loog",
    description:
      "Seu acesso completo está ativo. Fale com o suporte para ajustar ou renovar seu plano.",
    action: "Falar com suporte",
    message: (companyName) =>
      `Olá! Sou cliente do Loog System e gostaria de falar sobre o plano da empresa ${companyName}.`,
  },
};

function getTrialDueDate(date?: Date | string | null) {
  if (!date) {
    return null;
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const dueDate = new Date(parsedDate);
  dueDate.setDate(dueDate.getDate() + 7);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dueDate);
}

export function PlanStatusBubble({
  companyName,
  planType,
  trialStartDate,
  variant = "inline",
}: PlanStatusBubbleProps) {
  const content = PLAN_CONTENT[planType];
  const trialDueDate =
    planType === "tester" ? getTrialDueDate(trialStartDate) : null;
  const whatsappUrl = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(
    content.message(companyName),
  )}`;
  const bubbleClass = [
    styles.planStatusBubble,
    planType === "customer"
      ? styles.planStatusBubbleCustomer
      : styles.planStatusBubbleTester,
    variant === "floating" ? styles.planStatusBubbleFloating : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={bubbleClass}
      role="status"
      aria-label={`${content.label}: ${content.title}`}
    >
      <span className={styles.planStatusIcon}>
        <Crown size={18} />
      </span>
      <div className={styles.planStatusText}>
        <span>{content.label}</span>
        <strong>{content.title}</strong>
        <p>{content.description}</p>
        {trialDueDate && (
          <div className={styles.planStatusDue}>
            <span>Teste de 7 dias</span>
            <strong>Vence em {trialDueDate}</strong>
          </div>
        )}
      </div>
      <a
        className={styles.planStatusButton}
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
      >
        {content.action}
        <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
