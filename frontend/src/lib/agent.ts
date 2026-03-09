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

export async function runReActAgent(
  provider: LLMProviderType,
  apiKey: string,
  messages: Message[],
): Promise<string> {
  if (provider !== "WebLLM" && !apiKey) {
    throw new Error(`API Key is missing for provider: ${provider}`);
  }

  let llmResponse = "";

  switch (provider) {
    case "Gemini":
      try {
        const llm = llmFactory.getModel(provider, apiKey);

        const searchMovementsTool = createSearchMovementsTool();
        const getCategoriesTool = createGetCategoriesTool();
        const getAppInfo = createGetAppInfoTool();
        const getMonthCategorySummaryTool = createGetMonthCategorySummaryTool();
        const tools = [
          searchMovementsTool,
          getCategoriesTool,
          getAppInfo,
          getMonthCategorySummaryTool,
        ];
        const toolNode = new ToolNode(tools);

        const callModel = async (state: typeof MessagesAnnotation.State) => {
          const modelWithTools = llm.bindTools(tools);
          const response = await modelWithTools.invoke(state.messages);
          return { messages: [response] };
        };

        const shouldContinue = (state: typeof MessagesAnnotation.State) => {
          const messages = state.messages;
          const lastMessage = messages[messages.length - 1] as AIMessage;

          if (lastMessage.tool_calls?.length) {
            return "tools";
          }
          return "__end__";
        };

        const workflow = new StateGraph(MessagesAnnotation)
          .addNode("agent", callModel)
          .addNode("tools", toolNode)
          .addEdge("__start__", "agent")
          .addConditionalEdges("agent", shouldContinue)
          .addEdge("tools", "agent");

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
              ]),
            ),
            ...formattedMessages,
          ],
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
      llmResponse = `Not implemented`;
      break;

    case "Anthropic":
      llmResponse = `Not implemented`;
      break;
    case "WebLLM":
      llmResponse = `Not implemented`;
      break;
    default:
      llmResponse = "Unsupported provider selected.";
      break;
  }

  return llmResponse;
}
