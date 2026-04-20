import type { TraitKey } from "../traits/model";

export type PreludeAnswers = {
  name: string;
  surface: string[];
};

export type TraitDelta = Partial<Record<TraitKey, number>>;

export type ChoiceOption = {
  id: string;
  label: string;
  detail?: string;
  deltas: TraitDelta;
  evidence: string;
};

export type NarrativeBeat = {
  kind: "narrative";
  speaker?: string;
  body: string;
  tone?: "neutral" | "urgent" | "soft" | "alarm";
};

export type ChoiceNode = {
  id: string;
  kind: "choice";
  tag?: string;
  title: string;
  beats: NarrativeBeat[];
  prompt: string;
  options: ChoiceOption[];
};

export type ChatLine = {
  id: string;
  from: "teammate" | "you";
  text: string;
};

export type ChatInterludeNode = {
  id: string;
  kind: "chat";
  tag?: string;
  title: string;
  heading: string;
  contactName: string;
  contactRole: string;
  lines: ChatLine[];
  prompt: string;
  options: ChoiceOption[];
};

export type FreeTextNode = {
  id: string;
  kind: "freeText";
  tag?: string;
  title: string;
  beats: NarrativeBeat[];
  prompt: string;
  placeholder: string;
  minChars?: number;
  evidenceTrait: TraitKey;
};

export type InterruptionNode = {
  id: string;
  kind: "interruption";
  tag?: string;
  title: string;
  body: string;
  ctaLabel: string;
};

export type VoiceNode = {
  id: string;
  kind: "voice";
  tag?: string;
  title: string;
  caller: {
    name: string;
    role: string;
    initials: string;
    colorClass: string;
  };
  prePrompt: string;
  assistantOpening: string;
  fallbackPrompt: string;
  fallbackPlaceholder: string;
  topic: string;
};

export type NarrativeNode = {
  id: string;
  kind: "narrative";
  tag?: string;
  title: string;
  beats: NarrativeBeat[];
  nextLabel?: string;
};

export type ResultsNode = {
  id: string;
  kind: "results";
  title: string;
  blurb: string;
};

export type ScenarioNode =
  | ChoiceNode
  | ChatInterludeNode
  | FreeTextNode
  | InterruptionNode
  | VoiceNode
  | NarrativeNode
  | ResultsNode;

export type Scenario = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  estMinutes: number;
  nodes: ScenarioNode[];
};
