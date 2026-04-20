import { cn } from "../../lib/utils";

type Props = { ratio: number; tag?: string; title?: string };

export default function ProgressBar({ ratio, tag, title }: Props) {
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div className="sticky top-0 z-20 bg-cream/80 backdrop-blur-md border-b border-cream-deep px-5 py-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-ink-muted">
        <span>{tag ?? "launch day rollback"}</span>
        <span>{pct}%</span>
      </div>
      {title && (
        <p className="mt-1 font-display text-base text-ink truncate">{title}</p>
      )}
      <div className="mt-2 h-[3px] bg-cream-deep rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full bg-gradient-to-r from-accent-ember to-accent-rose transition-all duration-700 ease-out"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
