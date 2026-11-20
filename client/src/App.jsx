import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Code2,
  Lightbulb,
  Menu,
  PanelLeft,
  Sparkles,
  Terminal,
} from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import MessageBubble from "./components/MessageBubble";
import ChatInput from "./components/ChatInput";
import SettingsModal from "./components/SettingsModal";

const SUGGESTED_PROMPTS = [
  {
    icon: Code2,
    title: "Build a React component",
    prompt: "Write a clean, reusable React modal component using Tailwind CSS.",
  },
  {
    icon: Lightbulb,
    title: "Explain a concept",
    prompt: "Explain how JWT authentication works in simple terms with an example.",
  },
  {
    icon: Terminal,
    title: "Debug my code",
    prompt: "What are the most common mistakes in async/await JavaScript code?",
  },
  {
    icon: Sparkles,
    title: "Productivity boost",
    prompt: "Create a 7-day study roadmap to master Full-Stack Web Development.",
  },
];

function ChatWorkspace() {
  const { user, token, logout } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorBanner, setErrorBanner] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("fardin_ai_theme") !== "light"
  );
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("fardin_ai_settings");
      return saved
        ? JSON.parse(saved)
        : { model: "", systemPrompt: "", temperature: 0.7 };
    } catch {
      return { model: "", systemPrompt: "", temperature: 0.7 };
    }
  });

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("fardin_ai_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem("fardin_ai_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats);
      }
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [token]);

  const handleSelectChat = async (chatId) => {
    if (isStreaming) return;
    setErrorBanner("");
    setActiveChatId(chatId);
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.chat.messages || []);
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    }
  };

  const handleNewChat = () => {
    if (isStreaming) abortControllerRef.current?.abort();
    setActiveChatId(null);
    setMessages([]);
    setErrorBanner("");
  };

  const handleRenameChat = async (chatId, newTitle) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, title: newTitle } : c))
        );
      }
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  const handleDeleteChat = async (chatId) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleClearAllChats = async () => {
    try {
      const res = await fetch("/api/chats", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setChats([]);
        setActiveChatId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Clear all failed:", err);
    }
  };

  const streamCompletion = async ({
    message = "",
    attachments = [],
    regenerate = false,
    editMessageId = null,
  }) => {
    setErrorBanner("");
    setIsStreaming(true);

    const tempAssistantId = `temp-assistant-${Date.now()}`;

    if (regenerate) {
      setMessages((prev) => {
        const cleaned =
          prev.length > 0 && prev[prev.length - 1].role === "assistant"
            ? prev.slice(0, -1)
            : prev;
        return [...cleaned, { id: tempAssistantId, role: "assistant", content: "" }];
      });
    } else if (editMessageId) {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === editMessageId);
        const sliced = idx !== -1 ? prev.slice(0, idx + 1) : prev;
        const updated = sliced.map((m) =>
          m.id === editMessageId ? { ...m, content: message } : m
        );
        return [...updated, { id: tempAssistantId, role: "assistant", content: "" }];
      });
    } else {
      const tempUserMsg = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content: message,
        attachments,
      };
      setMessages((prev) => [
        ...prev,
        tempUserMsg,
        { id: tempAssistantId, role: "assistant", content: "" },
      ]);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId: activeChatId,
          message,
          attachments,
          regenerate,
          editMessageId,
          model: settings.model,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to connect to AI stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let activeAssistantId = tempAssistantId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          const event = JSON.parse(jsonStr);

          if (event.type === "meta") {
            setActiveChatId(event.chatId);
            activeAssistantId = event.assistantMessageId;
            setMessages([
              ...event.messages,
              { id: activeAssistantId, role: "assistant", content: "" },
            ]);
            fetchChats();
          } else if (event.type === "delta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === activeAssistantId
                  ? { ...m, content: m.content + event.content }
                  : m
              )
            );
          } else if (event.type === "error") {
            setErrorBanner(event.error);
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setErrorBanner(err.message);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
      fetchChats();
    }
  };

  const handleStopStreaming = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const lastAssistantIndex = [...messages]
    .reverse()
    .findIndex((m) => m.role === "assistant");
  const actualLastAssistantIdx =
    lastAssistantIndex === -1 ? -1 : messages.length - 1 - lastAssistantIndex;

  return (
    <div
      className={`flex h-screen overflow-hidden ${
        darkMode ? "bg-[#212121] text-gray-100" : "bg-white text-gray-900"
      }`}
    >
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onOpenSettings={() => setSettingsOpen(true)}
        user={user}
        onLogout={logout}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        darkMode={darkMode}
      />

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar */}
        <header className="h-14 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              title="Toggle sidebar"
              className="p-2 rounded-lg hover:bg-gray-500/20 transition cursor-pointer"
            >
              <PanelLeft className="w-5 h-5 hidden md:block" />
              <Menu className="w-5 h-5 md:hidden" />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight">
                Fardin AI Chatbot
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#10a37f]/15 text-[#10a37f] font-medium">
                {settings.model || "Auto Model"}
              </span>
            </div>
          </div>
        </header>

        {/* Error Alert */}
        {errorBanner && (
          <div className="max-w-3xl mx-auto w-full px-4 mb-2">
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex justify-between items-center">
              <span>{errorBanner}</span>
              <button
                type="button"
                onClick={() => setErrorBanner("")}
                className="underline ml-3 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Messages or Welcome View */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6">
          {messages.length === 0 ? (
            <div className="h-full max-w-3xl mx-auto flex flex-col items-center justify-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-[#10a37f] flex items-center justify-center mb-5 shadow-lg shadow-[#10a37f]/25">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-2">
                How can I help you today?
              </h2>
              <p className="text-sm text-gray-400 text-center mb-8">
                Ask anything, upload code or images, or pick a prompt below.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {SUGGESTED_PROMPTS.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => streamCompletion({ message: item.prompt })}
                      className={`text-left p-4 rounded-2xl border transition cursor-pointer ${
                        darkMode
                          ? "bg-[#2f2f2f]/60 border-white/10 hover:bg-[#2f2f2f]"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className="w-4 h-4 text-[#10a37f]" />
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">
                        {item.prompt}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-4">
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLastAssistant={idx === actualLastAssistantIdx}
                  isStreaming={isStreaming && idx === messages.length - 1}
                  darkMode={darkMode}
                  onRegenerate={() => streamCompletion({ regenerate: true })}
                  onEditMessage={(id, newText) =>
                    streamCompletion({ message: newText, editMessageId: id })
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Input Area */}
        <ChatInput
          onSend={(message, attachments) =>
            streamCompletion({ message, attachments })
          }
          onStop={handleStopStreaming}
          isStreaming={isStreaming}
          darkMode={darkMode}
        />
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onClearAllChats={handleClearAllChats}
      />
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#171717] text-gray-300 text-sm">
        Loading Fardin AI Chatbot...
      </div>
    );
  }

  return user ? <ChatWorkspace /> : <AuthScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}