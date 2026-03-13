import React, { createContext, useContext, useState, useEffect } from "react";
import CryptoJS from "crypto-js";

// This prevents plain-text keys from sitting in localStorage, adding a basic layer of obfuscation.
const ENCRYPTION_KEY =
  import.meta.env.VITE_ENCRYPTION_KEY || "public-bc-finance-local-key";

export type LLMProviderType =
  | "OpenAI"
  | "Anthropic"
  | "Gemini"
  | "DeepSeek"
  | "WebLLM"
  | "None";

interface LLMContextState {
  provider: LLMProviderType;
  apiKey: string;
}

interface LLMContextValue extends LLMContextState {
  setProvider: (provider: LLMProviderType) => void;
  setApiKey: (key: string) => void;
  clearConfig: () => void;
}

const LLMContext = createContext<LLMContextValue | undefined>(undefined);

export function LLMProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<LLMProviderType>("None");
  const [apiKey, setApiKeyState] = useState<string>("");

  useEffect(() => {
    // Load config from localStorage
    const storedProvider = localStorage.getItem(
      "llm-provider",
    ) as LLMProviderType;
    const storedKey = localStorage.getItem("llm-api-key");

    if (storedProvider) {
      setProviderState(storedProvider);
    }
    if (storedKey) {
      try {
        const bytes = CryptoJS.AES.decrypt(storedKey, ENCRYPTION_KEY);
        const decryptedKey = bytes.toString(CryptoJS.enc.Utf8);
        if (decryptedKey) {
          setApiKeyState(decryptedKey);
        } else {
          // Fallback if the key was stored plainly before encryption was added
          setApiKeyState(storedKey);
        }
      } catch (e) {
        // Fallback for non-encrypted keys
        setApiKeyState(storedKey);
      }
    }
  }, []);

  const setProvider = (newProvider: LLMProviderType) => {
    setProviderState(newProvider);
    localStorage.setItem("llm-provider", newProvider);
  };

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    if (key) {
      const encryptedKey = CryptoJS.AES.encrypt(key, ENCRYPTION_KEY).toString();
      localStorage.setItem("llm-api-key", encryptedKey);
    } else {
      localStorage.setItem("llm-api-key", "");
    }
  };

  const clearConfig = () => {
    setProviderState("None");
    setApiKeyState("");
    localStorage.removeItem("llm-provider");
    localStorage.removeItem("llm-api-key");
  };

  return (
    <LLMContext.Provider
      value={{
        provider,
        apiKey,
        setProvider,
        setApiKey,
        clearConfig,
      }}
    >
      {children}
    </LLMContext.Provider>
  );
}

export function useLLM() {
  const context = useContext(LLMContext);
  if (context === undefined) {
    throw new Error("useLLM must be used within an LLMProvider");
  }
  return context;
}
