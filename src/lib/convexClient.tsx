/**
 * Convex hook wrappers.
 *
 * This file exports ONLY hooks (no React components) so that Vite Fast Refresh
 * can hot-reload it without a full page reload. The provider lives in
 * convexProvider.tsx.
 */
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Re-export so callers don't have to change their import path.
export { ConvexProviderShim } from "./convexProvider";

// ─── Session mutations ────────────────────────────────────────────────────────

export function useCreateSession() {
  return useMutation(api.sessions.create);
}

export function useRecordChoice() {
  return useMutation(api.sessions.recordChoice);
}

export function useRecordFreeText() {
  return useMutation(api.sessions.recordFreeText);
}

export function useCompleteSession() {
  return useMutation(api.sessions.complete);
}

// ─── Voice call mutations ─────────────────────────────────────────────────────

export function useUpsertVoiceCall() {
  return useMutation(api.voiceCalls.upsert);
}

// ─── Artifact mutations ───────────────────────────────────────────────────────

export function useSaveArtifact() {
  return useMutation(api.artifacts.save);
}

// ─── Session queries ──────────────────────────────────────────────────────────

/**
 * Session + choices + freeTexts + voiceCall + artifact in one query.
 * Used by Results and Share pages.
 */
export function useSessionWithRelated(sessionId: string | undefined) {
  return useQuery(
    api.sessions.getWithRelated,
    sessionId ? { sessionId: sessionId as Id<"sessions"> } : "skip"
  );
}

/**
 * All sessions with related data. Used by Trait Lab Lite.
 */
export function useSessionSummaries() {
  return useQuery(api.sessions.listSummaries);
}

export function useArtifactList() {
  return useQuery(api.artifacts.list);
}
