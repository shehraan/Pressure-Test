import { useEffect, useRef, useState } from "react";
import type { ChoiceOption } from "../../lib/scenario/types";
import { cn } from "../../lib/utils";

type Props = {
  prompt: string;
  options: ChoiceOption[];
  onPick: (option: ChoiceOption, hesitationMs: number) => void;
  variant?: "default" | "chat";
};

export default function ChoiceCard({ prompt, options, onPick, variant = "default" }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const shownAtRef = useRef<number>(Date.now());

  useEffect(() => {
    shownAtRef.current = Date.now();
  }, [prompt]);

  const handle = (opt: ChoiceOption) => {
    if (picked) return;
    const hesitation = Date.now() - shownAtRef.current;
    setPicked(opt.id);
    setTimeout(() => onPick(opt, hesitation), 260);
  };

  return (
    <div className="mt-8 animate-slide-up">
      <p
        className={cn(
          "text-[13px] uppercase tracking-[0.2em] mb-3",
          variant === "chat" ? "text-cream/70" : "text-ink-muted"
        )}
      >
        your move
      </p>
      <p
        className={cn(
          "font-display text-xl leading-snug mb-4",
          variant === "chat" ? "text-cream" : "text-ink"
        )}
      >
        {prompt}
      </p>
      <div className="space-y-2.5">
        {options.map((opt) => {
          const isPicked = picked === opt.id;
          const isDim = picked && !isPicked;
          return (
            <button
              key={opt.id}
              onClick={() => handle(opt)}
              disabled={!!picked}
              className={cn(
                "w-full text-left rounded-2xl px-5 py-4 border transition-all duration-200 active:scale-[0.99]",
                variant === "chat"
                  ? "bg-cream/5 border-cream/10 hover:bg-cream/10 text-cream"
                  : "bg-white border-cream-deep hover:border-ink hover:shadow-[0_4px_16px_-4px_rgba(26,24,22,0.12)] text-ink",
                isPicked && (variant === "chat"
                  ? "bg-accent-ember/30 border-accent-ember"
                  : "bg-ink text-cream border-ink"),
                isDim && "opacity-40"
              )}
            >
              <p className="font-medium text-[15px] leading-snug">{opt.label}</p>
              {opt.detail && (
                <p
                  className={cn(
                    "text-[13px] mt-1 leading-snug",
                    variant === "chat"
                      ? "text-cream/60"
                      : isPicked
                      ? "text-cream/70"
                      : "text-ink-muted"
                  )}
                >
                  {opt.detail}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
