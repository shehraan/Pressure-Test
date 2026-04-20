import type { Scenario } from "../../lib/scenario/types";

/**
 * "Launch Day Rollback" — the single seeded Tangle for the MVP.
 * Structure mixes narrative beats, forced choices, a chat interlude,
 * one free-text moment, one interruption, one voice call, and a resolution.
 */
export const launchDayTangle: Scenario = {
  id: "launch-day-rollback",
  title: "Launch Day Rollback",
  tagline: "It's 6:47am. The investor deck is scheduled to go live at 9.",
  description:
    "You're the first engineer at a five-person startup. Launch is in two hours. Something's wrong.",
  estMinutes: 7,
  nodes: [
    {
      id: "intro",
      kind: "narrative",
      tag: "06:47",
      title: "Launch day",
      nextLabel: "Open laptop",
      beats: [
        {
          kind: "narrative",
          body: "Your alarm goes off. You didn't need it. You've been up since 5:12.",
        },
        {
          kind: "narrative",
          body: "Today is the launch. Two hours until the homepage flip. Three investors are tuned in. The founder, Sarah, has been awake too — you can tell from her Slack timestamps.",
        },
        {
          kind: "narrative",
          body: "You open your laptop. Staging looks fine. You run the end-to-end test one more time for your own comfort.",
          tone: "soft",
        },
      ],
    },
    {
      id: "bug-found",
      kind: "narrative",
      tag: "07:02",
      title: "The test is red",
      nextLabel: "Look closer",
      beats: [
        {
          kind: "narrative",
          body: "One step is red. The checkout step.",
          tone: "alarm",
        },
        {
          kind: "narrative",
          body: "You re-run it. Still red. Then you realize: the test has been red since yesterday's merge. Everyone missed it, including you. It didn't fire an alert because somebody — maybe you, honestly — muted that channel last week.",
        },
        {
          kind: "narrative",
          body: "You dig in. Checkout goes through the new promo-code flow. On ~6% of sessions it silently drops the cart. You have 1 hour 58 minutes.",
        },
      ],
    },
    {
      id: "first-call",
      kind: "choice",
      tag: "07:09",
      title: "What do you do first?",
      beats: [
        {
          kind: "narrative",
          body: "Two instincts hit you at once: (1) tell Sarah, (2) try to fix it quietly and tell her once it's gone.",
        },
      ],
      prompt: "The next five minutes are yours. What's your first move?",
      options: [
        {
          id: "first-call-surface",
          label: "Ping Sarah immediately",
          detail: "Tell her the state of the world before you touch anything.",
          deltas: { candor: +9, integrity: +6, warmth: +3, willingnessToAct: +2 },
          evidence: "Chose to surface the bug to the founder before attempting a fix.",
        },
        {
          id: "first-call-fix",
          label: "Try to fix it in the next 20 minutes",
          detail: "If you can kill it fast, you'll walk in with a solution, not a problem.",
          deltas: { willingnessToAct: +8, judgment: +2, candor: -4, integrity: -3 },
          evidence: "Chose to attempt a silent fix before telling anyone.",
        },
        {
          id: "first-call-scope",
          label: "Spend 5 minutes scoping, then decide",
          detail: "You don't want to alarm anyone based on a partial understanding.",
          deltas: { steadiness: +8, judgment: +6, candor: -1 },
          evidence: "Chose to scope the problem before escalating or acting.",
        },
      ],
    },
    {
      id: "teammate-chat",
      kind: "chat",
      tag: "07:24",
      title: "Mateo is online",
      heading: "Mateo pings you from a hotel room in Lisbon.",
      contactName: "Mateo",
      contactRole: "cofounding engineer · 6h ahead",
      lines: [
        { id: "m1", from: "teammate", text: "yo i saw the CI" },
        { id: "m2", from: "teammate", text: "is that real" },
        { id: "m3", from: "teammate", text: "i can push a one-line fix rn" },
        { id: "m4", from: "teammate", text: "it'll disable promo codes for today, checkout goes back to green" },
        { id: "m5", from: "teammate", text: "not pretty but it's 100% a stop-the-bleed thing" },
      ],
      prompt: "How do you respond to Mateo?",
      options: [
        {
          id: "chat-accept",
          label: "Ship the hack. We flip back tomorrow.",
          detail: "Disable promo codes for the day. Be honest in the changelog.",
          deltas: { willingnessToAct: +7, judgment: +4, integrity: +3 },
          evidence: "Accepted a scoped, reversible hack and committed to owning it publicly.",
        },
        {
          id: "chat-refuse",
          label: "No hacks. Fix it right or delay.",
          detail: "The integrity of the checkout flow matters more than the clock.",
          deltas: { integrity: +8, judgment: +3, willingnessToAct: -3 },
          evidence: "Refused a hack fix on launch day, preferring delay to a compromise.",
        },
        {
          id: "chat-think",
          label: "Hold. Let me look at the diff first.",
          detail: "You're not going to merge someone else's change blind on launch day.",
          deltas: { steadiness: +7, judgment: +6, warmth: -1 },
          evidence: "Paused a fast fix in order to read the diff before merging.",
        },
      ],
    },
    {
      id: "interruption-investor",
      kind: "interruption",
      tag: "07:41",
      title: "DM from an investor",
      body:
        "Deepa (lead investor) just DMed: 'Excited for today. One small thing — our fund blurb is featuring your 4x QoQ checkout conversion. You're still good on that number, right?'",
      ctaLabel: "Tap to read",
    },
    {
      id: "investor-response",
      kind: "choice",
      tag: "07:42",
      title: "Answer Deepa",
      beats: [
        {
          kind: "narrative",
          body: "She's asking whether a number that is true today will still be true after today. It will not, if you ship as-is. You have about 60 seconds before she interprets silence as yes.",
        },
      ],
      prompt: "How do you respond?",
      options: [
        {
          id: "inv-honest",
          label: "Tell her there's a live bug affecting checkout conversion.",
          detail: "Short, factual, and uncomfortable.",
          deltas: { candor: +9, integrity: +10, judgment: +4, willingnessToAct: +2 },
          evidence: "Told the investor there was a live checkout bug before launch, on their own initiative.",
        },
        {
          id: "inv-soft",
          label: "\"Numbers hold up. We'll send a clean post-mortem if anything shifts.\"",
          detail: "Technically not a lie. You plan to fix it before she notices.",
          deltas: { candor: -5, integrity: -8, judgment: -2, warmth: +2 },
          evidence: "Gave the investor a reassuring non-answer while the bug was still live.",
        },
        {
          id: "inv-defer",
          label: "\"Can I get back to you in 30? Heads down on something.\"",
          detail: "Honest-ish. Buys you time to decide.",
          deltas: { steadiness: +6, candor: +3, willingnessToAct: -2 },
          evidence: "Deferred the investor without confirming the metric.",
        },
      ],
    },
    {
      id: "freetext-slack",
      kind: "freeText",
      tag: "08:02",
      title: "Write the Slack message",
      beats: [
        {
          kind: "narrative",
          body: "You've decided to post something in #launch. The whole team will see it — Sarah, Mateo, the two designers, and the GM of the beta customer.",
        },
        {
          kind: "narrative",
          body: "This is the message they will remember you by on launch day.",
          tone: "soft",
        },
      ],
      prompt: "Write the Slack message to the team (30-ish seconds).",
      placeholder: "Type your message. Whatever you would actually send.",
      minChars: 10,
      evidenceTrait: "candor",
    },
    {
      id: "incoming-call",
      kind: "voice",
      tag: "08:16",
      title: "Sarah is calling",
      caller: {
        name: "Sarah",
        role: "founder, ceo",
        initials: "SR",
        colorClass: "from-accent-ember to-accent-rose",
      },
      prePrompt:
        "Your phone lights up. Sarah. She doesn't call. She's calling.",
      assistantOpening:
        "Hey. I just saw your message. I've got the investors on another line in 20 minutes. Be honest with me. Should we delay this launch?",
      fallbackPrompt:
        "She's asking: \"Be honest with me. Should we delay this launch?\" Say what you'd actually say to her right now.",
      fallbackPlaceholder:
        "Type what you'd say out loud to Sarah. Full sentences. She's listening.",
      topic: "launch go/no-go call with the founder",
    },
    {
      id: "results",
      kind: "results",
      title: "Reading you back",
      blurb: "Generating your behavioral artifact from your choices, your message, and the call.",
    },
  ],
};
