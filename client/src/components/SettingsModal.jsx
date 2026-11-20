import { Moon, Sun, Trash2, X } from "lucide-react";

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  darkMode,
  onToggleDarkMode,
  onClearAllChats,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl ${
          darkMode
            ? "bg-[#212121] border-white/10 text-gray-100"
            : "bg-white border-gray-200 text-gray-900"
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Fardin AI Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-500/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Theme Switch */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Appearance</p>
              <p className="text-xs text-gray-400">
                Switch between Dark and Light mode
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                darkMode
                  ? "bg-[#2f2f2f] border-white/10"
                  : "bg-gray-100 border-gray-300"
              }`}
            >
              {darkMode ? (
                <>
                  <Moon className="w-4 h-4 text-[#10a37f]" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Light Mode</span>
                </>
              )}
            </button>
          </div>

          {/* Model Override */}
          <div>
            <label className="block text-sm font-medium mb-1">
              AI Model Name (Optional Override)
            </label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) =>
                onSaveSettings({ ...settings, model: e.target.value })
              }
              placeholder="Leave blank to use server default (.env)"
              className={`w-full px-3.5 py-2 rounded-xl text-sm border focus:outline-none focus:border-[#10a37f] ${
                darkMode
                  ? "bg-[#2f2f2f] border-white/10"
                  : "bg-gray-50 border-gray-300"
              }`}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Examples: gemini-2.5-flash, llama-3.3-70b-versatile, gpt-4o-mini
            </p>
          </div>

          {/* Custom System Prompt */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Custom Instructions (System Prompt)
            </label>
            <textarea
              rows={3}
              value={settings.systemPrompt}
              onChange={(e) =>
                onSaveSettings({ ...settings, systemPrompt: e.target.value })
              }
              placeholder="e.g., Always explain concepts simply with real-world code examples."
              className={`w-full px-3.5 py-2 rounded-xl text-sm border resize-none focus:outline-none focus:border-[#10a37f] ${
                darkMode
                  ? "bg-[#2f2f2f] border-white/10"
                  : "bg-gray-50 border-gray-300"
              }`}
            />
          </div>

          {/* Temperature */}
          <div>
            <div className="flex justify-between text-sm font-medium mb-1">
              <span>Creativity (Temperature)</span>
              <span className="text-[#10a37f]">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={settings.temperature}
              onChange={(e) =>
                onSaveSettings({
                  ...settings,
                  temperature: parseFloat(e.target.value),
                })
              }
              className="w-full accent-[#10a37f]"
            />
          </div>

          {/* Clear All Chats */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-400">
                Clear All Chat History
              </p>
              <p className="text-xs text-gray-400">
                Permanently delete all your conversations
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete all chats permanently?")) {
                  onClearAllChats();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-medium cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#10a37f] hover:bg-[#0e906f] text-white text-sm font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}