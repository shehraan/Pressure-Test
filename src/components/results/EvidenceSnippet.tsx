import type { EvidenceSnippet as Snippet } from "../../lib/sessionStore";
import { TRAITS } from "../../lib/traits/model";
import { cn } from "../../lib/utils";
import { MessageSquare, Phone, PenLine, MessageCircle } from "lucide-react";

const sourceIcon = {
  choice: MessageSquare,
  voice: Phone,
  fallback: Phone,
  freeText: PenLine,
};

const sourceLabel = {
  choice: "choice",
  voice: "voice call",
  fallback: "typed to sarah",
  freeText: "slack message",
};

export default function EvidenceSnippetView({ snippet }: { snippet: Snippet }) {
  const Icon = sourceIcon[snippet.source] ?? MessageCircle;
  return (
    <div className="rounded-2xl border border-cream-deep bg-white p-4 card-shadow">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-ink-muted mb-2">
        <Icon className="w-3.5 h-3.5" />
        <span>{sourceLabel[snippet.source]}</span>
        <span className="text-ink-muted/60">→</span>
        <span className="text-ink">{TRAITS[snippet.trait].label}</span>
      </div>
      <p className="font-serif text-[15.5px] text-ink leading-relaxed">
        "{snippet.quote}"
      </p>
      <p className={cn("text-[13px] text-ink-muted mt-2 leading-snug")}>
        {snippet.context}
      </p>
    </div>
  );
}
