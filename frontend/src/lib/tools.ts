import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { IndexedDbRepository } from "@/api/IndexedDbRepository";
import { profile } from "console";

export const createSearchMovementsTool = () => {
  return tool(
    async ({ query, category_id, account_id, start_date, end_date, type }) => {
      try {
        const repo = IndexedDbRepository.getInstance();
        const results = await repo.getTransactions({
          search: query,
          category_id,
          account_id,
          start_date,
          end_date,
          type,
          per_page: 50,
        });
        return JSON.stringify(results.items);
      } catch (error) {
        console.error("Error searching movements:", error);
        return "Failed to search transactions. Please try again.";
      }
    },
    {
      name: "search_movements",
      description:
        "Search the IndexedDB repository for financial transactions (movements). Use this when the user asks about their spending, income, or specific purchases. You can filter by search term, category, account, dates, and type.",
      schema: z.object({
        query: z
          .string()
          .optional()
          .describe(
            "The search term to query transactions with. E.g., 'food', 'rent'. Matches if ANY word is present.",
          ),
        category_id: z
          .string()
          .optional()
          .describe(
            "Filter by a specific category ID. Use the get_categories tool to find category IDs.",
          ),
        account_id: z
          .string()
          .optional()
          .describe("Filter by a specific account ID."),
        start_date: z
          .string()
          .optional()
          .describe(
            "Filter transactions starting from this date (YYYY-MM-DD).",
          ),
        end_date: z
          .string()
          .optional()
          .describe("Filter transactions up to this date (YYYY-MM-DD)."),
        type: z
          .string()
          .optional()
          .describe("Filter by transaction type, e.g., 'EXPENSE' or 'INCOME'."),
      }),
    },
  );
};

export const createGetCategoriesTool = () => {
  return tool(
    async () => {
      try {
        const repo = IndexedDbRepository.getInstance();
        const categories = await repo.getCategories();
        return JSON.stringify(categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        return "Failed to fetch categories. Please try again.";
      }
    },
    {
      name: "get_categories",
      description:
        "Get a list of all available categories. Use this to find category IDs context to filter transactions when using the search_movements tool.",
      schema: z.object({}),
    },
  );
};

export const createGetAppInfoTool = () => {
  return tool(
    () => {
      return `
      AppInfo: The finance app is builded so the user should first populate the common persons he interacts with everyday, some common expenses and income categories and create some accounts, The accounts should represent real accounts the user has, e.g. bank account, credit card, cash, etc. The categories should represent real categories the user has, e.g. food, rent, salary, etc. The persons should represent real persons the user has, e.g. family, friends, colleagues, etc.
      Dashboard: Get a quick overview of your finances here. Contains an account general balance, and actual month balance, expenses and incomes.
      Transactions: View and manage all your income and expenses. You can filter by search term, category, account, dates, and type.
      Manage: Organize your accounts, categories, and people here. Containes information about accounts, categories and people. Should be populated before the transactions because they are linked to them.
      Insights: Analyze your financial trends and summaries over time. Contains a monthly resume with common transactions by category, and a list of transactions sorted by category and a Yearly resume with the general balance for each month of the year
      Assistant: Chat with your AI financial assistant for personalized help.
      Profile: Manage your profile and settings. Contains information about your profile and settings.`;
    },
    {
      name: "get_app_info",
      description:
        "Provide a user guide for the application. Use this when the user ask questions related on how to do something or has question of some page in particular e.g ",
      schema: z.string(),
    },
  );
};
