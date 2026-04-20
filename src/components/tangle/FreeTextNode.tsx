import { useRef, useState } from "react";
import type { FreeTextNode as FTNode } from "../../lib/scenario/types";
import TimelineNode from "./TimelineNode";

type Props = {
  node: FTNode;
  onSubmit: (
    text: string,
    meta: { editCount: number; backspaces: number; durationMs: number }
  ) => void;
};

export default function FreeTextNodeView({ node, onSubmit }: Props) {
  const [text, setText] = useState("");
  const [editCount, setEditCount] = useState(0);
  const [backspaces, setBackspaces] = useState(0);
  const startedAtRef = useRef<number>(Date.now());

  const minChars = node.minChars ?? 6;
  const canSubmit = text.trim().length >= minChars;

  return (
    <div className="space-y-6">
      <TimelineNode beats={node.beats} tag={node.tag} title={node.title} />

      <div className="animate-slide-up">
        <p className="text-[11px] uppercase tracking-[0.2em] text-ink-muted mb-2">
          #launch
        </p>
        <div className="rounded-2xl bg-white border border-cream-deep p-4 card-shadow">
          <textarea
            value={text}
            onKeyDown={(e) => {
              if (e.key === "Backspace" || e.key === "Delete") {
                setBackspaces((b) => b + 1);
              }
            }}
            onChange={(e) => {
              setText(e.target.value);
              setEditCount((c) => c + 1);
            }}
            placeholder={node.placeholder}
            rows={4}
            className="w-full bg-transparent text-ink font-serif text-[16px] leading-relaxed placeholder-ink-muted/60 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-cream-deep">
            <p className="text-[11px] font-mono text-ink-muted">
              {text.trim().split(/\s+/).filter(Boolean).length} words
            </p>
            <p className="text-[11px] font-mono text-ink-muted italic">
              {node.prompt}
            </p>
          </div>
        </div>

        <button
          disabled={!canSubmit}
          onClick={() =>
            onSubmit(text.trim(), {
              editCount,
              backspaces,
              durationMs: Date.now() - startedAtRef.current,
            })
          }
          className="mt-4 w-full rounded-full bg-ink text-cream py-3.5 font-medium tracking-wide active:scale-[0.99] transition-transform disabled:opacity-40"
        >
          send to #launch
        </button>
      </div>
    </div>
  );
}
