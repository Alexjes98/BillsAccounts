import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useChat } from "@/hooks/useChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { History, Plus, Search, ChevronUp, Trash2 } from "lucide-react";

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
  const {
    provider,
    messages,
    input,
    setInput,
    loading,
    handleSend,
    hasMoreMessages,
    loadMoreMessages,
    chatHistory,
    historySearch,
    setHistorySearch,
    loadSession,
    clearSession,
    deleteSession,
    sessionId,
  } = useChat();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <Card className={`flex flex-col shadow-sm ${className}`}>
      <CardHeader className="border-b bg-muted/20 pb-4 relative">
        <CardTitle className="text-lg md:text-xl flex justify-between items-center pr-8">
          <div className="flex items-center gap-2">
            AI Assistant
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full hidden sm:inline-block">
              Provider: {provider}
            </span>
          </div>
          <Button
            variant={isHistoryOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline-block">History</span>
          </Button>
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
        {isHistoryOpen ? (
          <div className="flex flex-col space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search conversations..."
                  className="pl-8"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
              <Button
                onClick={() => {
                  clearSession();
                  setIsHistoryOpen(false);
                }}
                size="icon"
                variant="outline"
                title="New Chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-col gap-2 pb-4">
              {chatHistory.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No conversations found.
                </div>
              ) : (
                chatHistory.map((session) => (
                  <div key={session.id} className="flex gap-2 items-center w-full">
                    <Button
                      variant={session.id === sessionId ? "secondary" : "ghost"}
                      className="justify-start text-left h-auto py-3 flex-1 overflow-hidden"
                      onClick={() => {
                        loadSession(session.id);
                        setIsHistoryOpen(false);
                      }}
                    >
                      <div className="flex flex-col items-start gap-1 w-full overflow-hidden">
                        <span className="font-medium truncate w-full">
                          {session.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.updated_at).toLocaleString()}
                        </span>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Are you sure you want to delete this conversation?")) {
                          deleteSession(session.id);
                        }
                      }}
                      title="Delete Conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            {hasMoreMessages && (
              <div className="flex justify-center mb-4">
                <Button variant="ghost" size="sm" onClick={loadMoreMessages}>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Load previous messages
                </Button>
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground self-end ml-auto"
                    : "bg-muted text-foreground self-start mr-auto"
                }`}
              >
                <div className="text-sm break-words prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-muted-foreground text-sm self-start mr-auto">
                Thinking... (Waiting for {provider})
              </div>
            )}
          </>
        )}
      </CardContent>

      {!isHistoryOpen && (
        <CardFooter className="border-t p-4 flex gap-2 w-full">
          <Input
            type="text"
            className="flex-1"
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
      )}

      {provider === "None" && !isHistoryOpen && (
        <div className="text-center text-xs text-destructive p-2 pb-4">
          Configure an AI provider in Profile settings.
        </div>
      )}
    </Card>
  );
}
