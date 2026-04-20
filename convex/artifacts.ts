import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const save = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("artifacts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, createdAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("artifacts", { ...args, createdAt: Date.now() });
  },
});

export const getForSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db
      .query("artifacts")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("artifacts").order("desc").take(200);
  },
});
