import { useEffect, useState } from "react";
import type { ChatInterludeNode, ChoiceOption } from "../../lib/scenario/types";
import ChoiceCard from "./ChoiceCard";
import { cn } from "../../lib/utils";

type Props = {
  node: ChatInterludeNode;
  onPick: (option: ChoiceOption, hesitationMs: number) => void;
};

/**
 * DM-style interlude with progressive bubble reveal. Visually distinct from
 * the main timeline so the shift in medium is felt.
 */
export default function ChatInterlude({ node, onPick }: Props) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    const interval = setInterval(() => {
      setVisibleCount((c) => {
        if (c >= node.lines.length) {
          clearInterval(interval);
          return c;
        }
        return c + 1;
      });
    }, 650);
    return () => clearInterval(interval);
  }, [node.id, node.lines.length]);

  const allShown = visibleCount >= node.lines.length;

  return (
    <div className="rounded-3xl bg-ink text-cream p-5 card-shadow-lg">
      <div className="flex items-center gap-3 pb-4 border-b border-cream/10">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-sage to-accent-ink flex items-center justify-center text-sm font-display text-cream">
          M
        </div>
        <div>
          <p className="font-medium text-cream">{node.contactName}</p>
          <p className="text-cream/50 text-xs">{node.contactRole}</p>
        </div>
      </div>

      <p className="text-xs text-cream/50 italic mt-4 mb-3">{node.heading}</p>

      <div className="space-y-2 min-h-[120px]">
        {node.lines.slice(0, visibleCount).map((l) => (
          <div
            key={l.id}
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-snug animate-slide-up",
              l.from === "teammate"
                ? "bg-cream/10 rounded-bl-sm"
                : "bg-cream text-ink rounded-br-sm ml-auto"
            )}
          >
            {l.text}
          </div>
        ))}
        {!allShown && (
          <div className="flex items-center gap-1.5 pl-1 pt-1 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-cream/40 animate-pulse" />
            <span className="w-1.5 h-1.5 rounded-full bg-cream/40 animate-pulse" style={{ animationDelay: "0.15s" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-cream/40 animate-pulse" style={{ animationDelay: "0.3s" }} />
          </div>
        )}
      </div>

      {allShown && (
        <ChoiceCard
          prompt={node.prompt}
          options={node.options}
          onPick={onPick}
          variant="chat"
        />
      )}
    </div>
  );
}
