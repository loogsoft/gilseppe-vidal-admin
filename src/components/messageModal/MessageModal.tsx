import { createPortal } from "react-dom";
import {
  FiAlertTriangle,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiCopy,
  FiPackage,
  FiAlertCircle,
  FiInbox,
  FiTrash2,
} from "react-icons/fi";
import style from "./MessageModal.module.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageService } from "../../service/Message.service";
import type { MessageResponseDto } from "../../dtos/response/message-response.dto";
import { useMessageContext } from "../../contexts/useMessageContext";

const handleCopy = (productId?: string) => {
  if (!productId) return;
  navigator.clipboard.writeText(productId);
};

type FilterType = "all" | "estoque_baixo" | "esgotado";

type MessageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
};

export function MessageModal({
  isOpen,
  onClose,
  title = "Notificações",
}: MessageModalProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<MessageResponseDto[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [clearing, setClearing] = useState(false);
  const { decrementMessageCount, clearMessageCount } = useMessageContext();
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await MessageService.remove(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
    decrementMessageCount();
  };

  const handleClearAll = async () => {
    if (clearing) return;
    setClearing(true);
    await Promise.all(
      messages.map((m) => MessageService.remove(m.id).catch(() => {})),
    );
    setMessages([]);
    clearMessageCount();
    setClearing(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    MessageService.findAll().then(setMessages);
  }, [isOpen]);

  const counts = useMemo(() => {
    const low = messages.filter((m) => m.type === "estoque_baixo").length;
    const out = messages.filter((m) => m.type === "esgotado").length;
    return { all: messages.length, estoque_baixo: low, esgotado: out };
  }, [messages]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return messages;
    return messages.filter((m) => m.type === activeFilter);
  }, [messages, activeFilter]);

  if (!isOpen) return null;

  const tabFilters: {
    key: FilterType;
    label: string;
    icon: React.ReactNode;
  }[] = [
    { key: "all", label: "Todos", icon: <FiInbox size={14} /> },
    {
      key: "estoque_baixo",
      label: "Estoque Baixo",
      icon: <FiAlertTriangle size={14} />,
    },
    {
      key: "esgotado",
      label: "Sem Estoque",
      icon: <FiAlertCircle size={14} />,
    },
  ];

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Agora";
    if (mins < 60) return `${mins} min atrás`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atrás`;
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  return createPortal(
    <div className={style.backdrop} onClick={onClose}>
      <div className={style.modal} onClick={(e) => e.stopPropagation()}>
        <div className={style.header}>
          <div className={style.headerLeft}>
            <span className={style.title}>{title}</span>
            {counts.all > 0 && (
              <span className={style.totalBadge}>{counts.all}</span>
            )}
          </div>
          <div className={style.headerActions}>
            {messages.length > 0 && (
              <button
                className={style.clearBtn}
                onClick={handleClearAll}
                disabled={clearing}
                title="Limpar todas"
              >
                <FiTrash2 size={13} />
                {clearing ? "Limpando..." : "Limpar tudo"}
              </button>
            )}
            <button className={style.closeBtn} onClick={onClose}>
              <FiX />
            </button>
          </div>
        </div>

        <div className={style.tabs}>
          {tabFilters.map((f) => (
            <button
              key={f.key}
              className={`${style.tab} ${activeFilter === f.key ? style.tabActive : ""}`}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.icon}
              <span>{f.label}</span>
              {counts[f.key] > 0 && (
                <span className={style.tabBadge}>{counts[f.key]}</span>
              )}
            </button>
          ))}
        </div>

        <div className={style.content}>
          {filtered.length === 0 ? (
            <div className={style.empty}>
              <FiPackage size={32} />
              <span>Nenhuma notificação encontrada.</span>
            </div>
          ) : (
            <div className={style.list}>
              {filtered.map((msg) => {
                const isExpanded = expandedId === msg.id;
                const isOut = msg.type === "esgotado";
                return (
                  <div
                    key={msg.id}
                    className={`${style.card} ${isOut ? style.cardDanger : style.cardWarning}`}
                    onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                  >
                    <div className={style.cardTop}>
                      <div className={style.cardImageWrap}>
                        {msg.url ? (
                          <img
                            src={msg.url}
                            alt={msg.name}
                            className={style.productImg}
                          />
                        ) : (
                          <div className={style.productImgPlaceholder}>
                            {isOut ? (
                              <FiAlertCircle className={style.iconDanger} />
                            ) : (
                              <FiAlertTriangle className={style.iconWarning} />
                            )}
                          </div>
                        )}
                        <div className={style.cardIconBadge}>
                          {isOut ? (
                            <FiAlertCircle className={style.iconBadgeIcon} />
                          ) : (
                            <FiAlertTriangle className={style.iconBadgeIcon} />
                          )}
                        </div>
                      </div>
                      <div className={style.cardLeft}>
                        <div className={style.cardMeta}>
                          <span className={style.productName}>{msg.name}</span>
                          <span
                            className={`${style.typeBadge} ${isOut ? style.typeDanger : style.typeWarning}`}
                          >
                            {isOut ? "Sem estoque" : "Estoque baixo"}
                          </span>
                          <button
                            className={style.deleteBtn}
                            onClick={(e) => handleDelete(e, msg.id)}
                            title="Remover notificação"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </div>
                        <p
                          className={`${style.cardText} ${isExpanded ? style.cardTextExpanded : ""}`}
                        >
                          {msg.description}
                        </p>
                        <div className={style.cardFooter}>
                          <span className={style.cardDate}>
                            {formatDate(msg.date)}
                          </span>
                          <span className={style.chevron}>
                            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                          </span>
                        </div>
                        {isExpanded && (
                          <div
                            className={style.producIdRow}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className={style.producIdInfo}>
                              <span className={style.producIdLabel}>ID</span>
                              <span className={style.producIdValue}>
                                {msg.productId.length > 8
                                  ? `${msg.productId.slice(0, 7)}...`
                                  : msg.productId}
                              </span>
                              <button
                                className={style.copyBtn}
                                onClick={() => handleCopy(msg.productId)}
                                title="Copiar ID"
                              >
                                <FiCopy />
                              </button>
                            </div>
                            <button
                              className={style.searchBtn}
                              onClick={() => {
                                onClose();
                                navigate(
                                  isOut ? "/out-of-stock" : "/produtos",
                                  { state: { id: msg.productId } },
                                );
                              }}
                            >
                              Buscar produto
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
