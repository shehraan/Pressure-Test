/**
 * ConvexProviderShim lives in its own file so Vite Fast Refresh can handle
 * convexClient.tsx (hooks only) without forcing a full-page reload each time.
 */
import { type ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;

let convex: ConvexReactClient | null = null;
try {
  if (CONVEX_URL) {
    convex = new ConvexReactClient(CONVEX_URL);
    console.info("[convex] client initialised →", CONVEX_URL);
  } else {
    console.warn(
      "[convex] VITE_CONVEX_URL is not set. " +
        "Run `npx convex dev` and add the URL to .env.local. " +
        "Queries will stay in loading state until the page is refreshed."
    );
  }
} catch (e) {
  console.error("[convex] Failed to initialise client:", e);
}

export function ConvexProviderShim({ children }: { children: ReactNode }) {
  if (!convex) {
    return <>{children}</>;
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
