import { createContext, useContext, ReactNode, useMemo } from "react";
import { ApiRepository } from "../api/repository";
import { RestApiRepository } from "../api/RestRepository";
import { IndexedDbRepository } from "../api/IndexedDbRepository";
import { useCrypto } from "@/context/CryptoContext";

const ApiContext = createContext<ApiRepository | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  isAuthenticated: boolean;
}

export const ApiProvider = ({
  children,
  isAuthenticated,
}: ApiProviderProps) => {
  const { cryptoKey } = useCrypto();

  const api = useMemo(() => {
    // If authenticated, use the Cloud (Rest) repository
    // If not, use the Local (IndexedDB) repository
    console.log("Initializing API Repository. Authenticated:", isAuthenticated);
    return isAuthenticated
      ? new RestApiRepository()
      : IndexedDbRepository.getInstance(cryptoKey);
  }, [isAuthenticated, cryptoKey]);

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
};
