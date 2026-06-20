import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { MessageRequestDto } from "../dtos/request/message-request.dto";
import { MessageService } from "../service/Message.service";
import { ProductService } from "../service/Product.service";
import { toast } from "react-toastify";

import {
  getLowStockEntries,
  getOutOfStockEntries,
} from "../utils/productStock";
import {
  playNotificationSound,
  unlockNotificationSound,
} from "../utils/notificationSound";

import { MessageContext } from "./message-context";


export function MessageProvider({ children }: { children: ReactNode }) {
  const [messageCount, setMessageCount] = useState(0);
  const shownIds = useRef<Set<string>>(new Set());
  const shownKeys = useRef<Set<string>>(new Set()); // productId-type

  const refreshMessageCount = useCallback(() => {
    MessageService.findAll()
      .then((data) => {
        setMessageCount(data.length);
        data.forEach((m) => {
          shownIds.current.add(String(m.id));
          if (m.productId && m.type) {
            shownKeys.current.add(`${m.productId}-${m.type}`);
          }
        });
      })
      .catch(() => {});
  }, []);

  const decrementMessageCount = useCallback(() => {
    setMessageCount((prev) => Math.max(0, prev - 1));
  }, []);

  const clearMessageCount = useCallback(() => {
    setMessageCount(0);
    shownIds.current.clear();
    shownKeys.current.clear();
  }, []);

  const createMessage = useCallback(async (dto: MessageRequestDto) => {
    try {
      const created = await MessageService.create(dto);
      // Se a mensagem já existia, não mostrar toast de sucesso
      const key = `${created.productId}-${created.type}`;
      const isNova = !shownKeys.current.has(key);
      if (isNova) {
        shownKeys.current.add(key);
        shownIds.current.add(String(created.id));
        if (created.type === "esgotado") {
          toast.error(created.description);
        } else if (created.type === "estoque_baixo") {
          toast.warning(created.description);
        } else {
          toast.success("Mensagem criada com sucesso!");
        }
        void playNotificationSound();
      }
      refreshMessageCount();
    } catch {
      toast.error("Erro ao criar mensagem");
    }
  }, [refreshMessageCount]);

  const checkStockAndNotify = useCallback(async () => {
    try {
      const [products, currentMessages] = await Promise.all([
        ProductService.findAll(),
        MessageService.findAll(),
      ]);
      const knownStockItemIds = new Set<string>();
      const desiredAlertTypes = new Map<string, MessageRequestDto["type"]>();

      currentMessages.forEach((message) => {
        shownIds.current.add(String(message.id));
        shownKeys.current.add(`${message.productId}-${message.type}`);
      });

      for (const p of products) {
        knownStockItemIds.add(p.id);
        (p.variations ?? []).forEach((variation) =>
          knownStockItemIds.add(variation.id),
        );
        const primaryImage = (p.images || []).find((img) => img.isPrimary);
        const productImage = primaryImage?.url || p.images?.[0]?.url || "";
        const outOfStockEntries = getOutOfStockEntries(p);
        const outOfStockIds = new Set(
          outOfStockEntries.map((entry) => entry.id),
        );
        const alertEntries = [
          ...outOfStockEntries,
          ...getLowStockEntries(p),
        ];

        for (const entry of alertEntries) {
          const variation = entry.variation;
          const isOutOfStock = outOfStockIds.has(entry.id);
          const type = isOutOfStock ? "esgotado" : "estoque_baixo";
          const key = `${entry.id}-${type}`;
          desiredAlertTypes.set(entry.id, type);

          if (shownKeys.current.has(key)) continue;
          shownKeys.current.add(key);

          const variationLabel = variation
            ? `${variation.color || ""} ${variation.size || ""}`.trim()
            : "";
          const name = variation
            ? `${p.name} - ${variationLabel}`
            : p.name;
          const url = variation?.imageUrl || productImage;
          const description = variation
            ? isOutOfStock
              ? `A variação "${variationLabel}" do produto "${p.name}" foi esgotada. Estoque zerado. Realize a reposição imediatamente.`
              : `Alerta de estoque baixo: a variação "${variationLabel}" do produto "${p.name}" possui apenas ${entry.stock} unidades restantes. O limite de alerta é ${entry.lowStock}. Realize a reposição.`
            : isOutOfStock
              ? `O produto "${p.name}" foi esgotado. Estoque zerado. Realize a reposição imediatamente.`
              : `Alerta de estoque baixo: o produto "${p.name}" possui apenas ${entry.stock} unidades restantes. O limite de alerta é ${entry.lowStock}. Realize a reposição.`;

          try {
            const created = await MessageService.create({
              productId: entry.id,
              name,
              url,
              type,
              description,
            });
            if (
              created?.id &&
              !shownIds.current.has(String(created.id))
            ) {
              shownIds.current.add(String(created.id));
            }
            if (type === "esgotado") {
              toast.error(description);
            } else {
              toast.warning(description);
            }
            void playNotificationSound();
          } catch {
            shownKeys.current.delete(key);
          }
        }
      }

      const existingMessages = await MessageService.findAll();
      for (const message of existingMessages) {
        if (!knownStockItemIds.has(message.productId)) continue;
        if (desiredAlertTypes.get(message.productId) === message.type) continue;

        try {
          await MessageService.remove(String(message.id));
          shownIds.current.delete(String(message.id));
          shownKeys.current.delete(`${message.productId}-${message.type}`);
        } catch {
          // Mantém o alerta local para tentar a sincronização novamente.
        }
      }
    } catch {
      // A próxima verificação refaz a sincronização completa do estoque.
    }
    refreshMessageCount();
  }, [refreshMessageCount]);

  useEffect(() => {
    refreshMessageCount();
    const interval = setInterval(() => {
      void checkStockAndNotify();
    }, 30000);
    return () => clearInterval(interval);
  }, [checkStockAndNotify, refreshMessageCount]);

  useEffect(() => {
    const unlockSound = () => {
      void unlockNotificationSound();
    };

    window.addEventListener("pointerdown", unlockSound, { once: true });
    window.addEventListener("keydown", unlockSound, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockSound);
      window.removeEventListener("keydown", unlockSound);
    };
  }, []);

  return (
    <MessageContext.Provider
      value={{
        messageCount,
        refreshMessageCount,
        decrementMessageCount,
        clearMessageCount,
        checkStockAndNotify,
        createMessage,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}
