# Pressure Test

Pressure Test is a mobile-first behavioral scenario game that captures how a person makes decisions under startup pressure, then generates an evidence-based personality artifact from their actions.

This project was built as a demo-ready MVP focused on product taste, full-stack execution, and practical behavioral data design.

## Why this project matters

Most personality products rely on self-report forms. Pressure Test uses behavioral evidence:

- forced choices in a high-stakes scenario
- hesitation timing and free-text edits
- a live voice interruption (with resilient fallback)
- transparent trait scoring with confidence and contradiction logic

The result is a user experience that feels like a game, but behaves like a personalized signal platform.

## What I built

### End-to-end product experience

- `/` polished landing page with clear framing and CTA
- `/play` one complete playable Tangle (Launch Day Rollback)
- `/results/:id` behavioral artifact with evidence, contradiction, and growth edge
- `/share/:id` collectible public share card
- `/admin/trait-lab` internal analytics view for signal quality and model inspection

### Product features

- Progressive timeline narrative and chat-style interlude
- Free-text capture with edit/backspace behavioral signals
- Vapi-powered incoming call interruption with realistic phone UI
- Typed fallback mode if voice fails (never breaks the user flow)
- JSON export of session + artifact data
- Low-confidence warnings and mixed-profile explanations

### Highlights

- Typed, modular architecture separating:
  - scenario content
  - scoring logic
  - voice integration
  - UI/presentation
- Versioned scoring/artifact model for future experimentation
- Convex schema + functions designed for production migration
- Local storage shim that mirrors backend entities for zero-friction demoing
- Obsidian-style force graph (D3) in Trait Lab for exploratory analysis

## Tech stack

- React + Vite + TypeScript
- Tailwind CSS
- Convex (schema/functions scaffolded)
- Vapi Web SDK
- D3 (graph visualization)

## Architecture snapshot

```text
src/
  pages/           Landing, Play, Results, Share, TraitLab
  components/      tangle/, voice/, results/, traitlab/
  lib/
    scenario/      scenario primitives and engine
    scoring/       trait scoring and artifact generation
    voice/         Vapi integration and signal extraction
    traits/        typed trait model and versions
    sessionStore   local data shim matching Convex schema
convex/
  schema + session/voice/artifact functions
```

## Build and run

For setup, environment variables, and implementation details, see [`BUILD.md`](BUILD.md).