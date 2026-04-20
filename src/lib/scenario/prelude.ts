import type { PreludeAnswers } from "./types";
import type { TraitKey } from "../traits/model";

export type SurfaceOption = {
  id: string;
  label: string;
  hint: string;
  traits: TraitKey[];
};

export const SURFACE_OPTIONS: SurfaceOption[] = [
  {
    id: "conflict",
    label: "my conflict style",
    hint: "how I hold a hard conversation",
    traits: ["candor", "warmth"],
  },
  {
    id: "ambition-integrity",
    label: "ambition vs integrity",
    hint: "what I'll trade for the win",
    traits: ["integrity", "willingnessToAct"],
  },
  {
    id: "closeness-independence",
    label: "closeness vs independence",
    hint: "how I work with other people",
    traits: ["warmth"],
  },
  {
    id: "ambiguity",
    label: "calm under ambiguity",
    hint: "what happens to me when things get unclear",
    traits: ["steadiness"],
  },
  {
    id: "taste",
    label: "taste under pressure",
    hint: "what I pick when there's no right answer",
    traits: ["judgment"],
  },
];

export function personalizeHeadline(p: PreludeAnswers, headline: string): string {
  const name = (p.name || "").trim();
  if (!name) return headline;
  return `${name}, ${headline.charAt(0).toLowerCase()}${headline.slice(1)}`;
}

export function preludeWeights(p: PreludeAnswers): Partial<Record<TraitKey, number>> {
  const weights: Partial<Record<TraitKey, number>> = {};
  for (const id of p.surface ?? []) {
    const opt = SURFACE_OPTIONS.find((o) => o.id === id);
    if (!opt) continue;
    for (const t of opt.traits) {
      weights[t] = (weights[t] ?? 1) + 0.15;
    }
  }
  return weights;
}
