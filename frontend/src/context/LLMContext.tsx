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
  | "Ollama"
  | "None";

interface LLMContextState {
  provider: LLMProviderType;
  apiKey: string;
  ollamaModel: string;
}

interface LLMContextValue extends LLMContextState {
  setProvider: (provider: LLMProviderType) => void;
  setApiKey: (key: string) => void;
  setOllamaModel: (model: string) => void;
  clearConfig: () => void;
}

const LLMContext = createContext<LLMContextValue | undefined>(undefined);

export function LLMProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<LLMProviderType>("None");
  const [apiKey, setApiKeyState] = useState<string>("");
  const [ollamaModel, setOllamaModelState] = useState<string>("llama3.1");

  useEffect(() => {
    // Load config from localStorage
    const storedProvider = localStorage.getItem(
      "llm-provider",
    ) as LLMProviderType;
    const storedKey = localStorage.getItem("llm-api-key");
    const storedOllamaModel = localStorage.getItem("llm-ollama-model");

    if (storedProvider) {
      setProviderState(storedProvider);
    }
    if (storedOllamaModel) {
      setOllamaModelState(storedOllamaModel);
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

  const setOllamaModel = (model: string) => {
    setOllamaModelState(model);
    localStorage.setItem("llm-ollama-model", model);
  };

  const clearConfig = () => {
    setProviderState("None");
    setApiKeyState("");
    setOllamaModelState("llama3.1");
    localStorage.removeItem("llm-provider");
    localStorage.removeItem("llm-api-key");
    localStorage.removeItem("llm-ollama-model");
  };

  return (
    <LLMContext.Provider
      value={{
        provider,
        apiKey,
        ollamaModel,
        setProvider,
        setApiKey,
        setOllamaModel,
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
