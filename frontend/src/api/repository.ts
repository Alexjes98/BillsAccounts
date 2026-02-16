import { MascotMessage } from "./mascotMessages";

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
  classification?: "ASSET" | "LIABILITY" | "EQUITY";
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

export interface TransferPayload {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  category_id: string;
  transaction_date: string;
  description?: string;
}

export interface TransactionQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: string;
  account_id?: string;
  debt_id?: string;
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

export interface CategoryCreate {
  name: string;
  type: string;
  icon?: string;
  color?: string;
}

export interface CreateAccountPayload {
  name: string;
  type: string;
  classification: "ASSET" | "LIABILITY" | "EQUITY";
  current_balance?: number;
  currency?: string;
}

export interface CreateDebtPayload {
  creditor_id: string;
  debtor_id: string;
  total_amount: number;
  description?: string;
  due_date?: string;
}

export interface DebtSummary {
  creditor_name: string;
  debtor_name: string;
  count: number;
  total_amount: number;
}

export interface Person {
  id: string;
  name: string;
  contact_info: string;
  created_at: string;
}

export interface CreatePersonPayload {
  name: string;
  contact_info?: string;
}

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
    daily_expense_rate: number;
    month_balance: number;
  };
  month_comparison: {
    current: { income: number; expenses: number };
    last: { income: number; expenses: number };
    income_trend: number;
  };
  chart_data: { day: number; income: number; expenses: number }[];
}

export interface MonthlySummary {
  id: string;
  year: number;
  month: number;
  month_name: string;
  total_income: number;
  total_expense: number;
  closing_balance: number;
}

export interface ApiRepository {
  getTransactions(
    params?: TransactionQueryParams,
  ): Promise<PaginatedResponse<Transaction>>;
  createTransaction(data: CreateTransactionPayload): Promise<Transaction>;
  updateTransaction(
    id: string,
    data: Partial<CreateTransactionPayload>,
  ): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  transfer(data: TransferPayload): Promise<void>;

  getSavingsGoals(): Promise<SavingsGoal[]>;

  getCategories(): Promise<Category[]>;
  createCategory(data: CategoryCreate): Promise<Category>;
  updateCategory(id: string, data: Partial<CategoryCreate>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  getAccounts(): Promise<Account[]>;
  createAccount(data: CreateAccountPayload): Promise<Account>;
  updateAccount(
    id: string,
    data: Partial<CreateAccountPayload>,
  ): Promise<Account>;
  deleteAccount(id: string): Promise<void>;

  createDebt(data: CreateDebtPayload): Promise<Debt>;
  getDebts(): Promise<Debt[]>;
  getDebtsSummary(): Promise<DebtSummary[]>;
  updateDebt(
    id: string,
    data: Partial<CreateDebtPayload> | { is_settled: boolean },
  ): Promise<Debt>;
  deleteDebt(id: string): Promise<void>;

  getPersons(): Promise<Person[]>;
  createPerson(data: CreatePersonPayload): Promise<Person>;
  updatePerson(id: string, data: CreatePersonPayload): Promise<Person>;
  deletePerson(id: string): Promise<void>;

  getDashboardSummary(): Promise<DashboardData>;
  getMonthlySummaries(year: number): Promise<MonthlySummary[]>;
  recalculateMonthlySummaries(): Promise<{ message: string; count: number }>;
  recalculateSingleMonthSummary(
    year: number,
    month: number,
  ): Promise<{ message: string; data: MonthlySummary }>;

  getUser(): Promise<User | null>;
  createUser(data: CreateUserPayload): Promise<User>;
  getAllData?(): Promise<any>;
  loadData?(data: any): Promise<void>;
  getMascotMessage?(context: string): Promise<MascotMessage | null>;
}

export interface CreateUserPayload {
  name: string;
  email?: string;
  base_currency: string;
}

export interface User {
  id: string;
  name?: string;
  email?: string;
  base_currency: string;
  person_id?: string;
  created_at: string;
  person?: {
    name: string;
    contact_info?: string;
  };
}
