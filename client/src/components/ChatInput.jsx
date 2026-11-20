import { useRef, useState } from "react";
import {
  ArrowUp,
  FileText,
  Mic,
  MicOff,
  Paperclip,
  Square,
  X,
} from "lucide-react";

export default function ChatInput({
  onSend,
  onStop,
  isStreaming,
  darkMode,
}) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (isStreaming) return;
    if (!input.trim() && attachments.length === 0) return;

    onSend(input.trim(), attachments);
    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setAttachments((prev) => [
            ...prev,
            { type: "image", name: file.name, dataUrl: reader.result },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        setAttachments((prev) => [
          ...prev,
          { type: "text", name: file.name, content: text.slice(0, 30000) },
        ]);
      }
    }
    e.target.value = "";
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setTimeout(adjustHeight, 10);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pb-4">
      <form
        onSubmit={handleSubmit}
        className={`rounded-3xl border shadow-lg transition ${
          darkMode
            ? "bg-[#2f2f2f] border-white/10"
            : "bg-white border-gray-300"
        }`}
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs border ${
                  darkMode
                    ? "bg-[#212121] border-white/10"
                    : "bg-gray-100 border-gray-300"
                }`}
              >
                {att.type === "image" ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <FileText className="w-4 h-4 text-[#10a37f]" />
                )}
                <span className="max-w-[130px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="p-0.5 rounded-full hover:bg-gray-500/30 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 px-3 py-2.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.txt,.md,.js,.jsx,.ts,.tsx,.py,.json,.csv,.html,.css"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file or image"
            className="p-2 rounded-full hover:bg-gray-500/20 text-gray-400 hover:text-gray-200 transition cursor-pointer shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Message Fardin AI..."
            className="flex-1 bg-transparent resize-none max-h-[180px] py-2 text-[15px] focus:outline-none"
          />

          <button
            type="button"
            onClick={toggleVoiceInput}
            title="Voice input"
            className={`p-2 rounded-full transition cursor-pointer shrink-0 ${
              isListening
                ? "bg-red-500/20 text-red-400 animate-pulse"
                : "hover:bg-gray-500/20 text-gray-400 hover:text-gray-200"
            }`}
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop generating"
              className="p-2.5 rounded-full bg-white text-black hover:bg-gray-200 transition cursor-pointer shrink-0"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && attachments.length === 0}
              title="Send message"
              className={`p-2.5 rounded-full transition shrink-0 ${
                input.trim() || attachments.length > 0
                  ? "bg-white text-black hover:bg-gray-200 cursor-pointer"
                  : "bg-gray-500/30 text-gray-400 cursor-not-allowed"
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </form>

      <p className="text-[11px] text-center text-gray-500 mt-2">
        Fardin AI Chatbot can make mistakes. Verify important information.
      </p>
    </div>
  );
}