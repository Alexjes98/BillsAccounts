import { LLMProviderType } from "@/context/LLMContext";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

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
      // Add other providers here in the future
    }

    this.currentModel = model;
    this.currentProvider = provider;
    this.currentApiKey = apiKey;

    return model;
  }
}

export const llmFactory = LLMFactory.getInstance();
