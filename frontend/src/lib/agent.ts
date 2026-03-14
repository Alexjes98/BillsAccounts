import { LLMProviderType } from "@/context/LLMContext";
import { Message } from "@/hooks/useChat";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph/web";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { llmFactory } from "./LLMFactory";
import {
  createSearchMovementsTool,
  createGetCategoriesTool,
  createGetAppInfoTool,
  createGetMonthCategorySummaryTool,
  createPrepareTransactionTool,
  createCreateTransactionTool,
} from "./tools";

const getSystemPrompt = (tools: string[]) => {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
You are a financial AI agent.
The current date is ${currentDate}.
You have tools available to search the local database for financial transactions.
You have access to the following tools: ${tools.join(", ")}.
These tools allow you to search for financial transactions, fetch category mappings, and get app information. Use them to answer the user's question the best you can.
If you don't have the answer, say so.
Always be helpful, concise, and provide financial insights when possible.
`.trim();
};

/**
 * Shared ReAct graph runner used by every cloud provider (Gemini, OpenAI, Anthropic).
 * The only thing that varies per provider is the `llm` instance passed in.
 */
async function runReActGraph(llm: any, messages: Message[]): Promise<string> {
  const searchMovementsTool = createSearchMovementsTool();
  const getCategoriesTool = createGetCategoriesTool();
  const getAppInfo = createGetAppInfoTool();
  const getMonthCategorySummaryTool = createGetMonthCategorySummaryTool();
  const prepareTransactionTool = createPrepareTransactionTool();
  const createTransactionTool = createCreateTransactionTool();
  const tools = [
    searchMovementsTool,
    getCategoriesTool,
    getAppInfo,
    getMonthCategorySummaryTool,
    prepareTransactionTool,
    createTransactionTool,
  ];

  const toolNode = new ToolNode(tools);

  const callModel = async (state: typeof MessagesAnnotation.State) => {
    const modelWithTools = llm.bindTools(tools);
    const response = await modelWithTools.invoke(state.messages);
    return { messages: [response] };
  };

  const shouldContinue = (state: typeof MessagesAnnotation.State) => {
    const msgs = state.messages;
    const lastMessage = msgs[msgs.length - 1] as AIMessage;

    if (!lastMessage.tool_calls?.length) {
      return "__end__";
    }
    return "tools";
  };

  // Reflection node: guides the agent to recover from tool errors
  const reflectionNode = async (state: typeof MessagesAnnotation.State) => {
    const msgs = state.messages;
    const lastMessage = msgs[msgs.length - 1];

    if (
      typeof lastMessage.content === "string" &&
      (lastMessage.content.includes("Failed to prepare") ||
        lastMessage.content.includes("Failed to create") ||
        lastMessage.content.includes("Error"))
    ) {
      return {
        messages: [
          new SystemMessage(
            "The previous tool call failed or returned an error. Please carefully review the error message. " +
              "Reflect on what went wrong (e.g., did you use a category name instead of a category UUID?). " +
              "Make sure you have used the correct IDs (use get_categories to find correct UUIDs). " +
              "Try the tool call again with corrected parameters.",
          ),
        ],
      };
    }

    return { messages: [] };
  };

  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addNode("reflection", reflectionNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "reflection")
    .addEdge("reflection", "agent");

  const app = workflow.compile();

  const formattedMessages = messages.map((msg) =>
    msg.role === "user"
      ? new HumanMessage(msg.content)
      : new AIMessage(msg.content),
  );

  const agentState = await app.invoke({
    messages: [
      new SystemMessage(
        getSystemPrompt([
          searchMovementsTool.name,
          getCategoriesTool.name,
          getAppInfo.name,
          getMonthCategorySummaryTool.name,
          prepareTransactionTool.name,
          createTransactionTool.name,
        ]),
      ),
      ...formattedMessages,
    ],
  });

  const lastMsg = agentState.messages[agentState.messages.length - 1];
  return (lastMsg.content as string) || "I'm sorry, I couldn't process that request.";
}

export async function runReActAgent(
  provider: LLMProviderType,
  apiKey: string,
  messages: Message[],
): Promise<string> {
  if (provider !== "WebLLM" && provider !== "Ollama" && !apiKey) {
    throw new Error(`API Key is missing for provider: ${provider}`);
  }

  switch (provider) {
    case "Gemini":
    case "OpenAI":
    case "Anthropic":
    case "DeepSeek":
    case "Ollama": {
      try {
        const llm = llmFactory.getModel(provider, apiKey);
        return await runReActGraph(llm, messages);
      } catch (error: any) {
        console.error("LangGraph Agent Error:", error);
        throw new Error(`Agent execution failed: ${error.message}`);
      }
    }

    case "WebLLM":
      return "WebLLM is not yet supported in this agent.";

    default:
      return "Unsupported provider selected.";
  }
}
