import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

export default function CoreChatDrawer({ open, onClose }) {
  const [messages, setMessages] = useState([]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          className="fixed right-0 top-0 h-full w-full sm:w-[380px] bg-white dark:bg-slate-900 border-l dark:border-slate-800 z-50 flex flex-col"
        >
          <div className="h-12 flex items-center justify-between px-3 border-b dark:border-slate-800">
            <div className="font-semibold">CORE Assistant</div>
            <button
              onClick={onClose}
              className="text-sm opacity-70 hover:opacity-100"
            >
              Close
            </button>
          </div>

          <div className="flex-1 p-3 overflow-auto space-y-2">
            <div className="text-sm opacity-70">
              Hi! CORE here — live responses coming in Phase 7.
            </div>
          </div>

          <div className="p-3 border-t dark:border-slate-800 flex gap-2">
            <input
              className="flex-1 px-3 py-2 rounded border dark:border-slate-700 bg-transparent"
              placeholder="Ask something…"
              disabled
            />
            <button
              className="px-3 py-2 rounded bg-accent text-white"
              disabled
            >
              Send
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
