import { useState } from "react";
import { SURFACE_OPTIONS } from "../../lib/scenario/prelude";
import type { PreludeAnswers } from "../../lib/scenario/types";
import { cn } from "../../lib/utils";

type Props = {
  onStart: (answers: PreludeAnswers) => void;
};

/**
 * Short (~20s) prelude: name + multi-select "what do you want this Tangle
 * to surface?". Results personalize the final headline and weight the
 * trait scoring slightly.
 */
export default function PreludeForm({ onStart }: Props) {
  const [name, setName] = useState("");
  const [surface, setSurface] = useState<string[]>([]);
  const [step, setStep] = useState<0 | 1>(0);

  const toggle = (id: string) => {
    setSurface((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  if (step === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col px-6 pt-14 pb-8 max-w-md mx-auto">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted">step 1 of 2</p>
        <h1 className="font-display text-[40px] leading-[1.05] mt-3 mb-6 text-ink">
          Before we start,
          <br />
          what should I call you?
        </h1>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your first name"
          className="w-full border-b border-ink/20 bg-transparent text-3xl font-display pb-2 placeholder-ink-muted/40 focus:outline-none focus:border-ink"
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) setStep(1);
          }}
        />
        <p className="text-sm text-ink-muted mt-3 italic">
          We read you back through the things you do, not the things you say about yourself.
        </p>

        <div className="flex-1" />
        <button
          disabled={name.trim().length < 1}
          onClick={() => setStep(1)}
          className="mt-8 w-full rounded-full bg-ink text-cream py-4 font-medium tracking-wide disabled:opacity-40 active:scale-[0.99] transition-transform"
        >
          continue
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 pt-14 pb-8 max-w-md mx-auto">
      <button
        onClick={() => setStep(0)}
        className="text-[11px] uppercase tracking-[0.2em] text-ink-muted self-start"
      >
        ← step 1
      </button>
      <h1 className="font-display text-[36px] leading-[1.08] mt-4 mb-2 text-ink">
        What do you want this Tangle to surface?
      </h1>
      <p className="text-sm text-ink-muted italic mb-5">
        Pick any that apply. Or don't. We'll still read you.
      </p>

      <div className="space-y-2.5">
        {SURFACE_OPTIONS.map((opt) => {
          const selected = surface.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={cn(
                "w-full text-left rounded-2xl px-5 py-3.5 border transition-all active:scale-[0.99]",
                selected
                  ? "bg-ink text-cream border-ink"
                  : "bg-white border-cream-deep hover:border-ink text-ink"
              )}
            >
              <p className="font-medium text-[15px]">{opt.label}</p>
              <p className={cn("text-xs mt-0.5", selected ? "text-cream/60" : "text-ink-muted")}>
                {opt.hint}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-[24px]" />
      <button
        onClick={() =>
          onStart({
            name: name.trim(),
            surface,
          })
        }
        className="mt-8 w-full rounded-full bg-ink text-cream py-4 font-medium tracking-wide active:scale-[0.99] transition-transform"
      >
        start the Tangle
      </button>
      <p className="text-[11px] text-ink-muted text-center mt-3">
        takes about 7 minutes · one voice moment inside
      </p>
    </div>
  );
}
