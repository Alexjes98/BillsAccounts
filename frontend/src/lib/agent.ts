import { LLMProviderType } from "@/context/LLMContext";
import { Message } from "@/pages/ChatPage";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { IndexedDbRepository } from "@/api/IndexedDbRepository";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

const systemPrompt = `
You are a local-first financial AI agent.
You have tools available to search the local database for financial transactions.
Use the tools when the user asks questions about their spending, income, or specific transactions.
Always be helpful, concise, and provide financial insights when possible.
`.trim();

const searchMovementsTool = tool(
  async ({ query }) => {
    try {
      const repo = new IndexedDbRepository();
      const results = await repo.getTransactions({
        search: query,
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
      "Search the IndexedDB repository for financial transactions (movements). Use this when the user asks about their spending, income, or specific purchases.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "The search term to query transactions with, e.g., 'food', 'rent', or a merchant name.",
        ),
    }),
  },
);

export async function runReActAgent(
  provider: LLMProviderType,
  apiKey: string,
  messages: Message[],
): Promise<string> {
  if (provider !== "WebLLM" && !apiKey) {
    throw new Error(`API Key is missing for provider: ${provider}`);
  }

  const userQuery = messages[messages.length - 1].content;
  let llmResponse = "";

  switch (provider) {
    case "Gemini":
      try {
        const llm = new ChatGoogleGenerativeAI({
          apiKey: apiKey,
          model: "gemini-2.5-flash",
        });

        const agent = createReactAgent({
          llm,
          tools: [searchMovementsTool],
        });

        const formattedMessages = messages.map((msg) =>
          msg.role === "user"
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content),
        );

        const agentState = await agent.invoke({
          messages: [new SystemMessage(systemPrompt), ...formattedMessages],
        });

        const lastMessage = agentState.messages[agentState.messages.length - 1];
        llmResponse =
          (lastMessage.content as string) ||
          "I'm sorry, I couldn't process that request.";
      } catch (error: any) {
        console.error("LangGraph Agent Error:", error);
        throw new Error(`Agent execution failed: ${error.message}`);
      }
      break;

    case "OpenAI":
      llmResponse = `[Mock OpenAI] I see you said: "${userQuery}". You would need to implement the fetch inside lib/agent.ts`;
      break;

    case "Anthropic":
      llmResponse = `[Mock Anthropic] Message received: "${userQuery}". Implement fetch inside lib/agent.ts`;
      break;

    case "WebLLM":
      llmResponse = `[Mock WebLLM] Local inference would run here via MLCEngine. Try saying: "${userQuery}" after you implement the setup!`;
      break;

    default:
      llmResponse = "Unsupported provider selected.";
      break;
  }

  return llmResponse;
}
