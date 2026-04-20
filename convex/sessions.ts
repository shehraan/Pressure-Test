import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    guestName: v.string(),
    scenarioId: v.string(),
    prelude: v.object({
      name: v.string(),
      surface: v.array(v.string()),
    }),
    scoringModelVersion: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      ...args,
      startedAt: Date.now(),
      nodesVisited: [],
    });
  },
});

export const recordChoice = mutation({
  args: {
    sessionId: v.id("sessions"),
    nodeId: v.string(),
    choiceId: v.string(),
    label: v.string(),
    hesitationMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("choices", { ...args, at: Date.now() });
    const s = await ctx.db.get(args.sessionId);
    if (s && !s.nodesVisited.includes(args.nodeId)) {
      await ctx.db.patch(args.sessionId, {
        nodesVisited: [...s.nodesVisited, args.nodeId],
      });
    }
  },
});

export const recordFreeText = mutation({
  args: {
    sessionId: v.id("sessions"),
    nodeId: v.string(),
    text: v.string(),
    editCount: v.number(),
    backspaces: v.number(),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("freeTextResponses", args);
  },
});

export const complete = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    await ctx.db.patch(sessionId, { completedAt: Date.now() });
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    return await ctx.db.get(sessionId);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sessions").withIndex("by_started").order("desc").take(200);
  },
});

/**
 * Returns a single session with all related rows joined server-side.
 * Used by Results and Share pages so they only need one query.
 */
export const getWithRelated = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return null;
    const choices = await ctx.db
      .query("choices")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const freeTexts = await ctx.db
      .query("freeTextResponses")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect();
    const voice = await ctx.db
      .query("voiceCalls")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    const artifact = await ctx.db
      .query("artifacts")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .first();
    return { session, choices, freeTexts, voice, artifact };
  },
});

/**
 * Returns all sessions with related data joined — used by Trait Lab Lite.
 */
export const listSummaries = query({
  args: {},
  handler: async (ctx) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_started")
      .order("desc")
      .take(200);
    return await Promise.all(
      sessions.map(async (s) => {
        const choices = await ctx.db
          .query("choices")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .collect();
        const freeTexts = await ctx.db
          .query("freeTextResponses")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .collect();
        const voice = await ctx.db
          .query("voiceCalls")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .first();
        const artifact = await ctx.db
          .query("artifacts")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .first();
        return { session: s, choices, freeTexts, voice, artifact };
      })
    );
  },
});
