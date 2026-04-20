import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "../../lib/utils";

type Props = {
  callerName: string;
  callerRole: string;
  callerInitials: string;
  colorClass: string;
  assistantOpening: string;
  prompt: string;
  placeholder: string;
  onSubmit: (text: string, meta: { editCount: number; durationMs: number }) => void;
  onDismiss: () => void;
};

/**
 * Typed fallback for the voice moment. Runs when Vapi is unavailable, the
 * mic is denied, or the user hits decline. Framed as an urgent live note
 * so the dramatic beat still lands.
 */
export default function TypedFallback({
  callerName,
  callerRole,
  callerInitials,
  colorClass,
  assistantOpening,
  prompt,
  placeholder,
  onSubmit,
  onDismiss,
}: Props) {
  const [text, setText] = useState("");
  const [editCount, setEditCount] = useState(0);
  const startRef = useRef<number>(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const submit = () => {
    const trimmed = text.trim();
    if (trimmed.length < 4) return;
    onSubmit(trimmed, {
      editCount,
      durationMs: Date.now() - startRef.current,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-ink via-ink-soft to-black text-cream">
      <div className="absolute inset-0 pointer-events-none grain opacity-20" />

      <div className="pt-10 pb-4 px-6 flex items-center gap-3 z-10 border-b border-cream/10">
        <div className={cn("w-11 h-11 rounded-full bg-gradient-to-br flex items-center justify-center font-display text-cream", colorClass)}>
          {callerInitials}
        </div>
        <div className="flex-1">
          <p className="font-display text-xl leading-none">{callerName}</p>
          <p className="text-cream/50 text-xs mt-0.5">{callerRole} · live note</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-cream/50 text-xs uppercase tracking-wider"
        >
          close
        </button>
      </div>

      <div className="px-6 py-5 z-10">
        <div className="max-w-md rounded-2xl bg-cream/10 px-4 py-3 text-sm leading-snug">
          {assistantOpening}
        </div>
        <p className="text-cream/50 text-xs mt-4 italic">{prompt}</p>
      </div>

      <div className="flex-1 px-6 z-10">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setEditCount((c) => c + 1);
          }}
          placeholder={placeholder}
          className="w-full h-full min-h-[160px] bg-transparent text-cream text-base leading-relaxed placeholder-cream/30 focus:outline-none resize-none font-serif"
        />
      </div>

      <div className="p-6 pt-3 z-10 border-t border-cream/10 flex items-center gap-3">
        <span className="text-cream/40 text-xs font-mono flex-1">{text.trim().split(/\s+/).filter(Boolean).length} words</span>
        <button
          onClick={submit}
          disabled={text.trim().length < 4}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all",
            text.trim().length < 4
              ? "bg-cream/10 text-cream/40"
              : "bg-cream text-ink active:scale-95"
          )}
        >
          <Send className="w-4 h-4" />
          send to {callerName.toLowerCase()}
        </button>
      </div>
    </div>
  );
}
