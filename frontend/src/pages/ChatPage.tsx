import { useState } from "react";
import { useLLM } from "@/context/LLMContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { runReActAgent } from "@/lib/agent";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ChatPage() {
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
      // Basic skeleton of ReAct loop invocation.
      // We pass the conversation history and the user's new message.
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

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto space-y-4">
      <Card className="flex flex-col flex-1 shadow-sm">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="text-xl flex justify-between items-center">
            AI Assistant
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
              Provider: {provider}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col max-w-[80%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground self-end ml-auto"
                  : "bg-muted text-foreground self-start mr-auto"
              }`}
            >
              <div className="text-sm">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="text-muted-foreground text-sm self-start mr-auto">
              Thinking... (Waiting for {provider})
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t p-4 flex gap-2">
          <input
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) {
                handleSend();
              }
            }}
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            Send
          </Button>
        </CardFooter>
      </Card>

      {provider === "None" && (
        <div className="text-center text-sm text-destructive">
          You must configure an AI provider and API Key in your Profile settings
          before chatting.
        </div>
      )}
    </div>
  );
}
