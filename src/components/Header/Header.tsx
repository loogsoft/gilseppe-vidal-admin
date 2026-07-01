import styles from "./Header.module.css";
import { FiBell, FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../../contexts/useTheme";
import { useAuth } from "../../contexts/useAuth";
import { useMessageContext } from "../../contexts/useMessageContext";
import {
  CalendarDays,
  CheckCircle2,
  Crown,
  Headset,
  XCircle,
} from "lucide-react";
import { SubscriptionStatusEnum } from "../../dtos/enums/subscription-status.num";
import { useEffect, useState } from "react";
import { CompanyService } from "../../service/Company.service";
import type { CompanyResponseDto } from "../../dtos/response/company-response.dto";
import { InscriptionTypeStatusEnum } from "../../dtos/enums/inscription-type-status.enum";
import {
  PlanStatusBubble,
  type PlanStatusType,
} from "../PlanStatusBubble/PlanStatusBubble";

type HeaderProps = {
  title: string;
  isMessageModalOpen: (value: boolean) => void;
};

type PlanStatusMenuProps = {
  companyName: string;
  planType: PlanStatusType;
  trialStartDate?: Date | string;
};

function PlanStatusMenu({
  companyName,
  planType,
  trialStartDate,
}: PlanStatusMenuProps) {
  const [showPlanBubble, setShowPlanBubble] = useState(false);

  return (
    <div className={styles.planMenu}>
      <button
        className={`${styles.iconButton} ${
          planType === "customer"
            ? styles.planButtonPremium
            : styles.planButtonTrial
        } ${showPlanBubble ? styles.planButtonOpen : ""}`}
        type="button"
        aria-label={
          planType === "customer"
            ? "Mostrar plano premium"
            : "Mostrar plano gratuito"
        }
        aria-expanded={showPlanBubble}
        onClick={() => setShowPlanBubble((current) => !current)}
      >
        <Crown size={18} />
      </button>
      {showPlanBubble && (
        <PlanStatusBubble
          companyName={companyName}
          planType={planType}
          trialStartDate={trialStartDate}
          variant="floating"
        />
      )}
    </div>
  );
}

export function Header({ title, isMessageModalOpen }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { messageCount } = useMessageContext();
  const [company, setCompany] = useState<CompanyResponseDto | null>(null);

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : "U";

  const SUPPORT_PHONE = "64999663524";
  const SUPPORT_MESSAGE =
    "Olá! Sou usuário do sistema de Gerenciamento de Estoque da Loog System e estou enfrentando um problema. Poderiam me ajudar, por favor?";
  const SUPPORT_URL = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(
    SUPPORT_MESSAGE,
  )}`;

  const supportUrl = SUPPORT_URL;

  function getStatus(status?: SubscriptionStatusEnum) {
    if (status === SubscriptionStatusEnum.ACTIVATED) {
      return {
        name: "Ativo",
        active: true,
      };
    }
    if (status === SubscriptionStatusEnum.DISABLED) {
      return {
        name: "Desativado",
        active: false,
      };
    }

    return {
      name: "Carregando",
      active: false,
    };
  }

  function formatPaymentDueDate(date?: Date | string) {
    if (!date) {
      return "--/--/----";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "--/--/----";
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsedDate);
  }

  const paymentDueDate = formatPaymentDueDate(company?.paymentDueDay);
  const status = getStatus(company?.subscriptionStatus);
  const isTesterPlan =
    company?.inscriptionType === InscriptionTypeStatusEnum.TESTER;
  const isCustomerPlan =
    company?.inscriptionType === InscriptionTypeStatusEnum.CUSTOMER;
  const planType: PlanStatusType | null = isCustomerPlan
    ? "customer"
    : isTesterPlan
      ? "tester"
      : null;
  const companyName =
    company?.companyName || user?.name || user?.email?.split("@")[0] || "Usuário";
  const StatusIcon = company
    ? status.active
      ? CheckCircle2
      : XCircle
    : CalendarDays;
  const paymentCardClass = `${styles.subscriptionCard} ${
    !company
      ? styles.subscriptionCardLoading
      : status.active
      ? styles.subscriptionCardActive
      : styles.subscriptionCardDisabled
  }`;

  useEffect(() => {
    const companyId = user?.companyId || localStorage.getItem("companyId") || "";

    if (!companyId) {
      return;
    }

    let isMounted = true;

    async function loadCompany() {
      try {
        const data = await CompanyService.findOne(companyId);

        if (!isMounted) {
          return;
        }

        setCompany(data);
        localStorage.setItem("company", JSON.stringify(data));
      } catch {
        if (isMounted) {
          setCompany(null);
        }
      }
    }

    void loadCompany();

    return () => {
      isMounted = false;
    };
  }, [user?.companyId]);

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title || ""}</h1>

      <div className={styles.right}>
        {planType && (
          <PlanStatusMenu
            companyName={companyName}
            planType={planType}
            trialStartDate={company?.date}
          />
        )}

        <div
          className={paymentCardClass}
          aria-label={`Assinatura vence em ${paymentDueDate}. Status ${status.name}`}
        >
          <div className={styles.subscriptionItem}>
            <span className={styles.subscriptionIcon}>
              <CalendarDays size={16} />
            </span>
            <span className={styles.subscriptionText}>
              <span className={styles.subscriptionLabel}>Vence em</span>
              <strong className={styles.subscriptionValue}>
                {paymentDueDate}
              </strong>
            </span>
          </div>

          <span className={styles.subscriptionDivider} />

          <div
            className={`${styles.subscriptionItem} ${styles.subscriptionStatus}`}
          >
            <span className={styles.subscriptionIcon}>
              <StatusIcon size={16} />
            </span>
            <span className={styles.subscriptionText}>
              <span className={styles.subscriptionLabel}>Status</span>
              <strong className={styles.subscriptionValue}>
                {status.name}
              </strong>
            </span>
          </div>
        </div>

        <a
          className={styles.iconButton}
          href={supportUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Falar com suporte"
          data-tooltip="Suporte"
        >
          <Headset size={18} />
        </a>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="Alternar tema"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <FiSun /> : <FiMoon />}
        </button>

        <button
          className={styles.iconButton}
          type="button"
          aria-label="Notificações"
          onClick={() => isMessageModalOpen(true)}
        >
          <FiBell />
          {messageCount > 0 && (
            <span className={styles.badge}>
              {messageCount > 99 ? "99+" : messageCount}
            </span>
          )}
        </button>

        <button className={styles.avatar} aria-label="Perfil" type="button">
          <span>{userInitial}</span>
        </button>
      </div>
    </header>
  );
}
