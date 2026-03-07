import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

interface ChatInterfaceProps {
  className?: string;
  isWidget?: boolean;
  onClose?: () => void;
}

export function ChatInterface({
  className = "",
  isWidget = false,
  onClose,
}: ChatInterfaceProps) {
  const { provider, messages, input, setInput, loading, handleSend } =
    useChat();

  return (
    <Card className={`flex flex-col shadow-sm ${className}`}>
      <CardHeader className="border-b bg-muted/20 pb-4 relative">
        <CardTitle className="text-xl flex justify-between items-center">
          AI Assistant
          <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full">
            Provider: {provider}
          </span>
        </CardTitle>
        {isWidget && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Close Chat"
          >
            ✕
          </button>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[60vh] md:max-h-full">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col max-w-[80%] rounded-lg p-3 ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground self-end ml-auto"
                : "bg-muted text-foreground self-start mr-auto"
            }`}
          >
            <div className="text-sm break-words whitespace-pre-wrap">
              {msg.content}
            </div>
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
      {provider === "None" && (
        <div className="text-center text-xs text-destructive p-2 pb-4">
          Configure an AI provider in Profile settings.
        </div>
      )}
    </Card>
  );
}
