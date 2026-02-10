import api from "./axios";
import {
  Account,
  ApiRepository,
  Category,
  CategoryCreate,
  CreateAccountPayload,
  CreateDebtPayload,
  CreatePersonPayload,
  CreateTransactionPayload,
  DashboardData,
  Debt,
  DebtSummary,
  MonthlySummary,
  PaginatedResponse,
  Person,
  SavingsGoal,
  Transaction,
  TransactionQueryParams,
  TransferPayload,
  User,
} from "./repository";
import { MascotMessage } from "./mascotMessages";

export class RestApiRepository implements ApiRepository {
  async getTransactions(
    params?: TransactionQueryParams,
  ): Promise<PaginatedResponse<Transaction>> {
    const response = await api.get("/api/transactions", { params });
    return response.data;
  }

  async getSavingsGoals(): Promise<SavingsGoal[]> {
    const response = await api.get("/api/transactions/savings-goals");
    return response.data;
  }

  async getCategories(): Promise<Category[]> {
    const response = await api.get("/api/categories");
    return response.data;
  }

  async createCategory(data: CategoryCreate): Promise<Category> {
    const response = await api.post("/api/categories", data);
    return response.data;
  }

  async updateCategory(
    id: string,
    data: Partial<CategoryCreate>,
  ): Promise<Category> {
    const response = await api.put(`/api/categories/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/api/categories/${id}`);
  }

  async getAccounts(): Promise<Account[]> {
    const response = await api.get("/api/accounts");
    return response.data;
  }

  async createAccount(data: CreateAccountPayload): Promise<Account> {
    const response = await api.post("/api/accounts", data);
    return response.data;
  }

  async updateAccount(
    id: string,
    data: Partial<CreateAccountPayload>,
  ): Promise<Account> {
    const response = await api.put(`/api/accounts/${id}`, data);
    return response.data;
  }

  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/api/accounts/${id}`);
  }

  async createDebt(data: CreateDebtPayload): Promise<Debt> {
    const response = await api.post("/api/debts", data);
    return response.data;
  }

  async createTransaction(
    data: CreateTransactionPayload,
  ): Promise<Transaction> {
    const response = await api.post("/api/transactions", data);
    return response.data;
  }

  async updateTransaction(
    id: string,
    data: Partial<CreateTransactionPayload>,
  ): Promise<Transaction> {
    const response = await api.put(`/api/transactions/${id}`, data);
    return response.data;
  }

  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/api/transactions/${id}`);
  }

  async transfer(data: TransferPayload): Promise<void> {
    await api.post("/api/transactions/transfer", data);
  }

  async getDebts(): Promise<Debt[]> {
    const response = await api.get("/api/debts");
    return response.data;
  }

  async updateDebt(
    id: string,
    data: Partial<CreateDebtPayload> | { is_settled: boolean },
  ): Promise<Debt> {
    const response = await api.put(`/api/debts/${id}`, data);
    return response.data;
  }

  async deleteDebt(id: string): Promise<void> {
    await api.delete(`/api/debts/${id}`);
  }

  async getDebtsSummary(): Promise<DebtSummary[]> {
    const response = await api.get("/api/debts/summary");
    return response.data;
  }

  async getPersons(): Promise<Person[]> {
    const response = await api.get("/api/persons");
    return response.data;
  }

  async createPerson(data: CreatePersonPayload): Promise<Person> {
    const response = await api.post("/api/persons", data);
    return response.data;
  }

  async updatePerson(id: string, data: CreatePersonPayload): Promise<Person> {
    const response = await api.put(`/api/persons/${id}`, data);
    return response.data;
  }

  async deletePerson(id: string): Promise<void> {
    await api.delete(`/api/persons/${id}`);
  }

  async getDashboardSummary(): Promise<DashboardData> {
    const response = await api.get("/api/dashboard/summary");
    return response.data;
  }

  async getMonthlySummaries(year: number): Promise<MonthlySummary[]> {
    const response = await api.get(`/api/monthly-summaries?year=${year}`);
    return response.data;
  }

  async recalculateMonthlySummaries(): Promise<{
    message: string;
    count: number;
  }> {
    const response = await api.post("/api/monthly-summaries/recalculate");
    return response.data;
  }

  async recalculateSingleMonthSummary(
    year: number,
    month: number,
  ): Promise<{ message: string; data: MonthlySummary }> {
    const response = await api.post(
      `/api/monthly-summaries/recalculate/${year}/${month}`,
    );
    return response.data;
  }

  async getUser(): Promise<User | null> {
    const response = await api.get("/api/users/me");
    return response.data;
  }

  async createUser(_data: any): Promise<User> {
    // For online version, this is handled by Auth provider usually, or we can mock it
    throw new Error("Not implemented for REST API");
  }

  async getMascotMessage(context: string): Promise<MascotMessage | null> {
    try {
      const response = await api.get(`/api/mascot/message?context=${context}`);
      return response.data;
    } catch (error) {
      console.warn("Failed to fetch mascot message from server", error);
      return null; // Fallback will be handled by context
    }
  }
}
