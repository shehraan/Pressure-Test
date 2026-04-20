# Convex backend

The Convex schema + functions here describe the production storage model for
Pressure Test. The vertical-slice demo runs locally against the shim in
[`src/lib/sessionStore.ts`](../src/lib/sessionStore.ts), which mirrors this
schema so swapping providers is a one-file change.

## Wire it up

1. `npx convex dev` in the project root. This provisions a deployment,
   generates `_generated/`, and writes `VITE_CONVEX_URL` to `.env.local`.
2. Replace the body of `ConvexProviderShim` in `src/lib/convexClient.tsx`
   with the real `ConvexProvider` + `ConvexReactClient(import.meta.env.VITE_CONVEX_URL)`.
3. Swap `sessionStore` call sites for `useMutation` / `useQuery` bindings
   generated from `convex/_generated/api`.

## Tables

- `sessions` — one row per play session (guest, prelude, timestamps, scoring model version)
- `choices` — one row per forced-choice answer (with hesitation ms)
- `freeTextResponses` — one row per free-text node (with edit count, backspaces, duration)
- `voiceCalls` — one row per voice moment (status, transcript, derived signals)
- `artifacts` — one row per generated behavioral artifact (trait scores, confidence, headline)
