import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const statusUnion = v.union(
  v.literal("not_started"),
  v.literal("answered"),
  v.literal("declined"),
  v.literal("missed"),
  v.literal("fallback_typed"),
  v.literal("failed")
);

const signalsValidator = v.object({
  directness: v.number(),
  hedging: v.number(),
  ownership: v.number(),
  warmth: v.number(),
  decisiveness: v.number(),
  steadiness: v.number(),
  wordCount: v.number(),
  sampleQuote: v.string(),
  notes: v.array(v.string()),
});

export const upsert = mutation({
  args: {
    sessionId: v.id("sessions"),
    status: statusUnion,
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
    derivedSignals: v.optional(signalsValidator),
    shipOrDelay: v.optional(v.union(v.boolean(), v.null())),
    callSummary: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("voiceCalls")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("voiceCalls", args);
  },
});

export const getForSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("voiceCalls")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
  },
});
