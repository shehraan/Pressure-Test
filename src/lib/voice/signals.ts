/**
 * Lightweight behavioral signal extraction from a voice transcript (or from
 * the typed fallback). We deliberately keep this to simple, explainable
 * heuristics — enough to be useful in the demo and in Trait Lab Lite, not
 * enough to pretend we're doing real NLP.
 */

export type DerivedVoiceSignals = {
  directness: number;
  hedging: number;
  ownership: number;
  warmth: number;
  decisiveness: number;
  steadiness: number;
  wordCount: number;
  sampleQuote: string;
  notes: string[];
};

const HEDGES = [
  "maybe",
  "i think",
  "kind of",
  "sort of",
  "i guess",
  "probably",
  "not sure",
  "honestly not sure",
  "might",
  "a bit",
  "somewhat",
  "possibly",
];

const OWNERSHIP = [
  "i'll",
  "i will",
  "i'm going to",
  "on me",
  "my call",
  "my bad",
  "my fault",
  "i own",
  "i made",
  "i broke",
];

const AVOIDANCE = ["we should", "someone", "the team", "they", "i wasn't the one"];

const WARMTH = ["thank you", "i hear you", "i get it", "with you", "we'll", "us", "together"];

const DECISIVE = [
  "we delay",
  "we ship",
  "let's ship",
  "let's delay",
  "no",
  "yes",
  "we're going to",
  "here's what we do",
  "here is what we do",
];

const UNSTEADY = ["oh god", "i'm panicking", "shit", "i don't know what to do", "freaking out"];

function countHits(text: string, phrases: string[]): number {
  const t = text.toLowerCase();
  let hits = 0;
  for (const p of phrases) {
    const re = new RegExp(`\\b${escape(p)}\\b`, "g");
    const m = t.match(re);
    if (m) hits += m.length;
  }
  return hits;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function norm(hits: number, wordCount: number, scale = 100): number {
  if (wordCount === 0) return 0;
  return Math.min(100, Math.round((hits / Math.max(wordCount, 10)) * scale * 10));
}

export function deriveSignals(rawText: string): DerivedVoiceSignals {
  const text = (rawText || "").trim();
  const words = text ? text.split(/\s+/) : [];
  const wordCount = words.length;

  const hedges = countHits(text, HEDGES);
  const owns = countHits(text, OWNERSHIP);
  const avoids = countHits(text, AVOIDANCE);
  const warm = countHits(text, WARMTH);
  const decisive = countHits(text, DECISIVE);
  const unsteady = countHits(text, UNSTEADY);

  const hedging = norm(hedges, wordCount, 1.4);
  const ownershipRatio =
    owns + avoids === 0 ? 50 : Math.round((owns / (owns + avoids)) * 100);

  const directness = Math.max(
    0,
    Math.min(
      100,
      60 - hedging * 0.5 + (decisive > 0 ? 20 : 0) + (wordCount > 0 && wordCount < 40 ? 10 : 0)
    )
  );

  const warmth = Math.min(100, 40 + warm * 10);
  const decisiveness = Math.min(100, 40 + decisive * 15 - hedging * 0.3);
  const steadiness = Math.max(0, 70 - unsteady * 20 - hedging * 0.4);

  const sampleQuote = pickSampleQuote(text);

  const notes: string[] = [];
  if (wordCount < 8) notes.push("Very short response.");
  if (hedging > 40) notes.push("Heavy hedging language.");
  if (decisive > 0) notes.push("Clear decision signal detected.");
  if (owns > 0) notes.push("First-person ownership detected.");
  if (avoids > owns) notes.push("Distancing language outweighs ownership.");
  if (unsteady > 0) notes.push("Stress markers detected.");

  return {
    directness: Math.round(directness),
    hedging: Math.round(hedging),
    ownership: Math.round(ownershipRatio),
    warmth: Math.round(warmth),
    decisiveness: Math.round(decisiveness),
    steadiness: Math.round(steadiness),
    wordCount,
    sampleQuote,
    notes,
  };
}

function pickSampleQuote(text: string): string {
  if (!text) return "";
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length === 0) return text.slice(0, 140);
  const scored = sentences
    .map((s) => ({ s, score: Math.abs(12 - s.split(/\s+/).length) * -1 }))
    .sort((a, b) => b.score - a.score);
  const chosen = scored[0].s;
  return chosen.length > 160 ? chosen.slice(0, 157) + "…" : chosen;
}

export function transcriptToText(
  transcript: Array<{ role: "assistant" | "user"; text: string }>,
  fallback?: string
): string {
  const userLines = transcript.filter((t) => t.role === "user").map((t) => t.text);
  if (userLines.length > 0) return userLines.join(" ");
  return fallback ?? "";
}
