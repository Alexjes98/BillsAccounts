import { useState, useEffect, useCallback } from "react";
import { useLLM } from "@/context/LLMContext";
import { runReActAgent } from "@/lib/agent";
import { IndexedDbRepository } from "@/api/IndexedDbRepository";
import { ChatSession, ChatMessage } from "@/api/repository";

export type Message = ChatMessage;

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

  // Chat History States
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historySearch, setHistorySearch] = useState("");

  // Pagination inside a session
  const [messageLimit, setMessageLimit] = useState(20);

  const fetchChatHistory = useCallback(
    async (page: number = 1, search: string = historySearch) => {
      const repo = IndexedDbRepository.getInstance();
      if (repo.getChatSessions) {
        const res = await repo.getChatSessions(page, search);
        if (page === 1) {
          setChatHistory(res.items);
        } else {
          setChatHistory((prev) => [...prev, ...res.items]);
        }
        setHistoryPage(res.page);
        setHistoryTotalPages(res.pages);
      }
    },
    [historySearch],
  );

  const loadSession = useCallback(async (id: string) => {
    const repo = IndexedDbRepository.getInstance();
    if (repo.getChatSession) {
      const session = await repo.getChatSession(id);
      if (session) {
        setSessionId(session.id);
        setMessages(session.messages);
        setMessageLimit(20);
      }
    }
  }, []);

  const clearSession = useCallback(() => {
    setSessionId(null);
    setMessages([
      {
        role: "assistant",
        content: "Hello! I am your AI assistant. How can I help you today?",
      },
    ]);
    setMessageLimit(20);
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    const repo = IndexedDbRepository.getInstance();
    if (repo.deleteChatSession) {
      await repo.deleteChatSession(id);
      
      // If we are deleting the currently active session, clear it
      setSessionId((currentId) => {
        if (currentId === id) {
          clearSession();
          return null;
        }
        return currentId;
      });

      // Refresh history list
      fetchChatHistory(1, historySearch);
    }
  }, [clearSession, fetchChatHistory, historySearch]);

  const saveSession = async (newMessages: Message[], currentSessionId: string | null) => {
    const repo = IndexedDbRepository.getInstance();
    if (!repo.createChatSession || !repo.updateChatSession) return currentSessionId;

    if (!currentSessionId) {
      // Create new session
      const firstUserMsg = newMessages.find((m) => m.role === "user");
      const title = firstUserMsg
        ? firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? "..." : "")
        : "New Chat";
      const session = await repo.createChatSession(title, newMessages);
      setSessionId(session.id);
      fetchChatHistory(1, historySearch);
      return session.id;
    } else {
      // Update existing session
      await repo.updateChatSession(currentSessionId, newMessages);
      fetchChatHistory(1, historySearch);
      return currentSessionId;
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    if (provider === "None") {
      alert("Please select an LLM provider in your Profile settings first.");
      return;
    }

    const userMessage: Message = { role: "user", content: input };
    const historyMsg = [...messages, userMessage];

    setMessages(historyMsg);
    setInput("");
    setLoading(true);

    // Save user message immediately
    const newSessionId = await saveSession(historyMsg, sessionId);

    try {
      const response = await runReActAgent(provider, apiKey, historyMsg);

      const updatedHistory = [
        ...historyMsg,
        { role: "assistant", content: response } as Message,
      ];
      setMessages(updatedHistory);
      await saveSession(updatedHistory, newSessionId);
    } catch (error: any) {
      console.error(error);
      const updatedHistory = [
        ...historyMsg,
        { role: "assistant", content: `Error: ${error.message}` } as Message,
      ];
      setMessages(updatedHistory);
      await saveSession(updatedHistory, newSessionId);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = () => {
    setMessageLimit((prev) => prev + 20);
  };

  const visibleMessages = messages.slice(-messageLimit);
  const hasMoreMessages = messages.length > messageLimit;

  useEffect(() => {
    fetchChatHistory(1, "");
  }, []);

  return {
    provider,
    messages: visibleMessages,
    hasMoreMessages,
    loadMoreMessages,
    input,
    setInput,
    loading,
    handleSend,
    // History specific
    chatHistory,
    historyPage,
    historyTotalPages,
    historySearch,
    setHistorySearch,
    fetchChatHistory,
    loadSession,
    clearSession,
    deleteSession,
    sessionId,
  };
}
