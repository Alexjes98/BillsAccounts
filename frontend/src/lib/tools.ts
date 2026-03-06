import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { IndexedDbRepository } from "@/api/IndexedDbRepository";

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
