import React, { createContext, useContext, useState, useEffect } from "react";
import {
  deriveKey,
  encryptData,
  decryptData,
  generateRandomBytes,
  bufferToBase64,
  base64ToBuffer,
} from "@/lib/crypto";

interface CryptoContextState {
  isUnlocked: boolean;
  cryptoKey: CryptoKey | null;
  hasPasswordSet: boolean;
  isInitializing: boolean;
}

interface CryptoContextValue extends CryptoContextState {
  unlock: (password: string) => Promise<boolean>;
  setupPassword: (password: string) => Promise<void>;
  lock: () => void;
}

const CryptoContext = createContext<CryptoContextValue | undefined>(undefined);

const SALT_KEY = "offline_db_salt";
const VALIDATION_KEY = "offline_db_validation";

export function CryptoProvider({ children }: { children: React.ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [hasPasswordSet, setHasPasswordSet] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  useEffect(() => {
    // Check if the user has a salt saved, which indicates a password is set
    const savedSalt = localStorage.getItem(SALT_KEY);
    const savedValidation = localStorage.getItem(VALIDATION_KEY);

    if (savedSalt && savedValidation) {
      setHasPasswordSet(true);
    } else {
      setHasPasswordSet(false);
    }
    setIsInitializing(false);
  }, []);

  const unlock = async (password: string): Promise<boolean> => {
    try {
      const savedSaltBase64 = localStorage.getItem(SALT_KEY);
      const savedValidationJson = localStorage.getItem(VALIDATION_KEY);

      if (!savedSaltBase64 || !savedValidationJson) {
        return false;
      }

      const salt = base64ToBuffer(savedSaltBase64);
      const key = await deriveKey(password, salt);

      // Verify password by decrypting the validation payload
      const validationPayload = JSON.parse(savedValidationJson);
      const decrypted = await decryptData(validationPayload, key);

      if (decrypted !== "VALID_PASSWORD") {
        return false;
      }

      setCryptoKey(key);
      setIsUnlocked(true);
      return true;
    } catch (e) {
      console.error("Unlock failed", e);
      return false;
    }
  };

  const setupPassword = async (password: string): Promise<void> => {
    // Generate new salt
    const salt = generateRandomBytes(16);
    const key = await deriveKey(password, salt);

    // Encrypt validation string
    const validationPayload = await encryptData("VALID_PASSWORD", key);

    // Save to localStorage
    localStorage.setItem(SALT_KEY, bufferToBase64(salt.buffer));
    localStorage.setItem(VALIDATION_KEY, JSON.stringify(validationPayload));

    // Update state
    setCryptoKey(key);
    setHasPasswordSet(true);
    setIsUnlocked(true);

    // Dispatch a custom event to notify the IndexedDB repository that it might need to migrate data
    window.dispatchEvent(
      new CustomEvent("crypto:password_set", { detail: { key } }),
    );
  };

  const lock = () => {
    setCryptoKey(null);
    setIsUnlocked(false);
  };

  return (
    <CryptoContext.Provider
      value={{
        isUnlocked,
        cryptoKey,
        hasPasswordSet,
        isInitializing,
        unlock,
        setupPassword,
        lock,
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
}

export function useCrypto() {
  const context = useContext(CryptoContext);
  if (context === undefined) {
    throw new Error("useCrypto must be used within a CryptoProvider");
  }
  return context;
}
