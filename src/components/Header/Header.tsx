import styles from "./Header.module.css";
import { FiBell, FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../../contexts/useTheme";
import { useAuth } from "../../contexts/useAuth";
import { useMessageContext } from "../../contexts/useMessageContext";
import { useNavigate } from "react-router-dom";
import { Headset } from "lucide-react";
type HeaderProps = {
  title: string;
  isMessageModalOpen: (value: boolean) => void;
};

export function Header({ title, isMessageModalOpen }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { messageCount } = useMessageContext();
  const navigate = useNavigate();

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
      ? user.email.charAt(0).toUpperCase()
      : "U";

  const handleAvatarClick = () => {
    if (user?.id) {
      navigate(`/config/${user.id}`);
    }
  };
  const SUPPORT_PHONE = "64999663524";
  const SUPPORT_MESSAGE =
    "Olá! Sou usuário do sistema de Gerenciamento de Estoque da Loog System e estou enfrentando um problema. Poderiam me ajudar, por favor?";
  const SUPPORT_URL = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(
    SUPPORT_MESSAGE,
  )}`;

  const supportUrl = SUPPORT_URL;

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title || ""}</h1>

      <div className={styles.right}>
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

        <button
          className={styles.avatar}
          onClick={handleAvatarClick}
          aria-label="Perfil"
          type="button"
        >
          <span>{userInitial}</span>
        </button>
      </div>
    </header>
  );
}
