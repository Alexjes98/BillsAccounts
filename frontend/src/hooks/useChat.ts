import { useState } from "react";
import { useLLM } from "@/context/LLMContext";
import { runReActAgent } from "@/lib/agent";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function useChat() {
  const { provider, apiKey } = useLLM();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your AI assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    if (provider === "None") {
      alert("Please select an LLM provider in your Profile settings first.");
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const historyMsg = [...messages, userMessage];
      const response = await runReActAgent(provider, apiKey, historyMsg);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return {
    provider,
    messages,
    input,
    setInput,
    loading,
    handleSend,
  };
}
