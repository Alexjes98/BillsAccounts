import { useLLM } from "@/context/LLMContext";
import { ChatInterface } from "@/components/ChatInterface";

export function ChatPage() {
  const { provider } = useLLM();

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto space-y-4 animate-fade-in-up">
      <div className="flex-1 relative">
        <ChatInterface className="h-full" />
      </div>
      {provider === "None" && (
        <div className="text-center text-sm text-destructive">
          You must configure an AI provider and API Key in your Profile settings
          before chatting.
        </div>
      )}
    </div>
  );
}
