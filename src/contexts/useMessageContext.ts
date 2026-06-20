import { useContext } from "react";
import { MessageContext } from "./message-context";

export function useMessageContext() {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessageContext must be used within MessageProvider");
  }
  return context;
}
