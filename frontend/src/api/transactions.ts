import api from "./axios";

export interface Transaction {
  id: string;
  transaction_date: string;
  name: string;
  amount: number;
  category: {
    name: string;
    icon?: string;
  };
  account: {
    name: string;
  };
  // Add other fields as needed based on the backend response
}

export const getTransactions = async (): Promise<Transaction[]> => {
  const response = await api.get("/api/transactions");
  return response.data;
};
