import type { NarrativeBeat } from "../../lib/scenario/types";
import { cn } from "../../lib/utils";

type Props = {
  beats: NarrativeBeat[];
  tag?: string;
  title?: string;
};

/**
 * Renders a vertical timeline of narrative beats that progressively reveal.
 * Beat tone colors the marker.
 */
export default function TimelineNode({ beats, tag, title }: Props) {
  return (
    <div className="relative pl-6 reveal-text">
      {tag && (
        <p className="text-[10px] font-mono uppercase tracking-widest text-ink-muted mb-2">
          {tag}
        </p>
      )}
      {title && (
        <h2 className="font-display text-[28px] leading-[1.1] text-ink mb-6">
          {title}
        </h2>
      )}
      <div className="space-y-5">
        {beats.map((b, i) => (
          <div key={i} className="relative">
            <span
              className={cn(
                "absolute -left-6 top-2 w-2 h-2 rounded-full",
                b.tone === "alarm"
                  ? "bg-accent-rose ring-4 ring-accent-rose/20"
                  : b.tone === "urgent"
                  ? "bg-accent-ember"
                  : b.tone === "soft"
                  ? "bg-ink-muted"
                  : "bg-ink"
              )}
            />
            {b.speaker && (
              <p className="text-[11px] uppercase tracking-widest text-ink-muted mb-1">
                {b.speaker}
              </p>
            )}
            <p
              className={cn(
                "text-[17px] leading-relaxed text-ink font-serif",
                b.tone === "alarm" && "text-accent-rose font-medium",
                b.tone === "soft" && "text-ink-muted italic"
              )}
            >
              {b.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
