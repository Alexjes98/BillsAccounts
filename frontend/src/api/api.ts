import api from "./axios";
// Types defined locally for now

// We can keep the interface here or move it.
// Let's redefine it to match what we need or just export what was there.
export interface Transaction {
  id: string;
  transaction_date: string;
  name: string;
  amount: number;
  category_id: string;
  account_id?: string | null;
  debt_id?: string | null;
  savings_goal_id?: string | null;
  category: {
    name: string;
    icon?: string;
  };
  account: {
    name: string;
  };
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  type: string;
  created_at: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  current_balance: number;
  currency: string;
  updated_at: string;
}
export interface Debt {
  id: string;
  user_id: string;
  creditor_id: string;
  debtor_id: string;
  total_amount: number;
  remaining_amount: number;
  description: string;
  due_date: string;
  is_settled: boolean;
  deleted_at: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  status: string;
  created_at: string;
}

export interface CreateTransactionPayload {
  name: string;
  description?: string;
  amount: number;
  transaction_date: string;
  category_id: string;
  account_id?: string | null;
  debt_id?: string | null;
  savings_goal_id?: string | null;
}

export const getTransactions = async (): Promise<Transaction[]> => {
  const response = await api.get("/api/transactions");
  return response.data;
};

export const getSavingsGoals = async (): Promise<SavingsGoal[]> => {
  const response = await api.get("/api/transactions/savings-goals");
  return response.data;
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get("/api/transactions/categories");
  return response.data;
};

export const getAccounts = async (): Promise<Account[]> => {
  const response = await api.get("/api/transactions/accounts");
  return response.data;
};

export interface CreateDebtPayload {
  creditor_id: string;
  debtor_id: string;
  total_amount: number;
  description?: string;
  due_date?: string;
}

export const createDebt = async (data: CreateDebtPayload): Promise<Debt> => {
  const response = await api.post("/api/debts", data);
  return response.data;
};

export const createTransaction = async (
  data: CreateTransactionPayload,
): Promise<Transaction> => {
  const response = await api.post("/api/transactions", data);
  return response.data;
};

export interface DebtSummary {
  creditor_name: string;
  debtor_name: string;
  count: number;
  total_amount: number;
}

export const getDebts = async (): Promise<Debt[]> => {
  const response = await api.get("/api/debts");
  return response.data;
};

export const getDebtsSummary = async (): Promise<DebtSummary[]> => {
  const response = await api.get("/api/debts/summary");
  return response.data;
};

export interface Person {
  id: string;
  name: string;
  contact_info: string;
  created_at: string;
}

export const getPersons = async (): Promise<Person[]> => {
  const response = await api.get("/api/persons");
  return response.data;
};

export interface CreatePersonPayload {
  name: string;
  contact_info?: string;
}

export const createPerson = async (
  data: CreatePersonPayload,
): Promise<Person> => {
  const response = await api.post("/api/persons", data);
  return response.data;
};
