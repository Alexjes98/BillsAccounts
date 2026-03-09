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
  MonthCategorySummary,
  CategorySummary,
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
import { MascotMessage, FALLBACK_MESSAGES } from "./mascotMessages";
import { encryptObject, decryptObject } from "@/lib/crypto";
import {
  sanitizeInput,
  validateInput,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_CONTACT_INFO_LENGTH,
} from "@/lib/sanitization";

// TODO: Refine all behaviours with data relations to ensure data consistency with basic functions

// Fix for floating point precision: round down to 2 decimal places to avoid e.g. .99999955
function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

// Fix Date parsing for YYYY-MM-DD and UTC midnight that shift days in local timezone
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.length === 10) {
    return new Date(`${dateStr}T12:00:00`);
  }
  if (dateStr.endsWith("T00:00:00.000Z")) {
    return new Date(`${dateStr.split("T")[0]}T12:00:00`);
  }
  return new Date(dateStr);
}

// Internal type for what we actually store in IndexedDB
// We make relational fields optional because we want to hydrate them at runtime
type StoredTransaction = Omit<
  Transaction,
  "category" | "account" | "debt" | "savings_goal"
> & {
  category?: { name: string; icon?: string };
  account?: { name: string };
  debt?: { description: string; remaining_amount: number };
  savings_goal?: { name: string };
};

interface MyDB extends DBSchema {
  transactions: {
    key: string;
    value: StoredTransaction;
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
  private static instance: IndexedDbRepository;
  private dbPromise!: Promise<IDBPDatabase<MyDB>>;
  private readonly DB_NAME = "finance_app_db";
  private readonly DB_VERSION = 1;
  private cryptoKey: CryptoKey | null = null;

  private static readonly INDEX_FIELDS: Record<string, string[]> = {
    transactions: [
      "id",
      "transaction_date",
      "account_id",
      "category_id",
      "debt_id",
      "savings_goal_id",
      "amount",
    ],
    categories: ["id", "type"],
    accounts: ["id", "type"],
    debts: ["id", "debtor_id", "creditor_id", "type", "is_settled"],
    persons: ["id"],
    savings_goals: ["id"],
    monthly_summaries: ["id", "year", "month"],
    user: ["id", "person_id"],
  };

  private async encryptRecord(record: any, storeName: string): Promise<any> {
    if (!this.cryptoKey) return record;

    const indexFields = IndexedDbRepository.INDEX_FIELDS[storeName] || ["id"];
    const plainTextRecord: any = {};
    const sensitiveRecord: any = {};

    for (const key of Object.keys(record)) {
      if (indexFields.includes(key)) {
        plainTextRecord[key] = record[key];
      } else {
        sensitiveRecord[key] = record[key];
      }
    }

    if (Object.keys(sensitiveRecord).length === 0) return plainTextRecord;

    const encryptedData = await encryptObject(sensitiveRecord, this.cryptoKey);
    plainTextRecord._encryptedData = encryptedData;
    return plainTextRecord;
  }

  private async decryptRecord(record: any): Promise<any> {
    if (!this.cryptoKey || !record || !record._encryptedData) return record;

    try {
      const decrypted = await decryptObject(
        record._encryptedData,
        this.cryptoKey,
      );
      const fullRecord = { ...record, ...decrypted };
      delete fullRecord._encryptedData;
      return fullRecord;
    } catch (e) {
      console.error("Failed to decrypt record", record);
      return record;
    }
  }

  private async _put(
    db: IDBPDatabase<MyDB>,
    storeName: string,
    value: any,
  ): Promise<any> {
    const encrypted = await this.encryptRecord(value, storeName);
    // @ts-ignore
    return db.put(storeName, encrypted);
  }

  private async _get(
    db: IDBPDatabase<MyDB>,
    storeName: string,
    key: string,
  ): Promise<any> {
    // @ts-ignore
    const record = await db.get(storeName, key);
    return this.decryptRecord(record);
  }

  private async _getAll(
    db: IDBPDatabase<MyDB>,
    storeName: string,
  ): Promise<any[]> {
    // @ts-ignore
    const records = await db.getAll(storeName);
    return Promise.all(records.map((r) => this.decryptRecord(r)));
  }

  private async _getAllFromIndex(
    db: IDBPDatabase<MyDB>,
    storeName: string,
    indexName: string,
    key: any,
  ): Promise<any[]> {
    // @ts-ignore
    const records = await db.getAllFromIndex(storeName, indexName, key);
    return Promise.all(records.map((r) => this.decryptRecord(r)));
  }

  private async migrateToEncrypted() {
    if (!this.cryptoKey) return;
    const db = await this.dbPromise;

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

    const tx = db.transaction(stores as any, "readwrite");

    for (const storeName of stores) {
      const store = tx.objectStore(storeName as any);
      const records = await store.getAll();
      for (const record of records) {
        if (!record._encryptedData) {
          const encryptedRecord = await this.encryptRecord(record, storeName);
          await store.put(encryptedRecord);
        }
      }
    }

    await tx.done;
    console.log("Migration to encrypted DB completed.");
  }

  public static getInstance(cryptoKey?: CryptoKey | null): IndexedDbRepository {
    if (!IndexedDbRepository.instance) {
      IndexedDbRepository.instance = new IndexedDbRepository(cryptoKey);
    } else if (cryptoKey && !IndexedDbRepository.instance.cryptoKey) {
      IndexedDbRepository.instance.cryptoKey = cryptoKey;
      IndexedDbRepository.instance.migrateToEncrypted().catch(console.error);
    }
    return IndexedDbRepository.instance;
  }

  private constructor(cryptoKey?: CryptoKey | null) {
    this.cryptoKey = cryptoKey || null;

    if (typeof window !== "undefined") {
      window.addEventListener("crypto:password_set", async (e: any) => {
        this.cryptoKey = e.detail.key;
        await this.migrateToEncrypted();
      });
    }

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
    // const user = await this._getAll(db, "user");
    // Removed user seeding to allow onboarding
    // if (user.length === 0) { ... }
  }

  // Helper to fetch all related entities and create maps for hydration
  private async getAllMaps() {
    const db = await this.dbPromise;
    const [categories, accounts, debts, savingsGoals] = await Promise.all([
      await this._getAll(db, "categories"),
      await this._getAll(db, "accounts"),
      await this._getAll(db, "debts"),
      await this._getAll(db, "savings_goals"),
    ]);

    return {
      categoryMap: new Map(categories.map((c) => [c.id, c])),
      accountMap: new Map(accounts.map((a) => [a.id, a])),
      debtMap: new Map(debts.map((d) => [d.id, d])),
      savingsGoalMap: new Map(savingsGoals.map((s) => [s.id, s])),
    };
  }

  // Helper to hydrate a stored transaction with latest related data
  private hydrateTransaction(
    tx: StoredTransaction,
    maps: {
      categoryMap: Map<string, Category>;
      accountMap: Map<string, Account>;
      debtMap: Map<string, Debt>;
      savingsGoalMap: Map<string, SavingsGoal>;
    },
  ): Transaction {
    const category = maps.categoryMap.get(tx.category_id);
    const account = tx.account_id
      ? maps.accountMap.get(tx.account_id)
      : undefined;
    const debt = tx.debt_id ? maps.debtMap.get(tx.debt_id) : undefined;
    const savingsGoal = tx.savings_goal_id
      ? maps.savingsGoalMap.get(tx.savings_goal_id)
      : undefined;

    return {
      ...tx,
      category: {
        name: category?.name || "Unknown",
        icon: category?.icon,
      },
      account: account ? { name: account.name } : undefined,
      debt: debt
        ? {
            description: debt.description,
            remaining_amount: debt.remaining_amount,
          }
        : undefined,
      savings_goal: savingsGoal ? { name: savingsGoal.name } : undefined,
    } as Transaction;
  }

  async getTransactions(
    params?: TransactionQueryParams,
  ): Promise<PaginatedResponse<Transaction>> {
    const db = await this.dbPromise;
    const maps = await this.getAllMaps();

    // Strategy:
    // We strictly use the generic 'by-date' index for sorting.
    // Filtering is done by iterating the cursor and checking conditions.
    // Pagination is done by skipping matched items.

    const txStore = db.transaction("transactions", "readonly").store;
    const index = txStore.index("by-date");

    // We walk backwards (descending date)
    let cursor = await index.openCursor(null, "prev");

    const items: Transaction[] = [];

    // Pagination params
    const page = params?.page || 1;
    const per_page = params?.per_page || 20;
    const skipCount = (page - 1) * per_page;

    // Filters
    const search = params?.search?.toLowerCase();
    const categoryId = params?.category_id;
    const accountId = params?.account_id;
    const debtId = params?.debt_id;
    const type = params?.type;
    const startDate = params?.start_date;
    const endDate = params?.end_date;

    // Optimization: If no filters, we can just count total and then advance cursor
    const hasFilters = !!(
      search ||
      categoryId ||
      accountId ||
      debtId ||
      type ||
      startDate ||
      endDate
    );

    if (!hasFilters) {
      const total = await txStore.count();

      // Advance to the correct page
      if (skipCount > 0 && skipCount < total) {
        // Re-open cursor if we need to advance (sometimes safer than advance() on a fresh cursor depending on implementation, but advance() is standard)
        // Actually, we already opened it.
        await cursor?.advance(skipCount);
      }

      while (cursor && items.length < per_page) {
        const decryptedTx = await this.decryptRecord(cursor.value);
        items.push(this.hydrateTransaction(decryptedTx, maps));
        cursor = await cursor.continue();
      }

      return {
        items,
        total,
        page,
        per_page,
        pages: Math.ceil(total / per_page),
      };
    } else {
      // Filtered Case: We must iterate to find matches
      // Note: Getting total count for filtered items in IDB is hard without iterating all.
      // For now, we unfortunately have to iterate potentially everything to get the TOTAL count for pagination to work correctly (pages count).
      // IF performance becomes an issue with 10k items + filters, we might need a separate count index or just "approximate" pages.
      // Optimally, we cap this to avoid freezing the UI on huge datasets with broad filters.

      const MAX_MATCHES_LIMIT = 2000; // Cap at 100 pages of 20 items
      const allMatches: Transaction[] = [];

      while (cursor) {
        const tx = await this.decryptRecord(cursor.value);
        let isMatch = true;

        if (categoryId && tx.category_id !== categoryId) isMatch = false;
        else if (accountId && tx.account_id !== accountId) isMatch = false;
        else if (debtId && tx.debt_id !== debtId) isMatch = false;
        else if (search) {
          const searchTerms = search.toLowerCase().split(/\s+/).filter(Boolean);
          const nameMatch = searchTerms.some((term) =>
            tx.name.toLowerCase().includes(term),
          );
          const descMatch = tx.description
            ? searchTerms.some((term) =>
                tx.description!.toLowerCase().includes(term),
              )
            : false;
          if (!nameMatch && !descMatch) isMatch = false;
        }

        if (isMatch && startDate) {
          if ((tx.transaction_date || "").substring(0, 10) < startDate)
            isMatch = false;
        }

        if (isMatch && endDate) {
          if ((tx.transaction_date || "").substring(0, 10) > endDate)
            isMatch = false;
        }

        if (isMatch && type) {
          // Check category type from map
          const cat = maps.categoryMap.get(tx.category_id);
          if (cat?.type !== type) isMatch = false;
        }

        if (isMatch) {
          allMatches.push(this.hydrateTransaction(tx, maps));
          if (allMatches.length >= MAX_MATCHES_LIMIT) {
            break;
          }
        }

        cursor = await cursor.continue();
      }

      // Now we have all matches, we can slice for pagination
      const total = allMatches.length;
      const paginatedItems = allMatches.slice(skipCount, skipCount + per_page);

      return {
        items: paginatedItems,
        total,
        page,
        per_page,
        pages: Math.ceil(total / per_page),
      };
    }
  }

  async createTransaction(
    data: CreateTransactionPayload,
  ): Promise<Transaction> {
    const db = await this.dbPromise;
    const id = crypto.randomUUID();

    // Helper to get fresh maps would be expensive here if we just need single items?
    // But for consistency and since we need to return hydrated, let's just fetch what we can or use the helper.
    // Optimization: Just get specific items for mutation logic, but we need full maps for proper hydration return?
    // Actually, we can just construct the hydrated object manually from the specific items we fetched.

    // Fetch related objects to hydrate the response
    const category = await this._get(db, "categories", data.category_id);
    if (!category) throw new Error("Category not found");

    const account = data.account_id
      ? await this._get(db, "accounts", data.account_id)
      : undefined;
    const debt = data.debt_id
      ? await this._get(db, "debts", data.debt_id)
      : undefined;
    const savings_goal = data.savings_goal_id
      ? await this._get(db, "savings_goals", data.savings_goal_id)
      : undefined;

    // 1. Determine Amount Sign
    if (category.type === "INCOME") {
      data.amount = Math.abs(data.amount);
    } else {
      data.amount = -Math.abs(data.amount);
    }

    // Sanitize and Validate Inputs
    validateInput(data.name, MAX_NAME_LENGTH, "Transaction Name");
    if (data.description) {
      validateInput(
        data.description,
        MAX_DESCRIPTION_LENGTH,
        "Transaction Description",
      );
    }

    data.name = sanitizeInput(data.name);
    if (data.description) {
      data.description = sanitizeInput(data.description);
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
        debt.remaining_amount = roundAmount(
          debt.remaining_amount - paymentAmount,
        );
        if (debt.remaining_amount <= 0) {
          debt.remaining_amount = 0;
          debt.is_settled = true;
        } else {
          debt.is_settled = false;
        }
        await this._put(db, "debts", debt);
      }
    }

    // CREATE StoredTransaction (no hydrated fields)
    const newTx: StoredTransaction = {
      id,
      ...data,
      account_id: data.account_id ?? undefined,
      debt_id: data.debt_id ?? undefined,
      savings_goal_id: data.savings_goal_id ?? undefined,
      is_system_generated: data.is_system_generated,
      // explicitly omit category, account, debt, savings_goal objects
    };

    await this._put(db, "transactions", newTx);

    // 3. Update Account Balance
    if (data.account_id && account) {
      account.current_balance = roundAmount(
        account.current_balance + data.amount,
      );
      await this._put(db, "accounts", account);
    }

    // RETURN Hydrated Transaction
    return {
      ...newTx,
      category: {
        name: category.name,
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
    } as Transaction;
  }

  async updateTransaction(
    id: string,
    data: Partial<CreateTransactionPayload>,
  ): Promise<Transaction> {
    const db = await this.dbPromise;
    const tx = await this._get(db, "transactions", id);
    if (!tx) throw new Error("Transaction not found");

    // 1. Revert Old Balance Effect
    const oldAccountId = tx.account_id;
    const oldAmount = tx.amount;

    if (oldAccountId) {
      const oldAccount = await this._get(db, "accounts", oldAccountId);
      if (oldAccount) {
        oldAccount.current_balance = roundAmount(
          oldAccount.current_balance - oldAmount,
        );
        await this._put(db, "accounts", oldAccount);
      }
    }

    // 2. Prepare Updates
    // We need to check if category changed to recalculate amount sign
    let category = await this._get(db, "categories", tx.category_id); // Default to existing
    if (data.category_id && data.category_id !== tx.category_id) {
      const newCat = await this._get(db, "categories", data.category_id);
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

    // Merge updates into StoredTransaction
    const updatedTx: StoredTransaction = {
      ...tx,
      ...data,
      amount: finalAmount,
      // Ensure we clean up any old hydrated data if it existed in the record (filtering it out effectively by typing)
    };

    // Explicitly delete optional hydrated fields if they were present in 'tx' (from old DB data)
    delete (updatedTx as any).category;
    delete (updatedTx as any).account;
    delete (updatedTx as any).debt;
    delete (updatedTx as any).savings_goal;

    // Sanitize and Validate Inputs if updated
    if (data.name !== undefined) {
      validateInput(data.name, MAX_NAME_LENGTH, "Transaction Name");
      updatedTx.name = sanitizeInput(data.name);
    }
    if (data.description !== undefined) {
      validateInput(
        data.description,
        MAX_DESCRIPTION_LENGTH,
        "Transaction Description",
      );
      updatedTx.description = sanitizeInput(data.description);
    }
    if (data.is_system_generated !== undefined) {
      updatedTx.is_system_generated = data.is_system_generated;
    }

    // 3. Apply New Balance Effect
    if (updatedTx.account_id) {
      const newAccount = await this._get(db, "accounts", updatedTx.account_id);
      if (newAccount) {
        newAccount.current_balance = roundAmount(
          newAccount.current_balance + updatedTx.amount,
        );
        await this._put(db, "accounts", newAccount);
      }
    }

    // 4. Handle Debt Updates
    const oldDebtId = tx.debt_id;
    const newDebtId = updatedTx.debt_id;
    const oldAmountAbs = Math.abs(tx.amount);
    const newAmountAbs = Math.abs(updatedTx.amount);

    // Scenario A: Debt ID Changed (or removed)
    if (oldDebtId && oldDebtId !== newDebtId) {
      const oldDebt = await this._get(db, "debts", oldDebtId);
      if (oldDebt) {
        oldDebt.remaining_amount = roundAmount(
          oldDebt.remaining_amount + oldAmountAbs,
        );
        oldDebt.is_settled = false;
        await this._put(db, "debts", oldDebt);
      }
    }

    let debtObj: Debt | undefined;

    if (newDebtId && newDebtId !== oldDebtId) {
      const newDebt = await this._get(db, "debts", newDebtId);
      if (newDebt) {
        newDebt.remaining_amount = roundAmount(
          newDebt.remaining_amount - newAmountAbs,
        );
        if (newDebt.remaining_amount <= 0) {
          newDebt.remaining_amount = 0;
          newDebt.is_settled = true;
        } else {
          newDebt.is_settled = false;
        }
        await this._put(db, "debts", newDebt);
        debtObj = newDebt;
      }
    }

    // Scenario B: Debt ID Unchanged, Amount Changed
    if (newDebtId && newDebtId === oldDebtId && oldAmountAbs !== newAmountAbs) {
      const debt = await this._get(db, "debts", newDebtId);
      if (debt) {
        const diff = oldAmountAbs - newAmountAbs;
        debt.remaining_amount = roundAmount(debt.remaining_amount + diff);

        if (debt.remaining_amount <= 0) {
          debt.remaining_amount = 0;
          debt.is_settled = true;
        } else {
          debt.is_settled = false;
        }
        await this._put(db, "debts", debt);
        debtObj = debt;
      }
    } else if (newDebtId && newDebtId === oldDebtId) {
      // Just fetch it for hydration
      debtObj = await this._get(db, "debts", newDebtId);
    }

    let savingsGoalObj: SavingsGoal | undefined;
    if (updatedTx.savings_goal_id) {
      savingsGoalObj = await this._get(
        db,
        "savings_goals",
        updatedTx.savings_goal_id,
      );
    }

    let accountObj: Account | undefined;
    if (updatedTx.account_id) {
      accountObj = await this._get(db, "accounts", updatedTx.account_id);
    }

    await this._put(db, "transactions", updatedTx);

    // Return Hydrated
    return {
      ...updatedTx,
      category: {
        name: category.name,
        icon: category.icon,
      },
      account: accountObj ? { name: accountObj.name } : undefined,
      debt: debtObj
        ? {
            description: debtObj.description,
            remaining_amount: debtObj.remaining_amount,
          }
        : undefined,
      savings_goal: savingsGoalObj ? { name: savingsGoalObj.name } : undefined,
    } as Transaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    const db = await this.dbPromise;
    const tx = await this._get(db, "transactions", id);
    if (!tx) return;

    // 1. Revert Account Balance
    if (tx.account_id) {
      const account = await this._get(db, "accounts", tx.account_id);
      if (account) {
        account.current_balance = roundAmount(
          account.current_balance - tx.amount,
        );
        await this._put(db, "accounts", account);
      }
    }

    // Revert Debt Balance
    if (tx.debt_id) {
      const debt = await this._get(db, "debts", tx.debt_id);
      if (debt) {
        // Revert the payment: Add back the absolute transaction amount
        debt.remaining_amount = roundAmount(
          debt.remaining_amount + Math.abs(tx.amount),
        );

        // If the debt was settled, mark it as pending (not settled)
        if (debt.is_settled) {
          debt.is_settled = false;
        }

        await this._put(db, "debts", debt);
      }
    }

    // 2. Delete Transaction
    await db.delete("transactions", id);
  }

  async transfer(data: TransferPayload): Promise<void> {
    const db = await this.dbPromise;
    const fromAccount = await this._get(db, "accounts", data.from_account_id);
    const toAccount = await this._get(db, "accounts", data.to_account_id);
    const category = await this._get(db, "categories", data.category_id);

    if (!fromAccount || !toAccount) throw new Error("Account not found");
    if (!category) throw new Error("Category not found");
    if (category.type !== "TRANSFER")
      throw new Error("Category must be of type TRANSFER");

    // Fix for floating point precision: compare amounts in cents (integers)
    const balanceCents = Math.round(fromAccount.current_balance * 100);
    const amountCents = Math.round(data.amount * 100);

    if (balanceCents < amountCents) {
      throw new Error("Insufficient funds in source account");
    }

    // Handle Debt Update
    if (data.debt_id) {
      const debt = await this._get(db, "debts", data.debt_id);
      if (debt) {
        debt.remaining_amount = roundAmount(
          debt.remaining_amount - Math.abs(data.amount),
        );
        if (debt.remaining_amount <= 0) {
          debt.remaining_amount = 0;
          debt.is_settled = true;
        } else {
          debt.is_settled = false;
        }
        await this._put(db, "debts", debt);
      }
    }

    // Create Outgoing Transaction
    const txOut: StoredTransaction = {
      id: crypto.randomUUID(),
      name: `Transfer to ${toAccount.name}`,
      description: data.description,
      amount: -Math.abs(data.amount),
      transaction_date: data.transaction_date,
      is_system_generated: true,
      category_id: category.id,
      account_id: fromAccount.id,
      debt_id: data.debt_id,
    };

    // Create Incoming Transaction
    const txIn: StoredTransaction = {
      id: crypto.randomUUID(),
      name: `Transfer from ${fromAccount.name}`,
      description: data.description,
      amount: Math.abs(data.amount),
      transaction_date: data.transaction_date,
      is_system_generated: true,
      category_id: category.id,
      account_id: toAccount.id,
      debt_id: data.debt_id,
    };

    await this._put(db, "transactions", txOut);
    await this._put(db, "transactions", txIn);

    // Update balances
    fromAccount.current_balance = roundAmount(
      fromAccount.current_balance - data.amount,
    );
    toAccount.current_balance = roundAmount(
      toAccount.current_balance + data.amount,
    );

    await this._put(db, "accounts", fromAccount);
    await this._put(db, "accounts", toAccount);
  }

  async getSavingsGoals(): Promise<SavingsGoal[]> {
    const db = await this.dbPromise;
    return await this._getAll(db, "savings_goals");
  }

  async getCategories(): Promise<Category[]> {
    const db = await this.dbPromise;
    return await this._getAll(db, "categories");
  }

  async createCategory(data: CategoryCreate): Promise<Category> {
    const db = await this.dbPromise;
    const newCat: Category = {
      id: crypto.randomUUID(),
      ...data,
      created_at: new Date().toISOString(),
    };

    validateInput(newCat.name, MAX_NAME_LENGTH, "Category Name");
    newCat.name = sanitizeInput(newCat.name);

    await this._put(db, "categories", newCat);
    return newCat;
  }

  async updateCategory(
    id: string,
    data: Partial<CategoryCreate>,
  ): Promise<Category> {
    const db = await this.dbPromise;
    const cat = await this._get(db, "categories", id);
    if (!cat) throw new Error("Category not found");
    const updated = { ...cat, ...data };

    if (data.name !== undefined) {
      validateInput(updated.name, MAX_NAME_LENGTH, "Category Name");
      updated.name = sanitizeInput(updated.name);
    }

    await this._put(db, "categories", updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<void> {
    const db = await this.dbPromise;

    // Check for related transactions
    const transactions = await this._getAllFromIndex(
      db,
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
    return await this._getAll(db, "accounts");
  }

  async createAccount(data: CreateAccountPayload): Promise<Account> {
    const db = await this.dbPromise;
    const newAcc: Account = {
      id: crypto.randomUUID(),
      name: data.name,
      type: data.type,
      classification: data.classification,
      tags: data.tags || [],
      current_balance: data.current_balance || 0,
      currency: data.currency || "USD",
      updated_at: new Date().toISOString(),
    };

    validateInput(newAcc.name, MAX_NAME_LENGTH, "Account Name");
    newAcc.name = sanitizeInput(newAcc.name);

    await this._put(db, "accounts", newAcc);
    return newAcc;
  }

  async updateAccount(
    id: string,
    data: Partial<CreateAccountPayload>,
  ): Promise<Account> {
    const db = await this.dbPromise;
    const acc = await this._get(db, "accounts", id);
    if (!acc) throw new Error("Account not found");
    const updated = { ...acc, ...data, updated_at: new Date().toISOString() };

    if (data.name !== undefined) {
      validateInput(updated.name, MAX_NAME_LENGTH, "Account Name");
      updated.name = sanitizeInput(updated.name);
    }

    if (data.tags !== undefined) {
      updated.tags = data.tags;
    }

    if (data.classification !== undefined) {
      updated.classification = data.classification;
    }

    await this._put(db, "accounts", updated);
    return updated;
  }

  async deleteAccount(id: string): Promise<void> {
    const db = await this.dbPromise;

    // Cascade delete transactions
    const transactions = await this._getAllFromIndex(
      db,
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

    if (newDebt.description) {
      validateInput(
        newDebt.description,
        MAX_DESCRIPTION_LENGTH,
        "Debt Description",
      );
      newDebt.description = sanitizeInput(newDebt.description);
    }

    // Logic based on Debt Type
    if (data.type === "DELAYED_PAYMENT") {
      // 1. Create/Find Asset Account for Person (User is Creditor, Person is Debtor)
      // ID: user_id + person_id + debt_id
      const accountId = `${newDebt.user_id}-${newDebt.debtor_id}-DELAYED_PAYMENT`;
      let account = await this._get(db, "accounts", accountId);

      if (!account) {
        const person = await this._get(db, "persons", newDebt.debtor_id);
        const personName = person ? person.name : "Unknown";
        account = {
          id: accountId,
          name: `${personName} Asset`,
          type: "ASSET",
          classification: "ASSET",
          current_balance: 0,
          currency: "USD",
          updated_at: new Date().toISOString(),
        };
        await this._put(db, "accounts", account);
      }

      // 2. Create Income Transaction
      if (!data.category_id)
        throw new Error("Category is required for Delayed Payment");

      const txData: CreateTransactionPayload = {
        name: `Delayed Payment: ${data.description || "Debt"}`,
        amount: data.total_amount,
        transaction_date: new Date().toISOString(),
        category_id: data.category_id,
        account_id: accountId,
        debt_id: newDebt.id,
        person_id: newDebt.debtor_id,
        is_system_generated: true,
      };
      await this.createTransaction(txData);
    } else if (data.type === "PASSIVE_DEBT") {
      // User owes Person (Liability)
      // ID: user_id + creditor_id + debt_id
      const accountId = `${newDebt.user_id}-${newDebt.creditor_id}-PASSIVE_DEBT`;
      let account = await this._get(db, "accounts", accountId);

      if (!account) {
        const person = await this._get(db, "persons", newDebt.creditor_id);
        const personName = person ? person.name : "Unknown";
        account = {
          id: accountId,
          name: `${personName} Liability`,
          type: "LIABILITY",
          classification: "LIABILITY",
          current_balance: 0,
          currency: "USD",
          updated_at: new Date().toISOString(),
        };
        await this._put(db, "accounts", account);
      }

      // Create Expense Transaction (Dr Expense, Cr Liability)
      // We need a category. We check if provided.
      if (data.category_id) {
        const txData: CreateTransactionPayload = {
          name: `Passive Debt: ${data.description || "Owed"}`,
          amount: data.total_amount, // Positive passed, createTransaction makes it negative based on Expense Type
          transaction_date: new Date().toISOString(),
          category_id: data.category_id,
          account_id: accountId,
          debt_id: newDebt.id,
          person_id: newDebt.creditor_id,
          is_system_generated: true,
        };
        await this.createTransaction(txData);
      } else {
        // Fallback: Just update balance if no category provided (though UI should enforce)
        account.current_balance = roundAmount(
          account.current_balance - data.total_amount,
        ); // Debt = Negative balance
        await this._put(db, "accounts", account);
      }
    } else if (data.type === "LOAN") {
      // User Loaned to Person
      // Transfer: Equity (Source) -> Asset (Target)
      if (!data.account_id)
        throw new Error("Source Account is required for Loan");

      const targetAccountId = `${newDebt.user_id}-${newDebt.debtor_id}-LOAN`;
      let targetAccount = await this._get(db, "accounts", targetAccountId);

      if (!targetAccount) {
        const person = await this._get(db, "persons", newDebt.debtor_id);
        const personName = person ? person.name : "Unknown";
        targetAccount = {
          id: targetAccountId,
          name: `${personName} Loan Asset`,
          type: "ASSET",
          classification: "ASSET",
          current_balance: 0,
          currency: "USD",
          updated_at: new Date().toISOString(),
        };
        await this._put(db, "accounts", targetAccount);
      }

      // Transfer
      const categories = await this._getAll(db, "categories");
      const transferCat = categories.find((c) => c.type === "TRANSFER");
      if (!transferCat)
        throw new Error("No TRANSFER category found for Loan creation");

      const transferData: TransferPayload = {
        from_account_id: data.account_id,
        to_account_id: targetAccountId,
        amount: data.total_amount,
        category_id: transferCat.id,
        debt_id: newDebt.id,
        transaction_date: new Date().toISOString(),
        description: `Loan to ${data.description || "Person"}`,
      };
      await this.transfer(transferData);
    }

    await this._put(db, "debts", newDebt);
    return newDebt;
  }

  async getDebts(): Promise<Debt[]> {
    const db = await this.dbPromise;
    return await this._getAll(db, "debts");
  }

  async updateDebt(
    id: string,
    data: Partial<CreateDebtPayload> | { is_settled: boolean },
  ): Promise<Debt> {
    const db = await this.dbPromise;
    const debt = await this._get(db, "debts", id);
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

    if ("description" in data && data.description) {
      validateInput(
        data.description,
        MAX_DESCRIPTION_LENGTH,
        "Debt Description",
      );
      updatedDebt.description = sanitizeInput(data.description);
    }

    await this._put(db, "debts", updatedDebt);
    return updatedDebt;
  }

  async deleteDebt(id: string): Promise<void> {
    const db = await this.dbPromise;

    // 1. Get all transactions linked to this debt
    // We scan all transactions because there is no index on debt_id.
    // Given client-side usage, this is generally acceptable.
    const allTransactions = await this._getAll(db, "transactions");
    const debtTransactions = allTransactions.filter((tx) => tx.debt_id === id);

    // 2. Delete each transaction
    // We use the existing deleteTransaction method to ensure proper balance reversion.
    // We MUST await sequentially to avoid race conditions on account balance updates.
    for (const tx of debtTransactions) {
      await this.deleteTransaction(tx.id);
    }

    // 3. Delete the debt
    await db.delete("debts", id);
  }

  async getGroupedDebts(): Promise<GroupedDebts> {
    const db = await this.dbPromise;
    const debts = await this._getAll(db, "debts");

    debts.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    const delayed_payments = debts.filter(
      (d) => !d.is_settled && !d.deleted_at && d.type === "DELAYED_PAYMENT",
    );
    const loans = debts.filter(
      (d) => !d.is_settled && !d.deleted_at && d.type === "LOAN",
    );
    const passive_debts = debts.filter(
      (d) => !d.is_settled && !d.deleted_at && d.type === "PASSIVE_DEBT",
    );
    const others = debts.filter(
      (d) =>
        !d.is_settled &&
        !d.deleted_at &&
        !["DELAYED_PAYMENT", "LOAN", "PASSIVE_DEBT"].includes(d.type as string),
    );
    const settled = debts.filter((d) => d.is_settled && !d.deleted_at);

    return {
      delayed_payments,
      loans,
      passive_debts,
      others,
      settled,
    };
  }

  async getDebtsSummary(): Promise<DebtSummary[]> {
    const db = await this.dbPromise;
    const debts = await this._getAll(db, "debts");
    const persons = await this._getAll(db, "persons");

    // Filter active debts
    const activeDebts = debts.filter((d) => !d.is_settled && !d.deleted_at);

    const summaryMap = new Map<string, DebtSummary>();

    activeDebts.forEach((debt) => {
      const key = `${debt.creditor_id}-${debt.debtor_id}`;
      if (!summaryMap.has(key)) {
        const creditor = persons.find((p) => p.id === debt.creditor_id);
        const debtor = persons.find((p) => p.id === debt.debtor_id);
        summaryMap.set(key, {
          creditor_id: debt.creditor_id,
          debtor_id: debt.debtor_id,
          creditor_name: creditor
            ? creditor.name
            : debt.creditor_id.substring(0, 8) + "...",
          debtor_name: debtor
            ? debtor.name
            : debt.debtor_id.substring(0, 8) + "...",
          count: 0,
          total_amount: 0,
          types: [],
        });
      }

      const item = summaryMap.get(key)!;
      item.count += 1;
      item.total_amount += debt.remaining_amount;
      if (debt.type && !item.types.includes(debt.type)) {
        item.types.push(debt.type);
      }
    });

    return Array.from(summaryMap.values());
  }

  async getPersons(): Promise<Person[]> {
    const db = await this.dbPromise;
    const persons = await this._getAll(db, "persons");
    const user = await this._get(db, "user", "local-user");

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

    validateInput(newPerson.name, MAX_NAME_LENGTH, "Person Name");
    newPerson.name = sanitizeInput(newPerson.name);

    if (newPerson.contact_info) {
      validateInput(
        newPerson.contact_info,
        MAX_CONTACT_INFO_LENGTH,
        "Contact Info",
      );
      newPerson.contact_info = sanitizeInput(newPerson.contact_info);
    }

    await this._put(db, "persons", newPerson);
    return newPerson;
  }

  async updatePerson(id: string, data: CreatePersonPayload): Promise<Person> {
    const db = await this.dbPromise;
    const person = await this._get(db, "persons", id);
    if (!person) throw new Error("Person not found");
    const updated = {
      ...person,
      name: data.name,
      contact_info: data.contact_info || "",
    };

    validateInput(updated.name, MAX_NAME_LENGTH, "Person Name");
    updated.name = sanitizeInput(updated.name);

    if (updated.contact_info) {
      validateInput(
        updated.contact_info,
        MAX_CONTACT_INFO_LENGTH,
        "Contact Info",
      );
      updated.contact_info = sanitizeInput(updated.contact_info);
    }

    await this._put(db, "persons", updated);
    return updated;
  }

  async deletePerson(id: string): Promise<void> {
    const db = await this.dbPromise;
    // Check for related debts? For now strictly implementing interface.
    // Ideally we should check if person is used in debts.
    // But since this was a "side quest" fixing lints, I will do basic implementation.
    await db.delete("persons", id);
  }

  async getMonthTransactionsByCategory(
    year: number,
    month: number,
  ): Promise<MonthCategorySummary> {
    const db = await this.dbPromise;
    const maps = await this.getAllMaps();

    const targetMonthStr = String(month).padStart(2, "0");
    // Ensure we capture all times for the month
    const startDate = `${year}-${targetMonthStr}-01`;
    const endDate = `${year}-${targetMonthStr}-31T23:59:59`;
    const range = IDBKeyRange.bound(startDate, endDate);

    const txStore = db.transaction("transactions", "readonly").store;
    const index = txStore.index("by-date");

    // Natively fetch only records within the date range
    const encryptedMonthTxs = await index.getAll(range);
    const monthTxs = await Promise.all(
      encryptedMonthTxs.map((tx) => this.decryptRecord(tx)),
    );

    const summary: MonthCategorySummary = {
      month,
      year,
      total_expenses: 0,
      total_income: 0,
      total_transactions: monthTxs.length,
      categories: {},
    };

    const categorySummaryMap: Record<string, CategorySummary> = {};

    for (const tx of monthTxs) {
      const cat = maps.categoryMap.get(tx.category_id);
      if (!cat) continue;

      if (!categorySummaryMap[tx.category_id]) {
        categorySummaryMap[tx.category_id] = {
          category_id: cat.id,
          category_name: cat.name,
          type: cat.type,
          total_amount: 0,
          transaction_count: 0,
          transactions: [],
        };
      }

      const catSum = categorySummaryMap[tx.category_id];
      const hydratedTx = this.hydrateTransaction(tx, maps);

      catSum.transactions.push(hydratedTx);
      catSum.transaction_count += 1;
      catSum.total_amount = roundAmount(catSum.total_amount + tx.amount);

      if (cat.type === "EXPENSE") {
        summary.total_expenses = roundAmount(
          summary.total_expenses + Math.abs(tx.amount),
        );
      } else if (cat.type === "INCOME") {
        summary.total_income = roundAmount(
          summary.total_income + Math.abs(tx.amount),
        );
      }
    }

    summary.categories = categorySummaryMap;
    return summary;
  }

  async getDashboardSummary(): Promise<DashboardData> {
    const db = await this.dbPromise;
    const accounts = await this._getAll(db, "accounts");
    const categories = await this._getAll(db, "categories");
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const balance = accounts.reduce(
      (acc, curr) => acc + curr.current_balance,
      0,
    );

    // Filter for current month using the by-date index natively
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const targetMonthStr = String(currentMonth + 1).padStart(2, "0");
    // Ensure we capture all times for the month
    const startDate = `${currentYear}-${targetMonthStr}-01`;
    const endDate = `${currentYear}-${targetMonthStr}-31T23:59:59`;
    const range = IDBKeyRange.bound(startDate, endDate);

    const txStore = db.transaction("transactions", "readonly").store;
    const index = txStore.index("by-date");

    // Natively fetch only records within the date range
    const encryptedMonthTxs = await index.getAll(range);
    const currentMonthTx = await Promise.all(
      encryptedMonthTxs.map((tx) => this.decryptRecord(tx)),
    );

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
      if (type === "TRANSFER") return;
      const val = Math.abs(t.amount);
      const day = parseLocalDate(t.transaction_date).getDate();

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
    const lastMonthSummary = await this._get(
      db,
      "monthly_summaries",
      lastMonthId,
    );

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
        month: new Date(Date.UTC(currentYear, currentMonth, 2)).toLocaleString(
          "default",
          { month: "long", timeZone: "UTC" },
        ),
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
    const summaries = await this._getAllFromIndex(
      db,
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
    const transactions = await this._getAll(db, "transactions");
    const categories = await this._getAll(db, "categories");
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const currentYear = new Date().getFullYear();

    // 1. Identify all months from transactions
    const monthsSet = new Set<string>();
    transactions.forEach((t) => {
      const d = parseLocalDate(t.transaction_date);
      const year = d.getFullYear();
      if (year >= currentYear) {
        const key = `${year}-${d.getMonth() + 1}`;
        monthsSet.add(key);
      }
    });

    // 2. Identify all months from existing summaries
    const existingSummaries = await this._getAll(db, "monthly_summaries");
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
        const d = parseLocalDate(t.transaction_date);
        return d.getFullYear() === year && d.getMonth() === monthIndex;
      });

      // Calculate totals for the month
      let total_income = 0;
      let total_expense = 0;

      monthTransactions.forEach((t) => {
        const type = catMap.get(t.category_id)?.type;
        if (type === "INCOME")
          total_income = roundAmount(total_income + Math.abs(t.amount));
        if (type === "EXPENSE")
          total_expense = roundAmount(total_expense + Math.abs(t.amount));
      });

      // Calculate Net Flow for this specific month (Income - Expense)
      const closing_balance = roundAmount(total_income - total_expense);

      const summary: MonthlySummary = {
        id: `${year}-${month}`,
        year,
        month,
        month_name: new Date(Date.UTC(year, monthIndex, 2)).toLocaleString(
          "default",
          {
            month: "long",
            timeZone: "UTC",
          },
        ),
        total_income,
        total_expense,
        closing_balance,
      };

      await this._put(db, "monthly_summaries", summary);
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
    const allTransactions = await this._getAll(db, "transactions");
    const monthTransactions = allTransactions.filter((t) => {
      const d = parseLocalDate(t.transaction_date);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    });

    const categories = await this._getAll(db, "categories");
    const catMap = new Map(categories.map((c) => [c.id, c]));

    // 2. Calculate Totals
    let total_income = 0;
    let total_expense = 0;

    monthTransactions.forEach((t) => {
      const type = catMap.get(t.category_id)?.type;
      if (type === "INCOME")
        total_income = roundAmount(total_income + Math.abs(t.amount));
      if (type === "EXPENSE")
        total_expense = roundAmount(total_expense + Math.abs(t.amount));
    });

    // 3. Calculate Net Flow for this specific month (Income - Expense)
    const closing_balance = roundAmount(total_income - total_expense);

    const summary: MonthlySummary = {
      id: `${year}-${month}`,
      year,
      month,
      month_name: new Date(Date.UTC(year, monthIndex, 2)).toLocaleString(
        "default",
        {
          month: "long",
          timeZone: "UTC",
        },
      ),
      total_income,
      total_expense,
      closing_balance,
    };

    await this._put(db, "monthly_summaries", summary);

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
    const users = await this._getAll(db, "user");
    return users.length > 0 ? users[0] : null;
  }

  async createUser(data: CreateUserPayload): Promise<User> {
    const db = await this.dbPromise;

    // Automatically create the user person
    const personName = data.name;
    const userPerson: Person = {
      id: crypto.randomUUID(),
      name: personName,
      contact_info: data.email || "",
      created_at: new Date().toISOString(),
    };
    await this._put(db, "persons", userPerson);

    const newUser: User = {
      id: "local-user",
      name: data.name,
      email: data.email || "",
      base_currency: data.base_currency,
      person_id: userPerson.id,
      created_at: new Date().toISOString(),
    };
    await this._put(db, "user", newUser);

    return newUser;
  }

  async updateUser(
    id: string,
    data: Partial<CreateUserPayload>,
  ): Promise<User> {
    const db = await this.dbPromise;
    const user = await this._get(db, "user", id);
    if (!user) throw new Error("User not found");

    if (data.name !== undefined) user.name = data.name;
    if (data.base_currency !== undefined)
      user.base_currency = data.base_currency;
    if (data.lastBackupDate !== undefined)
      user.lastBackupDate = data.lastBackupDate;

    await this._put(db, "user", user);

    // Update userPerson as well if name changes
    if (data.name !== undefined && user.person_id) {
      const person = await this._get(db, "persons", user.person_id);
      if (person) {
        person.name = data.name;
        await this._put(db, "persons", person);
      }
    }

    return user;
  }

  async getAllData(): Promise<any> {
    const db = await this.dbPromise;
    const transactions = await this._getAll(db, "transactions");
    const categories = await this._getAll(db, "categories");
    const accounts = await this._getAll(db, "accounts");
    const debts = await this._getAll(db, "debts");
    const persons = await this._getAll(db, "persons");
    const savings_goals = await this._getAll(db, "savings_goals");
    const monthly_summaries = await this._getAll(db, "monthly_summaries");
    const user = await this._getAll(db, "user");

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
          const encryptedItem = await this.encryptRecord(item, storeName);
          await store.put(encryptedItem);
        }
      }
    }

    await tx.done;
  }
}
