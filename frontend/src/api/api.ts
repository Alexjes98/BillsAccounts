import api from "./axios";
// Types defined locally for now

// We can keep the interface here or move it.
// Let's redefine it to match what we need or just export what was there.
export interface Transaction {
  id: string;
  transaction_date: string;
  name: string;
  description?: string;
  amount: number;
  category_id: string;
  account_id?: string | null;
  debt_id?: string | null;
  savings_goal_id?: string | null;
  category: {
    name: string;
    icon?: string;
  };
  account?: {
    name: string;
  };
  debt?: {
    description: string;
    remaining_amount: number;
  };
  savings_goal?: {
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
  person_id: string;
}

export interface TransactionQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: string;
  account_id?: string;
  date?: string;
  type?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const getTransactions = async (
  params?: TransactionQueryParams,
): Promise<PaginatedResponse<Transaction>> => {
  const response = await api.get("/api/transactions", { params });
  return response.data;
};

export const getSavingsGoals = async (): Promise<SavingsGoal[]> => {
  const response = await api.get("/api/transactions/savings-goals");
  return response.data;
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get("/api/categories");
  return response.data;
};

export interface CategoryCreate {
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

export const createCategory = async (
  data: CategoryCreate,
): Promise<Category> => {
  const response = await api.post("/api/categories", data);
  return response.data;
};

export const getAccounts = async (): Promise<Account[]> => {
  const response = await api.get("/api/accounts");
  return response.data;
};

export interface CreateAccountPayload {
  name: string;
  type: string;
  current_balance?: number;
  currency?: string;
}

export const createAccount = async (
  data: CreateAccountPayload,
): Promise<Account> => {
  const response = await api.post("/api/accounts", data);
  return response.data;
};

export const updateAccount = async (
  id: string,
  data: Partial<CreateAccountPayload>,
): Promise<Account> => {
  const response = await api.put(`/api/accounts/${id}`, data);
  return response.data;
};

export const deleteAccount = async (id: string): Promise<void> => {
  await api.delete(`/api/accounts/${id}`);
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

export const updateTransaction = async (
  id: string,
  data: Partial<CreateTransactionPayload>,
): Promise<Transaction> => {
  const response = await api.put(`/api/transactions/${id}`, data);
  return response.data;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  await api.delete(`/api/transactions/${id}`);
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

export interface DashboardData {
  current_date: {
    year: number;
    month: string;
    month_int: number;
  };
  cards: {
    balance: number;
    income: number;
    expenses: number;
  };
  month_comparison: {
    current: { income: number; expenses: number };
    last: { income: number; expenses: number };
  };
  chart_data: { day: number; income: number; expenses: number }[];
}

export const getDashboardSummary = async (): Promise<DashboardData> => {
  const response = await api.get("/api/dashboard/summary");
  return response.data;
};

export interface MonthlySummary {
  id: string;
  year: number;
  month: number;
  month_name: string;
  total_income: number;
  total_expense: number;
  closing_balance: number;
}

export const getMonthlySummaries = async (
  year: number,
): Promise<MonthlySummary[]> => {
  const response = await api.get(`/api/monthly-summaries?year=${year}`);
  return response.data;
};

export const recalculateMonthlySummaries = async (): Promise<{
  message: string;
  count: number;
}> => {
  const response = await api.post("/api/monthly-summaries/recalculate");
  return response.data;
};

export const recalculateSingleMonthSummary = async (
  year: number,
  month: number,
): Promise<{ message: string; data: MonthlySummary }> => {
  const response = await api.post(
    `/api/monthly-summaries/recalculate/${year}/${month}`,
  );
  return response.data;
};

export interface User {
  id: string;
  name?: string;
  email?: string;
  base_currency: string;
  created_at: string;
}

export const getUser = async (): Promise<User> => {
  const response = await api.get("/api/user");
  return response.data;
};
