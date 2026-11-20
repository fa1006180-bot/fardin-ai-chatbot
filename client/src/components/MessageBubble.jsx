import { useState } from "react";
import {
  Bot,
  Check,
  Copy,
  FileText,
  Pencil,
  RotateCcw,
  User,
} from "lucide-react";
import MarkdownRenderer from "./MarkdownRenderer";

export default function MessageBubble({
  message,
  isLastAssistant,
  isStreaming,
  darkMode,
  onRegenerate,
  onEditMessage,
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (!editValue.trim()) return;
    setIsEditing(false);
    onEditMessage(message.id, editValue.trim());
  };

  if (isUser) {
    return (
      <div className="group flex justify-end mb-6">
        <div className="max-w-[85%] md:max-w-[75%] flex flex-col items-end">
          {message.attachments?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 justify-end">
              {message.attachments.map((att, idx) =>
                att.type === "image" ? (
                  <img
                    key={idx}
                    src={att.dataUrl}
                    alt={att.name}
                    className="max-h-52 rounded-xl border border-white/10 object-cover"
                  />
                ) : (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border ${
                      darkMode
                        ? "bg-[#2f2f2f] border-white/10 text-gray-200"
                        : "bg-gray-100 border-gray-300 text-gray-800"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-[#10a37f]" />
                    <span>{att.name}</span>
                  </div>
                )
              )}
            </div>
          )}

          {isEditing ? (
            <div
              className={`w-full min-w-[280px] sm:min-w-[420px] rounded-2xl p-3 border ${
                darkMode
                  ? "bg-[#2f2f2f] border-white/15"
                  : "bg-gray-100 border-gray-300"
              }`}
            >
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={3}
                className="w-full bg-transparent text-sm focus:outline-none resize-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditValue(message.content);
                  }}
                  className="px-3 py-1 text-xs rounded-lg bg-gray-500/20 hover:bg-gray-500/30 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1 text-xs rounded-lg bg-[#10a37f] text-white hover:bg-[#0e906f] cursor-pointer"
                >
                  Save & Submit
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              {!isStreaming && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  title="Edit message"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-gray-500/20 transition mt-1 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
              <div
                className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                  darkMode
                    ? "bg-[#2f2f2f] text-gray-100"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {message.content}
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3 sm:gap-4 mb-6">
      <div className="w-8 h-8 rounded-full bg-[#10a37f] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        <Bot className="w-4 h-4 text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold mb-1 opacity-75">Fardin AI</div>

        {message.content ? (
          <MarkdownRenderer content={message.content} />
        ) : (
          <div className="flex items-center gap-1.5 py-2">
            <span className="w-2 h-2 rounded-full bg-[#10a37f] animate-bounce" />
            <span
              className="w-2 h-2 rounded-full bg-[#10a37f] animate-bounce"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-[#10a37f] animate-bounce"
              style={{ animationDelay: "0.3s" }}
            />
          </div>
        )}

        {!isStreaming && message.content && (
          <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy response"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-500/15 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10a37f]" />
                  <span className="text-[#10a37f]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {isLastAssistant && (
              <button
                type="button"
                onClick={onRegenerate}
                title="Regenerate response"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-500/15 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}