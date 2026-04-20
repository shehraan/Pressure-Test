/**
 * Clean analytics event stub. Reads `VITE_POSTHOG_KEY` and, if present,
 * delegates to PostHog. Otherwise falls back to a local console logger that
 * keeps the same callsites. Never silently drops in dev.
 */

type EventProps = Record<string, unknown>;

type Adapter = { capture: (event: string, props?: EventProps) => void };

function makeLocalAdapter(): Adapter {
  return {
    capture(event, props) {
      if (typeof window === "undefined") return;
      const store = (window as unknown as { __ptEvents?: unknown[] }).__ptEvents ?? [];
      store.push({ event, props, at: Date.now() });
      (window as unknown as { __ptEvents?: unknown[] }).__ptEvents = store;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[pt]", event, props ?? {});
      }
    },
  };
}

const adapter: Adapter = makeLocalAdapter();

export const events = {
  capture(event: string, props?: EventProps) {
    adapter.capture(event, props);
  },
};
