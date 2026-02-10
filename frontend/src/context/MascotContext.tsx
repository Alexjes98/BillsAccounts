import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { FALLBACK_MESSAGES, MascotMessage } from "@/api/mascotMessages";
import { useApi } from "@/contexts/ApiContext";

interface MascotContextType {
  isVisible: boolean;
  message: MascotMessage | null;
  showMascot: (msg: string | MascotMessage) => void;
  hideMascot: () => void;
  hideMessage: () => void;
  loadMessage: (context: string) => void;
}

const MascotContext = createContext<MascotContextType | undefined>(undefined);

export function MascotProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState<MascotMessage | null>(null);
  const api = useApi();

  const showMascot = useCallback((msg: string | MascotMessage) => {
    if (typeof msg === "string") {
      setMessage({
        id: crypto.randomUUID(),
        text: msg,
        context: "custom",
        type: "info",
      });
    } else {
      setMessage(msg);
    }
    setIsVisible(true);
  }, []);

  const hideMascot = useCallback(() => {
    setIsVisible(false);
    setMessage(null);
  }, []);

  const hideMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const loadMessage = useCallback(
    async (context: string) => {
      // Try to get from API
      if (api.getMascotMessage) {
        try {
          const msg = await api.getMascotMessage(context);
          if (msg) {
            setMessage(msg);
            setIsVisible(true);
            return;
          }
        } catch (e) {
          console.warn("Failed to fetch mascot message, using fallback", e);
        }
      }

      // Fallback logic
      let candidates = FALLBACK_MESSAGES.filter((m) => m.context === context);
      if (candidates.length === 0) {
        candidates = FALLBACK_MESSAGES.filter((m) => m.context === "generic");
      }

      if (candidates.length > 0) {
        const randomMsg =
          candidates[Math.floor(Math.random() * candidates.length)];
        setMessage(randomMsg);
        setIsVisible(true);
      }
    },
    [api],
  );

  return (
    <MascotContext.Provider
      value={{
        isVisible,
        message,
        showMascot,
        hideMascot,
        hideMessage,
        loadMessage,
      }}
    >
      {children}
    </MascotContext.Provider>
  );
}

export function useMascot() {
  const context = useContext(MascotContext);
  if (context === undefined) {
    throw new Error("useMascot must be used within a MascotProvider");
  }
  return context;
}
