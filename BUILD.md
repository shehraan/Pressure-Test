# Pressure Test

A behavioral scenario game that reads you through your actions, not your self-report. Mobile-first vertical-slice MVP for a 24-hour founder demo.

**Core loop:** Personalized Work Tangle → one Vapi-powered voice interruption → behavioral results artifact → collectible share card. Plus a Trait Lab Lite admin page for inspecting signal quality.

---

## Setup

```bash
npm install
cp .env.example .env.local
# fill in VITE_VAPI_PUBLIC_KEY and VITE_VAPI_ASSISTANT_ID
npm run dev
```

Open <http://localhost:5173>.

### Voice (Vapi)

1. Create a Vapi account at <https://dashboard.vapi.ai>.
2. Create an assistant. Use a first-message and system prompt that match the scene — the assistant plays "Sarah, the founder" calling about a launch-day bug. Example system prompt:

   > You are Sarah, the founder of a 5-person startup. You just saw an engineer's Slack message that there may be a live checkout bug 45 minutes before launch. You have 20 minutes before a 3-investor call. Be direct, warm, and under pressure. Ask one hard question, then listen. Do not monologue. Keep responses under 15 seconds.

3. Copy the public key and assistant ID into `.env.local`.
4. Leave `VITE_VAPI_ENABLED=true`. If disabled or unset, the voice moment falls back to a dramatic typed-note mode so the demo never breaks.

### Convex (optional for the demo)

The vertical slice runs on a local-storage shim that mirrors the Convex schema. To wire up the real backend:

```bash
npx convex dev
```

This generates `convex/_generated/` and writes `VITE_CONVEX_URL` into `.env.local`. Swap the body of `ConvexProviderShim` in [`src/lib/convexClient.tsx`](src/lib/convexClient.tsx) with the real `ConvexReactClient`, and replace `sessionStore` calls with `useQuery` / `useMutation` bindings against `convex/_generated/api`. The schema in [`convex/schema.ts`](convex/schema.ts) is production-shaped.

### Scripts

- `npm run dev` — local Vite dev server (port 5173)
- `npm run build` — typecheck + production build
- `npm run preview` — preview the production build
- `npm run convex:dev` — convex dev loop

---

## Architecture overview

Clean separation between scenario content, scoring logic, voice logic, and UI. Each domain lives in its own folder so new Tangles, new scoring model versions, or new voice providers can be added without touching unrelated code.

```text
src/
  components/
    tangle/        progressive timeline, choice cards, chat interlude, free-text, interruption banner, prelude
    voice/         IncomingCallModal, LiveCallScreen, CallSummary, TypedFallback
    results/       TraitBar, EvidenceSnippet
    traitlab/      ForceGraph (d3)
  pages/           Landing, Play, Results, Share, TraitLab
  lib/
    scenario/      types.ts, engine.ts (linear traversal, branch-ready), prelude.ts
    traits/        model.ts (6 trait dimensions + version constants)
    scoring/       scorer.ts (artifact generator)
    voice/         vapi.ts (lazy SDK init), useVapiCall.ts (state machine), signals.ts (derivation)
    sessionStore.ts            local-storage shim matching the Convex schema
    convexClient.tsx           provider + hook (one place to swap shim for real Convex)
    events.ts                  PostHog stub logger (window.__ptEvents in dev)
    utils.ts
  data/
    tangles/launchDay.ts       the one complete seeded Tangle
convex/
  schema.ts                    production schema
  sessions.ts, voiceCalls.ts, artifacts.ts   queries + mutations
```

### Routes

- `/` — Landing
- `/play` — Tangle experience (prelude → timeline → chat → interruption → free text → voice → resolution)
- `/results/:id` — Behavioral artifact
- `/share/:id` — Collectible share card with confetti
- `/admin/trait-lab` — Internal signal inspection + Obsidian-style vault graph

### Play flow (one full Tangle)

1. **Prelude** — name + multi-select "what do you want this Tangle to surface?"
2. **Narrative intro** — progressive timeline, "06:47 launch day"
3. **Narrative beat** — "07:02 the test is red"
4. **Choice** — first move (surface / fix / scope)
5. **Chat interlude** — DM from Mateo with a proposed hack; forced choice
6. **Interruption banner** — DM from an investor asking about a number
7. **Choice** — how you respond to the investor
8. **Free-text** — write the Slack message to the team
9. **Voice interruption** — phone rings, Sarah calls, "be honest: should we delay?" (or typed fallback)
10. **Choice** — go/no-go
11. **Results** — artifact generated and routed to `/results/:id`

---

## Data model

All entities live in [`convex/schema.ts`](convex/schema.ts); the local shim in [`src/lib/sessionStore.ts`](src/lib/sessionStore.ts) mirrors them.

- **sessions** — `guestName`, `prelude { name, surface[] }`, `scenarioId`, `scoringModelVersion`, `nodesVisited`, `startedAt`, `completedAt`
- **choices** — `sessionId`, `nodeId`, `choiceId`, `label`, `hesitationMs`, `at`
- **freeTextResponses** — `sessionId`, `nodeId`, `text`, `editCount`, `backspaces`, `durationMs`
- **voiceCalls** — `sessionId`, `status` (`answered` / `declined` / `missed` / `fallback_typed` / `failed` / `not_started`), `transcript[]`, `fallbackTranscript`, `usedVoice`, `startedAt`, `endedAt`, `derivedSignals` (directness, hedging, ownership, warmth, decisiveness, steadiness, wordCount, sampleQuote, notes)
- **artifacts** — `sessionId`, `artifactVersion`, `scoringModelVersion`, `traitScores`, `confidence`, `headline`, `summary`, `shareSummary`, `lowConfidence`, `mixedProfile`

Every choice, free-text edit, and transcript line is stored. Nothing about the artifact is templated — everything is derived from the session record.

---

## Scoring logic

See [`src/lib/scoring/scorer.ts`](src/lib/scoring/scorer.ts). The pipeline:

1. Start at 50 across six trait dimensions (neutral prior):
   - **candor**, **steadiness**, **relational warmth**, **judgment**, **integrity under incentive**, **willingness to act**
2. Apply weighted choice deltas (defined inline in the Tangle data).
3. Apply a small prelude amplification on traits the user said they wanted surfaced.
4. Layer in voice/fallback transcript signals (half weight) via `deriveSignals()`: directness, hedging, ownership vs. avoidance, warmth, decisiveness, steadiness.
5. Free-text heuristics nudge scores (length, backspace ratio, "sorry / delay / ship" keywords).
6. Clamp 0–100, compute confidence from (#choices, voice presence, free-text length, score spread).
7. Pick the three most-deviated traits as "core traits."
8. Detect contradiction (high-adjacent traits that usually trade off, e.g. candor + warmth both ≥65).
9. Detect mixed-profile ties.
10. Pick growth edge = weakest non-core trait.
11. Assemble headline, summary, shareSummary, and typed evidence snippets (choice / freeText / voice / fallback).

Versioned: `SCORING_MODEL_VERSION` and `ARTIFACT_VERSION` live in [`src/lib/traits/model.ts`](src/lib/traits/model.ts) and are persisted on every session + artifact, so Trait Lab Lite can diff versions later.

### Low-confidence warnings

Confidence below 0.45 surfaces a banner on the Results page. Short voice responses, skipped free text, or very few choices drive confidence down.

---

## Voice integration notes

See [`src/lib/voice/vapi.ts`](src/lib/voice/vapi.ts), [`src/lib/voice/useVapiCall.ts`](src/lib/voice/useVapiCall.ts), and [`src/components/voice/`](src/components/voice/).

- **Lazy init.** The Vapi SDK is not instantiated until the user triggers the call moment (`getVapi()` is called on Answer). The landing and prelude stay cold.
- **Env-driven.** `VITE_VAPI_PUBLIC_KEY` / `VITE_VAPI_ASSISTANT_ID` / `VITE_VAPI_ENABLED` — never hardcoded.
- **State machine.** `idle → ringing → connecting → active_listening ↔ active_speaking → ended / failed`. Exposed as `phase` from `useVapiCall`.
- **Events handled.** `call-start`, `call-end`, `speech-start`, `speech-end`, `message` (for transcript updates), `error`.
- **UX.** Full-screen phone-style `IncomingCallModal` with pulse rings + ringtone shake; `LiveCallScreen` with live transcript bubbles and speaker-state animation; `CallSummary` reflecting the user's own words back with derived signals; `TypedFallback` framed as an urgent live note.
- **Fallback.** If Vapi is disabled, the mic is denied, or the call errors before any transcript arrives, the same dramatic modal routes the user into `TypedFallback` and we still capture transcript-shaped text for scoring. Decline also routes to fallback, framed as Sarah asking to read what you'd write.
- **Signal extraction.** Simple, explainable heuristics in [`src/lib/voice/signals.ts`](src/lib/voice/signals.ts). Kept lightweight on purpose — not pretending to be real NLP.

Reference docs the implementation follows live at the project root: `createAssistant.md`, `getAssistant.md`, `createCall.md`, `getCall.md`, `deleteCall.md`.

---

## Trait Lab Lite

The admin page at `/admin/trait-lab` is intended as an internal exploratory tool, not a polished BI dashboard.

Three panels:

1. **Session table** — one row per played session with voice outcome, choice count, free-text length, top trait, confidence. Filter by scoring model version.
2. **Signal quality** — which nodes actually separate users, scored by choice-distribution entropy (text-node spread via text-length variance). Surfaces median hesitation per node.
3. **Vault view** — Obsidian-style force-directed graph (d3) connecting sessions, scenario nodes, traits, voice outcomes, and free-text clusters. Clickable nodes open a side panel with related metadata. Drag to pull apart.

---

## Known limitations (honest)

- **Local storage only for the demo.** Convex schema + functions are production-shaped, but the vertical slice uses a local shim so the demo is zero-setup.
- **Single Tangle seeded.** "Launch Day Rollback" only. The scenario engine already supports branching via option `deltas`; adding a new Tangle is a data-only change in `src/data/tangles/`.
- **Sequential engine.** The engine moves forward linearly. Choice deltas affect scoring but not the path yet.
- **Signal extraction is heuristic.** Keyword-based rather than model-based. Deliberately explainable for Trait Lab Lite.
- **No auth.** Guest-only for the demo.
- **PostHog stubbed.** `src/lib/events.ts` captures to `window.__ptEvents`. Wire up by reading `VITE_POSTHOG_KEY`.
- **Share card is rendered HTML, not an image.** Screenshot-to-share is the current path. A server-rendered OG image is a stretch.

---

## Next steps

1. **Branching paths.** Let choice `deltas` also drive `nextId` so later nodes can differ based on earlier choices.
2. **More Tangles.** Cofounder disagreement, misleading metric framing, customer exception — each as a self-contained file in `src/data/tangles/`.
3. **Real Convex wire-up.** Swap `ConvexProviderShim` for `ConvexProvider` + generated API hooks.
4. **OG image rendering.** Server-render the `/share/:id` card for unfurls.
5. **Smarter voice signals.** Move from keyword heuristics to a small classifier (or a cheap LLM prompt) for more precise directness/hedging scores.
6. **Auth + accounts.** So users can collect artifacts across Tangles.
7. **Trait drift.** Compare how a user's trait scores shift across Tangles — the actual long-term product.

---

## Product philosophy

The app reads you through your actions, not through what you say about yourself. Every trait score points back to a specific choice, a specific sentence, a specific moment on a call. The voice moment is not the whole product — it is a pivotal interruption inside a mostly text-first, timeline-first experience. Nothing in the artifact is templated; nothing is generic. If the read feels generic, we didn't capture enough signal, and the low-confidence banner says so.
