import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Pressure Test schema. The local-storage shim in `src/lib/sessionStore.ts`
 * mirrors this shape, so swapping providers is a one-file change.
 */
export default defineSchema({
  sessions: defineTable({
    guestName: v.string(),
    scenarioId: v.string(),
    prelude: v.object({
      name: v.string(),
      surface: v.array(v.string()),
    }),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    scoringModelVersion: v.string(),
    nodesVisited: v.array(v.string()),
  }).index("by_started", ["startedAt"]),

  choices: defineTable({
    sessionId: v.id("sessions"),
    nodeId: v.string(),
    choiceId: v.string(),
    label: v.string(),
    at: v.number(),
    hesitationMs: v.number(),
  }).index("by_session", ["sessionId"]),

  freeTextResponses: defineTable({
    sessionId: v.id("sessions"),
    nodeId: v.string(),
    text: v.string(),
    editCount: v.number(),
    backspaces: v.number(),
    durationMs: v.number(),
  }).index("by_session", ["sessionId"]),

  voiceCalls: defineTable({
    sessionId: v.id("sessions"),
    status: v.union(
      v.literal("not_started"),
      v.literal("answered"),
      v.literal("declined"),
      v.literal("missed"),
      v.literal("fallback_typed"),
      v.literal("failed")
    ),
    transcript: v.array(
      v.object({
        role: v.union(v.literal("assistant"), v.literal("user")),
        text: v.string(),
        at: v.optional(v.number()),
      })
    ),
    fallbackTranscript: v.optional(v.string()),
    usedVoice: v.boolean(),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    derivedSignals: v.optional(
      v.object({
        directness: v.number(),
        hedging: v.number(),
        ownership: v.number(),
        warmth: v.number(),
        decisiveness: v.number(),
        steadiness: v.number(),
        wordCount: v.number(),
        sampleQuote: v.string(),
        notes: v.array(v.string()),
      })
    ),
    shipOrDelay: v.optional(v.union(v.boolean(), v.null())),
    callSummary: v.optional(v.union(v.string(), v.null())),
  }).index("by_session", ["sessionId"]),

  artifacts: defineTable({
    sessionId: v.id("sessions"),
    artifactVersion: v.string(),
    scoringModelVersion: v.string(),
    traitScores: v.object({
      candor: v.number(),
      steadiness: v.number(),
      warmth: v.number(),
      judgment: v.number(),
      integrity: v.number(),
      willingnessToAct: v.number(),
    }),
    confidence: v.number(),
    headline: v.string(),
    summary: v.string(),
    shareSummary: v.string(),
    lowConfidence: v.boolean(),
    mixedProfile: v.union(v.string(), v.null()),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),
});
