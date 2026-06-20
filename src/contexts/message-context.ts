import { createContext } from "react";
import type { MessageRequestDto } from "../dtos/request/message-request.dto";

export type MessageContextValue = {
  messageCount: number;
  refreshMessageCount: () => void;
  decrementMessageCount: () => void;
  clearMessageCount: () => void;
  checkStockAndNotify: () => Promise<void>;
  createMessage: (dto: MessageRequestDto) => Promise<void>;
};

export const MessageContext = createContext<MessageContextValue | undefined>(
  undefined,
);
