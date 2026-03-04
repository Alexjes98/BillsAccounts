import React, { createContext, useContext, useState, useEffect } from "react";

export type LLMProviderType =
  | "OpenAI"
  | "Anthropic"
  | "Gemini"
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
      setApiKeyState(storedKey);
    }
  }, []);

  const setProvider = (newProvider: LLMProviderType) => {
    setProviderState(newProvider);
    localStorage.setItem("llm-provider", newProvider);
  };

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    localStorage.setItem("llm-api-key", key);
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
