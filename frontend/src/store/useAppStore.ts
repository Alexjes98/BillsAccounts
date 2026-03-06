import { create } from "zustand";

export interface Transaction {
  amount: number;
  category: string;
  date: string;
  description?: string;
}

export interface FreeModeData {
  summary: {
    balance: number;
    total_income: number;
    total_expenses: number;
  };
  category_breakdown: Record<string, number>;
  transaction_count: number;
}

interface AppState {
  userMode: "free" | "paid";
  freeData: FreeModeData | null;
  isLoading: boolean;
  error: string | null;
  isSidebarAnimating: boolean;

  setIsSidebarAnimating: (animating: boolean) => void;
  setFreeData: (data: FreeModeData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  userMode: "free", // Default to free for now
  freeData: null,
  isLoading: false,
  error: null,
  isSidebarAnimating: false,

  setIsSidebarAnimating: (animating: boolean) =>
    set({ isSidebarAnimating: animating }),
  setFreeData: (data: FreeModeData) => set({ freeData: data, error: null }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  reset: () => set({ freeData: null, error: null }),
}));
