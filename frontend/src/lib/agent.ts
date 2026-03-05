import { LLMProviderType } from "@/context/LLMContext";
import { Message } from "@/pages/ChatPage";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph/web";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { llmFactory } from "./LLMFactory";
import { createSearchMovementsTool } from "./tools";

const getSystemPrompt = (toolName: string) =>
  `
You are a financial AI agent.
You have tools available to search the local database for financial transactions.
You have access to the following tools: ${toolName}.
That allows you to search for financial transactions. Use it and answer the user's question the best you can.
If you don't have the answer, say so.
Always be helpful, concise, and provide financial insights when possible.
`.trim();

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
        const tools = [searchMovementsTool];
        const toolNode = new ToolNode(tools);

        const callModel = async (state: typeof MessagesAnnotation.State) => {
          const modelWithTools = llm.bindTools(tools);
          const response = await modelWithTools.invoke(state.messages);
          console.log("response", response);
          return { messages: [response] };
        };

        const shouldContinue = (state: typeof MessagesAnnotation.State) => {
          const messages = state.messages;
          const lastMessage = messages[messages.length - 1] as AIMessage;
          console.log("lastMessage", lastMessage);

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
            new SystemMessage(getSystemPrompt(searchMovementsTool.name)),
            ...formattedMessages,
          ],
        });

        console.log("agentState", agentState);

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
