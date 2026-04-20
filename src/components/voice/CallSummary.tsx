import type { TranscriptLine } from "../../lib/voice/useVapiCall";
import type { DerivedVoiceSignals } from "../../lib/voice/signals";
import { cn } from "../../lib/utils";

type Props = {
  callerName: string;
  transcript: TranscriptLine[];
  fallbackText?: string;
  /** Plain-English summary extracted from Vapi's end-of-call analysis. */
  vapiSummary?: string;
  /** Extracted from Vapi structured output: true = ship, false = delay. */
  shipOrDelay?: boolean;
  signals?: DerivedVoiceSignals;
  onContinue: () => void;
  status: "answered" | "declined" | "missed" | "fallback_typed" | "failed";
};

/**
 * Post-call breather. Surfaces the user's own words back to them,
 * the Vapi-extracted summary, and the ship/delay verdict.
 */
export default function CallSummary({
  callerName,
  transcript,
  fallbackText,
  vapiSummary,
  shipOrDelay,
  signals,
  onContinue,
  status,
}: Props) {
  const userLines = transcript.filter((t) => t.role === "user");

  const statusCopy: Record<Props["status"], string> = {
    answered: `Call ended. ${callerName} is back with the investors.`,
    declined: `You let it ring out. ${callerName} will read your Slack message instead.`,
    missed: `The call timed out. ${callerName} will read your Slack message instead.`,
    fallback_typed: `You typed back to ${callerName} instead of speaking.`,
    failed: `The line dropped. Your note to ${callerName} went through.`,
  };

  return (
    <div className="max-w-xl mx-auto w-full">
      <p className="text-xs uppercase tracking-[0.3em] text-ink-muted">after the call</p>
      <h2 className="font-display text-3xl mt-2 mb-3">{statusCopy[status]}</h2>

      {/* Ship / delay verdict from Vapi structured output */}
      {shipOrDelay !== undefined && (
        <div
          className={cn(
            "mb-4 rounded-2xl px-5 py-4 border flex items-center gap-3",
            shipOrDelay
              ? "bg-green-50 border-green-200"
              : "bg-amber-50 border-amber-200"
          )}
        >
          <span className="text-2xl">{shipOrDelay ? "🚀" : "⏸"}</span>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-ink-muted">your call</p>
            <p className={cn("font-display text-xl", shipOrDelay ? "text-green-800" : "text-amber-800")}>
              {shipOrDelay ? "Ship it" : "Delay launch"}
            </p>
          </div>
        </div>
      )}

      {/* Vapi-generated summary */}
      {vapiSummary && (
        <div className="mb-4 rounded-2xl bg-ink text-cream px-5 py-4">
          <p className="text-[11px] uppercase tracking-widest text-cream/50 mb-1.5">call summary</p>
          <p className="text-sm leading-relaxed">{vapiSummary}</p>
        </div>
      )}

      {/* What the user said */}
      {(userLines.length > 0 || fallbackText) && (
        <div className="rounded-2xl bg-cream-soft border border-cream-deep p-5 card-shadow space-y-3">
          <p className="text-xs uppercase tracking-widest text-ink-muted">you said</p>
          {userLines.length > 0 ? (
            <div className="space-y-2">
              {userLines.map((l, i) => (
                <p key={i} className="text-sm text-ink leading-relaxed">
                  "{l.text}"
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {fallbackText}
            </p>
          )}
          {signals && (
            <div className="pt-2 mt-1 border-t border-cream-deep flex flex-wrap gap-2">
              <SignalPill label="directness" value={signals.directness} />
              <SignalPill label="decisiveness" value={signals.decisiveness} />
              <SignalPill label="ownership" value={signals.ownership} />
              {signals.hedging > 25 && (
                <SignalPill label="hedging" value={signals.hedging} tone="warn" />
              )}
            </div>
          )}
        </div>
      )}

      <button
        onClick={onContinue}
        className="mt-6 w-full rounded-full bg-ink text-cream py-4 font-medium tracking-wide active:scale-[0.99] transition-transform"
      >
        back into the timeline
      </button>
    </div>
  );
}

function SignalPill({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono",
        tone === "warn"
          ? "bg-accent-rose/15 text-accent-rose"
          : "bg-ink/5 text-ink"
      )}
    >
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}
