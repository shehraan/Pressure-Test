import { TRAITS, type TraitKey } from "../../lib/traits/model";
import { cn } from "../../lib/utils";

export default function TraitBar({
  traitKey,
  score,
  highlighted = false,
}: {
  traitKey: TraitKey;
  score: number;
  highlighted?: boolean;
}) {
  const t = TRAITS[traitKey];
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div>
          <p
            className={cn(
              "font-display text-[20px] leading-tight",
              highlighted ? "text-ink" : "text-ink/80"
            )}
          >
            {t.label}
          </p>
          <p className="text-[11px] uppercase tracking-widest text-ink-muted mt-0.5">
            {t.lowLabel} <span className="mx-1.5">·</span> {t.highLabel}
          </p>
        </div>
        <p className="font-mono text-lg text-ink">{pct}</p>
      </div>
      <div className="h-[6px] bg-cream-deep rounded-full overflow-hidden relative">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out",
            highlighted
              ? "bg-gradient-to-r from-accent-ember to-accent-rose"
              : "bg-ink"
          )}
          style={{ width: `${pct}%` }}
        />
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cream/60" />
      </div>
      <p className="text-[12px] text-ink-muted mt-1.5 leading-snug">
        {t.description}
      </p>
    </div>
  );
}
