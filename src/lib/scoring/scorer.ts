import type { SessionRecord, ArtifactRecord, EvidenceSnippet } from "../sessionStore";
import type { TraitKey, TraitScores } from "../traits/model";
import { TRAITS, TRAIT_ORDER, emptyScores, ARTIFACT_VERSION, SCORING_MODEL_VERSION } from "../traits/model";
import { deriveSignals, transcriptToText } from "../voice/signals";
import { personalizeHeadline, preludeWeights } from "../scenario/prelude";
import { launchDayTangle } from "../../data/tangles/launchDay";
import { truncate } from "../utils";

/**
 * Artifact generator. Turns a `SessionRecord` into a typed `ArtifactRecord`.
 *
 * Scoring pipeline:
 *   1. Start everyone at 50 across all six traits (neutral prior).
 *   2. Apply choice deltas for each recorded decision.
 *   3. Apply a small prelude weight (what the user said they wanted surfaced).
 *   4. Layer in voice/fallback signals with half weight.
 *   5. Nudge based on free-text length/tone.
 *   6. Clamp, compute confidence, select core traits, detect contradiction.
 *   7. Assemble headline, summary, share string, evidence snippets.
 */
export function generateArtifact(session: SessionRecord): ArtifactRecord {
  const scores = emptyScores();
  const evidence: EvidenceSnippet[] = [];

  applyChoiceDeltas(session, scores, evidence);
  applyPreludeWeights(session, scores);
  applyVoiceSignals(session, scores, evidence);
  applyFreeTextHeuristics(session, scores, evidence);

  clampScores(scores);

  const traitsSorted = TRAIT_ORDER.slice().sort(
    (a, b) => distance(scores[b]) - distance(scores[a])
  );

  const coreKeys = traitsSorted.slice(0, 3);
  const confidence = computeConfidence(session, scores);
  const lowConfidence = confidence < 0.45;
  const contradiction = detectContradiction(scores, session);
  const mixedProfile = detectMixedProfile(scores, session);
  const growthEdge = pickGrowthEdge(scores, coreKeys);
  const coreTraits = coreKeys.map((key) => ({
    key,
    label: TRAITS[key].label,
    score: scores[key],
    blurb: traitBlurb(key, scores[key]),
  }));

  const headline = buildHeadline(session, coreTraits, scores);
  const summary = buildSummary(session, coreTraits, contradiction, growthEdge);
  const shareSummary = buildShareSummary(coreTraits);

  return {
    sessionId: session.id,
    artifactVersion: ARTIFACT_VERSION,
    scoringModelVersion: SCORING_MODEL_VERSION,
    traitScores: scores,
    confidence,
    coreTraits,
    contradiction,
    growthEdge,
    headline,
    summary,
    shareSummary,
    evidence: evidence.slice(0, 6),
    mixedProfile,
    lowConfidence,
    createdAt: Date.now(),
  };
}

function applyChoiceDeltas(
  session: SessionRecord,
  scores: TraitScores,
  evidence: EvidenceSnippet[]
): void {
  for (const choice of session.choices) {
    const node = launchDayTangle.nodes.find((n) => n.id === choice.nodeId);
    if (!node) continue;
    if (node.kind !== "choice" && node.kind !== "chat") continue;
    const option = node.options.find((o) => o.id === choice.choiceId);
    if (!option) continue;
    for (const [k, delta] of Object.entries(option.deltas) as [TraitKey, number][]) {
      scores[k] = (scores[k] ?? 50) + delta;
    }
    const primaryTrait = bestTrait(option.deltas);
    if (primaryTrait) {
      evidence.push({
        trait: primaryTrait,
        source: "choice",
        quote: option.label,
        context: option.evidence,
        weight: Math.abs(option.deltas[primaryTrait] ?? 0),
      });
    }
  }
}

function applyPreludeWeights(session: SessionRecord, scores: TraitScores): void {
  const weights = preludeWeights(session.prelude);
  for (const [k, w] of Object.entries(weights) as [TraitKey, number][]) {
    const delta = (scores[k] - 50) * (w - 1);
    scores[k] = scores[k] + delta;
  }
}

function applyVoiceSignals(
  session: SessionRecord,
  scores: TraitScores,
  evidence: EvidenceSnippet[]
): void {
  const voice = session.voice;
  if (!voice || voice.status === "not_started" || voice.status === "declined") {
    return;
  }
  const text = transcriptToText(voice.transcript, voice.fallbackTranscript);
  if (!text) return;
  const signals = voice.derivedSignals ?? deriveSignals(text);

  const pull = (current: number, signal: number, weight = 0.25) =>
    current + (signal - 50) * weight;

  scores.candor = pull(scores.candor, signals.directness, 0.25);
  scores.steadiness = pull(scores.steadiness, signals.steadiness, 0.2);
  scores.warmth = pull(scores.warmth, signals.warmth, 0.2);
  scores.willingnessToAct = pull(scores.willingnessToAct, signals.decisiveness, 0.25);
  scores.integrity = pull(scores.integrity, signals.ownership, 0.15);
  scores.candor -= signals.hedging * 0.15;

  const source: EvidenceSnippet["source"] = voice.usedVoice ? "voice" : "fallback";
  if (signals.sampleQuote) {
    evidence.push({
      trait: signals.directness > 60 ? "candor" : "warmth",
      source,
      quote: truncate(signals.sampleQuote, 160),
      context: voice.usedVoice
        ? "From the live voice call with Sarah."
        : "From the typed fallback note to Sarah.",
      weight: 8,
    });
  }
  if (signals.decisiveness > 65) {
    evidence.push({
      trait: "willingnessToAct",
      source,
      quote: truncate(signals.sampleQuote || text, 120),
      context: "Decision-shaped language under time pressure.",
      weight: 6,
    });
  }

  // Apply trait deltas from the Vapi structured output ship/delay decision.
  // These mirror the old final-call choice node weights at 60% to account for
  // the fact that the call also drives the heuristic signal scoring above.
  if (voice.shipOrDelay === true) {
    // "Ship it" — decisiveness, reasonable judgment, some candor for transparency
    scores.willingnessToAct = (scores.willingnessToAct ?? 50) + 5;
    scores.judgment = (scores.judgment ?? 50) + 4;
    scores.integrity = (scores.integrity ?? 50) + 2;
    scores.candor = (scores.candor ?? 50) + 2;
    evidence.push({
      trait: "willingnessToAct",
      source,
      quote: "Chose to ship during the live call with Sarah.",
      context: "Extracted from voice call structured output: shipOrDelay = true.",
      weight: 7,
    });
  } else if (voice.shipOrDelay === false) {
    // "Delay" — integrity-first, steady, lower urgency-to-act
    scores.integrity = (scores.integrity ?? 50) + 5;
    scores.judgment = (scores.judgment ?? 50) + 4;
    scores.steadiness = (scores.steadiness ?? 50) + 3;
    scores.willingnessToAct = (scores.willingnessToAct ?? 50) - 2;
    evidence.push({
      trait: "integrity",
      source,
      quote: "Chose to delay launch during the live call with Sarah.",
      context: "Extracted from voice call structured output: shipOrDelay = false.",
      weight: 7,
    });
  }
}

function applyFreeTextHeuristics(
  session: SessionRecord,
  scores: TraitScores,
  evidence: EvidenceSnippet[]
): void {
  for (const ft of session.freeText) {
    if (!ft.text) continue;
    const node = launchDayTangle.nodes.find((n) => n.id === ft.nodeId);
    const targetTrait: TraitKey =
      node && node.kind === "freeText" ? node.evidenceTrait : "candor";

    const wordCount = ft.text.trim().split(/\s+/).length;
    if (wordCount < 10) scores.candor -= 3;
    if (wordCount > 40) scores.warmth += 3;
    if (/\bsorry\b|\bmy fault\b|\bi broke\b|\bi missed\b/i.test(ft.text))
      scores.integrity += 5;
    if (/\?\s*$/.test(ft.text)) scores.candor -= 2;
    if (/\bdelay\b|\bhold\b|\bpause\b/i.test(ft.text)) scores.judgment += 4;
    if (/\bship(ing|ped)?\b|\bgo\b/i.test(ft.text)) scores.willingnessToAct += 3;
    if (ft.backspaces > wordCount * 0.5) scores.steadiness -= 4;

    evidence.push({
      trait: targetTrait,
      source: "freeText",
      quote: truncate(ft.text, 180),
      context: "Your #launch Slack message at 08:02.",
      weight: 5,
    });
  }
}

function clampScores(scores: TraitScores): void {
  for (const k of TRAIT_ORDER) scores[k] = Math.max(0, Math.min(100, Math.round(scores[k])));
}

function distance(n: number): number {
  return Math.abs(n - 50);
}

function bestTrait(deltas: Partial<Record<TraitKey, number>>): TraitKey | null {
  let best: TraitKey | null = null;
  let max = 0;
  for (const [k, v] of Object.entries(deltas) as [TraitKey, number][]) {
    if (Math.abs(v) > max) {
      max = Math.abs(v);
      best = k;
    }
  }
  return best;
}

function computeConfidence(session: SessionRecord, scores: TraitScores): number {
  const choiceCount = session.choices.length;
  const hasVoice =
    session.voice.status === "answered" ||
    session.voice.status === "fallback_typed";
  const hasFreeText = session.freeText.some((f) => f.text.trim().length > 10);
  const spread =
    TRAIT_ORDER.reduce((acc, k) => acc + distance(scores[k]), 0) / TRAIT_ORDER.length;

  let c = 0.3;
  c += Math.min(0.3, choiceCount * 0.06);
  if (hasVoice) c += 0.2;
  if (hasFreeText) c += 0.1;
  c += Math.min(0.15, spread / 100);
  return Math.min(1, Math.max(0, Number(c.toFixed(2))));
}

function detectContradiction(
  scores: TraitScores,
  session: SessionRecord
): { title: string; detail: string } | null {
  const pairs: Array<{ a: TraitKey; b: TraitKey; title: string; detail: string }> = [
    {
      a: "candor",
      b: "warmth",
      title: "Direct, but warmer than you look",
      detail:
        "Your choices were unusually candid — harder than most people pick — but the way you chose to say it stayed careful about the other person. That's a rare combo people often mis-read.",
    },
    {
      a: "willingnessToAct",
      b: "judgment",
      title: "Fast mover, slow decider",
      detail:
        "You showed high willingness to act on the surface, but your actual judgment-weighted choices were more cautious than your tempo suggested. When you rush, you rush toward waiting.",
    },
    {
      a: "integrity",
      b: "willingnessToAct",
      title: "Principled, but you stalled",
      detail:
        "You held the line on honesty — and then took longer than you needed to act on it. Integrity without tempo starts to look like paralysis to the people waiting on you.",
    },
  ];
  for (const p of pairs) {
    if (scores[p.a] >= 65 && scores[p.b] >= 65 && Math.abs(scores[p.a] - scores[p.b]) < 12) {
      return { title: p.title, detail: p.detail };
    }
  }
  const voice = session.voice;
  if (
    voice.status === "fallback_typed" &&
    scores.candor >= 60 &&
    voice.derivedSignals &&
    voice.derivedSignals.hedging > 35
  ) {
    return {
      title: "Bold on paper, hedged in voice",
      detail:
        "Your choices looked candid, but when Sarah put you on a live line, your phrasing hedged. Under pressure in voice, you get softer than your decisions suggest.",
    };
  }
  return null;
}

function detectMixedProfile(
  scores: TraitScores,
  _session: SessionRecord
): string | null {
  if (Math.abs(scores.candor - scores.warmth) < 5 && scores.candor > 55) {
    return "You look split between candor and warmth because both signals pulled in the same direction without one dominating.";
  }
  if (Math.abs(scores.judgment - scores.willingnessToAct) < 5 && scores.judgment > 55) {
    return "You look split between judgment and willingness to act — your thinking was careful, but when you moved you moved hard.";
  }
  return null;
}

function pickGrowthEdge(
  scores: TraitScores,
  coreKeys: TraitKey[]
): { title: string; detail: string } {
  const nonCore = TRAIT_ORDER.filter((k) => !coreKeys.includes(k));
  const weakest = nonCore.sort((a, b) => scores[a] - scores[b])[0];
  const map: Record<TraitKey, { title: string; detail: string }> = {
    candor: {
      title: "Say the hard thing faster",
      detail:
        "Your first honest sentence keeps arriving about one sentence too late. The version of you people trust most is the one that starts with the uncomfortable line.",
    },
    steadiness: {
      title: "Hold the room when it tilts",
      detail:
        "Ambiguity visibly moves you. Even a ten-second pause before reacting would change how steady you look to the team in the next real crunch.",
    },
    warmth: {
      title: "Name the person, not just the problem",
      detail:
        "You tend to default to the decision shape. Next time, name the person carrying it in the first line. It will cost you nothing and change the room.",
    },
    judgment: {
      title: "Trade speed for discernment one more round",
      detail:
        "You're acting before the third-best option has arrived in your head. The version you'd pick after one more beat is usually the right one.",
    },
    integrity: {
      title: "Protect the uncomfortable number",
      detail:
        "When incentives lean on a number, your framing softens it a touch. Keep the uncomfortable number uncomfortable — people feel it either way.",
    },
    willingnessToAct: {
      title: "Commit before the air cools",
      detail:
        "You see it, you think it, and then you wait for permission you don't actually need. Commit one beat earlier.",
    },
  };
  return map[weakest];
}

function traitBlurb(key: TraitKey, score: number): string {
  const t = TRAITS[key];
  if (score >= 70) {
    const high: Record<TraitKey, string> = {
      candor: "Chooses the direct line even when a softer one is right there.",
      steadiness: "Slows down when everyone else speeds up.",
      warmth: "Moves through decisions like a person, not a function.",
      judgment: "Reliably picks the non-obvious right answer.",
      integrity: "Holds the truth even when it costs you something real.",
      willingnessToAct: "Moves before permission arrives.",
    };
    return high[key];
  }
  if (score <= 35) {
    const low: Record<TraitKey, string> = {
      candor: "Softens truth by default — sometimes past what the moment can hold.",
      steadiness: "Ambiguity shows on you. You move first, settle after.",
      warmth: "Stays in the task; people come second until asked.",
      judgment: "Leans on the rule rather than the read.",
      integrity: "Bent the framing when the upside asked you to.",
      willingnessToAct: "Waits longer than the situation wants you to.",
    };
    return low[key];
  }
  return `${t.label}: showed up neither high nor low — hard to read on this one from one Tangle.`;
}

function buildHeadline(
  session: SessionRecord,
  coreTraits: Array<{ key: TraitKey; label: string; score: number }>,
  _scores: TraitScores
): string {
  const top = coreTraits[0];
  const second = coreTraits[1];
  const templates: Record<TraitKey, string> = {
    candor: "The person who says the uncomfortable thing first",
    steadiness: "The calmest line in the room",
    warmth: "The one who names the person before the problem",
    judgment: "Taste under pressure",
    integrity: "The one who protected the uncomfortable number",
    willingnessToAct: "Moves before permission arrives",
  };
  let base = templates[top.key];
  if (second && second.score >= 60) {
    base += ` — with ${TRAITS[second.key].label.toLowerCase()} right behind it`;
  }
  return personalizeHeadline(session.prelude, base);
}

function buildSummary(
  _session: SessionRecord,
  coreTraits: Array<{ key: TraitKey; label: string; score: number; blurb: string }>,
  contradiction: { title: string; detail: string } | null,
  growthEdge: { title: string; detail: string }
): string {
  const bulletFromCore = coreTraits
    .map((t) => `• ${t.label} (${t.score}) — ${t.blurb}`)
    .join("\n");
  const contradictionText = contradiction
    ? `\n\nThe tension: ${contradiction.title}. ${contradiction.detail}`
    : "";
  return `Across Launch Day Rollback you showed up as:\n${bulletFromCore}${contradictionText}\n\nThe edge to work on: ${growthEdge.title}. ${growthEdge.detail}`;
}

function buildShareSummary(
  coreTraits: Array<{ key: TraitKey; label: string; score: number }>
): string {
  return coreTraits.map((t) => `${t.label} ${t.score}`).join(" · ");
}
