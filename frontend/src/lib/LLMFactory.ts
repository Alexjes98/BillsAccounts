import { LLMProviderType } from "@/context/LLMContext";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatDeepSeek } from "@langchain/deepseek";

class LLMFactory {
  private static instance: LLMFactory;

  private currentModel: any = null;
  private currentProvider: LLMProviderType | null = null;
  private currentApiKey: string | null = null;

  private constructor() {}

  public static getInstance(): LLMFactory {
    if (!LLMFactory.instance) {
      LLMFactory.instance = new LLMFactory();
    }
    return LLMFactory.instance;
  }

  public getModel(provider: LLMProviderType, apiKey: string) {
    if (
      this.currentModel &&
      this.currentProvider === provider &&
      this.currentApiKey === apiKey
    ) {
      return this.currentModel;
    }

    let model: any = null;

    switch (provider) {
      case "Gemini":
        model = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          apiKey: apiKey,
          maxRetries: 2,
          temperature: 1.0,
        });
        break;

      case "OpenAI":
        model = new ChatOpenAI({
          model: "gpt-4o",
          apiKey: apiKey,
          maxRetries: 2,
          temperature: 1.0,
        });
        break;

      case "Anthropic":
        model = new ChatAnthropic({
          model: "claude-opus-4-5",
          apiKey: apiKey,
          maxRetries: 2,
          temperature: 1.0,
        });
        break;

      case "DeepSeek":
        model = new ChatDeepSeek({
          model: "deepseek-chat",
          apiKey: apiKey,
          maxRetries: 2,
          temperature: 1.0,
        });
        break;
    }

    this.currentModel = model;
    this.currentProvider = provider;
    this.currentApiKey = apiKey;

    return model;
  }
}

export const llmFactory = LLMFactory.getInstance();
