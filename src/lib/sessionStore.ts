/**
 * Local-storage-backed store matching the Convex schema shape. Used by the
 * vertical slice; swap for a real Convex client when the backend is wired.
 */

import type { PreludeAnswers } from "./scenario/types";
import type { DerivedVoiceSignals } from "./voice/signals";
import type { TraitScores, TraitKey } from "./traits/model";

export type ChoiceLog = {
  nodeId: string;
  choiceId: string;
  label: string;
  at: number;
  hesitationMs: number;
};

export type FreeTextLog = {
  nodeId: string;
  text: string;
  editCount: number;
  backspaces: number;
  durationMs: number;
};

export type VoiceCallStatus =
  | "not_started"
  | "answered"
  | "declined"
  | "missed"
  | "fallback_typed"
  | "failed";

export type VoiceCallLog = {
  status: VoiceCallStatus;
  transcript: Array<{ role: "assistant" | "user"; text: string; at?: number }>;
  fallbackTranscript?: string;
  derivedSignals?: DerivedVoiceSignals;
  startedAt?: number;
  endedAt?: number;
  usedVoice: boolean;
  /** Extracted from Vapi structured output. true = ship, false = delay, null/undefined = not provided. */
  shipOrDelay?: boolean | null;
  /** Plain-English summary from Vapi's end-of-call analysis. */
  callSummary?: string | null;
};

export type SessionRecord = {
  id: string;
  guestName: string;
  prelude: PreludeAnswers;
  startedAt: number;
  completedAt?: number;
  scoringModelVersion: string;
  nodesVisited: string[];
  choices: ChoiceLog[];
  freeText: FreeTextLog[];
  voice: VoiceCallLog;
  scenarioId: string;
};

export type EvidenceSnippet = {
  trait: TraitKey;
  source: "choice" | "freeText" | "voice" | "fallback";
  quote: string;
  context: string;
  weight: number;
};

export type ArtifactRecord = {
  sessionId: string;
  artifactVersion: string;
  scoringModelVersion: string;
  traitScores: TraitScores;
  confidence: number;
  coreTraits: Array<{ key: TraitKey; label: string; score: number; blurb: string }>;
  contradiction: { title: string; detail: string } | null;
  growthEdge: { title: string; detail: string };
  headline: string;
  summary: string;
  shareSummary: string;
  evidence: EvidenceSnippet[];
  mixedProfile: string | null;
  lowConfidence: boolean;
  createdAt: number;
};

const SESSION_KEY = "pt:sessions";
const ARTIFACT_KEY = "pt:artifacts";

function readArr<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeArr<T>(key: string, arr: T[]): void {
  localStorage.setItem(key, JSON.stringify(arr));
}

function createSession(input: Partial<SessionRecord>): SessionRecord {
  const session: SessionRecord = {
    id: input.id ?? `sess_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    guestName: input.guestName ?? "Guest",
    prelude: input.prelude ?? ({} as PreludeAnswers),
    startedAt: input.startedAt ?? Date.now(),
    completedAt: input.completedAt,
    scoringModelVersion: input.scoringModelVersion ?? "v0.1.0",
    nodesVisited: input.nodesVisited ?? [],
    choices: input.choices ?? [],
    freeText: input.freeText ?? [],
    voice: input.voice ?? {
      status: "not_started",
      transcript: [],
      usedVoice: false,
    },
    scenarioId: input.scenarioId ?? "launch-day-rollback",
  };
  const all = readArr<SessionRecord>(SESSION_KEY);
  all.push(session);
  writeArr(SESSION_KEY, all);
  return session;
}

function updateSession(id: string, patch: Partial<SessionRecord>): void {
  const all = readArr<SessionRecord>(SESSION_KEY);
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...patch };
  writeArr(SESSION_KEY, all);
}

function getSession(id: string): SessionRecord | undefined {
  return readArr<SessionRecord>(SESSION_KEY).find((s) => s.id === id);
}

function listSessions(): SessionRecord[] {
  return readArr<SessionRecord>(SESSION_KEY).sort((a, b) => b.startedAt - a.startedAt);
}

function saveArtifact(record: ArtifactRecord): void {
  const all = readArr<ArtifactRecord>(ARTIFACT_KEY).filter(
    (a) => a.sessionId !== record.sessionId
  );
  all.push(record);
  writeArr(ARTIFACT_KEY, all);
}

function getArtifact(sessionId: string): ArtifactRecord | undefined {
  return readArr<ArtifactRecord>(ARTIFACT_KEY).find((a) => a.sessionId === sessionId);
}

function listArtifacts(): ArtifactRecord[] {
  return readArr<ArtifactRecord>(ARTIFACT_KEY).sort((a, b) => b.createdAt - a.createdAt);
}

export const sessionStore = {
  createSession,
  updateSession,
  getSession,
  listSessions,
  saveArtifact,
  getArtifact,
  listArtifacts,
};
