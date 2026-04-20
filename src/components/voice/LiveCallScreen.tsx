import { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic } from "lucide-react";
import { cn } from "../../lib/utils";
import type { CallPhase, TranscriptLine } from "../../lib/voice/useVapiCall";

type Props = {
  callerName: string;
  callerRole: string;
  callerInitials: string;
  colorClass: string;
  phase: CallPhase;
  transcript: TranscriptLine[];
  onHangUp: () => void;
};

/**
 * Active call UI. Shows caller info, live duration, speaker state
 * (assistant-speaking vs user-speaking vs listening), live transcript snippets.
 */
export default function LiveCallScreen({
  callerName,
  callerRole,
  callerInitials,
  colorClass,
  phase,
  transcript,
  onHangUp,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript.length]);

  const statusLabel: Record<CallPhase, string> = {
    idle: "idle",
    ringing: "ringing…",
    connecting: "connecting…",
    active_listening: "listening",
    active_speaking: "speaking",
    ended: "call ended",
    failed: "connection failed",
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  const isAssistantSpeaking = phase === "active_speaking";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-stretch bg-gradient-to-b from-ink via-ink-soft to-black text-cream">
      <div className="absolute inset-0 pointer-events-none grain opacity-20" />

      <div className="pt-12 pb-6 px-6 flex flex-col items-center z-10">
        <p className="text-xs uppercase tracking-[0.3em] text-cream/50">{statusLabel[phase]}</p>
        <p className="font-mono text-sm text-cream/70 mt-1">
          {mm}:{ss}
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 z-10 px-6">
        <div className="relative">
          {isAssistantSpeaking && (
            <>
              <span className={cn("absolute inset-0 rounded-full bg-gradient-to-br opacity-50 animate-pulse-ring", colorClass)} />
              <span className={cn("absolute inset-0 rounded-full bg-gradient-to-br opacity-30 animate-pulse-ring", colorClass)} style={{ animationDelay: "0.5s" }} />
            </>
          )}
          <div
            className={cn(
              "relative w-28 h-28 rounded-full bg-gradient-to-br flex items-center justify-center",
              "text-4xl font-display text-cream shadow-2xl",
              colorClass
            )}
          >
            {callerInitials}
          </div>
        </div>
        <p className="font-display text-3xl mt-2">{callerName}</p>
        <p className="text-cream/60 text-xs">{callerRole}</p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 mt-4 space-y-3 z-10"
      >
        {transcript.length === 0 && phase !== "active_speaking" && (
          <p className="text-center text-cream/40 text-sm italic mt-8">
            {phase === "ringing" || phase === "connecting"
              ? "connecting…"
              : "go ahead. she's listening."}
          </p>
        )}
        {transcript.map((line, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-snug animate-slide-up",
              line.role === "assistant"
                ? "bg-cream/10 text-cream rounded-bl-sm"
                : "bg-cream text-ink ml-auto rounded-br-sm"
            )}
          >
            {line.text}
          </div>
        ))}
      </div>

      <div className="pb-10 pt-4 flex flex-col items-center gap-4 z-10">
        <div className="flex items-center gap-3 text-cream/60 text-xs">
          <Mic className={cn("w-4 h-4", phase === "active_listening" && "text-accent-ember")} />
          <span>
            {phase === "active_listening" && "your turn"}
            {phase === "active_speaking" && "she's speaking"}
            {(phase === "ringing" || phase === "connecting") && "connecting"}
          </span>
        </div>
        <button
          onClick={onHangUp}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          aria-label="End call"
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
}
