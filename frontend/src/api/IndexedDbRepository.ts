import { openDB, DBSchema, IDBPDatabase } from "idb";
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
} from "./repository";
import { MascotMessage, FALLBACK_MESSAGES } from "./mascotMessages";

// TODO: Refine all behaviours with data relations to ensure data consistency with basic functions

/*function generateSimpleUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}*/

interface MyDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      "by-date": string;
      "by-account": string;
      "by-category": string;
    };
  };
  categories: {
    key: string;
    value: Category;
  };
  accounts: {
    key: string;
    value: Account;
  };
  debts: {
    key: string;
    value: Debt;
  };
  persons: {
    key: string;
    value: Person;
  };
  savings_goals: {
    key: string;
    value: SavingsGoal;
  };
  monthly_summaries: {
    key: string;
    value: MonthlySummary;
    indexes: { "by-year": number };
  };
  user: {
    key: string;
    value: User;
  };
}

export class IndexedDbRepository implements ApiRepository {
  private dbPromise: Promise<IDBPDatabase<MyDB>>;
  private readonly DB_NAME = "finance_app_db";
  private readonly DB_VERSION = 1;

  constructor() {
    this.dbPromise = openDB<MyDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Transactions
        const txStore = db.createObjectStore("transactions", { keyPath: "id" });
        txStore.createIndex("by-date", "transaction_date");
        txStore.createIndex("by-account", "account_id");
        txStore.createIndex("by-category", "category_id");

        // Categories
        db.createObjectStore("categories", { keyPath: "id" });

        // Accounts
        db.createObjectStore("accounts", { keyPath: "id" });

        // Debts
        db.createObjectStore("debts", { keyPath: "id" });

        // Persons
        db.createObjectStore("persons", { keyPath: "id" });

        // Savings Goals
        db.createObjectStore("savings_goals", { keyPath: "id" });

        // Monthly Summaries
        const summaryStore = db.createObjectStore("monthly_summaries", {
          keyPath: "id",
        });
        summaryStore.createIndex("by-year", "year");

        // User
        db.createObjectStore("user", { keyPath: "id" });
      },
    });
    this.seedInitialData();
  }

  private async seedInitialData() {
    // const db = await this.dbPromise;
    // const user = await db.getAll("user");
    // Removed user seeding to allow onboarding
    // if (user.length === 0) { ... }
  }

  async getTransactions(
    params?: TransactionQueryParams,
  ): Promise<PaginatedResponse<Transaction>> {
    const db = await this.dbPromise;
    let transactions = await db.getAll("transactions");

    // Filtering
    if (params) {
      if (params.search) {
        const search = params.search.toLowerCase();
        transactions = transactions.filter(
          (t) =>
            t.name.toLowerCase().includes(search) ||
            t.description?.toLowerCase().includes(search),
        );
      }
      if (params.category_id) {
        transactions = transactions.filter(
          (t) => t.category_id === params.category_id,
        );
      }
      if (params.account_id) {
        transactions = transactions.filter(
          (t) => t.account_id === params.account_id,
        );
      }
      if (params.debt_id) {
        transactions = transactions.filter((t) => t.debt_id === params.debt_id);
      }
      if (params.date) {
        // Simple date matching if needed, or by month
      }
      // If type filter is needed, we need to join with category
      if (params.type) {
        // This would require checking category type.
        // For efficiency in a real app we'd index this or denormalize.
        // For now, let's fetch categories.
        const categories = await db.getAll("categories");
        const catMap = new Map(categories.map((c) => [c.id, c]));
        transactions = transactions.filter(
          (t) => catMap.get(t.category_id)?.type === params.type,
        );
      }
    }

    // Sorting (descending date)
    transactions.sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() -
        new Date(a.transaction_date).getTime(),
    );

    // Pagination
    const page = params?.page || 1;
    const per_page = params?.per_page || 20;
    const total = transactions.length;
    const items = transactions.slice((page - 1) * per_page, page * per_page);

    return {
      items,
      total,
      page,
      per_page,
      pages: Math.ceil(total / per_page),
    };
  }

  async createTransaction(
    data: CreateTransactionPayload,
  ): Promise<Transaction> {
    const db = await this.dbPromise;
    const id = crypto.randomUUID();

    // Fetch related objects to hydrate the response
    const category = await db.get("categories", data.category_id);
    if (!category) throw new Error("Category not found"); // Basic validation matching backend

    const account = data.account_id
      ? await db.get("accounts", data.account_id)
      : undefined;
    const debt = data.debt_id ? await db.get("debts", data.debt_id) : undefined;
    const savings_goal = data.savings_goal_id
      ? await db.get("savings_goals", data.savings_goal_id)
      : undefined;

    // 1. Determine Amount Sign
    if (category.type === "INCOME") {
      data.amount = Math.abs(data.amount);
    } else {
      data.amount = -Math.abs(data.amount);
    }

    // 2. Handle Debt Update (Only on Create)
    if (data.debt_id && debt) {
      if (!data.person_id) {
        throw new Error("Person ID is required when linking a debt");
      }
      if (
        data.person_id !== debt.creditor_id &&
        data.person_id !== debt.debtor_id
      ) {
        throw new Error("The person provided is not part of this debt");
      }

      let shouldPermitReduction = false;
      const isExpense = category.type === "EXPENSE";

      if (isExpense) {
        // User paying
        shouldPermitReduction = true;
      } else {
        // Income: only if user is creditor (someone paying user)
        if (data.person_id === debt.creditor_id) {
          shouldPermitReduction = true;
        }
      }

      if (shouldPermitReduction) {
        const paymentAmount = Math.abs(data.amount);
        debt.remaining_amount -= paymentAmount;
        if (debt.remaining_amount <= 0) {
          debt.remaining_amount = 0;
          debt.is_settled = true;
        } else {
          debt.is_settled = false;
        }
        await db.put("debts", debt);
      }
    }

    const newTx: Transaction = {
      id,
      ...data,
      account_id: data.account_id ?? undefined,
      debt_id: data.debt_id ?? undefined,
      savings_goal_id: data.savings_goal_id ?? undefined,
      category: {
        name: category.name || "Unknown",
        icon: category.icon,
      },
      account: account ? { name: account.name } : undefined,
      debt: debt
        ? {
            description: debt.description,
            remaining_amount: debt.remaining_amount,
          }
        : undefined,
      savings_goal: savings_goal ? { name: savings_goal.name } : undefined,
    };

    await db.put("transactions", newTx);

    // 3. Update Account Balance
    if (data.account_id && account) {
      // Backend logic: account.current_balance += amount
      // (amount is already signed correctly above)
      account.current_balance += data.amount;
      await db.put("accounts", account);
    }

    return newTx;
  }

  async updateTransaction(
    id: string,
    data: Partial<CreateTransactionPayload>,
  ): Promise<Transaction> {
    const db = await this.dbPromise;
    const tx = await db.get("transactions", id);
    if (!tx) throw new Error("Transaction not found");

    // 1. Revert Old Balance Effect
    const oldAccountId = tx.account_id;
    const oldAmount = tx.amount;

    if (oldAccountId) {
      const oldAccount = await db.get("accounts", oldAccountId);
      if (oldAccount) {
        oldAccount.current_balance -= oldAmount;
        await db.put("accounts", oldAccount);
      }
    }

    // 2. Prepare Updates
    // We need to check if category changed to recalculate amount sign
    let category = await db.get("categories", tx.category_id); // Default to existing
    if (data.category_id && data.category_id !== tx.category_id) {
      const newCat = await db.get("categories", data.category_id);
      if (newCat) category = newCat;
    }

    if (!category) throw new Error("Category not found");

    // Calculate new amount with sign
    let finalAmount = tx.amount; // Default start with existing (signed)
    if (data.amount !== undefined) {
      // New amount provided, apply sign
      finalAmount =
        category.type === "EXPENSE"
          ? -Math.abs(data.amount)
          : Math.abs(data.amount);
    } else if (data.category_id) {
      // Only category changed, re-evaluate sign of existing amount
      // We need absolute value of current amount to re-sign
      const absAmount = Math.abs(tx.amount);
      finalAmount = category.type === "EXPENSE" ? -absAmount : absAmount;
    }

    // Merge updates
    const updatedTx: Transaction = {
      ...tx,
      ...data,
      amount: finalAmount,
      // Update hydration if needed (simplified)
      category: {
        name: category.name,
        icon: category.icon,
      },
    };

    // 3. Apply New Balance Effect
    if (updatedTx.account_id) {
      const newAccount = await db.get("accounts", updatedTx.account_id);
      if (newAccount) {
        newAccount.current_balance += updatedTx.amount;
        await db.put("accounts", newAccount);
        // Update hydrated name
        updatedTx.account = { name: newAccount.name };
      }
    } else {
      updatedTx.account = undefined;
    }

    // 4. Handle Debt Updates
    const oldDebtId = tx.debt_id;
    const newDebtId = updatedTx.debt_id;
    const oldAmountAbs = Math.abs(tx.amount);
    const newAmountAbs = Math.abs(updatedTx.amount);

    // Scenario A: Debt ID Changed (or removed)
    if (oldDebtId && oldDebtId !== newDebtId) {
      const oldDebt = await db.get("debts", oldDebtId);
      if (oldDebt) {
        oldDebt.remaining_amount += oldAmountAbs;
        oldDebt.is_settled = false;
        await db.put("debts", oldDebt);
      }
    }

    if (newDebtId && newDebtId !== oldDebtId) {
      const newDebt = await db.get("debts", newDebtId);
      if (newDebt) {
        newDebt.remaining_amount -= newAmountAbs;
        if (newDebt.remaining_amount <= 0) {
          newDebt.remaining_amount = 0;
          newDebt.is_settled = true;
        } else {
          newDebt.is_settled = false;
        }
        await db.put("debts", newDebt);

        // Update hydrated debt
        updatedTx.debt = {
          description: newDebt.description,
          remaining_amount: newDebt.remaining_amount,
        };
      }
    }

    // Scenario B: Debt ID Unchanged, Amount Changed
    if (newDebtId && newDebtId === oldDebtId && oldAmountAbs !== newAmountAbs) {
      const debt = await db.get("debts", newDebtId);
      if (debt) {
        const diff = oldAmountAbs - newAmountAbs;
        debt.remaining_amount += diff;

        if (debt.remaining_amount <= 0) {
          debt.remaining_amount = 0;
          debt.is_settled = true;
        } else {
          debt.is_settled = false;
        }
        await db.put("debts", debt);

        // Update hydrated debt
        updatedTx.debt = {
          description: debt.description,
          remaining_amount: debt.remaining_amount,
        };
      }
    } else if (newDebtId && newDebtId === oldDebtId) {
      // Just refresh hydration if needed (e.g. if debt was updated elsewhere, though unlikely in this flow)
      const debt = await db.get("debts", newDebtId);
      if (debt) {
        updatedTx.debt = {
          description: debt.description,
          remaining_amount: debt.remaining_amount,
        };
      }
    } else if (!newDebtId) {
      updatedTx.debt = undefined;
    }

    if (data.savings_goal_id) {
      const sg = await db.get("savings_goals", data.savings_goal_id);
      if (sg) updatedTx.savings_goal = { name: sg.name };
    }

    await db.put("transactions", updatedTx);
    return updatedTx;
  }

  async deleteTransaction(id: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = await db.get("transactions", id);
    if (!tx) return;

    // 1. Revert Account Balance
    if (tx.account_id) {
      const account = await db.get("accounts", tx.account_id);
      if (account) {
        account.current_balance -= tx.amount;
        await db.put("accounts", account);
      }
    }

    // Revert Debt Balance
    if (tx.debt_id) {
      const debt = await db.get("debts", tx.debt_id);
      if (debt) {
        // Revert the payment: Add back the absolute transaction amount
        debt.remaining_amount += Math.abs(tx.amount);

        // If the debt was settled, mark it as pending (not settled)
        if (debt.is_settled) {
          debt.is_settled = false;
        }

        await db.put("debts", debt);
      }
    }

    // 2. Delete Transaction
    await db.delete("transactions", id);
  }

  async transfer(data: TransferPayload): Promise<void> {
    const db = await this.dbPromise;
    const fromAccount = await db.get("accounts", data.from_account_id);
    const toAccount = await db.get("accounts", data.to_account_id);
    const category = await db.get("categories", data.category_id);

    if (!fromAccount || !toAccount) throw new Error("Account not found");
    if (!category) throw new Error("Category not found");
    if (category.type !== "TRANSFER")
      throw new Error("Category must be of type TRANSFER");

    if (fromAccount.current_balance < data.amount) {
      throw new Error("Insufficient funds in source account");
    }

    // Create Outgoing Transaction
    const txOut: Transaction = {
      id: crypto.randomUUID(),
      name: `Transfer to ${toAccount.name}`,
      description: data.description,
      amount: -Math.abs(data.amount),
      transaction_date: data.transaction_date,
      category_id: category.id,
      account_id: fromAccount.id,
      category: { name: category.name, icon: category.icon },
      account: { name: fromAccount.name },
    };

    // Create Incoming Transaction
    const txIn: Transaction = {
      id: crypto.randomUUID(),
      name: `Transfer from ${fromAccount.name}`,
      description: data.description,
      amount: Math.abs(data.amount),
      transaction_date: data.transaction_date,
      category_id: category.id,
      account_id: toAccount.id,
      category: { name: category.name, icon: category.icon },
      account: { name: toAccount.name },
    };

    await db.put("transactions", txOut);
    await db.put("transactions", txIn);

    // Update balances
    fromAccount.current_balance -= data.amount;
    toAccount.current_balance += data.amount;

    await db.put("accounts", fromAccount);
    await db.put("accounts", toAccount);
  }

  async getSavingsGoals(): Promise<SavingsGoal[]> {
    const db = await this.dbPromise;
    return db.getAll("savings_goals");
  }

  async getCategories(): Promise<Category[]> {
    const db = await this.dbPromise;
    return db.getAll("categories");
  }

  async createCategory(data: CategoryCreate): Promise<Category> {
    const db = await this.dbPromise;
    const newCat: Category = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
    };
    await db.put("categories", newCat);
    return newCat;
  }

  async updateCategory(
    id: string,
    data: Partial<CategoryCreate>,
  ): Promise<Category> {
    const db = await this.dbPromise;
    const cat = await db.get("categories", id);
    if (!cat) throw new Error("Category not found");
    const updated = { ...cat, ...data };
    await db.put("categories", updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const db = await this.dbPromise;

    // Check for related transactions
    const transactions = await db.getAllFromIndex(
      "transactions",
      "by-category",
      id,
    );
    if (transactions.length > 0) {
      throw new Error(
        "Cannot delete category because it is used in transactions.",
      );
    }

    await db.delete("categories", id);
  }

  async getAccounts(): Promise<Account[]> {
    const db = await this.dbPromise;
    return db.getAll("accounts");
  }

  async createAccount(data: CreateAccountPayload): Promise<Account> {
    const db = await this.dbPromise;
    const newAcc: Account = {
      id: crypto.randomUUID(),
      name: data.name,
      type: data.type,
      current_balance: data.current_balance || 0,
      currency: data.currency || "USD",
      updated_at: new Date().toISOString(),
    };
    await db.put("accounts", newAcc);
    return newAcc;
  }

  async updateAccount(
    id: string,
    data: Partial<CreateAccountPayload>,
  ): Promise<Account> {
    const db = await this.dbPromise;
    const acc = await db.get("accounts", id);
    if (!acc) throw new Error("Account not found");
    const updated = { ...acc, ...data, updated_at: new Date().toISOString() };
    await db.put("accounts", updated);
    return updated;
  }

  async deleteAccount(id: string): Promise<void> {
    const db = await this.dbPromise;

    // Cascade delete transactions
    const transactions = await db.getAllFromIndex(
      "transactions",
      "by-account",
      id,
    );
    for (const tx of transactions) {
      await db.delete("transactions", tx.id);
    }

    await db.delete("accounts", id);
  }

  async createDebt(data: CreateDebtPayload): Promise<Debt> {
    const db = await this.dbPromise;
    const newDebt: Debt = {
      id: crypto.randomUUID(),
      user_id: "local-user",
      ...data,
      remaining_amount: data.total_amount,
      is_settled: false,
      created_at: new Date().toISOString(),
      deleted_at: "",
      description: data.description || "",
      due_date: data.due_date || "",
    };
    await db.put("debts", newDebt);
    return newDebt;
  }

  async getDebts(): Promise<Debt[]> {
    const db = await this.dbPromise;
    return db.getAll("debts");
  }

  async updateDebt(
    id: string,
    data: Partial<CreateDebtPayload> | { is_settled: boolean },
  ): Promise<Debt> {
    const db = await this.dbPromise;
    const debt = await db.get("debts", id);
    if (!debt) throw new Error("Debt not found");

    const updatedDebt = { ...debt, ...data };

    // Logic for settlement handling if needed locally, similar to backend
    if ("is_settled" in data) {
      if (data.is_settled) {
        updatedDebt.remaining_amount = 0;
      }
      // If un-settling, we keep as is or need logic.
      // Mirroring backend logic (which currently does nothing specific for un-settling)
    }

    await db.put("debts", updatedDebt);
    return updatedDebt;
  }

  async deleteDebt(id: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete("debts", id);
  }

  async getDebtsSummary(): Promise<DebtSummary[]> {
    const db = await this.dbPromise;
    const debts = await db.getAll("debts");
    const persons = await db.getAll("persons");

    // Filter active debts
    const activeDebts = debts.filter((d) => !d.is_settled && !d.deleted_at);

    const summaryMap = new Map<string, DebtSummary>();

    activeDebts.forEach((debt) => {
      const key = `${debt.creditor_id}-${debt.debtor_id}`;
      if (!summaryMap.has(key)) {
        const creditor = persons.find((p) => p.id === debt.creditor_id);
        const debtor = persons.find((p) => p.id === debt.debtor_id);
        summaryMap.set(key, {
          creditor_name: creditor
            ? creditor.name
            : debt.creditor_id.substring(0, 8) + "...",
          debtor_name: debtor
            ? debtor.name
            : debt.debtor_id.substring(0, 8) + "...",
          count: 0,
          total_amount: 0,
        });
      }

      const item = summaryMap.get(key)!;
      item.count += 1;
      item.total_amount += debt.total_amount;
    });

    return Array.from(summaryMap.values());
  }

  async getPersons(): Promise<Person[]> {
    const db = await this.dbPromise;
    const persons = await db.getAll("persons");
    const user = await db.get("user", "local-user");

    if (user && user.person_id) {
      return persons.filter((p) => p.id !== user.person_id);
    }
    return persons;
  }

  async createPerson(data: CreatePersonPayload): Promise<Person> {
    const db = await this.dbPromise;
    const newPerson: Person = {
      id: crypto.randomUUID(),
      name: data.name,
      contact_info: data.contact_info || "",
      created_at: new Date().toISOString(),
    };
    await db.put("persons", newPerson);
    return newPerson;
  }

  async updatePerson(id: string, data: CreatePersonPayload): Promise<Person> {
    const db = await this.dbPromise;
    const person = await db.get("persons", id);
    if (!person) throw new Error("Person not found");
    const updated = {
      ...person,
      name: data.name,
      contact_info: data.contact_info || "",
    };
    await db.put("persons", updated);
    return updated;
  }

  async deletePerson(id: string): Promise<void> {
    const db = await this.dbPromise;
    // Check for related debts? For now strictly implementing interface.
    // Ideally we should check if person is used in debts.
    // But since this was a "side quest" fixing lints, I will do basic implementation.
    await db.delete("persons", id);
  }

  async getDashboardSummary(): Promise<DashboardData> {
    const db = await this.dbPromise;
    const transactions = await db.getAll("transactions");
    const accounts = await db.getAll("accounts");
    const categories = await db.getAll("categories");
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const balance = accounts.reduce(
      (acc, curr) => acc + curr.current_balance,
      0,
    );

    // Filter for current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthTx = transactions.filter((t) => {
      const d = new Date(t.transaction_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    // Initialize Chart Data
    const numDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const chartDataMap: Record<
      number,
      { day: number; income: number; expenses: number }
    > = {};
    for (let i = 1; i <= numDays; i++) {
      chartDataMap[i] = { day: i, income: 0, expenses: 0 };
    }

    let income = 0;
    let expenses = 0;

    currentMonthTx.forEach((t) => {
      const type = catMap.get(t.category_id)?.type;
      const val = Math.abs(t.amount);
      const day = new Date(t.transaction_date).getDate();

      if (type === "INCOME") {
        income += t.amount;
        if (chartDataMap[day]) chartDataMap[day].income += val;
      }
      if (type === "EXPENSE") {
        expenses += t.amount;
        if (chartDataMap[day]) chartDataMap[day].expenses += val;
      }
    });
    income = Math.abs(income);
    expenses = Math.abs(expenses);

    const chart_data = Object.values(chartDataMap).sort(
      (a, b) => a.day - b.day,
    );

    // Calculate last month summary (1-based month index)
    let lastMonthYear = currentYear;
    let lastMonthIndex = currentMonth - 1; // 0-indexed: -1..10
    if (lastMonthIndex < 0) {
      lastMonthIndex = 11; // December
      lastMonthYear -= 1;
    }
    const lastMonthId = `${lastMonthYear}-${lastMonthIndex + 1}`;
    const lastMonthSummary = await db.get("monthly_summaries", lastMonthId);

    // New Calculations
    const currentDay = now.getDate();
    const daily_expense_rate = currentDay > 0 ? expenses / currentDay : 0;
    const month_balance = income - expenses;

    const lastMonthIncome = lastMonthSummary
      ? lastMonthSummary.total_income
      : 0;
    const income_trend =
      lastMonthIncome > 0
        ? ((income - lastMonthIncome) / lastMonthIncome) * 100
        : 0;

    return {
      current_date: {
        year: currentYear,
        month: now.toLocaleString("default", { month: "long" }),
        month_int: currentMonth + 1,
      },
      cards: {
        balance,
        income,
        expenses,
        daily_expense_rate,
        month_balance,
      },
      month_comparison: {
        current: { income, expenses },
        last: {
          income: lastMonthIncome,
          expenses: lastMonthSummary ? lastMonthSummary.total_expense : 0,
        },
        income_trend,
      },
      chart_data,
    };
  }

  async getMonthlySummaries(year: number): Promise<MonthlySummary[]> {
    const db = await this.dbPromise;
    const summaries = await db.getAllFromIndex(
      "monthly_summaries",
      "by-year",
      year,
    );
    return summaries.sort((a, b) => a.month - b.month);
  }

  async recalculateMonthlySummaries(): Promise<{
    message: string;
    count: number;
  }> {
    const db = await this.dbPromise;
    const transactions = await db.getAll("transactions");
    const categories = await db.getAll("categories");
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const currentYear = new Date().getFullYear();

    // 1. Identify all months from transactions
    const monthsSet = new Set<string>();
    transactions.forEach((t) => {
      const d = new Date(t.transaction_date);
      const year = d.getFullYear();
      if (year >= currentYear) {
        const key = `${year}-${d.getMonth() + 1}`;
        monthsSet.add(key);
      }
    });

    // 2. Identify all months from existing summaries
    const existingSummaries = await db.getAll("monthly_summaries");
    existingSummaries.forEach((s) => {
      if (s.year >= currentYear) {
        monthsSet.add(`${s.year}-${s.month}`);
      }
    });

    // 3. Recalculate for each unique month
    let count = 0;
    const uniqueMonths = Array.from(monthsSet);

    for (const key of uniqueMonths) {
      const [yearStr, monthStr] = key.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const monthIndex = month - 1;

      // Filter transactions for this specific month
      const monthTransactions = transactions.filter((t) => {
        const d = new Date(t.transaction_date);
        return d.getFullYear() === year && d.getMonth() === monthIndex;
      });

      // Calculate totals for the month
      let total_income = 0;
      let total_expense = 0;

      monthTransactions.forEach((t) => {
        const type = catMap.get(t.category_id)?.type;
        if (type === "INCOME") total_income += Math.abs(t.amount);
        if (type === "EXPENSE") total_expense += Math.abs(t.amount);
      });

      // Calculate Net Flow for this specific month (Income - Expense)
      const closing_balance = total_income - total_expense;

      const summary: MonthlySummary = {
        id: `${year}-${month}`,
        year,
        month,
        month_name: new Date(year, monthIndex).toLocaleString("default", {
          month: "long",
        }),
        total_income,
        total_expense,
        closing_balance,
      };

      await db.put("monthly_summaries", summary);
      count++;
    }

    return { message: "Recalculated all summaries", count };
  }

  async recalculateSingleMonthSummary(
    year: number,
    month: number,
  ): Promise<{ message: string; data: MonthlySummary }> {
    const currentYear = new Date().getFullYear();
    if (year < currentYear) {
      throw new Error("Recalculation is disabled for past years.");
    }

    const db = await this.dbPromise;
    const monthIndex = month - 1;

    // 1. Fetch transactions for the month
    const allTransactions = await db.getAll("transactions");
    const monthTransactions = allTransactions.filter((t) => {
      const d = new Date(t.transaction_date);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    });

    const categories = await db.getAll("categories");
    const catMap = new Map(categories.map((c) => [c.id, c]));

    // 2. Calculate Totals
    let total_income = 0;
    let total_expense = 0;

    monthTransactions.forEach((t) => {
      const type = catMap.get(t.category_id)?.type;
      if (type === "INCOME") total_income += Math.abs(t.amount);
      if (type === "EXPENSE") total_expense += Math.abs(t.amount);
    });

    // 3. Calculate Net Flow for this specific month (Income - Expense)
    const closing_balance = total_income - total_expense;

    const summary: MonthlySummary = {
      id: `${year}-${month}`,
      year,
      month,
      month_name: new Date(year, monthIndex).toLocaleString("default", {
        month: "long",
      }),
      total_income,
      total_expense,
      closing_balance,
    };

    await db.put("monthly_summaries", summary);

    return { message: "Recalculated locally", data: summary };
  }

  async getMascotMessage(context: string): Promise<MascotMessage | null> {
    // For offline/IndexedDB, we just pick a random message from fallback
    let candidates = FALLBACK_MESSAGES.filter((m) => m.context === context);
    if (candidates.length === 0) {
      candidates = FALLBACK_MESSAGES.filter((m) => m.context === "generic");
    }

    if (candidates.length > 0) {
      const randomMsg =
        candidates[Math.floor(Math.random() * candidates.length)];
      return randomMsg;
    }
    return null;
  }

  async getUser(): Promise<User | null> {
    const db = await this.dbPromise;
    const user = await db.get("user", "local-user");
    return user || null;
  }

  async createUser(data: CreateUserPayload): Promise<User> {
    const db = await this.dbPromise;

    // Automatically create the user person
    const personName = data.email ? data.email.split("@")[0] : "Me";
    const userPerson: Person = {
      id: "local-user-person",
      name: personName,
      contact_info: data.email || "",
      created_at: new Date().toISOString(),
    };

    userPerson.id = crypto.randomUUID();

    await db.put("persons", userPerson);

    const newUser: User = {
      id: "local-user",
      email: data.email || "",
      base_currency: data.base_currency,
      person_id: userPerson.id,
      created_at: new Date().toISOString(),
    };
    await db.put("user", newUser);

    return newUser;
  }

  async getAllData(): Promise<any> {
    const db = await this.dbPromise;
    const transactions = await db.getAll("transactions");
    const categories = await db.getAll("categories");
    const accounts = await db.getAll("accounts");
    const debts = await db.getAll("debts");
    const persons = await db.getAll("persons");
    const savings_goals = await db.getAll("savings_goals");
    const monthly_summaries = await db.getAll("monthly_summaries");
    const user = await db.getAll("user");

    return {
      transactions,
      categories,
      accounts,
      debts,
      persons,
      savings_goals,
      monthly_summaries,
      user,
      export_date: new Date().toISOString(),
    };
  }

  async loadData(data: any): Promise<void> {
    const db = await this.dbPromise;

    // Basic validation
    const requiredStores = [
      "transactions",
      "categories",
      "accounts",
      "debts",
      "persons",
      "savings_goals",
      "user",
    ];
    for (const store of requiredStores) {
      if (!data[store] || !Array.isArray(data[store])) {
        throw new Error(`Invalid data format: missing or invalid ${store}`);
      }
    }

    const tx = db.transaction(
      [
        "transactions",
        "categories",
        "accounts",
        "debts",
        "persons",
        "savings_goals",
        "monthly_summaries",
        "user",
      ],
      "readwrite",
    );

    // Clear all stores
    await Promise.all([
      tx.objectStore("transactions").clear(),
      tx.objectStore("categories").clear(),
      tx.objectStore("accounts").clear(),
      tx.objectStore("debts").clear(),
      tx.objectStore("persons").clear(),
      tx.objectStore("savings_goals").clear(),
      tx.objectStore("monthly_summaries").clear(),
      tx.objectStore("user").clear(),
    ]);

    // Insert new data
    // Insert new data
    const stores = [
      "transactions",
      "categories",
      "accounts",
      "debts",
      "persons",
      "savings_goals",
      "monthly_summaries",
      "user",
    ];

    for (const storeName of stores) {
      // Check if data for this store exists in the import file
      if (data[storeName] && Array.isArray(data[storeName])) {
        const store = tx.objectStore(storeName as any);
        for (const item of data[storeName]) {
          await store.put(item);
        }
      }
    }

    await tx.done;
  }
}
