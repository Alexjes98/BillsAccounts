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
  CreateUserPayload,
  GroupedDebts,
} from "./repository";
import { MascotMessage } from "./mascotMessages";
import {
  sanitizeInput,
  validateInput,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_CONTACT_INFO_LENGTH,
} from "@/lib/sanitization";

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
    validateInput(data.name, MAX_NAME_LENGTH, "Category Name");
    data.name = sanitizeInput(data.name);
    const response = await api.post("/api/categories", data);
    return response.data;
  }

  async updateCategory(
    id: string,
    data: Partial<CategoryCreate>,
  ): Promise<Category> {
    if (data.name !== undefined) {
      validateInput(data.name, MAX_NAME_LENGTH, "Category Name");
      data.name = sanitizeInput(data.name);
    }
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
    validateInput(data.name, MAX_NAME_LENGTH, "Account Name");
    data.name = sanitizeInput(data.name);
    console.log(data);
    const response = await api.post("/api/accounts", data);
    return response.data;
  }

  async updateAccount(
    id: string,
    data: Partial<CreateAccountPayload>,
  ): Promise<Account> {
    if (data.name !== undefined) {
      validateInput(data.name, MAX_NAME_LENGTH, "Account Name");
      data.name = sanitizeInput(data.name);
    }
    const response = await api.put(`/api/accounts/${id}`, data);
    return response.data;
  }

  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/api/accounts/${id}`);
  }

  async createDebt(data: CreateDebtPayload): Promise<Debt> {
    if (data.description) {
      validateInput(
        data.description,
        MAX_DESCRIPTION_LENGTH,
        "Debt Description",
      );
      data.description = sanitizeInput(data.description);
    }
    const response = await api.post("/api/debts", data);
    return response.data;
  }

  async createTransaction(
    data: CreateTransactionPayload,
  ): Promise<Transaction> {
    validateInput(data.name, MAX_NAME_LENGTH, "Transaction Name");
    data.name = sanitizeInput(data.name);

    if (data.description) {
      validateInput(
        data.description,
        MAX_DESCRIPTION_LENGTH,
        "Transaction Description",
      );
      data.description = sanitizeInput(data.description);
    }

    const response = await api.post("/api/transactions", data);
    return response.data;
  }

  async updateTransaction(
    id: string,
    data: Partial<CreateTransactionPayload>,
  ): Promise<Transaction> {
    if (data.name !== undefined) {
      validateInput(data.name, MAX_NAME_LENGTH, "Transaction Name");
      data.name = sanitizeInput(data.name);
    }
    if (data.description !== undefined) {
      validateInput(
        data.description,
        MAX_DESCRIPTION_LENGTH,
        "Transaction Description",
      );
      data.description = sanitizeInput(data.description);
    }
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

  async getGroupedDebts(): Promise<GroupedDebts> {
    const rawDebts = await this.getDebts();
    const debts = [...rawDebts];

    debts.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return {
      delayed_payments: debts.filter(
        (d) => !d.is_settled && !d.deleted_at && d.type === "DELAYED_PAYMENT",
      ),
      loans: debts.filter(
        (d) => !d.is_settled && !d.deleted_at && d.type === "LOAN",
      ),
      passive_debts: debts.filter(
        (d) => !d.is_settled && !d.deleted_at && d.type === "PASSIVE_DEBT",
      ),
      others: debts.filter(
        (d) =>
          !d.is_settled &&
          !d.deleted_at &&
          !["DELAYED_PAYMENT", "LOAN", "PASSIVE_DEBT"].includes(
            d.type as string,
          ),
      ),
      settled: debts.filter((d) => d.is_settled && !d.deleted_at),
    };
  }

  async updateDebt(
    id: string,
    data: Partial<CreateDebtPayload> | { is_settled: boolean },
  ): Promise<Debt> {
    if ("description" in data && data.description) {
      validateInput(
        data.description,
        MAX_DESCRIPTION_LENGTH,
        "Debt Description",
      );
      data.description = sanitizeInput(data.description);
    }
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
    validateInput(data.name, MAX_NAME_LENGTH, "Person Name");
    data.name = sanitizeInput(data.name);

    if (data.contact_info) {
      validateInput(data.contact_info, MAX_CONTACT_INFO_LENGTH, "Contact Info");
      data.contact_info = sanitizeInput(data.contact_info);
    }
    const response = await api.post("/api/persons", data);
    return response.data;
  }

  async updatePerson(id: string, data: CreatePersonPayload): Promise<Person> {
    validateInput(data.name, MAX_NAME_LENGTH, "Person Name");
    data.name = sanitizeInput(data.name);

    if (data.contact_info) {
      validateInput(data.contact_info, MAX_CONTACT_INFO_LENGTH, "Contact Info");
      data.contact_info = sanitizeInput(data.contact_info);
    }
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

  async createUser(data: CreateUserPayload): Promise<User> {
    const response = await api.post("/api/users", data);
    return response.data;
  }

  async updateUser(
    _id: string,
    data: Partial<CreateUserPayload>,
  ): Promise<User> {
    const response = await api.patch("/api/users/me", data);
    return response.data;
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
