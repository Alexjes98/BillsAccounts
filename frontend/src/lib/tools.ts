import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { IndexedDbRepository } from "@/api/IndexedDbRepository";

export const createSearchMovementsTool = () => {
  return tool(
    async ({ query }) => {
      try {
        console.log("Searching for movements with query:", query);
        const repo = IndexedDbRepository.getInstance();
        const results = await repo.getTransactions({
          search: query,
          per_page: 50,
        });
        console.log("TOOL results", results);
        return JSON.stringify(results.items);
      } catch (error) {
        console.error("Error searching movements:", error);
        return "Failed to search transactions. Please try again.";
      }
    },
    {
      name: "search_movements",
      description:
        "Search the IndexedDB repository for financial transactions (movements). Use this when the user asks about their spending, income, or specific purchases.",
      schema: z.object({
        query: z
          .string()
          .describe(
            "The search term to query transactions with. E.g., 'food', 'rent', or 'finestra restaurant'. Matches if ANY word is present.",
          ),
      }),
    },
  );
};
