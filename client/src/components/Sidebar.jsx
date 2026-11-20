import { useState } from "react";
import {
  Bot,
  Check,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from "lucide-react";

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onOpenSettings,
  user,
  onLogout,
  isOpen,
  onCloseMobile,
  darkMode,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (e, chat) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const submitRename = (e, chatId) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 flex flex-col border-r transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:hidden"
        } ${
          darkMode
            ? "bg-[#171717] border-white/10 text-gray-100"
            : "bg-gray-50 border-gray-200 text-gray-900"
        }`}
      >
        {/* Top Header */}
        <div className="p-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className={`flex-1 flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition cursor-pointer ${
              darkMode
                ? "border-white/10 hover:bg-white/5"
                : "border-gray-300 hover:bg-gray-200/60"
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#10a37f] flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="flex-1 text-left">New Chat</span>
            <Plus className="w-4 h-4 opacity-70" />
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-lg hover:bg-gray-500/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pb-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${
              darkMode
                ? "bg-[#212121] border-white/10"
                : "bg-white border-gray-300"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-transparent focus:outline-none py-0.5"
            />
          </div>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
          {filteredChats.length === 0 ? (
            <p className="text-xs text-center text-gray-500 py-8">
              No conversations yet
            </p>
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    onSelectChat(chat.id);
                    onCloseMobile();
                  }}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition ${
                    isActive
                      ? darkMode
                        ? "bg-[#2f2f2f] text-white"
                        : "bg-gray-200 text-black font-medium"
                      : darkMode
                      ? "hover:bg-[#212121] text-gray-300"
                      : "hover:bg-gray-200/60 text-gray-700"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />

                  {editingId === chat.id ? (
                    <div
                      className="flex items-center gap-1 flex-1 min-w-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitRename(e, chat.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-full bg-black/20 px-1.5 py-0.5 rounded text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={(e) => submitRename(e, chat.id)}
                        className="p-1 text-[#10a37f] hover:bg-white/10 rounded"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-[13px]">
                        {chat.title}
                      </span>
                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => startRename(e, chat)}
                          title="Rename"
                          className="p-1 rounded hover:bg-gray-500/25 text-gray-400 hover:text-white cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                          }}
                          title="Delete"
                          className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom User & Settings Bar */}
        <div
          className={`p-3 border-t space-y-1 ${
            darkMode ? "border-white/10" : "border-gray-200"
          }`}
        >
          <button
            type="button"
            onClick={onOpenSettings}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition cursor-pointer ${
              darkMode ? "hover:bg-white/5" : "hover:bg-gray-200/70"
            }`}
          >
            <Settings className="w-4 h-4 opacity-75" />
            <span>Settings & Model</span>
          </button>

          <div className="flex items-center justify-between px-3 py-2 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || "F"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{user?.name}</p>
                <p className="text-[11px] text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Log out"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}