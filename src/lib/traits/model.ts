/**
 * Trait model for Pressure Test. Six core behavioral dimensions that each
 * range 0-100. Scores are derived from observed behavior (choices, free text,
 * and voice/fallback transcript) rather than self-report.
 */

export type TraitKey =
  | "candor"
  | "steadiness"
  | "warmth"
  | "judgment"
  | "integrity"
  | "willingnessToAct";

export type TraitScores = Record<TraitKey, number>;

export type TraitDef = {
  key: TraitKey;
  label: string;
  short: string;
  lowLabel: string;
  highLabel: string;
  description: string;
};

export const TRAITS: Record<TraitKey, TraitDef> = {
  candor: {
    key: "candor",
    label: "Candor",
    short: "Direct talk over comfort",
    lowLabel: "Diplomatic",
    highLabel: "Unfiltered",
    description:
      "How willing you are to say the hard true thing when a softer line is available.",
  },
  steadiness: {
    key: "steadiness",
    label: "Steadiness",
    short: "Calm under ambiguity",
    lowLabel: "Reactive",
    highLabel: "Grounded",
    description: "Whether ambiguity makes you scatter or slow down.",
  },
  warmth: {
    key: "warmth",
    label: "Relational Warmth",
    short: "People first, by default",
    lowLabel: "Task-focused",
    highLabel: "Relational",
    description:
      "How visibly you make space for the humans around the decision, not just the decision.",
  },
  judgment: {
    key: "judgment",
    label: "Judgment",
    short: "Taste under pressure",
    lowLabel: "Rule-bound",
    highLabel: "Discerning",
    description:
      "Whether you choose the right answer when the right answer is not the easy one.",
  },
  integrity: {
    key: "integrity",
    label: "Integrity Under Incentive",
    short: "Truth when it costs you",
    lowLabel: "Accommodating",
    highLabel: "Principled",
    description:
      "Whether your story stays honest when reframing it would be lucrative.",
  },
  willingnessToAct: {
    key: "willingnessToAct",
    label: "Willingness to Act",
    short: "Decision over delay",
    lowLabel: "Reflective",
    highLabel: "Decisive",
    description:
      "How quickly you move when the cost of waiting is real and visible.",
  },
};

export const TRAIT_ORDER: TraitKey[] = [
  "candor",
  "steadiness",
  "warmth",
  "judgment",
  "integrity",
  "willingnessToAct",
];

export const SCORING_MODEL_VERSION = "v0.1.0";
export const ARTIFACT_VERSION = "v0.1.0";

export function emptyScores(): TraitScores {
  return {
    candor: 50,
    steadiness: 50,
    warmth: 50,
    judgment: 50,
    integrity: 50,
    willingnessToAct: 50,
  };
}
